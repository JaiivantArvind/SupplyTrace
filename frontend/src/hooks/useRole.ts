import { useState, useEffect } from 'react'
import { useReadContract, useAccount } from 'wagmi'
import { keccak256, toBytes } from 'viem'
import { contractAddress, contractAbi, isLocalDev } from '@/config/contracts'
import { getDemoPersona, setDemoPersona, type SupplyChainRole } from '@/lib/roleApplications'

export const ROLES = {
  MANUFACTURER: keccak256(toBytes('MANUFACTURER_ROLE')) as `0x${string}`,
  DISTRIBUTOR:  keccak256(toBytes('DISTRIBUTOR_ROLE'))  as `0x${string}`,
  RETAILER:     keccak256(toBytes('RETAILER_ROLE'))     as `0x${string}`,
  ADMIN:        keccak256(toBytes('ADMIN_ROLE'))        as `0x${string}`,
  INSPECTOR:    keccak256(toBytes('INSPECTOR_ROLE'))    as `0x${string}`,
} as const

export type RoleKey = keyof typeof ROLES

function useHasRole(role: `0x${string}`) {
  const { address } = useAccount()
  const { data, isLoading } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'hasRole',
    args: address ? [role, address] : undefined,
    chainId: isLocalDev ? 31337 : undefined,
    query: { enabled: !!address },
  })
  return { has: data === true, isLoading }
}

export function useRole() {
  const { address, isConnected } = useAccount()

  const [demoPersona, setDemoPersonaState] = useState<SupplyChainRole | null>(() => getDemoPersona())

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<SupplyChainRole | null>
      setDemoPersonaState(customEvent.detail)
    }
    window.addEventListener('supplytrace:demo-persona-updated', handleUpdate)
    return () => window.removeEventListener('supplytrace:demo-persona-updated', handleUpdate)
  }, [])

  const mfr      = useHasRole(ROLES.MANUFACTURER)
  const dist     = useHasRole(ROLES.DISTRIBUTOR)
  const retail   = useHasRole(ROLES.RETAILER)
  const admin    = useHasRole(ROLES.ADMIN)
  const inspector = useHasRole(ROLES.INSPECTOR)

  const hasOnChainRole = mfr.has || dist.has || retail.has || admin.has || inspector.has
  const hasAnyRole = hasOnChainRole || !!demoPersona

  return {
    isConnected,
    address,
    isManufacturer: mfr.has || demoPersona === 'MANUFACTURER',
    isDistributor:  dist.has || demoPersona === 'DISTRIBUTOR',
    isRetailer:     retail.has || demoPersona === 'RETAILER',
    isAdmin:        admin.has,
    isInspector:    inspector.has || demoPersona === 'INSPECTOR',
    hasOnChainRole,
    hasAnyRole,
    demoPersona,
    setDemoPersona,
    isLoading: mfr.isLoading || dist.isLoading || retail.isLoading || admin.isLoading || inspector.isLoading,
    ROLES,
  }
}
