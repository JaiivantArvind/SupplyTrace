import type { Abi } from 'viem'
import deployment from '../contracts/SupplyTrace.json'

export const SUPPLYTRACE_ADDRESS = deployment.address as `0x${string}`
export const SUPPLYTRACE_ABI = deployment.abi as Abi
