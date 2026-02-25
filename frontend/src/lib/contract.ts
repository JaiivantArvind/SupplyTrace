import type { Abi } from 'viem'
import deployment from '../contracts/SupplyTrace.json'

export const contractAddress: `0x${string}` = deployment.address as `0x${string}`
export const contractAbi: Abi = deployment.abi as Abi
