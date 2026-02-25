import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useReadContract } from 'wagmi'
import { Html5Qrcode } from 'html5-qrcode'
import { contractAddress, contractAbi } from '@/lib/contract'
import { fetchIPFSMetadata, resolveIPFS, type BatchMetadata } from '@/utils/ipfs'
import { BatchStateBadge } from '@/components/BatchStateBadge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, AlertCircle, MapPin, Award, Package, QrCode, X, Zap } from 'lucide-react'
import { useSubgraphCustody, type SubgraphTransfer } from '@/hooks/useSubgraphCustody'

type VerifyResult = readonly [`0x${string}`, string, boolean, number, bigint]

function SubgraphCustodyList({ transfers }: { transfers: SubgraphTransfer[] }) {
  if (transfers.length === 0) return <p className="text-muted-foreground text-sm">No transfers yet.</p>
  return (
    <ol className="space-y-3">
      {transfers.map((t, i) => (
        <li key={t.id} className="flex items-start gap-3 text-sm">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
            {i + 1}
          </span>
          <div className="space-y-0.5">
            <p><span className="text-muted-foreground">From: </span><span className="font-mono">{t.from.slice(0,8)}…{t.from.slice(-6)}</span></p>
            <p><span className="text-muted-foreground">To: </span><span className="font-mono">{t.to.slice(0,8)}…{t.to.slice(-6)}</span></p>
            <p className="text-muted-foreground">{new Date(Number(t.timestamp) * 1000).toLocaleString()}</p>
            <p className="text-muted-foreground text-xs font-mono truncate">tx: {t.transactionHash.slice(0,14)}…</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

function QrScanner({ onScan }: { onScan: (tokenId: string) => void }) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerId = 'qr-scanner-container'

  const start = async () => {
    setError(null)
    setActive(true)
    const scanner = new Html5Qrcode(containerId)
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // Extract tokenId from URL like /verify/3 or plain "3"
          const match = /\/verify\/(\d+)/.exec(decodedText) ?? /^(\d+)$/.exec(decodedText)
          if (match?.[1]) {
            onScan(match[1])
            stop()
          }
        },
        undefined
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera access denied')
      setActive(false)
    }
  }

  const stop = () => {
    scannerRef.current?.stop().catch(() => undefined)
    scannerRef.current = null
    setActive(false)
  }

  useEffect(() => () => { stop() }, [])

  return (
    <div className="space-y-2">
      {!active ? (
        <Button variant="outline" size="sm" onClick={start}>
          <QrCode className="w-4 h-4 mr-2" />
          Scan QR Code
        </Button>
      ) : (
        <div className="space-y-2">
          <div id={containerId} className="w-full rounded overflow-hidden border" />
          <Button variant="ghost" size="sm" onClick={stop}>
            <X className="w-4 h-4 mr-1" /> Stop Scanner
          </Button>
        </div>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  )
}

function Verify() {
  const { tokenId: paramTokenId } = useParams<{ tokenId: string }>()
  const navigate = useNavigate()

  const [inputId, setInputId] = useState(paramTokenId ?? '')
  const activeId = inputId || paramTokenId

  const [metadata, setMetadata] = useState<BatchMetadata | null>(null)
  const [metaLoading, setMetaLoading] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)

  let tokenIdBigInt: bigint | null = null
  try {
    if (activeId !== undefined && activeId !== '') {
      tokenIdBigInt = BigInt(activeId)
    }
  } catch {
    tokenIdBigInt = null
  }

  const { data, isLoading, isError, error } = useReadContract({
    address: contractAddress,
    abi: contractAbi,
    functionName: 'verifyAuthenticity',
    args: tokenIdBigInt !== null ? [tokenIdBigInt] : undefined,
    query: { enabled: tokenIdBigInt !== null },
  })

  // Subgraph query — primary source when configured
  const { data: sgData, loading: sgLoading, error: sgError, available: sgAvailable } = useSubgraphCustody(tokenIdBigInt)

  const metadataURI = data ? (data as VerifyResult)[1] : ''

  useEffect(() => {
    if (!metadataURI) return
    setMetadata(null)
    setMetaError(null)
    setMetaLoading(true)
    fetchIPFSMetadata<BatchMetadata>(metadataURI)
      .then(setMetadata)
      .catch((err: unknown) => {
        setMetaError(err instanceof Error ? err.message : 'Failed to load metadata')
      })
      .finally(() => setMetaLoading(false))
  }, [metadataURI])

  if (tokenIdBigInt === null && !activeId) {
    // No token ID yet — show lookup UI
    return (
      <div className="max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Verify Batch
          </h1>
          <p className="text-muted-foreground mt-1">Enter a token ID or scan a QR code.</p>
        </div>
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Token ID (e.g. 1)"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && inputId) navigate(`/verify/${inputId}`) }}
              />
              <Button onClick={() => { if (inputId) navigate(`/verify/${inputId}`) }}>
                Verify
              </Button>
            </div>
            <QrScanner onScan={(id) => navigate(`/verify/${id}`)} />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenIdBigInt === null) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Invalid token ID.</AlertDescription>
      </Alert>
    )
  }

  const batch = data as VerifyResult | undefined
  const isRecalled = batch && !batch[2]

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Token #{activeId}
          </h1>
          <p className="text-muted-foreground mt-1">On-chain provenance verification</p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            className="w-24 text-sm"
            placeholder="Token ID"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && inputId) navigate(`/verify/${inputId}`) }}
          />
          <Button size="sm" variant="outline" onClick={() => { if (inputId) navigate(`/verify/${inputId}`) }}>Go</Button>
        </div>
      </div>

      {isRecalled && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>This batch has been recalled and is no longer active.</AlertDescription>
        </Alert>
      )}

      {/* Authenticity */}
      <Card>
        <CardHeader>
          <CardTitle>Authenticity</CardTitle>
          <CardDescription>Data read directly from the Ethereum blockchain.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span>Reading chain…</span></div>}
          {isError && <p className="text-destructive text-sm">{error?.message}</p>}
          {batch && (
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Manufacturer</dt>
                <dd className="font-mono">{batch[0].slice(0, 10)}…{batch[0].slice(-8)}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">State</dt>
                <dd><BatchStateBadge state={Number(batch[3])} /></dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-muted-foreground">Active</dt>
                <dd>
                  <Badge variant={batch[2] ? 'secondary' : 'destructive'}>
                    {batch[2] ? 'Active' : 'Recalled'}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Custody transfers</dt>
                <dd>{batch[4].toString()}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {/* IPFS Metadata */}
      <Card>
        <CardHeader>
          <CardTitle>Product Metadata</CardTitle>
          <CardDescription>Retrieved from IPFS via {metadataURI || '—'}</CardDescription>
        </CardHeader>
        <CardContent>
          {!metadataURI && <p className="text-muted-foreground text-sm">No metadata URI on this batch.</p>}
          {metaLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span>Fetching from IPFS…</span></div>}
          {metaError && <p className="text-destructive text-sm">{metaError}</p>}
          {metadata && (
            <div className="space-y-4">
              <div className="flex gap-4">
                {metadata.image && (
                  <img
                    src={resolveIPFS(metadata.image)}
                    alt={metadata.name}
                    className="w-24 h-24 rounded object-cover border flex-shrink-0"
                  />
                )}
                <div className="space-y-1">
                  <h3 className="font-semibold text-base">{metadata.name}</h3>
                  <p className="text-sm text-muted-foreground">{metadata.description}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Manufacturer</dt>
                  <dd className="font-medium">{metadata.manufacturer}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Manufacture Date</dt>
                  <dd className="font-medium">{metadata.manufacture_date}</dd>
                </div>
              </dl>
              {metadata.origin_coordinates && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{metadata.origin_coordinates.lat}, {metadata.origin_coordinates.lng}</span>
                </div>
              )}
              {metadata.certifications.length > 0 && (
                <div>
                  <p className="text-sm font-medium flex items-center gap-1 mb-2">
                    <Award className="w-4 h-4" /> Certifications
                  </p>
                  <ul className="space-y-1">
                    {metadata.certifications.map((cert, i) => (
                      <li key={i} className="text-sm flex justify-between bg-muted/50 rounded px-2 py-1">
                        <span className="font-medium">{cert.type}</span>
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">{cert.document_hash}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custody History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Custody History
            {sgAvailable && <Badge variant="secondary" className="text-xs gap-1"><Zap className="w-3 h-3" />Indexed</Badge>}
          </CardTitle>
          <CardDescription>
            {sgAvailable ? 'Sourced from The Graph subgraph.' : 'Transfer count shown above. Full history available once subgraph is deployed.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sgAvailable ? (
            <>
              {sgLoading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span>Querying subgraph…</span></div>}
              {sgError && <p className="text-destructive text-sm">Subgraph error: {sgError}</p>}
              {!sgLoading && !sgError && sgData && <SubgraphCustodyList transfers={sgData} />}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Custody transfer count is tracked on-chain (see "Custody transfers" above).
              Deploy the subgraph and set <code className="bg-muted px-1 rounded text-xs">VITE_SUBGRAPH_URL</code> in{' '}
              <code className="bg-muted px-1 rounded text-xs">frontend/.env.local</code> to view full transfer history here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Verify
