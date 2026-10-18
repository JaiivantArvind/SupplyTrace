import { createWalletClient, http, keccak256, toBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'
import { contractAddress, contractAbi, isLocalDev } from '@/config/contracts'

export type SupplyChainRole = 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'INSPECTOR'

export interface RoleApplication {
  id: string
  address: `0x${string}`
  organizationName: string
  registrationNumber: string
  contactEmail: string
  role: SupplyChainRole
  scopeDescription: string
  submittedAt: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedAt?: number
  txHash?: string
}

export const ROLE_HASHES: Record<SupplyChainRole, `0x${string}`> = {
  MANUFACTURER: keccak256(toBytes('MANUFACTURER_ROLE')),
  DISTRIBUTOR:  keccak256(toBytes('DISTRIBUTOR_ROLE')),
  RETAILER:     keccak256(toBytes('RETAILER_ROLE')),
  INSPECTOR:    keccak256(toBytes('INSPECTOR_ROLE')),
}

const STORAGE_KEY = 'supplytrace_role_applications'
const DEMO_PERSONA_KEY = 'supplytrace_demo_persona'

// Pre-seeded enterprise applications for realistic admin queue showcase
const INITIAL_APPLICATIONS: RoleApplication[] = [
  {
    id: 'app_seed_001',
    address: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    organizationName: 'PharmaCore Biologics AG',
    registrationNumber: 'EMA-GMP-2026-9481',
    contactEmail: 'compliance@pharmacore-bio.ch',
    role: 'MANUFACTURER',
    scopeDescription: 'Manufacturer of temperature-controlled monoclonal antibody batches.',
    submittedAt: Date.now() - 3600 * 1000 * 5,
    status: 'APPROVED',
  },
  {
    id: 'app_seed_002',
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    organizationName: 'GlobalCold Supply Logistics',
    registrationNumber: 'ISO-9001-TRANS-8120',
    contactEmail: 'operations@globalcold-logistics.com',
    role: 'DISTRIBUTOR',
    scopeDescription: 'Tier-1 international distribution hubs and pharmaceutical refrigerated freight.',
    submittedAt: Date.now() - 3600 * 1000 * 2,
    status: 'PENDING',
  },
]

export function getRoleApplications(): RoleApplication[] {
  if (typeof window === 'undefined') return INITIAL_APPLICATIONS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_APPLICATIONS))
      return INITIAL_APPLICATIONS
    }
    return JSON.parse(raw) as RoleApplication[]
  } catch (err) {
    console.error('Failed to parse role applications from localStorage:', err)
    return INITIAL_APPLICATIONS
  }
}

export function submitRoleApplication(
  data: Omit<RoleApplication, 'id' | 'submittedAt' | 'status'>
): RoleApplication {
  const current = getRoleApplications()
  const newApp: RoleApplication = {
    ...data,
    id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    submittedAt: Date.now(),
    status: 'PENDING',
  }
  const updated = [newApp, ...current]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  window.dispatchEvent(new CustomEvent('supplytrace:applications-updated', { detail: updated }))
  return newApp
}

export function updateApplicationStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  txHash?: string
): void {
  const current = getRoleApplications()
  const updated = current.map((app) =>
    app.id === id
      ? { ...app, status, reviewedAt: Date.now(), txHash: txHash || app.txHash }
      : app
  )
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  window.dispatchEvent(new CustomEvent('supplytrace:applications-updated', { detail: updated }))
}

export function getApplicationForAddress(address?: string): RoleApplication | undefined {
  if (!address) return undefined
  const current = getRoleApplications()
  return current.find(
    (app) => app.address.toLowerCase() === address.toLowerCase()
  )
}

// ── Demo Persona Management (Sandbox Mode) ───────────────────────────────────

export function getDemoPersona(): SupplyChainRole | null {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem(DEMO_PERSONA_KEY) as SupplyChainRole) || null
}

export function setDemoPersona(role: SupplyChainRole | null): void {
  if (typeof window === 'undefined') return
  if (role) {
    localStorage.setItem(DEMO_PERSONA_KEY, role)
  } else {
    localStorage.removeItem(DEMO_PERSONA_KEY)
  }
  window.dispatchEvent(new CustomEvent('supplytrace:demo-persona-updated', { detail: role }))
}

// ── Hardhat Local On-Chain Role Dispenser ─────────────────────────────────────
// Uses default Account #0 (Hardhat deployer & admin) to grant real on-chain roles locally

const LOCAL_ADMIN_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

export async function grantLocalOnChainRole(
  role: SupplyChainRole,
  targetAddress: `0x${string}`
): Promise<`0x${string}`> {
  if (!isLocalDev) {
    throw new Error('Local on-chain dispenser is only available on localhost development network.')
  }

  const roleHash = ROLE_HASHES[role]
  const account = privateKeyToAccount(LOCAL_ADMIN_PRIVATE_KEY)
  const client = createWalletClient({
    account,
    chain: hardhat,
    transport: http('/rpc'),
  })

  const hash = await client.writeContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'grantRole',
    args: [roleHash, targetAddress],
  })

  return hash
}
