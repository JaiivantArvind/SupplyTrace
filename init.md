# SupplyTrace: Technical Initialization & AI Handoff Contract (`init.md`)

> **Notice to AI Agents & Developers:**  
> Read this document first before inspecting or modifying the codebase. This is the authoritative technical memory for SupplyTrace. Use it as a navigational index to locate relevant components, understand architectural boundaries and engineering invariants, and avoid redundant full-repository scans.

---

## 1. Project Identity & Overview

- **Project Name:** SupplyTrace
- **Core Purpose:** Decentralized supply chain provenance, custody verification, and batch lifecycle tracking on Ethereum using ERC-1155 tokens, UUPS upgradeable proxies, The Graph indexing, and IPFS metadata.
- **Current Operational State:** Fully implemented, verified end-to-end, and deployed. Contracts deployed to Sepolia testnet (`0x2d6e1979c944DdfCBF34FE1f172DED5e600bEc60`), 63/63 unit tests passing, production bundle built with 0 errors, and deployed live to Vercel.
- **Repository URL:** `https://github.com/JaiivantArvind/SupplyTrace`
- **Live Production URL:** `https://supplytrace-mauve.vercel.app`
- **Application Entry Points:**
  - **Windows Orchestrator:** [`Start.bat`](Start.bat) (Interactive menu & headless CLI runner)
  - **Frontend Web App:** [`frontend/src/main.tsx`](frontend/src/main.tsx) (Wagmi + React Query provider root)
  - **Smart Contract System:** [`smart-contracts/contracts/SupplyTraceUpgradeable.sol`](smart-contracts/contracts/SupplyTraceUpgradeable.sol) (UUPS proxy implementation)
  - **Local Deployment Routine:** [`smart-contracts/deploy/00_deploy_supplytrace.ts`](smart-contracts/deploy/00_deploy_supplytrace.ts)
  - **The Graph Mapping:** [`subgraph/src/mapping.ts`](subgraph/src/mapping.ts)

---

## 2. Technology Stack & Runtimes

| Layer | Technology | Version | Location / Config |
| :--- | :--- | :--- | :--- |
| **Runtime Environment** | Node.js | `>= 20.0.0` (Host: `v24.16.0`) | System PATH |
| **Package Management** | npm | `>= 10.0.0` (Host: `12.0.2`) | Workspaces via `--prefix` delegation |
| **Smart Contracts** | Solidity | `0.8.22` (EVM target: `paris`) | [`smart-contracts/hardhat.config.ts`](smart-contracts/hardhat.config.ts) |
| **Contract Framework** | Hardhat | `^2.22.3` | [`smart-contracts/package.json`](smart-contracts/package.json) |
| **Contract Standards** | OpenZeppelin Upgradeable | `^5.4.0` (UUPS, ERC-1155) | [`smart-contracts/package.json`](smart-contracts/package.json) |
| **Contract Testing** | Mocha / Chai / Ethers v6 | `^4.5.0` / `^6.16.0` | [`smart-contracts/test/SupplyTrace.test.ts`](smart-contracts/test/SupplyTrace.test.ts) |
| **Frontend Framework** | React | `^19.2.0` | [`frontend/package.json`](frontend/package.json) |
| **Frontend Bundler** | Vite | `^7.3.1` | [`frontend/vite.config.ts`](frontend/vite.config.ts) |
| **Language & Typings** | TypeScript (Strict) | `~5.9.3` | [`frontend/tsconfig.json`](frontend/tsconfig.json) |
| **Web3 Client Bindings**| Wagmi / Viem | `^3.5.0` / `^2.46.3` | [`frontend/src/main.tsx`](frontend/src/main.tsx) |
| **Styling & Components**| Tailwind CSS / Radix UI | `^3.4.10` / Radix primitives | [`frontend/src/index.css`](frontend/src/index.css) |
| **Indexing Subsystem** | The Graph / AssemblyScript | CLI `^0.98.1` / TS `^0.35.1` | [`subgraph/subgraph.yaml`](subgraph/subgraph.yaml) |
| **Decentralized Storage**| IPFS | Multi-gateway failover | [`frontend/src/lib/ipfs-gateways.ts`](frontend/src/lib/ipfs-gateways.ts) |

---

## 3. Canonical Directory Map

```
SupplyTrace/
├── Start.bat                             # Windows startup & lifecycle orchestrator
├── package.json                          # Root delegation scripts (--prefix)
├── package-lock.json                     # Root lockfile (@types/node)
├── .npmrc                                # Root npm configuration (legacy-peer-deps=true)
├── .env.example                          # Root environment template
├── init.md                               # THIS DOCUMENT — Technical handoff & architecture memory
├── PROJECT_AUDIT.md                      # Audit log, architectural decisions & verification records
├── README.md                             # Human-facing user and developer documentation
├── SECURITY.md                           # Threat model, invariants & vulnerability disclosures
│
├── smart-contracts/                      # Blockchain Consensus & Logic Tier
│   ├── contracts/
│   │   ├── SupplyTraceUpgradeable.sol    # Primary logic contract behind UUPS proxy
│   │   ├── SupplyTraceUpgradeableV2.sol  # Demonstration contract for V2 upgradeability
│   │   └── legacy/
│   │       └── SupplyTrace.sol           # Archived non-upgradeable initial prototype
│   ├── deploy/
│   │   └── 00_deploy_supplytrace.ts      # hardhat-deploy deterministic migration script
│   ├── scripts/
│   │   ├── deploy.ts                     # Manual deploy helper using upgrades.deployProxy
│   │   ├── upgrade.ts                    # Manual upgrade helper to deploy V2
│   │   ├── export-frontend.ts            # Copies ABI and proxy address to frontend/src/contracts
│   │   ├── grant-roles.ts                # Grants supply chain roles to a designated wallet
│   │   ├── check-roles.ts                # Inspects active roles for an address
│   │   └── transfer-admin-to-safe.ts     # Transfers admin ownership to a Gnosis Safe multi-sig
│   ├── test/
│   │   └── SupplyTrace.test.ts           # 63 unit tests across 8 test suites
│   ├── .openzeppelin/
│   │   └── sepolia.json                  # Linear storage layout registry (slots 0–4 + __gap)
│   ├── hardhat.config.ts                 # Hardhat networks, Solidity compiler, account config
│   ├── .env.example                      # Contract environment template (SEPOLIA_RPC, PRIVATE_KEY)
│   ├── .npmrc                            # Workspace npm config (legacy-peer-deps=true)
│   └── package.json                      # Hardhat dependencies and test/deploy scripts
│
├── frontend/                             # Browser Client Tier
│   ├── src/
│   │   ├── config/
│   │   │   └── contracts.ts              # Canonical contract address & ABI export
│   │   ├── contracts/
│   │   │   └── SupplyTrace.json          # Exported ABI & address artifact from smart-contracts
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx             # Overview and role-gated quick action grid
│   │   │   ├── MintBatch.tsx             # Manufacturer mint form & QR code generator
│   │   │   ├── TransferBatch.tsx         # Custody transfer with role recipient routing
│   │   │   ├── ExploreBatches.tsx        # Searchable inventory table of all on-chain batches
│   │   │   ├── Verify.tsx                # Public consumer verification portal (no wallet required)
│   │   │   ├── AdminPanel.tsx            # Circuit breaker pause, emergency recall & role management
│   │   │   └── Settings.tsx              # Theme customization (Dark/Light) & wallet state
│   │   ├── hooks/
│   │   │   ├── useBatches.ts             # On-chain batch discovery via getLogs with block offset
│   │   │   ├── useRole.ts                # Resolves caller's supply chain roles via hasRole
│   │   │   └── useSubgraphCustody.ts     # GraphQL custody history fetcher with RPC fallback
│   │   ├── lib/
│   │   │   ├── ipfs-gateways.ts          # Resilient multi-gateway IPFS fetcher
│   │   │   └── theme.tsx                 # ThemeProvider and useTheme context
│   │   ├── components/
│   │   │   ├── Layout.tsx                # App shell, responsive sidebar & wallet header
│   │   │   ├── WalletButton.tsx          # MetaMask / injected connector button
│   │   │   └── ui/                       # shadcn/ui primitives (badge, button, card, dialog, etc.)
│   │   └── main.tsx                      # App entry point, WagmiConfig & QueryClientProvider
│   ├── .env.example                      # Frontend environment template
│   ├── .npmrc                            # Workspace npm config (legacy-peer-deps=true)
│   ├── eslint.config.js                  # ESLint 9 configuration (Fast Refresh & React 19 rules)
│   ├── vite.config.ts                    # Vite 7 build configuration with path aliases (@ -> src)
│   ├── vercel.json                       # Vercel SPA client-side routing configuration
│   └── package.json                      # React 19 dependencies & Vite build scripts
│
└── subgraph/                             # The Graph Indexing Subsystem
    ├── schema.graphql                    # GraphQL schema (Batch, CustodyTransfer, Recall)
    ├── subgraph.yaml                     # Subgraph manifest (Sepolia, 3 event handlers)
    ├── src/
    │   └── mapping.ts                    # AssemblyScript event handlers
    ├── abis/
    │   └── SupplyTraceUpgradeable.json   # Contract ABI used for code generation
    └── package.json                      # Graph CLI dependencies & build scripts
```

---

## 4. Architecture & Execution Flow

### Data Flow & Component Boundaries

```
[Browser Client]
       │
       ├─► Reads/Writes State ──────► [ERC-1967 Proxy: 0x2d6e...Ec60] ──► [Logic: SupplyTraceUpgradeable]
       │                                  │ (Emits Events: BatchMinted, BatchTransferred, BatchRecalled)
       │                                  ▼
       ├─► Queries Historical Graph ──► [The Graph Subgraph / Studio]
       │                                  ▲
       │                                  │ (Syncs from blocks)
       │                                  ▼
       └─► Resolves Product Data ────► [IPFS Gateways: ipfs.io, dweb.link, pinata]
```

1. **State Modifications (Transactions):**
   - The user connects an EIP-1193 wallet (MetaMask) configured for Sepolia (`11155111`) or Hardhat Localhost (`31337`).
   - Transactions are dispatched to the **ERC-1967 UUPS Proxy** address (`0x2d6e1979c944DdfCBF34FE1f172DED5e600bEc60`), which delegates calls via `DELEGATECALL` to `SupplyTraceUpgradeable.sol`.
   - The proxy preserves storage in slots 0–4 and consumes state changes atomically.
2. **Event Emission & Indexing:**
   - Contract transactions emit indexed events: `BatchMinted`, `BatchTransferred`, and `BatchRecalled`.
   - The Graph subgraph listens to these events, maps them in `subgraph/src/mapping.ts`, and indexes `Batch`, `CustodyTransfer`, and `Recall` entities.
   - The client fetches complete historical transfers via `useSubgraphCustody.ts`.
3. **Decentralized Metadata Resolution:**
   - Batch metadata (JSON documents containing origin coords, certs, descriptions) is stored on IPFS.
   - The client's [`ipfs-gateways.ts`](frontend/src/lib/ipfs-gateways.ts) attempts parallel and sequential resolution across `ipfs.io`, `dweb.link`, `gateway.pinata.cloud`, and `cloudflare-ipfs.com`.

---

## 5. Initialization Sequence

To start the system from scratch:

```
Step 1: System Prerequisite Check (Node >= 20.0.0, npm >= 10.0.0, Git)
   │
Step 2: Environment File Bootstrapping (.env.example -> .env in root, smart-contracts, frontend)
   │
Step 3: Dependency Installation (npm ci --prefix smart-contracts && npm ci --prefix frontend)
   │
Step 4: Consensus Node Startup (npx hardhat node on port 8545)
   │
Step 5: Readiness Polling (netstat checks for port 8545 listening state)
   │
Step 6: Smart Contract Deployment (npx hardhat deploy --network localhost --reset)
   │
Step 7: Artifact Synchronization (npx hardhat run scripts/export-frontend.ts --network localhost)
   │
Step 8: Client Web App Launch (npm run dev --prefix frontend on port 5173)
```

The Windows orchestrator [`Start.bat`](Start.bat) automates this entire sequence seamlessly via Option `[1]` (`Start.bat full`).

---

## 6. Commands Reference

### Windows Launcher Commands
```cmd
Start.bat full       # Complete local stack (Node + Deploy + ABI Export + Web UI)
Start.bat frontend   # Launch Vite frontend server only
Start.bat node       # Start standalone Hardhat node on port 8545
Start.bat deploy     # Deploy contracts to localhost and export ABI
Start.bat test       # Run 63 smart contract unit tests
Start.bat build      # Compile contracts and build Vite production bundle
Start.bat lint       # Run TypeScript strict typecheck & ESLint
Start.bat check      # Validate prerequisites and environment templates
Start.bat install    # Verify and install dependencies across workspaces
```

### Manual Cross-Platform npm CLI Commands
```bash
# Dependencies installation
npm ci --prefix smart-contracts
npm ci --prefix frontend
npm install --prefix subgraph

# Smart Contracts
npm run compile --prefix smart-contracts     # Compile Solidity & generate TypeChain types
npm test                                     # Run 63 unit tests across 8 suites
npx hardhat coverage --prefix smart-contracts # Run Solidity code coverage

# Frontend
npm run dev                                  # Start Vite dev server on http://localhost:5173
npx tsc -b --prefix frontend                 # Strict TypeScript typechecking
npm run lint                                 # Execute ESLint across frontend
npm run build                                # Full monorepo build (contracts + frontend)

# Subgraph
npm run codegen --prefix subgraph            # Generate GraphQL schema types
npm run build --prefix subgraph              # Compile WASM mapping to build/
```

---

## 7. Configuration Contract

| Environment Variable | Target Component | Required | Format / Pattern | Safe Default / Example | Notes |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `SEPOLIA_RPC_URL` | `smart-contracts` | Optional (local) / Yes (Sepolia) | Valid HTTP(S) URL | `https://rpc.sepolia.org` | RPC endpoint for Sepolia deployments |
| `PRIVATE_KEY` | `smart-contracts` | Optional (local) / Yes (Sepolia) | 64-char hex string (32 bytes) | Empty / Valid Hex | Guarded by `isValidPrivateKey` regex |
| `ETHERSCAN_API_KEY` | `smart-contracts` | Optional | Alphanumeric API key | Empty / `ABC123XYZ` | Used for Etherscan contract verification |
| `VITE_CONTRACT_ADDRESS`| `frontend` | Optional (falls back to artifact) | 42-char hex address (`0x...`) | `0x2d6e1979c944DdfCBF34FE1f172DED5e600bEc60` | Deployed proxy address |
| `VITE_SUBGRAPH_URL` | `frontend` | Optional | Valid HTTP(S) URL | Empty (falls back to RPC logs) | GraphQL query endpoint |
| `PINATA_JWT` | `frontend` | Optional | JWT bearer token | Empty (falls back to demo mode) | IPFS upload authorization |

---

## 8. Core Module Map

### Smart Contracts Tier ([`smart-contracts/`](smart-contracts/))
- **`SupplyTraceUpgradeable.sol`**: Core business logic and storage.
  - `initialize(address admin)`: Initializer replacing constructor.
  - `mintBatch(string metadataURI, uint256 quantity)`: Mints ERC-1155 tokens to manufacturer.
  - `transferBatch(uint256 tokenId, address to, uint256 quantity)`: Enforces custody transitions (`CREATED` → `DISTRIBUTED` → `RETAIL` → `SOLD`).
  - `recallBatch(uint256 tokenId)`: Permanently marks batch inactive and sets state to `CLOSED`.
  - `verifyAuthenticity(uint256 tokenId)`: View function returning manufacturer, state, active flag, metadata URI, and custody count.
  - `pause()` / `unpause()`: Circuit breaker functions restricted to `ADMIN_ROLE`.
- **`00_deploy_supplytrace.ts`**: Deployment script that initializes the proxy and seeds `MANUFACTURER_ROLE`, `DISTRIBUTOR_ROLE`, and `RETAILER_ROLE` on localhost.
- **`export-frontend.ts`**: Synchronization script reading deployment artifacts and writing canonical ABI + address to `frontend/src/contracts/SupplyTrace.json`.

### Frontend Client Tier ([`frontend/`](frontend/))
- **[`config/contracts.ts`](frontend/src/config/contracts.ts)**: Single source of truth for contract addresses, ABIs, and deployment block offset (`DEPLOYMENT_BLOCK = 7949300n`).
- **[`pages/MintBatch.tsx`](frontend/src/pages/MintBatch.tsx)**: Manufacturer portal; parses `BatchMinted` event from receipt and generates printable QR codes.
- **[`pages/TransferBatch.tsx`](frontend/src/pages/TransferBatch.tsx)**: Custody transfer portal; validates next valid recipient based on current role.
- **[`pages/Verify.tsx`](frontend/src/pages/Verify.tsx)**: Public consumer verification route (`/verify/:tokenId`); displays on-chain status, custody count, and parallel IPFS metadata.
- **[`pages/AdminPanel.tsx`](frontend/src/pages/AdminPanel.tsx)**: Admin dashboard; features role assignment, batch recall, and the Pausable Circuit Breaker toggle.
- **[`hooks/useBatches.ts`](frontend/src/hooks/useBatches.ts)**: Discovers all minted tokens via `getLogs` using network-aware block offsets (`7949300n` on Sepolia, `0n` on localhost).
- **[`hooks/useRole.ts`](frontend/src/hooks/useRole.ts)**: Reads `hasRole` for `ADMIN_ROLE`, `MANUFACTURER_ROLE`, `DISTRIBUTOR_ROLE`, `RETAILER_ROLE`.
- **[`lib/ipfs-gateways.ts`](frontend/src/lib/ipfs-gateways.ts)**: Multi-gateway failover resolver with timeout and abort controller.

---

## 9. API & Integration Contracts

### Smart Contract Interface
```solidity
function mintBatch(string calldata metadataURI, uint256 quantity) external returns (uint256);
function transferBatch(uint256 tokenId, address to, uint256 quantity) external;
function recallBatch(uint256 tokenId) external;
function verifyAuthenticity(uint256 tokenId) external view returns (
    address manufacturer,
    string memory metadataURI,
    bool active,
    BatchState state,
    uint256 custodyCount
);
function pause() external;
function unpause() external;
function paused() external view returns (bool);
```

### The Graph GraphQL Entity Schema
```graphql
type Batch @entity {
  id: ID!
  tokenId: BigInt!
  manufacturer: Bytes!
  metadataURI: String!
  active: Boolean!
  state: String!
  quantity: BigInt!
  createdAt: BigInt!
  custodyTransfers: [CustodyTransfer!]! @derivedFrom(field: "batch")
}

type CustodyTransfer @entity(immutable: true) {
  id: ID!
  batch: Batch!
  from: Bytes!
  to: Bytes!
  state: String!
  timestamp: BigInt!
  transactionHash: Bytes!
}
```

---

## 10. Dependency Constraints

1. **`hardhat-deploy-ethers` Peer Dependency Conflict:**
   `hardhat-deploy-ethers@0.4.2` declares peer dependency `hardhat-deploy@^0.12.0`, while `smart-contracts` pins `0.11.45`.
   **Rule:** Always preserve `.npmrc` with `legacy-peer-deps=true`. Do not casually bump `hardhat-deploy` to 0.12 without verifying deployment compatibility.
2. **Workspace Hoisting Isolation:**
   `smart-contracts`, `frontend`, and `subgraph` have incompatible transitive dependencies (e.g., Graph AssemblyScript vs React 19 vs Hardhat Ethers).
   **Rule:** Do not combine them into a single hoisted root workspace. Maintain root scripts using `--prefix`.
3. **OpenZeppelin Upgradeable Linear Storage Layout:**
   `SupplyTraceUpgradeable.sol` uses slots 0–4 followed by `uint256[45] private __gap;`.
   **Rule:** Any new state variables added in future upgrades (V2, V3) must either consume slots from `__gap` from top-to-bottom or be appended after slot 49, never inserted between existing slots 0–4.

---

## 11. Engineering Invariants

1. **Sequential State Transitions:**
   Batches must only advance: `CREATED` (0) → `DISTRIBUTED` (1) → `RETAIL` (2) → `SOLD` (3). Reversing state or skipping roles reverts with `InvalidState()`.
2. **Double Recall Prevention:**
   Recalling a batch sets `active = false` and `state = CLOSED` (4). Recalling an already inactive batch reverts with `AlreadyInactive()`.
3. **Circuit Breaker Recall Exemption:**
   `recallBatch` must **not** carry `whenNotPaused`. Safety recalls must remain executable even when general operations are frozen.
4. **Checks-Effects-Interactions:**
   State transitions and custody counter increments must be written to contract storage *before* dispatching `_safeTransferFrom`.
5. **Walletless Consumer Verification:**
   The `/verify/:tokenId` route must remain fully functional using read-only RPC calls without requiring a wallet connection.

---

## 12. Testing Reference

```bash
npm test # Runs smart-contracts test suite
```

- **Suite File:** [`smart-contracts/test/SupplyTrace.test.ts`](smart-contracts/test/SupplyTrace.test.ts)
- **Status:** **63 of 63 unit tests passed** (Runtime: ~3 seconds).
- **Test Coverage:**
  - Deployment & default admin role assignments (2 tests)
  - Role granting & unauthorized access checks (2 tests)
  - Batch minting, zero quantity & empty URI checks (6 tests)
  - Sequential custody transfer hierarchy (9 tests)
  - Emergency batch recalls & double-recall protection (6 tests)
  - `verifyAuthenticity` data integrity checks (6 tests)
  - Pausable circuit breaker controls & recall under pause (6 tests)
  - UUPS proxy upgradeability to V2 & unauthorized upgrade blockage (2 tests)
  - Gnosis Safe multi-sig governance takeover simulation (8 tests)
  - Audit invariants: reentrancy surface, event schemas, address zero checks (12 tests)

---

## 13. Known Issues & Unresolved External Dependencies

1. **Sepolia Testnet Gas:**
   Live writes against the Sepolia proxy require testnet ETH in the user's wallet. Local development mode (`Start.bat full` on chain 31337) runs with pre-funded local accounts with zero gas cost.
2. **The Graph Studio Private Auth Key:**
   Publishing the subgraph to Graph Studio requires a developer account and private deployment key. The frontend includes an automatic fallback to RPC logs when `VITE_SUBGRAPH_URL` is omitted.
3. **Pinata JWT Token:**
   Uploading new product images and metadata to Pinata IPFS requires an API key. For testing without an account, a mock IPFS CID is provided in the UI.

---

## 14. Instructions for Future AI Coding Agents

When tasked with modifications to this repository:
1. **Always read this document (`init.md`) first.** It is your primary reference for directory structure, dependencies, and configuration contracts.
2. **Never break the UUPS storage layout.** Check `.openzeppelin/sepolia.json` before touching contract state variables.
3. **Validate every change with tests:**
   - For contract changes: run `npm test` (all 63 tests must pass).
   - For frontend changes: run `npx tsc -b --prefix frontend` and `npm run lint`.
4. **Preserve launcher functionality:** Ensure any new service or workflow is integrated into [`Start.bat`](Start.bat).
5. **Update documentation:** When you modify architectural boundaries, add environment variables, or resolve known issues, update both `README.md` and `init.md`.

---

## 15. Sources of Truth

- **Contract Address & ABI (Frontend):** [`frontend/src/config/contracts.ts`](frontend/src/config/contracts.ts)
- **Deployed Proxy Storage Registry:** [`smart-contracts/.openzeppelin/sepolia.json`](smart-contracts/.openzeppelin/sepolia.json)
- **Root Environment Schema:** [`.env.example`](.env.example)
- **Smart Contract Manifest:** [`smart-contracts/package.json`](smart-contracts/package.json)
- **Frontend Manifest:** [`frontend/package.json`](frontend/package.json)
- **Subgraph Manifest:** [`subgraph/subgraph.yaml`](subgraph/subgraph.yaml)
- **Primary Orchestrator:** [`Start.bat`](Start.bat)
