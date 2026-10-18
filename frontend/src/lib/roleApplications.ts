import { createWalletClient, http, keccak256, toBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'
import { contractAddress, contractAbi, isLocalDev } from '@/config/contracts'
import {
  getDbRoleApplications,
  insertDbRoleApplication,
  updateDbRoleApplicationStatus,
  upsertDbOrganization,
  supabase,
  type DbRoleApplication,
} from '@/lib/supabase'

export type SupplyChainRole = 'MANUFACTURER' | 'DISTRIBUTOR' | 'RETAILER' | 'INSPECTOR' | 'ADMIN'

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
  ADMIN:        keccak256(toBytes('ADMIN_ROLE')),
}

const STORAGE_KEY = 'supplytrace_role_applications'
const DEMO_PERSONA_KEY = 'supplytrace_demo_persona'

function mapDbToApp(row: DbRoleApplication): RoleApplication {
  return {
    id: row.id,
    address: row.wallet_address as `0x${string}`,
    organizationName: row.organization_name,
    registrationNumber: row.registration_number,
    contactEmail: row.contact_email,
    role: row.requested_role,
    scopeDescription: row.scope_description || '',
    submittedAt: new Date(row.created_at).getTime(),
    status: row.status,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).getTime() : undefined,
    txHash: row.tx_hash || undefined,
  }
}

// ── Initial Local State & Background Supabase Sync ──────────────────────────

export function getRoleApplications(): RoleApplication[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as RoleApplication[]
    }
  } catch (err) {
    console.error('Failed to parse cached role applications:', err)
  }
  return []
}

// Asynchronously sync from Supabase and fire update event
export async function syncApplicationsFromSupabase(): Promise<RoleApplication[]> {
  const dbRows = await getDbRoleApplications()
  if (dbRows && dbRows.length > 0) {
    const mapped = dbRows.map(mapDbToApp)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped))
      window.dispatchEvent(new CustomEvent('supplytrace:applications-updated', { detail: mapped }))
    }
    return mapped
  }
  return getRoleApplications()
}

// Initialize Supabase sync and Realtime listener on client load
if (typeof window !== 'undefined') {
  syncApplicationsFromSupabase().catch(console.warn)

  // Realtime subscription: auto-sync whenever another user inserts/updates an application
  supabase
    .channel('supplytrace_applications_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'supplytrace_role_applications' },
      () => {
        syncApplicationsFromSupabase().catch(console.warn)
      }
    )
    .subscribe()
}

export function submitRoleApplication(
  data: Omit<RoleApplication, 'id' | 'submittedAt' | 'status'>
): RoleApplication {
  const current = getRoleApplications()
  const localId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const newApp: RoleApplication = {
    ...data,
    id: localId,
    submittedAt: Date.now(),
    status: 'PENDING',
  }
  const updated = [newApp, ...current]
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('supplytrace:applications-updated', { detail: updated }))
  }

  // Push to Supabase in background
  insertDbRoleApplication({
    wallet_address: data.address,
    organization_name: data.organizationName,
    registration_number: data.registrationNumber,
    contact_email: data.contactEmail,
    requested_role: data.role,
    scope_description: data.scopeDescription,
  }).then((saved) => {
    if (saved) {
      syncApplicationsFromSupabase().catch(console.warn)
    }
  }).catch(console.warn)

  return newApp
}

export function updateApplicationStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  txHash?: string,
  reviewerAddress?: string
): void {
  const current = getRoleApplications()
  let targetApp: RoleApplication | undefined

  const updated = current.map((app) => {
    if (app.id === id) {
      targetApp = { ...app, status, reviewedAt: Date.now(), txHash: txHash || app.txHash }
      return targetApp
    }
    return app
  })

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new CustomEvent('supplytrace:applications-updated', { detail: updated }))
  }

  // Update in Supabase in background
  updateDbRoleApplicationStatus(id, status, txHash, reviewerAddress).catch(console.warn)

  // If approved, also register organization in verified organizations table
  if (status === 'APPROVED' && targetApp) {
    upsertDbOrganization({
      wallet_address: targetApp.address,
      organization_name: targetApp.organizationName,
      registration_number: targetApp.registrationNumber,
      role: targetApp.role,
      contact_email: targetApp.contactEmail,
    }).catch(console.warn)
  }
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
