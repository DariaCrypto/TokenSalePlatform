// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ReferralSystem {
    using SafeERC20 for IERC20;

    event DistributedRewards(
        address referral,
        address[] referrers,
        uint256[] rewards
    );

    uint256[] internal _percentReward;
    address internal _owner;
    uint256 internal _allReferralPercent;

    mapping(address => address) internal _referralList;
    mapping(address => bool) internal _isReferrer;

    function _setSystemParameters(uint256[] memory percentReward, address owner)
        internal
    {
        _owner = owner;
        delete (_percentReward);
        uint256 level = percentReward.length;
        for (uint256 i; i < level; i++) {
            _allReferralPercent += percentReward[i];
            _percentReward.push(percentReward[i]);
        }
    }

    function _setReferrer(address referral, address referrer) internal virtual {
        _referralList[referral] = referrer;
    }

    function _distributeTheFee(
        address referral,
        uint256 amount,
        address token
    ) internal returns (uint256 feeToPeople, uint256 feeToPlatform) {
        uint256 level = _percentReward.length;
        address[] memory addresses = new address[](level);
        uint256[] memory fees = new uint256[](level);
        address newReferral = referral;

        for (uint256 i; i < level; ++i) {
            addresses[i] = _referralList[referral];
            uint256 value = _calcPercent(amount, _percentReward[i]);
            fees[i] = value;

            if (_referralList[newReferral] != address(0)) {
                newReferral = _referralList[newReferral];
                feeToPeople += value;
            } else {
                newReferral = _owner;
                feeToPlatform += value;
            }

            if (token != address(0)) {
                sendUSD(newReferral, value, token);
            } else {
                sendMATIC(newReferral, value);
            }
        }

        emit DistributedRewards(referral, addresses, fees);
    }

    function sendUSD(
        address account,
        uint256 value,
        address token
    ) internal {
        IERC20(token).safeTransfer(account, value);
    }

    function sendMATIC(address account, uint256 value) internal {
        payable(account).call{value: value}("");
    }

    function _calcPercent(uint256 value, uint256 percent)
        internal
        pure
        returns (uint256 res)
    {
        return ((percent * value) / (100));
    }

    function getDataRefSystem()
        external
        view
        returns (uint256[] memory percentReward, address owner)
    {
        return (_percentReward, _owner);
    }

    function getReferrer(address referral)
        external
        view
        returns (address referrer)
    {
        return _referralList[referral];
    }
}
