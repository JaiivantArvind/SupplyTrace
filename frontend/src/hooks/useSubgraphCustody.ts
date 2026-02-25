import { useState, useEffect } from 'react'
import { request, gql } from 'graphql-request'

const SUBGRAPH_URL = import.meta.env.VITE_SUBGRAPH_URL as string | undefined

const CUSTODY_QUERY = gql`
  query CustodyHistory($tokenId: String!) {
    custodyTransfers(
      where: { tokenId: $tokenId }
      orderBy: blockNumber
      orderDirection: asc
      first: 100
    ) {
      id
      from
      to
      quantity
      timestamp
      blockNumber
      transactionHash
    }
  }
`

export type SubgraphTransfer = {
  id: string
  from: string
  to: string
  quantity: string
  timestamp: string
  blockNumber: string
  transactionHash: string
}

type QueryResult = { custodyTransfers: SubgraphTransfer[] }

export function useSubgraphCustody(tokenId: bigint | null) {
  const [data, setData] = useState<SubgraphTransfer[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const available = Boolean(SUBGRAPH_URL)

  useEffect(() => {
    if (!SUBGRAPH_URL || tokenId === null) {
      setData(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    request<QueryResult>(SUBGRAPH_URL, CUSTODY_QUERY, { tokenId: tokenId.toString() })
      .then((res) => {
        if (!cancelled) setData(res.custodyTransfers)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Subgraph query failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [tokenId])

  return { data, loading, error, available }
}
