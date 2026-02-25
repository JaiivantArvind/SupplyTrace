// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// Custom errors — cheaper than require strings
error EmptyMetadataURI();
error ZeroQuantity();
error ZeroAddress();
error BatchInactive();
error AlreadyInactive();
error InvalidState();
error InvalidRole();
error InvalidToken();
error InsufficientBalance();

/// @custom:security-contact security@supplytrace.io
contract SupplyTraceUpgradeable is
    Initializable,
    ERC1155Upgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant RETAILER_ROLE = keccak256("RETAILER_ROLE");
    bytes32 public constant INSPECTOR_ROLE = keccak256("INSPECTOR_ROLE");

    enum BatchState { CREATED, DISTRIBUTED, RETAIL, SOLD, CLOSED }

    struct ProductBatch {
        uint256 tokenId;
        string metadataURI;
        address manufacturer;
        uint256 manufactureDate;
        bool active;
    }

    /// @dev Deprecated — kept only for storage-layout continuity. No longer written to.
    struct CustodyRecord { address from; address to; uint256 timestamp; }

    // ── Storage layout — DO NOT reorder ─────────────────────────────────────
    mapping(uint256 => ProductBatch) public batches;
    /// @dev Slot 1 — deprecated storage, writes removed in Phase 9. Layout preserved for upgrade safety.
    mapping(uint256 => CustodyRecord[]) private _legacyCustodyHistory;
    mapping(uint256 => BatchState) public batchState;
    uint256 private _nextTokenId;
    /// @dev Slot 4 — counts custody transfers per token (replaces on-chain array; consumed from __gap).
    mapping(uint256 => uint256) private _custodyCount;

    // Reserved storage gap: 50 slots total - 5 used = 45
    uint256[45] private __gap;

    // ── Events ───────────────────────────────────────────────────────────────
    event BatchMinted(uint256 indexed tokenId, address indexed manufacturer, uint256 quantity);
    /// @dev Emitted on every custody transfer; timestamp is included for off-chain tools
    ///      that don't index block metadata. The Graph subgraph ingests this event.
    event BatchTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint256 quantity,
        uint256 timestamp
    );
    event BatchRecalled(uint256 indexed tokenId);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin) public initializer {
        __ERC1155_init("");
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    // ── Circuit breaker ──────────────────────────────────────────────────────
    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    // ── Core functions ───────────────────────────────────────────────────────

    function mintBatch(string memory metadataURI, uint256 quantity)
        external
        onlyRole(MANUFACTURER_ROLE)
        whenNotPaused
    {
        if (bytes(metadataURI).length == 0) revert EmptyMetadataURI();
        if (quantity == 0) revert ZeroQuantity();

        uint256 tokenId;
        unchecked { tokenId = ++_nextTokenId; }

        batches[tokenId] = ProductBatch({
            tokenId: tokenId,
            metadataURI: metadataURI,
            manufacturer: msg.sender,
            manufactureDate: block.timestamp,
            active: true
        });

        batchState[tokenId] = BatchState.CREATED;

        _mint(msg.sender, tokenId, quantity, "");

        emit BatchMinted(tokenId, msg.sender, quantity);
    }

    function transferBatch(uint256 tokenId, address to, uint256 quantity)
        external
        nonReentrant
        whenNotPaused
    {
        if (to == address(0)) revert ZeroAddress();
        if (quantity == 0) revert ZeroQuantity();

        ProductBatch storage batch = batches[tokenId];
        if (!batch.active) revert BatchInactive();

        BatchState currentState = batchState[tokenId];

        if (hasRole(MANUFACTURER_ROLE, msg.sender)) {
            if (currentState != BatchState.CREATED) revert InvalidState();
            if (!hasRole(DISTRIBUTOR_ROLE, to)) revert InvalidRole();
            batchState[tokenId] = BatchState.DISTRIBUTED;
        } else if (hasRole(DISTRIBUTOR_ROLE, msg.sender)) {
            if (currentState != BatchState.DISTRIBUTED) revert InvalidState();
            if (!hasRole(RETAILER_ROLE, to)) revert InvalidRole();
            batchState[tokenId] = BatchState.RETAIL;
        } else if (hasRole(RETAILER_ROLE, msg.sender)) {
            if (currentState != BatchState.RETAIL) revert InvalidState();
            batchState[tokenId] = BatchState.SOLD;
        } else {
            revert InvalidRole();
        }

        if (balanceOf(msg.sender, tokenId) < quantity) revert InsufficientBalance();

        unchecked { _custodyCount[tokenId]++; }

        safeTransferFrom(msg.sender, to, tokenId, quantity, "");

        emit BatchTransferred(tokenId, msg.sender, to, quantity, block.timestamp);
    }

    // Recall is intentionally NOT gated by whenNotPaused — emergency recalls
    // must work even during a pause.
    function recallBatch(uint256 tokenId)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (batches[tokenId].tokenId == 0) revert InvalidToken();
        if (!batches[tokenId].active) revert AlreadyInactive();

        batches[tokenId].active = false;
        batchState[tokenId] = BatchState.CLOSED;

        emit BatchRecalled(tokenId);
    }

    function verifyAuthenticity(uint256 tokenId)
        external
        view
        returns (
            address manufacturer,
            string memory metadataURI,
            bool active,
            BatchState currentState,
            uint256 custodyCount
        )
    {
        if (batches[tokenId].tokenId == 0) revert InvalidToken();

        ProductBatch storage batch = batches[tokenId];
        return (
            batch.manufacturer,
            batch.metadataURI,
            batch.active,
            batchState[tokenId],
            _custodyCount[tokenId]
        );
    }

    // getCustodyHistory() removed in Phase 9 — use The Graph subgraph instead.
    // On-chain array was unbounded and gas-expensive; event indexing is the
    // scalable alternative.

    // ── ERC1155 token-level emergency freeze ─────────────────────────────────
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override whenNotPaused {
        super._update(from, to, ids, values);
    }

    // ── UUPS upgrade authorization ───────────────────────────────────────────
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(ADMIN_ROLE)
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
