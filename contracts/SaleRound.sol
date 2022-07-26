//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ISaleRound.sol";
import "./interfaces/IERC20Burn.sol";
import "./ReferralSystem.sol";

contract SaleRound is ReferralSystem, ISaleRound, Ownable {
    using SafeERC20 for IERC20;

    uint256 public PRECISION = 1e18;
    uint256 public FACTOR = 1e12;
    uint256 public YELLOW_SUM = 100; //100$
    address public ADAPTER;

    uint256 private immutable _maxContribution;
    uint256 private immutable _minContribution;
    uint256 private immutable _pricePerToken; //0.07$

    uint256 private _totalAmount;
    uint256 private _percentDistributedImmediately;
    address private _SaleTokenAddress;
    uint256 private _startTime;
    uint256 private _distributedAmount;
    uint256 private _vestingDuration;
    uint256 private _receiveMATIC;
    uint256 private _receiveUSD;
    uint256 private _soldAmount;
    uint256 private _burnAmount;
    address private _stablecoin;
    uint256 private _feeToPlatform;

    mapping(address => bool) _availableCurrency;
    mapping(address => UserData) _userData;

    /**
     *@param amount the total number of tokens to be distributed
     *@param tokenAddr address SaleToken
     *@param vesting how long will all tokens be distributed. Specify in months
     *@param percentDistributedImmediately the percentage of the total amount that will be immediately available for receipt
     *@param pricePerToken the percentage of the total amount that will be immediately available for receipt
     *@param availableCurrencies stable coins will be available for the purchasing SaleToken
     *@param adapter address Uniswap adapter
     *@param maxContribution maximum deposit for a buy
     *@param minContribution minimum depositfor a buy
     *@param percentReward percents for the referral system
     */
    constructor(
        uint256 amount,
        address tokenAddr,
        uint256 vesting,
        uint256 percentDistributedImmediately,
        uint256 pricePerToken,
        address[] memory availableCurrencies,
        address adapter,
        uint256 maxContribution,
        uint256 minContribution,
        uint256[] memory percentReward
    ) {
        _totalAmount = amount;
        _startTime = block.timestamp;
        _percentDistributedImmediately = percentDistributedImmediately;
        _SaleTokenAddress = tokenAddr;
        _vestingDuration = vesting;
        _pricePerToken = pricePerToken;

        for (uint256 i; i < availableCurrencies.length; ) {
            address currency = availableCurrencies[i];
            _availableCurrency[currency] = true;

            unchecked {
                i++;
            }
        }

        _maxContribution = maxContribution;
        _minContribution = minContribution;

        ADAPTER = adapter;
        _stablecoin = availableCurrencies[0];

        _setSystemParameters(percentReward, address(this));
    }

    modifier isAvailableCurrency(address usdAddr) {
        require(_availableCurrency[usdAddr], "Unknown address");
        _;
    }

    modifier isFinish() {
        if (_burnAmount > 0) {
            revert Finish();
        }
        _;
    }

    function setPercentParameters(uint256[] memory percentReward)
        external
        onlyOwner
    {
        _setSystemParameters(percentReward, address(this));
    }

    /**
     * @dev See {IPrivateSale-buySaleToken}.
     */
    function addToReferrerList(address account) external onlyOwner {
        _isReferrer[account] = true;
        emit AddToReferrerList(account);
    }

    /**
     * @dev See {IPrivateSale-buySaleToken}.
     */
    function removeFromReferrerList(address account) external onlyOwner {
        delete _isReferrer[account];
    }

    /**
     * @dev See {IPrivateSale-buySaleToken}.
     */
    function setStablecoin(address coin) external onlyOwner {
        _stablecoin = coin;
    }

    function setYellowSum(uint256 newYellowSum) external onlyOwner {
        YELLOW_SUM = newYellowSum;
    }

    function setFactor(uint256 newFactor) external onlyOwner {
        FACTOR = newFactor;
    }

    function setPrecision(uint256 newPrecision) external onlyOwner {
        PRECISION = newPrecision;
    }

    /**
     * @dev See {IPrivateSale-buySaleToken}.
     */
    function buySaleToken(address referrer) external payable isFinish {
        uint256 amountMATIC = msg.value;
        (uint256 amountUSD, uint8 decimals) = _getPrice(amountMATIC);

        if (
            amountUSD > _maxContribution * 10**decimals ||
            amountUSD < _minContribution * 10**decimals
        ) {
            revert MinMaxContribution();
        }

        if (amountUSD >= YELLOW_SUM * 10**decimals) {
            _isReferrer[msg.sender] = true;
        }

        if (_isReferrer[referrer]) {
            _referralList[msg.sender] = referrer;
        }

        (uint256 feeToReferrals, uint256 feeToPlatform) = _distributeTheFee(
            msg.sender,
            amountMATIC,
            address(0)
        );

        uint256 amountAfterFee = _calcPercent(
            amountUSD,
            100 - _allReferralPercent
        );
        uint256 amountSaleToken = swap(amountAfterFee);

        _feeToPlatform += feeToPlatform;
        _soldAmount += amountSaleToken;

        if (_soldAmount > _totalAmount) revert ExceedingMaxSold();

        UserData storage userData = _userData[msg.sender];
        userData.buyAmount += amountSaleToken;

        uint256 availableAmount = _calcAvailableAmount(msg.sender);
        if (availableAmount == 0) revert ZeroAmount();

        userData.claimAmount += availableAmount;
        _distributedAmount += availableAmount;
        _receiveMATIC += amountMATIC;

        IERC20(_SaleTokenAddress).safeTransfer(msg.sender, availableAmount);

        emit BuySaleTokenOfMATIC(
            msg.sender,
            amountSaleToken,
            amountMATIC,
            amountUSD,
            _stablecoin,
            availableAmount,
            feeToPlatform,
            feeToReferrals
        );
    }

    /**
     * @dev See {IPrivateSale-buySaleToken}.
     */
    function buySaleToken(
        address usdAddr,
        uint256 usdAmount,
        address referrer
    ) external isAvailableCurrency(usdAddr) isFinish {
        uint8 decimals = IERC20Metadata(usdAddr).decimals();

        if (
            usdAmount > _maxContribution * 10**decimals ||
            usdAmount < _minContribution * 10**decimals
        ) {
            revert MinMaxContribution();
        }

        if (usdAmount >= YELLOW_SUM * 10**decimals) {
            _isReferrer[msg.sender] = true;
        }

        if (_isReferrer[referrer]) {
            _referralList[msg.sender] = referrer;
        }

        (uint256 feeToReferrals, uint256 feeToPlatform) = _distributeTheFee(
            msg.sender,
            usdAmount,
            usdAddr
        );

        uint256 amountAfterFee = _calcPercent(
            usdAmount,
            100 - _allReferralPercent
        );
        uint256 amountSaletoken = swap(amountAfterFee);

        _feeToPlatform += feeToPlatform;
        _soldAmount += amountSaletoken;

        if (_soldAmount > _totalAmount) {
            revert ExceedingMaxSold();
        }

        UserData storage userData = _userData[msg.sender];
        userData.buyAmount += amountSaletoken;

        uint256 avaiAmount = _calcAvailableAmount(msg.sender);
        if (avaiAmount == 0) {
            revert ZeroAmount();
        }

        userData.claimAmount += avaiAmount;
        _distributedAmount += avaiAmount;
        _receiveUSD += usdAmount;

        IERC20(usdAddr).safeTransferFrom(
            msg.sender,
            address(this),
            amountAfterFee
        );
        IERC20(_SaleTokenAddress).safeTransfer(msg.sender, avaiAmount);

        emit BuySaleTokenOfUSD(
            msg.sender,
            amountSaleToken,
            amountAfterFee,
            usdAddr,
            avaiAmount,
            feeToPlatform,
            feeToReferrals
        );
    }

    /**
     * @dev See {IPrivateSale-claim}.
     */
    function claim() external {
        uint256 avaiAmount = _calcAvailableAmount(msg.sender);
        if (avaiAmount == 0) revert ZeroAmount();
        UserData storage userData = _userData[msg.sender];
        userData.claimAmount += avaiAmount;
        _distributedAmount += avaiAmount;
        IERC20(_SaleTokenAddress).safeTransfer(msg.sender, avaiAmount);
        emit Claim(msg.sender, avaiAmount);
    }

    /**
     * @dev See {IPrivateSale-withdrawToken}.
     */
    function withdrawToken(address tokenAddr, uint256 amount)
        external
        onlyOwner
    {
        IERC20(tokenAddr).safeTransfer(msg.sender, amount);
    }

    /**
     * @dev See {IPrivateSale-withdrawETH}.
     */
    function withdraw(uint256 amount) external onlyOwner {
        msg.sender.call{value: amount}("");
    }

    function burnUnsoldToken() external onlyOwner {
        _burnAmount = _totalAmount - _soldAmount;
        IERC20Burn(_SaleTokenAddress).burn(address(this), _burnAmount);
    }

    function getPlatformFee() external view onlyOwner returns (uint256) {
        return _feeToPlatform;
    }

    function getBalanceContract() external view onlyOwner returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev See {IPrivateSale-getAvaiableAmount}.
     */
    function getAvailableAmount(
        address account //// Q: Anyone can see the available tokens of another address?!
    ) external view returns (uint256) {
        return (_calcAvailableAmount(account));
    }

    /**
     * @dev See {IPrivateSale-getPrice}.
     */
    function getPrice(uint256 amount) external view returns (uint256, uint8) {
        return (_getPrice(amount));
    }

    /**
     * @dev See {IPrivateSale-getInfo}.
     */
    function getInfo() external view returns (SaleInfo memory) {
        return
            SaleInfo(
                _SaleTokenAddress,
                _totalAmount,
                _percentDistributedImmediately,
                _distributedAmount,
                _vestingDuration,
                _startTime,
                _pricePerToken,
                _maxContribution,
                _minContribution,
                _soldAmount,
                _burnAmount
            );
    }

    /**
     * @dev See {IPrivateSale-getInfoTokens}.
     */
    function getInfoTokens() external view returns (uint256, uint256) {
        return (_receiveMATIC, _receiveUSD);
    }

    /**
     * @dev See {IPrivateSale-swap}.
     */
    function getCurrencyStatus(address currency) external view returns (bool) {
        return _availableCurrency[currency];
    }

    /**
     * @dev See {IPrivateSale-swap}.
     */
    function swap(uint256 usdAmount)
        public
        view
        returns (uint256 SaleTokenamount)
    {
        return (usdAmount * FACTOR * PRECISION) / _pricePerToken;
    }

    function _calcAvailableAmount(address account)
        internal
        view
        returns (uint256 avaiableAmount)
    {
        uint256 month = (block.timestamp - _startTime) / 30 days;
        if (month > _vestingDuration) {
            month = _vestingDuration;
        }

        uint256 distrAmount = (_userData[account].buyAmount *
            _percentDistributedImmediately) / 100;

        avaiableAmount =
            distrAmount +
            ((_userData[account].buyAmount - distrAmount) / _vestingDuration) *
            month -
            _userData[account].claimAmount;
    }

    /**
     * @dev Get USD amount
     * @param amount deposited for exchange
     */
    function _getPrice(uint256 amount) internal view returns (uint256, uint8) {
        address weth = IUniswapV2Router02(ADAPTER).WETH();
        uint8 decimals = IERC20Metadata(_stablecoin).decimals();

        address[] memory path = new address[](2);
        path[0] = weth;
        path[1] = _stablecoin;

        uint256[] memory amountOut = IUniswapV2Router02(ADAPTER).getAmountsOut(
            amount,
            path
        );

        return (amountOut[1], decimals);
    }
}
