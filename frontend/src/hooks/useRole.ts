import { useReadContract, useAccount } from 'wagmi'
import { keccak256, toBytes } from 'viem'
import { contractAddress, contractAbi } from '@/lib/contract'

const ROLES = {
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
    query: { enabled: !!address },
  })
  return { has: data === true, isLoading }
}

export function useRole() {
  const { address, isConnected } = useAccount()

  const mfr      = useHasRole(ROLES.MANUFACTURER)
  const dist     = useHasRole(ROLES.DISTRIBUTOR)
  const retail   = useHasRole(ROLES.RETAILER)
  const admin    = useHasRole(ROLES.ADMIN)
  const inspector = useHasRole(ROLES.INSPECTOR)

  return {
    isConnected,
    address,
    isManufacturer: mfr.has,
    isDistributor:  dist.has,
    isRetailer:     retail.has,
    isAdmin:        admin.has,
    isInspector:    inspector.has,
    isLoading: mfr.isLoading || dist.isLoading || retail.isLoading || admin.isLoading || inspector.isLoading,
    ROLES,
  }
}
