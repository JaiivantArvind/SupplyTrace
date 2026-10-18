import type { Abi } from 'viem'
import deployment from '../contracts/SupplyTrace.json'

export const SEPOLIA_PROXY: `0x${string}` = '0x2d6e1979c944DdfCBF34FE1f172DED5e600bEc60'

export const isLocalDev: boolean =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

// Canonical contract address: uses local deployment when on localhost, Sepolia proxy in production
export const contractAddress: `0x${string}` =
  isLocalDev ? (deployment.address as `0x${string}`) : SEPOLIA_PROXY
export const contractAbi: Abi = deployment.abi as Abi

// Aliases for compatibility
export const SUPPLYTRACE_ADDRESS = contractAddress
export const SUPPLYTRACE_ABI = contractAbi

// Sepolia deployment block for event filtering (avoids querying block 0 on public RPCs)
export const DEPLOYMENT_BLOCK: bigint = 7800000n

export const defaultChainId: number = isLocalDev ? 31337 : 11155111
