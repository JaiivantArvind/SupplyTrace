import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { contractAddress } from '@/lib/contract'

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
  const publicClient = usePublicClient()

  useEffect(() => {
    if (!publicClient) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    publicClient
      .getLogs({
        address: contractAddress,
        event: BATCH_MINTED_EVENT,
        fromBlock: 0n,
        toBlock: 'latest',
      })
      .then((logs) => {
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
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to fetch batches')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [publicClient])

  return { batches, isLoading, error }
}
