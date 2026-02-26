# SupplyTrace

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.22-363636?style=for-the-badge&logo=solidity&logoColor=white"/>
  <img src="https://img.shields.io/badge/Hardhat-2.22-F7DF1E?style=for-the-badge&logo=ethereum&logoColor=black"/>
  <img src="https://img.shields.io/badge/OpenZeppelin-5.4-4E5EE4?style=for-the-badge&logo=openzeppelin&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white"/>
  <img src="https://img.shields.io/badge/The_Graph-Subgraph-6747ED?style=for-the-badge&logo=thegraph&logoColor=white"/>
  <img src="https://img.shields.io/badge/IPFS-Metadata-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white"/>
</p>

> **Decentralised supply chain provenance on Ethereum.**  
> Mint product batches as ERC-1155 tokens, enforce role-gated custody transfers on-chain, and let any consumer verify authenticity — no intermediary required.

---

## ✨ Features

| Feature | Detail |
|---|---|
| 🏭 **Batch minting** | Manufacturers tokenise product batches as ERC-1155 tokens with IPFS metadata |
| 🔁 **Role-gated transfers** | Custody moves Manufacturer → Distributor → Retailer → Sold, enforced by the contract |
| 🔎 **Consumer verification** | Anyone with a token ID can verify manufacturer, state, and full IPFS metadata via a public page |
| 🛑 **Emergency recall** | Admins can instantly deactivate any batch and transition it to `CLOSED` |
| ⏸️ **Pausable circuit breaker** | Contract operations can be frozen by an admin while recall always stays live |
| 🔒 **UUPS upgradeability** | Implementation upgradeable behind a transparent proxy with storage-layout safety |
| 🏛️ **Multi-sig governance** | Admin role transferable to a Gnosis Safe for multi-party control |
| 📊 **The Graph indexing** | `BatchMinted`, `BatchTransferred`, `BatchRecalled` events indexed for efficient history queries |
| 📦 **IPFS metadata** | Product metadata (name, manufacturer, certifications, geo-coordinates) stored on IPFS via Pinata |
| 🔑 **QR verification** | Every batch generates a shareable QR code linking directly to its verification page |

---

## 🗂️ Project Structure

```
supplytrace/
├── .github/
│   └── workflows/                    # CI/CD pipelines
├── docs/                             # Architecture and project docs
├── smart-contracts/                  # Hardhat project
│   ├── contracts/
│   │   ├── SupplyTraceUpgradeable.sol     # Production contract (UUPS proxy)
│   │   └── SupplyTraceUpgradeableV2.sol   # Example V2 (upgrade demonstration)
│   ├── deploy/
│   │   └── 00_deploy_supplytrace.ts       # Deterministic hardhat-deploy script
│   ├── scripts/
│   │   ├── deploy.ts                      # Manual deploy helper
│   │   ├── upgrade.ts                     # Upgrade proxy to V2
│   │   ├── grant-roles.ts                 # Grant supply-chain roles to a wallet
│   │   ├── check-roles.ts                 # Check roles for an address
│   │   ├── transfer-admin-to-safe.ts      # Hand admin to a Gnosis Safe
│   │   └── export-frontend.ts             # Copy ABI + address to frontend
│   ├── test/
│   │   └── SupplyTrace.test.ts            # 63 tests across 8 describe blocks
│   ├── hardhat.config.ts
│   └── package.json
│
├── frontend/                         # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── assets/                        # Static assets (images, fonts, svgs)
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx              # Overview and role status
│   │   │   ├── MintBatch.tsx              # Mint form for manufacturers
│   │   │   ├── TransferBatch.tsx          # Transfer form with role routing
│   │   │   ├── ExploreBatches.tsx         # Browse all on-chain batches
│   │   │   ├── Verify.tsx                 # Public consumer verification page
│   │   │   └── AdminPanel.tsx             # Pause, recall, role management
│   │   ├── hooks/
│   │   │   ├── useBatches.ts              # Fetch all minted batches via logs
│   │   │   ├── useRole.ts                 # Resolve connected wallet's role
│   │   │   └── useSubgraphCustody.ts      # Query custody history from subgraph
│   │   ├── components/
│   │   │   ├── Layout.tsx                 # Sidebar navigation
│   │   │   ├── WalletButton.tsx           # Connect / disconnect wallet
│   │   │   ├── BatchStateBadge.tsx        # Coloured state pill
│   │   │   └── RoleBadge.tsx              # Role label chip
│   │   ├── utils/
│   │   │   └── ipfs.ts                    # Multi-gateway IPFS fetcher
│   │   ├── config/contracts.ts            # Contract address + ABI imports
│   │   ├── contracts/SupplyTrace.json     # Exported ABI (synced from artifacts)
│   │   └── main.tsx                       # Wagmi + React Query providers
│   └── package.json
│
├── subgraph/                         # The Graph subgraph
│   ├── schema.graphql                     # Batch, CustodyTransfer, Recall entities
│   ├── subgraph.yaml                      # Manifest — Sepolia, 3 event handlers
│   ├── src/mapping.ts                     # AssemblyScript event handlers
│   └── abis/SupplyTraceUpgradeable.json   # ABI used by the subgraph
│
├── SECURITY.md                       # Threat model and security notes
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Smart contract** | Solidity 0.8.22 · ERC-1155 · OpenZeppelin Upgradeable 5.4 (UUPS) |
| **Access control** | OZ AccessControl — ADMIN, MANUFACTURER, DISTRIBUTOR, RETAILER, INSPECTOR |
| **Security** | ReentrancyGuard · Pausable · Custom errors · Storage-gap layout |
| **Tooling** | Hardhat 2.22 · hardhat-deploy · hardhat-upgrades · TypeChain · hardhat-gas-reporter |
| **Frontend** | React 19 · Vite 7 · TypeScript · Tailwind CSS · shadcn/ui · framer-motion |
| **Web3 bindings** | wagmi v3 · viem v2 · @tanstack/react-query |
| **Theme** | Warm gold/navy palette · Light/Dark/System modes · `localStorage` persistence · zero-flicker |
| **Metadata storage** | IPFS via Pinata — multi-gateway fallback (Cloudflare → ipfs.io → dweb.link → Pinata) |
| **Indexing** | The Graph — AssemblyScript subgraph on Sepolia |
| **Governance** | Gnosis Safe multi-sig (admin handoff script included) |
| **Network** | Ethereum Sepolia testnet · localhost Hardhat node |

---

## ⛓️ Contract Architecture

### Role Hierarchy

```
DEFAULT_ADMIN_ROLE (Gnosis Safe)
       │
   ADMIN_ROLE ──────────── pause / unpause / recallBatch / grantRole
       │
MANUFACTURER_ROLE ───────── mintBatch → transferBatch (to DISTRIBUTOR)
       │
DISTRIBUTOR_ROLE  ───────── transferBatch (to RETAILER)
       │
RETAILER_ROLE     ───────── transferBatch (marks SOLD)
       │
INSPECTOR_ROLE    ───────── read-only auditing
```

### Lifecycle State Machine

```
mintBatch()
    │
  CREATED
    │  transferBatch() — MANUFACTURER → DISTRIBUTOR
  DISTRIBUTED
    │  transferBatch() — DISTRIBUTOR → RETAILER
  RETAIL
    │  transferBatch() — RETAILER (end customer)
  SOLD
    │  recallBatch() — ADMIN at any state
  CLOSED
```

### Storage Layout (slots 0 – 4 + `__gap[45]`)

| Slot | Variable | Type |
|---|---|---|
| 0 | `batches` | `mapping(uint256 => ProductBatch)` |
| 1 | `_legacyCustodyHistory` | `mapping(uint256 => CustodyRecord[])` *(deprecated, layout-frozen)* |
| 2 | `batchState` | `mapping(uint256 => BatchState)` |
| 3 | `_nextTokenId` | `uint256` |
| 4 | `_custodyCount` | `mapping(uint256 => uint256)` |

> OZ v5 upgradeable base contracts use ERC-7201 namespaced storage — they do **not** consume linear slots in child contracts.

### Key Functions

| Function | Caller | Description |
|---|---|---|
| `mintBatch(uri, qty)` | MANUFACTURER | Mint a new product batch as an ERC-1155 token |
| `transferBatch(id, to, qty)` | MANUFACTURER / DISTRIBUTOR / RETAILER | Move custody to next supply chain actor |
| `recallBatch(id)` | ADMIN | Deactivate batch; works even when paused |
| `verifyAuthenticity(id)` | Anyone | Returns manufacturer, metadataURI, active, state, custodyCount |
| `pause() / unpause()` | ADMIN | Enable / disable circuit breaker |

### Custom Errors

| Error | Trigger |
|---|---|
| `EmptyMetadataURI` | `mintBatch` called with empty URI |
| `ZeroQuantity` | `mintBatch` or `transferBatch` with `quantity == 0` |
| `ZeroAddress` | Transfer to `address(0)` |
| `BatchInactive` | Operation on a recalled batch |
| `AlreadyInactive` | Recalling an already-closed batch |
| `InvalidState` | Transfer does not match expected lifecycle state |
| `InvalidRole` | Recipient does not hold the required role for this transfer step |
| `InvalidToken` | Token ID has never been minted |
| `InsufficientBalance` | Sender does not hold enough tokens |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Git
- A browser wallet (MetaMask) funded with Sepolia ETH
- A Pinata account for IPFS uploads

### 1 — Clone the repository

```bash
git clone https://github.com/JaiivantArvind/SupplyTrace.git
cd SupplyTrace
```

### 2 — Install all dependencies (monorepo)

```bash
npm install
```

This installs dependencies for all three workspaces (`frontend`, `smart-contracts`, `subgraph`) in one step.

Create `smart-contracts/.env`:

```env
PRIVATE_KEY=0x<your_deployer_private_key>
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<your_infura_key>
ETHERSCAN_API_KEY=<your_etherscan_key>
```

### 3 — Compile and test

```bash
npx hardhat compile
npx hardhat test
```

Expected: **63 passing**

### 4 — Deploy locally

```bash
npx hardhat node
# In a second terminal:
npx hardhat deploy --network localhost --reset
npx hardhat run scripts/export-frontend.ts --network localhost
```

### 5 — Deploy to Sepolia

```bash
npx hardhat deploy --network sepolia --reset
npx hardhat run scripts/export-frontend.ts --network sepolia
```

### 6 — Grant supply-chain roles

```bash
# PowerShell
$env:GRANT_ADDRESS="0xYourWalletAddress"
npx hardhat run scripts/grant-roles.ts --network sepolia
```

This grants MANUFACTURER, DISTRIBUTOR, and RETAILER roles to the target wallet.

### 7 — Configure the frontend

Create `frontend/.env.local`:

```env
VITE_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/<your_infura_key>
VITE_SUBGRAPH_URL=   # leave empty until subgraph is deployed
```

### 8 — Start the frontend

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and connect your wallet.

---

## 🌐 Frontend Pages

| Page | Path | Description |
|---|---|---|
| **Dashboard** | `/` | Hero landing page (disconnected) · Role-based card grid (connected) |
| **Mint Batch** | `/mint` | Form to mint a new batch with IPFS URI and quantity |
| **Transfer Batch** | `/transfer` | Transfer custody to next role with token ID and recipient |
| **Explore Batches** | `/explore` | Browse all minted batches indexed from on-chain logs |
| **Verify** | `/verify/:tokenId` | Public consumer verification — metadata, state, custody count |
| **Admin Panel** | `/admin` | Pause/unpause contract, recall batches, grant/revoke roles |
| **Settings** | `/settings` | Switch Light / Dark / System theme · Disconnect wallet |

> **Consumer verification** is fully public — no wallet required. Share a link or QR code pointing to `/verify/<tokenId>`.

---

## 📦 IPFS Metadata Schema

Upload a JSON file to Pinata and pass the `ipfs://CID` as the `metadataURI` when minting.

```json
{
  "name": "Batch Name",
  "description": "Product description",
  "manufacturer": "Company Name",
  "manufactureDate": "YYYY-MM-DD",
  "location": "lat, lon",
  "certifications": [
    { "name": "ISO-9001", "hash": "0x..." }
  ],
  "image": "ipfs://<image-CID>"
}
```

---

## 📊 The Graph Subgraph

The subgraph indexes three events into three entities:

| Entity | Mutability | Source Event |
|---|---|---|
| `Batch` | mutable | `BatchMinted`, `BatchTransferred`, `BatchRecalled` |
| `CustodyTransfer` | immutable | `BatchTransferred` |
| `Recall` | immutable | `BatchRecalled` |

### Deploy the subgraph

```bash
cd subgraph

# Authenticate with Graph Studio
graph auth --studio <DEPLOY_KEY>

# Generate types and build
npm run codegen
npm run build

# Deploy
graph deploy --studio supplytrace
```

After deployment, set `VITE_SUBGRAPH_URL` in `frontend/.env.local` to the subgraph query URL. Full custody transfer history will then appear on the Verify page.

---

## 🔒 Security

### Contract hardening checklist

- [x] Custom errors (gas-cheaper than `require` strings)
- [x] `ReentrancyGuard` on `transferBatch`
- [x] `Pausable` circuit breaker — `mintBatch` and `transferBatch` blocked; `recallBatch` always live
- [x] `_beforeTokenTransfer` blocked during pause via `whenNotPaused`
- [x] UUPS `_authorizeUpgrade` restricted to `ADMIN_ROLE`
- [x] Storage gap of 45 slots reserved for future upgrades
- [x] `_disableInitializers()` in constructor prevents implementation contract initialisation
- [x] `__gap` consumed from bottom-up to avoid layout shift

See [`SECURITY.md`](SECURITY.md) for the full threat model.

### Upgrade path

```bash
# Deploy V2 implementation and upgrade the proxy
npx hardhat run scripts/upgrade.ts --network sepolia
```

### Multi-sig governance handoff

```bash
# Transfer DEFAULT_ADMIN_ROLE to a Gnosis Safe
$env:SAFE_ADDRESS="0xYourSafeAddress"
npx hardhat run scripts/transfer-admin-to-safe.ts --network sepolia
```

---

## 🧪 Tests

63 tests across 8 describe blocks covering:

- Role enforcement (mint, transfer, recall, pause)
- Full lifecycle state transitions
- Custom error revert conditions
- Reentrancy surface
- Pause/unpause behaviour
- Event emission (including `BatchTransferred` with timestamp)
- Upgrade safety invariants
- Gas profiling (mint ~195k, transfer ~101k, recall ~55k gas)

```bash
cd smart-contracts
npx hardhat test
# Optional: gas report
REPORT_GAS=true npx hardhat test
# Optional: coverage
npx hardhat coverage
```

---

## 🌍 Deployed Contracts (Sepolia)

| Contract | Address |
|---|---|
| **Proxy** (interact with this) | `0x2d6e1979c944DdfCBF34FE1f172DED5e600bEc60` |
| **Implementation** | `0x64641Ed583aB4aC7AAAa84213522f130F5e4FD64` |

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 📝 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ for transparent, tamper-evident supply chains</p>
