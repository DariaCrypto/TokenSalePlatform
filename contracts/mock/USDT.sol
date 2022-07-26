pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {
    uint256 public constant PRECISION = 1000;
    uint256 provideLiquidity;
    uint256 buyback;
    uint256 communityRewardPool;
    uint256 distributed;

    address _owner;
    uint256 _feePecent;

    constructor() ERC20("USDC_Test", "T_USDC") {
        _owner = msg.sender;
        _mint(msg.sender, 500000000000000000000000000);
    }

    function decimals() public view override returns (uint8) {
        return 6;
    }
}
