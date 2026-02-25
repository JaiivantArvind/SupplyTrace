import { useState, useRef, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { decodeEventLog, keccak256, toBytes } from 'viem'
import QRCode from 'qrcode'
import { contractAddress, contractAbi } from '@/lib/contract'
import { useRole } from '@/hooks/useRole'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PackagePlus, Download, AlertCircle } from 'lucide-react'

// topic0 of BatchMinted(uint256 indexed tokenId, address indexed manufacturer, uint256 quantity)
const BATCH_MINTED_TOPIC = keccak256(toBytes('BatchMinted(uint256,address,uint256)'))

export default function MintBatch() {
  const { isManufacturer, isConnected } = useRole()

  const [metadataURI, setMetadataURI] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [mintedTokenId, setMintedTokenId] = useState<bigint | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)

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
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>You need MANUFACTURER_ROLE to mint batches.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PackagePlus className="w-6 h-6" />
          Mint Batch
        </h1>
        <p className="text-muted-foreground mt-1">Create a new product batch on-chain.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
          <CardDescription>Enter the IPFS metadata URI and quantity for this batch.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="uri">Metadata URI</Label>
            <Input
              id="uri"
              placeholder="ipfs://Qm..."
              value={metadataURI}
              onChange={(e) => setMetadataURI(e.target.value)}
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
            onClick={handleMint}
            disabled={isPending || isConfirming || !metadataURI || !quantity}
          >
            {isPending ? 'Confirm in MetaMask…' : isConfirming ? 'Confirming…' : 'Mint Batch'}
          </Button>
          {writeError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{writeError.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {isSuccess && mintedTokenId !== null && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Batch Minted ✓</CardTitle>
            <CardDescription className="text-green-700">
              Token #{mintedTokenId.toString()} created successfully.
            </CardDescription>
          </CardHeader>
          {qrDataUrl && (
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                QR code for consumer verification:
              </p>
              <img src={qrDataUrl} alt="QR Code" className="rounded border" />
              <canvas ref={canvasRef} className="hidden" />
              <Button variant="outline" onClick={handleDownload} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
