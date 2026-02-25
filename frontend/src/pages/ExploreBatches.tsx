import { Link } from 'react-router-dom'
import { useBatches } from '@/hooks/useBatches'
import { useReadContract } from 'wagmi'
import { contractAddress, contractAbi } from '@/lib/contract'
import { BatchStateBadge } from '@/components/BatchStateBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search } from 'lucide-react'

type VerifyResult = readonly [`0x${string}`, string, boolean, number, bigint]

function BatchRow({ tokenId }: { tokenId: bigint }) {
  const { data } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'verifyAuthenticity',
    args: [tokenId],
  })
  const batch = data as VerifyResult | undefined
  return (
    <TableCell>
      {batch ? (
        <div className="flex items-center gap-2">
          <BatchStateBadge state={Number(batch[3])} />
          {!batch[2] && <Badge variant="destructive" className="text-xs">Recalled</Badge>}
        </div>
      ) : (
        <span className="text-muted-foreground text-xs">Loading…</span>
      )}
    </TableCell>
  )
}

export default function ExploreBatches() {
  const { batches, isLoading, error } = useBatches()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6" />
          Explore Batches
        </h1>
        <p className="text-muted-foreground mt-1">All product batches minted on-chain.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Batches ({batches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Fetching on-chain events…</span>
            </div>
          )}
          {error && (
            <p className="text-destructive text-sm py-4">{error}</p>
          )}
          {!isLoading && batches.length === 0 && (
            <p className="text-muted-foreground text-sm py-4 text-center">No batches minted yet.</p>
          )}
          {batches.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token ID</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((b) => (
                  <TableRow key={b.tokenId.toString()}>
                    <TableCell className="font-mono font-medium">#{b.tokenId.toString()}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {b.manufacturer.slice(0, 8)}…{b.manufacturer.slice(-6)}
                    </TableCell>
                    <TableCell>{b.quantity.toString()}</TableCell>
                    <BatchRow tokenId={b.tokenId} />
                    <TableCell className="text-muted-foreground text-xs">{b.blockNumber.toString()}</TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/verify/${b.tokenId.toString()}`}>Verify</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
