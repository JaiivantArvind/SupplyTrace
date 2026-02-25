import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { contractAddress, contractAbi } from '@/lib/contract'
import { useRole } from '@/hooks/useRole'
import { BatchStateBadge } from '@/components/BatchStateBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowRightLeft, AlertCircle } from 'lucide-react'

type VerifyResult = readonly [`0x${string}`, string, boolean, number, bigint]

const NEXT_STATE: Record<number, string> = {
  0: 'DISTRIBUTED (requires DISTRIBUTOR recipient)',
  1: 'RETAIL (requires RETAILER recipient)',
  2: 'SOLD',
}

export default function TransferBatch() {
  const { isManufacturer, isDistributor, isRetailer, isConnected } = useRole()
  const canTransfer = isManufacturer || isDistributor || isRetailer

  const [tokenId, setTokenId]     = useState('')
  const [recipient, setRecipient] = useState('')
  const [quantity, setQuantity]   = useState('1')

  const tokenIdBigInt = tokenId ? BigInt(tokenId) : undefined

  const { data: batchData } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'verifyAuthenticity',
    args: tokenIdBigInt !== undefined ? [tokenIdBigInt] : undefined,
    query: { enabled: tokenIdBigInt !== undefined },
  })

  const { data: txHash, writeContract, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  const handleTransfer = () => {
    if (!tokenIdBigInt || !recipient || !quantity) return
    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'transferBatch',
      args: [tokenIdBigInt, recipient as `0x${string}`, BigInt(quantity)],
    })
  }

  if (!isConnected) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Connect your wallet to transfer batches.</AlertDescription>
      </Alert>
    )
  }

  if (!canTransfer) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You need MANUFACTURER_ROLE, DISTRIBUTOR_ROLE, or RETAILER_ROLE to transfer batches.
        </AlertDescription>
      </Alert>
    )
  }

  const batch = batchData as VerifyResult | undefined
  const currentState = batch ? Number(batch[3]) : undefined

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6" />
          Transfer Batch
        </h1>
        <p className="text-muted-foreground mt-1">Transfer custody to the next supply chain actor.</p>
      </div>

      {batch && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current state:</span>
              <BatchStateBadge state={currentState ?? 0} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Active:</span>
              <span>{batch[2] ? 'Yes' : 'No'}</span>
            </div>
            {currentState !== undefined && NEXT_STATE[currentState] && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">After transfer:</span>
                <span className="font-medium">{NEXT_STATE[currentState]}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>Specify the batch, recipient, and quantity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tid">Token ID</Label>
            <Input
              id="tid"
              type="number"
              min="1"
              placeholder="1"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="to">Recipient Address</Label>
            <Input
              id="to"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qty">Quantity</Label>
            <Input
              id="qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleTransfer}
            disabled={isPending || isConfirming || !tokenId || !recipient || !quantity}
          >
            {isPending ? 'Confirm in MetaMask…' : isConfirming ? 'Confirming…' : 'Transfer Batch'}
          </Button>

          {writeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{writeError.message}</AlertDescription>
            </Alert>
          )}
          {isSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>Transfer confirmed successfully.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
