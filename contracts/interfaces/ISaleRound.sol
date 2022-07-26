//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

interface ISaleRound {
    struct SaleInfo {
        address SaleTokenAddress;
        uint256 totalAmount;
        uint256 percentDistributedImmediately;
        uint256 distributedAmount;
        uint256 vestingDuration;
        uint256 startTime;
        uint256 pricePerToken;
        uint256 maxContribution;
        uint256 minContribution;
        uint256 soldAmount;
        uint256 burnAmount;
    }

    struct UserData {
        uint256 buyAmount;
        uint256 claimAmount;
    }

    error ZeroAmount();
    error ExceedingMaxSold(uint256 availableAmount);
    error MinMaxContribution();
    error Finish();

    /**
     * @dev works out when emitting the "buySaleToken" method
     */
    event BuySaleTokenOfUSD(
        address account,
        uint256 amountSaleToken,
        uint256 amountUSD,
        uint256 transferAmount
    );

    /**
     * @dev works out when emitting the "buySaleToken" method
     */
    event BuySaleTokenOfMATIC(
        address account,
        uint256 amountSaleToken,
        uint256 amountMATIC,
        uint256 amountUSD,
        uint256 transferAmount
    );
    event Claim(address account, uint256 amount);

    /**
     * @dev purchase of saleToken tokens for native currency
     */
    function buySaleToken(address referral) external payable;

    /**
     * @dev purchase of saleToken tokens for USDT/USDC
     * @param usdAddr address USD
     * @param usdAmount the amount of USD to be exchanged for SaleToken
     */
    function buySaleToken(
        address usdAddr,
        uint256 usdAmount,
        address referral
    ) external;

    function claim() external;

    /**
     * @dev admin function for token withdrawal
     * @param tokenAddr token address
     * @param amount withdrawal amount
     */
    function withdrawToken(address tokenAddr, uint256 amount) external;

    /**
     * @dev admin function for native token withdrawal
     * @param amount withdrawal amount
     */
    function withdrawETH(uint256 amount) external;

    /**
    @dev get the available amount for distribution
    */
    function getAvaiableAmount(address account) external view returns (uint256);

    /**
     * @dev get the value of the native currency to the dollar
     */
    function getPrice(uint256 amount) external view returns (uint256);

    /**
     * @dev get basic information
     */
    function getInfo() external view returns (SaleInfo memory);

    function getCurrencyStatus(address currency) external view returns (bool);

    /**
     * @dev get information about the tokens received
     */
    function getInfoTokens() external view returns (uint256, uint256);

    /**
     * @dev get the result of usd to SaleToken exchange
     * @param usdAmount USD Amount
     */
    function swap(uint256 usdAmount)
        external
        view
        returns (uint256 SaleTokenamount);
}
