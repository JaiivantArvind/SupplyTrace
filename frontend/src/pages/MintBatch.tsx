import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { decodeEventLog, keccak256, toBytes } from 'viem'
import QRCode from 'qrcode'
import { contractAddress, contractAbi } from '@/config/contracts'
import { useRole } from '@/hooks/useRole'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { PackagePlus, Download, AlertCircle, Building2, Sparkles } from 'lucide-react'
import { RoleOnboardingDialog } from '@/components/RoleOnboardingDialog'

// topic0 of BatchMinted(uint256 indexed tokenId, address indexed manufacturer, uint256 quantity)
const BATCH_MINTED_TOPIC = keccak256(toBytes('BatchMinted(uint256,address,uint256)'))

export default function MintBatch() {
  const { isManufacturer, isConnected, demoPersona, setDemoPersona } = useRole()

  const [metadataURI, setMetadataURI] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingTab, setOnboardingTab] = useState<'apply' | 'demo'>('apply')

  const { data: txHash, writeContract, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess, data: receipt } = useWaitForTransactionReceipt({ hash: txHash })

  // Find the BatchMinted log by topic0 and decode it properly
  useEffect(() => {
    if (!isSuccess || !receipt) return
    const batchMintedLog = receipt.logs.find(
      (log) => log.topics[0]?.toLowerCase() === BATCH_MINTED_TOPIC.toLowerCase()
    )
    if (!batchMintedLog) return
    try {
      const decoded = decodeEventLog({
        abi: contractAbi,
        eventName: 'BatchMinted',
        topics: batchMintedLog.topics,
        data: batchMintedLog.data,
      })
      const tokenId = (decoded.args as unknown as { tokenId: bigint }).tokenId
      setMintedTokenId(tokenId)
      const url = `${window.location.origin}/verify/${tokenId.toString()}`
      QRCode.toDataURL(url, { width: 256, margin: 2 })
        .then(setQrDataUrl)
        .catch(console.error)
    } catch (e) {
      console.error('Failed to decode BatchMinted log', e)
    }
  }, [isSuccess, receipt])

  const handleMint = () => {
    if (!metadataURI || !quantity) return
    writeContract({
      address: contractAddress,
      abi: contractAbi,
      functionName: 'mintBatch',
      args: [metadataURI, BigInt(quantity)],
    })
  }

  const handleDownload = () => {
    if (!qrDataUrl || !mintedTokenId) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `supplytrace-token-${mintedTokenId}.png`
    a.click()
  }

  if (!isConnected) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Connect your wallet to mint batches.</AlertDescription>
      </Alert>
    )
  }

  if (!isManufacturer) {
    return (
      <div className="max-w-lg space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Manufacturer Role Required</AlertTitle>
          <AlertDescription>
            On-chain batch tokenization is restricted to verified manufacturers holding <code className="font-mono">MANUFACTURER_ROLE</code>.
          </AlertDescription>
        </Alert>

        <Card className="border-primary/30 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Need Access to Minting?
            </CardTitle>
            <CardDescription className="text-xs">
              Apply for enterprise authorization or test the minting interface immediately using sandbox mode.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2.5">
            <Button
              size="sm"
              onClick={() => { setOnboardingTab('apply'); setOnboardingOpen(true); }}
              className="gap-1.5 text-xs"
            >
              <Building2 className="h-3.5 w-3.5" />
              Apply for Enterprise Role
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDemoPersona('MANUFACTURER')}
              className="gap-1.5 text-xs border-primary/40 hover:bg-primary/10"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Activate Demo Manufacturer Persona
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

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackagePlus className="w-6 h-6 text-primary" />
          Mint Batch
        </h1>
      </div>

      {demoPersona === 'MANUFACTURER' && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 shrink-0" />
            Sandbox Persona Active: <strong>Manufacturer</strong> (Testing Mode)
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

      <Card>
        <CardHeader>
          <CardTitle>New Batch Details</CardTitle>
          <CardDescription>
            Specify product metadata URI and initial token batch quantity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metadata-uri">Metadata URI</Label>
            <Input
              id="metadata-uri"
              placeholder="ipfs://bafy... or https://..."
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleMint}
            disabled={isPending || isConfirming || !metadataURI || !quantity}
          >
            {isPending ? 'Confirm in MetaMask…' : isConfirming ? 'Minting on-chain…' : 'Mint Batch'}
          </Button>

          {writeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{writeError.message}</AlertDescription>
            </Alert>
          )}

          {isSuccess && mintedTokenId !== null && (
            <div className="space-y-4 pt-2">
              <Alert className="border-green-200 bg-green-50 text-green-800">
                <AlertDescription>
                  Batch #{mintedTokenId.toString()} successfully minted!
                </AlertDescription>
              </Alert>

              {qrDataUrl && (
                <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-card">
                  <p className="text-sm font-medium">Consumer Verification QR Code</p>
                  <img src={qrDataUrl} alt="Batch QR Code" className="w-48 h-48 border rounded" />
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download QR Code PNG
                  </Button>
                </div>
              )}
            </div>
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
