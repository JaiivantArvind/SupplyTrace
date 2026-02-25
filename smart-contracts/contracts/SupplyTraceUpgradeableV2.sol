// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./SupplyTraceUpgradeable.sol";

/// @notice V2 — adds version() to verify upgrade path in tests.
/// All storage is inherited unchanged from SupplyTraceUpgradeable.
contract SupplyTraceUpgradeableV2 is SupplyTraceUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function version() external pure returns (uint8) {
        return 2;
    }
}
