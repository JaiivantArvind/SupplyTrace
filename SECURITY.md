# SupplyTrace Security Model

**Contract:** `SupplyTraceUpgradeable` (UUPS Proxy)  
**Network:** Ethereum Sepolia (testnet) / Ethereum Mainnet (production target)  
**Proxy:** `0x2d6e1979c944DdfCBF34FE1f172DED5e600bEc60`  
**Audit status:** Pre-audit (Phase 9 hardened)

---

## Architecture Summary

```
User / Frontend
      │
      ▼
  UUPS Proxy (stable address)
      │
      ▼
  SupplyTraceUpgradeable (implementation)
      │
      ├─ ERC1155Upgradeable     — token standard
      ├─ AccessControlUpgradeable — role gating
      ├─ ReentrancyGuardUpgradeable
      ├─ PausableUpgradeable    — circuit breaker
      └─ UUPSUpgradeable        — upgrade authority
```

**Read layer:** The Graph subgraph (event-indexed, off-chain)  
**Metadata:** IPFS (content-addressed, pinned)

---

## Role Hierarchy

| Role | Capabilities | Escalation Risk |
|------|-------------|-----------------|
| `DEFAULT_ADMIN_ROLE` | Grant/revoke all roles | High — must be held by Safe |
| `ADMIN_ROLE` | Pause, unpause, recall, upgrade | High — must be held by Safe |
| `MANUFACTURER_ROLE` | Mint batches, transfer CREATED→DISTRIBUTED | Medium |
| `DISTRIBUTOR_ROLE` | Transfer DISTRIBUTED→RETAIL | Low |
| `RETAILER_ROLE` | Transfer RETAIL→SOLD | Low |
| `INSPECTOR_ROLE` | Read-only (reserved for future auditing) | None |

**Invariant:** No role can grant itself a higher privilege. `MANUFACTURER_ROLE` cannot grant `ADMIN_ROLE`. `DEFAULT_ADMIN_ROLE` gates all `grantRole` calls.

---

## Attack Vectors

### 1. Admin Key Compromise
**Risk:** Single wallet holds `ADMIN_ROLE` → attacker can pause, upgrade to malicious impl, or recall all batches.  
**Mitigation:** Transfer `ADMIN_ROLE` and `DEFAULT_ADMIN_ROLE` to a Gnosis Safe (≥2-of-3 multi-sig) via `scripts/transfer-admin-to-safe.ts`. See Phase 7 instructions.  
**Current status:** Safe transfer is a manual post-deploy step; deployer holds keys on testnet.

### 2. Upgrade Abuse (Malicious Implementation)
**Risk:** Attacker with `ADMIN_ROLE` deploys implementation that drains state, adds backdoors, or breaks invariants.  
**Mitigation:**
- `_authorizeUpgrade()` gated by `ADMIN_ROLE` → requires multi-sig approval after Safe transfer
- Storage layout is frozen (slot order documented, `__gap` reserves future slots)
- OZ upgrade safety validator enforces no storage collisions at deploy time
- `_disableInitializers()` in constructor blocks direct implementation initialization

### 3. Role Escalation
**Risk:** `MANUFACTURER_ROLE` holder attempts to escalate to `ADMIN_ROLE`.  
**Mitigation:** OZ `AccessControl` enforces that only the `DEFAULT_ADMIN_ROLE` of a given role can grant it. `MANUFACTURER_ROLE`'s admin role is `DEFAULT_ADMIN_ROLE`, which is held only by the Safe.

### 4. Reentrancy via ERC1155 Token Hook
**Risk:** Malicious `safeTransferFrom` recipient implements `onERC1155Received` and re-enters `transferBatch`.  
**Mitigation:**
- `transferBatch` is decorated with `nonReentrant` (OZ `ReentrancyGuard`)
- `batchState` is updated **before** `safeTransferFrom` call — checks-effects-interactions pattern followed
- `_custodyCount` incremented before token transfer

### 5. Pause Bypass
**Risk:** Critical functions operate while contract is paused.  
**Mitigation:**
- `mintBatch` and `transferBatch` use `whenNotPaused` modifier
- `_update()` override adds `whenNotPaused` at the ERC1155 token layer — blocks any direct ERC1155 transfer while paused
- `recallBatch` intentionally bypasses pause (emergency recalls must work during incidents)

### 6. Unbounded Array / DoS
**Risk (resolved):** `custodyHistory` dynamic array could grow unboundedly, making reads expensive.  
**Mitigation (Phase 9):** Array writes removed. `_custodyCount` tracks count in O(1). Full history available via The Graph subgraph.

### 7. Invalid State Transition
**Risk:** Batch transferred out of sequence (e.g., RETAIL → CREATED).  
**Mitigation:** `transferBatch` enforces strict role+state pairs. `MANUFACTURER` can only transfer `CREATED` batches. State only advances via enum progression. Reverse transitions are impossible.

### 8. Recall After Sale
**Risk:** Admin recalls a batch after it's been sold to a consumer, retroactively invalidating a purchase.  
**Mitigation:** `recallBatch` is available at any state — this is intentional for product safety incidents. The `BatchRecalled` event provides an audit trail. The subgraph indexes recall events for public visibility.

---

## Frontend Trust Boundaries

| Layer | Trust Level | Notes |
|-------|------------|-------|
| Smart contract | Trusted | On-chain, immutable logic |
| The Graph subgraph | Semi-trusted | Indexed from chain events; can lag by blocks |
| IPFS metadata | Content-addressed | Hash stored on-chain; content can be unpinned |
| Frontend (React) | Untrusted | Client-side code; never perform access control here |
| RPC provider | Semi-trusted | Use verified endpoints (Infura/Alchemy); validate responses |

**Frontend does not enforce role gating.** All access control is enforced at the contract level. UI restrictions are UX only.

---

## IPFS Availability Risk

- Metadata URIs are stored on-chain as `ipfs://` hashes (immutable)
- IPFS content can become unavailable if not pinned
- **Mitigation:** Use a pinning service (Pinata, web3.storage, nft.storage) for all uploaded metadata
- **Fallback:** On-chain `metadataURI` field always returns the hash for re-fetching via any IPFS gateway

---

## Storage Layout (Frozen)

| Slot | Variable | Type | Notes |
|------|----------|------|-------|
| 0 | `batches` | `mapping(uint256 => ProductBatch)` | Core batch data |
| 1 | `_legacyCustodyHistory` | `mapping(uint256 => CustodyRecord[])` | Deprecated (Phase 9), writes removed |
| 2 | `batchState` | `mapping(uint256 => BatchState)` | Lifecycle state |
| 3 | `_nextTokenId` | `uint256` | Auto-incrementing counter |
| 4 | `_custodyCount` | `mapping(uint256 => uint256)` | O(1) custody count |
| 5–49 | `__gap` | `uint256[45]` | Reserved for future upgrades |

OZ base contracts use ERC-7201 namespaced storage and do not consume linear slots.

**DO NOT reorder these variables in any future implementation upgrade.**

---

## Gas Profile (Optimizer: 200 runs, Solidity 0.8.22)

| Function | Min | Avg | Max |
|----------|-----|-----|-----|
| `mintBatch` | 178,532 | 195,209 | 195,752 |
| `transferBatch` | 83,554 | 100,603 | 115,378 |
| `recallBatch` | — | 54,857 | — |

---

## Known Limitations

1. **No formal verification** — invariants are tested but not formally proven
2. **Centralized upgrade authority** — until Safe is configured, single wallet can upgrade
3. **IPFS dependence** — metadata availability depends on pinning
4. **No oracle integration** — off-chain data (temperature, GPS) requires future oracle phase
5. **Testnet only** — Sepolia deployment; mainnet requires full audit before deploy
6. **Graph Studio** — subgraph requires manual deploy + auth token setup

---

## Deployment Checklist (Pre-Mainnet)

- [ ] Transfer `ADMIN_ROLE` and `DEFAULT_ADMIN_ROLE` to Gnosis Safe (≥2-of-3)
- [ ] Verify proxy on Etherscan (implementation + proxy)
- [ ] Pin all IPFS metadata via production pinning service
- [ ] Deploy and verify subgraph on The Graph Network (not Studio)
- [ ] Run third-party audit
- [ ] Set `VITE_SUBGRAPH_URL` in production frontend environment
- [ ] Remove deployer wallet from all roles
- [ ] Document Safe signers and threshold

---

## Reporting Security Issues

For vulnerabilities in this codebase, open a private disclosure via GitHub Security Advisories or contact the repository maintainer directly. Do not open public issues for unpatched vulnerabilities.
