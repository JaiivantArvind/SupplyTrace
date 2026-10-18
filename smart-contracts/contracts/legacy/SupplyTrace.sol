// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Custom errors — cheaper than require strings
error EmptyMetadataURI();
error ZeroQuantity();
error ZeroAddress();
error BatchInactive();
error AlreadyInactive();
error InvalidState();
error InvalidRole();
error InvalidToken();

contract SupplyTrace is ERC1155, AccessControl, ReentrancyGuard, Pausable {
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

    struct CustodyRecord {
        address from;
        address to;
        uint256 timestamp;
    }

    mapping(uint256 => ProductBatch) public batches;
    mapping(uint256 => CustodyRecord[]) public custodyHistory;
    mapping(uint256 => BatchState) public batchState;

    uint256 private _nextTokenId;

    event BatchMinted(uint256 indexed tokenId, address indexed manufacturer, uint256 quantity);
    event BatchTransferred(uint256 indexed tokenId, address indexed from, address indexed to, uint256 quantity);
    event BatchRecalled(uint256 indexed tokenId);

    constructor(string memory baseURI) ERC1155(baseURI) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
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

        if (balanceOf(msg.sender, tokenId) < quantity) revert ZeroQuantity();

        custodyHistory[tokenId].push(CustodyRecord({
            from: msg.sender,
            to: to,
            timestamp: block.timestamp
        }));

        safeTransferFrom(msg.sender, to, tokenId, quantity, "");

        emit BatchTransferred(tokenId, msg.sender, to, quantity);
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
            custodyHistory[tokenId].length
        );
    }

    function getCustodyHistory(uint256 tokenId)
        external
        view
        returns (CustodyRecord[] memory)
    {
        if (batches[tokenId].tokenId == 0) revert InvalidToken();
        return custodyHistory[tokenId];
    }

    // ── ERC1155 token-level emergency freeze ─────────────────────────────────
    // Overrides the OZ v5 _update hook so no token movement (mint, transfer,
    // burn) can occur while the contract is paused. recallBatch is unaffected
    // because it only writes a storage flag, never calls _update.
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override whenNotPaused {
        super._update(from, to, ids, values);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
