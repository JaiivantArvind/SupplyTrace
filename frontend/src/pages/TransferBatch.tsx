import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { contractAddress, contractAbi } from '@/config/contracts'
import { useRole } from '@/hooks/useRole'
import { BatchStateBadge } from '@/components/BatchStateBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ArrowRightLeft, AlertCircle, Building2, Sparkles } from 'lucide-react'
import { RoleOnboardingDialog } from '@/components/RoleOnboardingDialog'

type VerifyResult = readonly [`0x${string}`, string, boolean, number, bigint]

const NEXT_STATE: Record<number, string> = {
  0: 'DISTRIBUTED (requires DISTRIBUTOR recipient)',
  1: 'RETAIL (requires RETAILER recipient)',
  2: 'SOLD',
}

export default function TransferBatch() {
  const { isManufacturer, isDistributor, isRetailer, isConnected, demoPersona, setDemoPersona } = useRole()
  const canTransfer = isManufacturer || isDistributor || isRetailer

  const [tokenId, setTokenId]     = useState('')
  const [recipient, setRecipient] = useState('')
  const [quantity, setQuantity]   = useState('1')

  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingTab, setOnboardingTab] = useState<'apply' | 'demo'>('apply')

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
      <div className="max-w-lg space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Supply Chain Role Required</AlertTitle>
          <AlertDescription>
            Custody transitions require an authorized role (<code className="font-mono">MANUFACTURER_ROLE</code>, <code className="font-mono">DISTRIBUTOR_ROLE</code>, or <code className="font-mono">RETAILER_ROLE</code>).
          </AlertDescription>
        </Alert>

        <Card className="border-primary/30 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Need Access to Custody Transfers?
            </CardTitle>
            <CardDescription className="text-xs">
              Submit your organization credentials for review or test the transfer workflow using sandbox mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2.5">
            <Button
              size="sm"
              onClick={() => { setOnboardingTab('apply'); setOnboardingOpen(true); }}
              className="gap-1.5 text-xs"
            >
              <Building2 className="h-3.5 w-3.5" />
              Apply for Role
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDemoPersona('DISTRIBUTOR')}
              className="gap-1.5 text-xs border-primary/40 hover:bg-primary/10"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Activate Demo Distributor Persona
            </Button>
          </CardContent>
        </Card>

        <RoleOnboardingDialog
          open={onboardingOpen}
          onOpenChange={setOnboardingOpen}
          initialTab={onboardingTab}
        />
      </div>
    )
  }

  const batch = batchData as VerifyResult | undefined
  const currentState = batch ? Number(batch[3]) : undefined

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-primary" />
          Transfer Batch
        </h1>
        <p className="text-muted-foreground mt-1">Transfer custody to the next supply chain actor.</p>
      </div>

      {demoPersona && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 shrink-0" />
            Sandbox Persona Active: <strong>{demoPersona}</strong> (Testing Mode)
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDemoPersona(null)}
            className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
          >
            Reset to Guest
          </Button>
        </div>
      )}

      {batch && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Current state:</span>
              <BatchStateBadge state={currentState ?? 0} />
            </div>
            {currentState !== undefined && (
              <p className="text-xs text-muted-foreground">
                Next transition: {NEXT_STATE[currentState] ?? 'Terminal state'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Transfer Details</CardTitle>
          <CardDescription>Enter token ID, recipient address, and transfer amount.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token-id">Token ID</Label>
            <Input
              id="token-id"
              type="number"
              min="1"
              placeholder="e.g. 1"
              value={tokenId}
              onChange={(e) => setTokenId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Address</Label>
            <Input
              id="recipient"
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
            {isPending ? 'Confirm in MetaMask…' : isConfirming ? 'Confirming on-chain…' : 'Transfer Batch'}
          </Button>

          {writeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{writeError.message}</AlertDescription>
            </Alert>
          )}

          {isSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <AlertDescription>Custody transfer confirmed on-chain.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <RoleOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        initialTab={onboardingTab}
      />
    </div>
  )
}
