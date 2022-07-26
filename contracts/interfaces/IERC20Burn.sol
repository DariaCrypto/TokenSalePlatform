//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.10;

interface IERC20Burn {
    function burn(address from, uint256 amount) external;
}
