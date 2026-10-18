import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { contractAddress, DEPLOYMENT_BLOCK, isLocalDev } from '@/config/contracts'

export type BatchEvent = {
  tokenId: bigint
  manufacturer: `0x${string}`
  quantity: bigint
  blockNumber: bigint
}

const BATCH_MINTED_EVENT = parseAbiItem(
  'event BatchMinted(uint256 indexed tokenId, address indexed manufacturer, uint256 quantity)'
)

export function useBatches() {
  const [batches, setBatches] = useState<BatchEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const publicClient = usePublicClient({ chainId: isLocalDev ? 31337 : undefined })

  useEffect(() => {
    if (!publicClient) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    const fetchLogs = async () => {
      try {
        let fromBlock = 0n
        if (publicClient.chain?.id === 11155111) {
          try {
            const currentBlock = await publicClient.getBlockNumber()
            const maxRange = 990n
            fromBlock = currentBlock > maxRange ? currentBlock - maxRange : DEPLOYMENT_BLOCK
          } catch {
            fromBlock = DEPLOYMENT_BLOCK
          }
        }

        const logs = await publicClient.getLogs({
          address: contractAddress,
          event: BATCH_MINTED_EVENT,
          fromBlock,
          toBlock: 'latest',
        })

        if (cancelled) return
        const events: BatchEvent[] = logs
          .filter((log) => log.args.tokenId !== undefined)
          .map((log) => ({
            tokenId:      log.args.tokenId!,
            manufacturer: log.args.manufacturer!,
            quantity:     log.args.quantity!,
            blockNumber:  log.blockNumber ?? 0n,
          }))
        setBatches(events)
      } catch (err: unknown) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch batches')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchLogs()
    return () => { cancelled = true }
  }, [publicClient])

  return { batches, isLoading, error }
}
