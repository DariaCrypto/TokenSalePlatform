//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;
import "./ReflectToken.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SaleToken is ReflectToken, AccessControl {
    using SafeERC20 for ERC20;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DAO_ROLE = keccak256("DAO_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    uint256 public constant PRECISION = 1000;

    uint256 private _feePecent;
    uint256 private _provideLiquidity;
    uint256 private _buyback;
    uint256 private _communityRewardPool;
    uint256 private _distributed;
    address private _owner;

    constructor(uint256 feePecent_, uint256 initialSupply)
        ReflectToken("SaleToken", "ST", initialSupply)
    {
        _owner = msg.sender;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(BURNER_ROLE, msg.sender); //maybe create function 'setBurnRole'?
        _feePecent = feePecent_;
    }

    /**
     * @dev Withdraw reward amount
     */
    function withdrawCommunityRewardPool(address account)
        external
        onlyRole(DAO_ROLE)
    {
        _transfer(address(this), account, _communityRewardPool);
        _communityRewardPool = 0;
    }

    /**
     * @dev Withdraw buyback amount
     */
    function withdrawBuyback(address account) external onlyRole(DAO_ROLE) {
        _transfer(address(this), account, _buyback);
        _buyback = 0;
    }

    /**
     * @dev Withdraw provide liquidity amount
     */
    function withdrawProvideLiquidity(address account)
        external
        onlyRole(DAO_ROLE)
    {
        _transfer(address(this), account, _provideLiquidity);
        _provideLiquidity = 0;
    }

    /**
     * @dev Withdraw distribute amount
     */
    function withdrawDistribute(address account) external onlyRole(ADMIN_ROLE) {
        uint256 distributedAmount = balanceOf(address(this)) -
            _provideLiquidity -
            _buyback -
            _communityRewardPool;
        _transfer(address(this), account, distributedAmount);
    }

    /**
     * @dev Adding DEX account in list
     */
    function addAccountInDexList(address account, bool val)
        external
        onlyRole(ADMIN_ROLE)
    {
        _addAccountInDex(account, val);
    }

    function burn(address from, uint256 tAmount)
        external
        onlyRole(BURNER_ROLE)
    {
        _burn(from, tAmount);
    }

    function setBurnableRole(address account) external onlyRole(ADMIN_ROLE) {
        grantRole(BURNER_ROLE, account);
    }

    function setDAORole(address account) external onlyRole(ADMIN_ROLE) {
        grantRole(DAO_ROLE, account);
    }

    /**
     * @dev Withdraw ERC20 tokens
     */
    function withdrawToken(address token, uint256 amount)
        external
        onlyRole(ADMIN_ROLE)
    {
        ERC20(token).safeTransfer(msg.sender, amount);
    }

    /**
     * @dev Set account admin role
     */
    function setOwner(address newOnwer) external {
        require(msg.sender == _owner, "ST: you are not owner");
        _setupRole(DEFAULT_ADMIN_ROLE, newOnwer);
        _revokeRole(DEFAULT_ADMIN_ROLE, _owner);
        _owner = newOnwer;
    }

    /**
     * @dev Return provide liquidity pecent
     */
    function getProvideLiquidity() external view returns (uint256) {
        return _provideLiquidity;
    }

    /**
     * @dev Return buyback pecent
     */
    function getBuyback() external view returns (uint256) {
        return _buyback;
    }

    /**
     * @dev Return reward pecent
     */
    function getCommunityRewardPool() external view returns (uint256) {
        return _communityRewardPool;
    }

    /**
     * @dev Return distribution pecent
     */
    function getDistributed() external view returns (uint256) {
        return _distributed;
    }

    /**
     * @dev Return fee pecent
     */
    function getFeePecent() external view returns (uint256) {
        return _feePecent;
    }

    /**
     * @dev Return owner address
     */
    function getOwner() external view returns (address) {
        return _owner;
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address to, uint256 amount)
        public
        override
        returns (bool)
    {
        address owner = _msgSender();
        uint256 tax = _calcPercent(amount, _feePecent * PRECISION);
        if (isDex(to) || isDex(msg.sender)) {
            _provideLiquidity += _calcPercent(tax, 20 * PRECISION);
            _buyback += _calcPercent(tax, 30 * PRECISION);
            _communityRewardPool += _calcPercent(tax, 30 * PRECISION);
            _distributed += _calcPercent(tax, 20 * PRECISION);
        }
        _transfer(owner, to, amount);

        return true;
    }

    /**
     * @dev Amount of tokens to be charged as a reflection fee. Must be in range 0..amount.
     */
    function _calculateFee(uint256 amount)
        internal
        view
        override
        returns (uint256, uint256)
    {
        uint256 tax = _calcPercent(amount, _feePecent * PRECISION);
        uint256 fee = _calcPercent(tax, 80 * PRECISION);
        uint256 distributed = _calcPercent(tax, 20 * PRECISION);

        return (fee, distributed);
    }

    /**
     * @dev Calculate procent
     */
    function _calcPercent(uint256 amount, uint256 percent)
        internal
        pure
        returns (uint256)
    {
        return ((amount * percent) / (100 * PRECISION));
    }
}
