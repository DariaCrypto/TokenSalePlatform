//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

interface IVesting {
    struct InfoVesting {
        uint256 totalAmount;
        uint256 vestingDuration;
        uint256 startVesting;
        address SaleTokenAddress;
        uint256 distributedAmount;
        uint256 distributedImmediately;
    }

    /**
     *@dev Works out when emitting the "claim" method
     */
    event Claim(address indexed account, uint256 amountSaleToken);

    /**
     *@dev Users who are on the whitelist can pick up the available reward
     */
    function claim(uint256 amountSaleToken) external;

    /**
     * @dev Add or remove from whitelist
     * @param account array with user addresses
     * @param status array with user status
     */
    function setWhiteList(address[] memory account, bool[] memory status)
        external;

    /**
     * @dev Admin function for token withdrawal
     * @param tokenAddr token address
     * @param amount withdrawal amount
     */
    function withdrawToken(address tokenAddr, uint256 amount) external;

    /**
     * @dev Admin function for native token withdrawal
     * @param amount withdrawal amount
     */
    function withdrawETH(uint256 amount) external;

    /**
     * @dev Is the user whitelisted
     * @param account user address
     */
    function getkUserStatus(address account) external view returns (bool);

    /**
     * @dev Get basic information
     */
    function getInfoVesting() external view returns (InfoVesting memory);

    /**
     * @dev Get the available amount for distribution
     */
    function getAvaiableAmount() external view returns (uint256);
}
