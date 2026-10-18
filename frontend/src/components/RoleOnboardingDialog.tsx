import React, { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRole } from '@/hooks/useRole'
import {
  submitRoleApplication,
  getApplicationForAddress,
  grantLocalOnChainRole,
  type SupplyChainRole,
  type RoleApplication,
} from '@/lib/roleApplications'
import { isLocalDev } from '@/config/contracts'
import {
  Building2,
  FlaskConical,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  PackagePlus,
  ArrowRightLeft,
  Store,
} from 'lucide-react'

interface RoleOnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: 'apply' | 'demo'
}

export function RoleOnboardingDialog({
  open,
  onOpenChange,
  initialTab = 'apply',
}: RoleOnboardingDialogProps) {
  const { address, isConnected } = useAccount()
  const { isManufacturer, isDistributor, isRetailer, demoPersona, setDemoPersona } = useRole()

  const [activeTab, setActiveTab] = useState<'apply' | 'demo'>(initialTab)

  // Enterprise Application Form State
  const [orgName, setOrgName] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<SupplyChainRole>('MANUFACTURER')
  const [scope, setScope] = useState('')
  const [submittedApp, setSubmittedApp] = useState<RoleApplication | undefined>()

  // Local On-Chain Dispenser State
  const [localDispensing, setLocalDispensing] = useState(false)
  const [localTxHash, setLocalTxHash] = useState<string | null>(null)
  const [dispenseError, setDispenseError] = useState<string | null>(null)

  useEffect(() => {
    if (address) {
      setSubmittedApp(getApplicationForAddress(address))
    }
  }, [address, open])

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab, open])

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault()
    if (!address || !orgName || !regNumber || !email) return

    const newApp = submitRoleApplication({
      address: address as `0x${string}`,
      organizationName: orgName,
      registrationNumber: regNumber,
      contactEmail: email,
      role,
      scopeDescription: scope || 'Enterprise participant requesting access to SupplyTrace.',
    })

    setSubmittedApp(newApp)
  }

  const handleClaimLocalRole = async (targetRole: SupplyChainRole) => {
    if (!address) return
    setLocalDispensing(true)
    setDispenseError(null)
    setLocalTxHash(null)

    try {
      const hash = await grantLocalOnChainRole(targetRole, address as `0x${string}`)
      setLocalTxHash(hash)
      // Also sync demo persona for instant UI responsiveness
      setDemoPersona(targetRole)
    } catch (err: unknown) {
      console.error('Local role dispenser error:', err)
      const message = err instanceof Error ? err.message : 'Failed to dispense local role.'
      setDispenseError(message)
    } finally {
      setLocalDispensing(false)
    }
  }

  const handleSelectDemoPersona = (targetRole: SupplyChainRole | null) => {
    setDemoPersona(targetRole)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">SupplyTrace Identity & Access Gateway</DialogTitle>
          </div>
          <DialogDescription>
            Authenticate your organization or test supply chain capabilities with demo personas.
          </DialogDescription>
        </DialogHeader>

        {/* ── Mode Toggle Tabs ── */}
        <div className="flex border-b border-border gap-4 mt-2">
          <button
            type="button"
            onClick={() => setActiveTab('apply')}
            className={`pb-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'apply'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Enterprise Onboarding Application
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('demo')}
            className={`pb-2.5 text-sm font-medium border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'demo'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            Instant Demo Sandbox
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              For Evaluators
            </Badge>
          </button>
        </div>

        {/* ── Content Area ── */}
        <div className="py-2">
          {activeTab === 'apply' && (
            <div className="space-y-4">
              {!isConnected ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Wallet Connection Required</AlertTitle>
                  <AlertDescription>
                    Please connect your Ethereum wallet first to bind your organization to a cryptographic address.
                  </AlertDescription>
                </Alert>
              ) : submittedApp ? (
                <div className="space-y-4 rounded-lg border border-border p-4 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground text-base">
                        {submittedApp.organizationName}
                      </h4>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {submittedApp.address}
                      </p>
                    </div>
                    <Badge
                      variant={
                        submittedApp.status === 'APPROVED'
                          ? 'default'
                          : submittedApp.status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="capitalize"
                    >
                      {submittedApp.status === 'PENDING' && <Clock className="h-3 w-3 mr-1 inline animate-pulse" />}
                      {submittedApp.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3 mr-1 inline" />}
                      {submittedApp.status.toLowerCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Requested Role:</span>
                      <p className="font-medium text-foreground">{submittedApp.role}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Registration ID:</span>
                      <p className="font-medium text-foreground">{submittedApp.registrationNumber}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Contact Email:</span>
                      <p className="font-medium text-foreground">{submittedApp.contactEmail}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <p className="font-medium text-foreground">
                        {new Date(submittedApp.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {submittedApp.status === 'PENDING' && (
                    <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-500">
                      <Clock className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Your application is currently pending review in the SupplyTrace Governance queue. An administrator will review your credentials and call <code className="font-mono">grantRole()</code> on-chain.
                      </AlertDescription>
                    </Alert>
                  )}

                  {submittedApp.status === 'APPROVED' && (
                    <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Congratulations! Your organization has been approved and granted cryptographic authorization on-chain.
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="pt-2 flex justify-between items-center text-xs text-muted-foreground">
                    <span>Application ID: <code className="font-mono">{submittedApp.id}</code></span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSubmittedApp(undefined)}
                      className="text-xs h-7"
                    >
                      Submit Different Application
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleApply} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="orgName">Organization Name *</Label>
                      <Input
                        id="orgName"
                        placeholder="e.g. Apex BioPharma Inc."
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="regNumber">Business / License Number *</Label>
                      <Input
                        id="regNumber"
                        placeholder="e.g. FDA-REG-2026-9041"
                        value={regNumber}
                        onChange={(e) => setRegNumber(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Official Contact Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="compliance@organization.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="role">Supply Chain Tier / Role *</Label>
                      <Select
                        value={role}
                        onValueChange={(val) => setRole(val as SupplyChainRole)}
                      >
                        <SelectTrigger id="role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MANUFACTURER">Manufacturer (Mints product batches)</SelectItem>
                          <SelectItem value="DISTRIBUTOR">Distributor (Wholesale custody transit)</SelectItem>
                          <SelectItem value="RETAILER">Retailer (Customer points of sale)</SelectItem>
                          <SelectItem value="INSPECTOR">Inspector (Quality & compliance audits)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="scope">Supply Chain Scope & Description</Label>
                    <Input
                      id="scope"
                      placeholder="e.g. Cold-chain pharmaceutical logistics across North America."
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full mt-2">
                    Submit Enterprise Application
                  </Button>
                </form>
              )}
            </div>
          )}

          {activeTab === 'demo' && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-lg p-3.5 border border-border">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-medium text-foreground">
                      Testing SupplyTrace? Activate a Demo Persona
                    </p>
                    <p className="text-muted-foreground">
                      Instant sandbox mode enables you to test all minting, custody transfer, and verification flows immediately without waiting for an administrator.
                    </p>
                  </div>
                </div>
              </div>

              {/* Persona Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => handleSelectDemoPersona('MANUFACTURER')}
                  className={`cursor-pointer rounded-lg border p-3 transition-all hover:border-primary/50 ${
                    demoPersona === 'MANUFACTURER' || isManufacturer
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <PackagePlus className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-xs">Manufacturer</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Can mint new ERC-1155 batches with IPFS metadata & QR codes.
                  </p>
                  {(demoPersona === 'MANUFACTURER' || isManufacturer) && (
                    <Badge variant="default" className="mt-2 text-[10px] h-4 px-1.5">
                      Active
                    </Badge>
                  )}
                </div>

                <div
                  onClick={() => handleSelectDemoPersona('DISTRIBUTOR')}
                  className={`cursor-pointer rounded-lg border p-3 transition-all hover:border-primary/50 ${
                    demoPersona === 'DISTRIBUTOR' || isDistributor
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-xs">Distributor</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Can receive custody from manufacturers and transfer to retailers.
                  </p>
                  {(demoPersona === 'DISTRIBUTOR' || isDistributor) && (
                    <Badge variant="default" className="mt-2 text-[10px] h-4 px-1.5">
                      Active
                    </Badge>
                  )}
                </div>

                <div
                  onClick={() => handleSelectDemoPersona('RETAILER')}
                  className={`cursor-pointer rounded-lg border p-3 transition-all hover:border-primary/50 ${
                    demoPersona === 'RETAILER' || isRetailer
                      ? 'border-primary bg-primary/10 shadow-sm'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Store className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-xs">Retailer</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Receives stock and marks batches as sold to final consumers.
                  </p>
                  {(demoPersona === 'RETAILER' || isRetailer) && (
                    <Badge variant="default" className="mt-2 text-[10px] h-4 px-1.5">
                      Active
                    </Badge>
                  )}
                </div>
              </div>

              {/* Localhost Direct On-Chain Role Dispenser */}
              {isLocalDev && isConnected && (
                <div className="border border-primary/20 bg-primary/5 rounded-lg p-3.5 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Localhost On-Chain Role Dispenser
                    </span>
                    <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                      Hardhat Node 8545
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Execute a real, cryptographically signed on-chain transaction from the local Admin deployer directly to your current address (<code className="font-mono text-[10px]">{address?.slice(0, 6)}…{address?.slice(-4)}</code>).
                  </p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={localDispensing}
                      onClick={() => handleClaimLocalRole('MANUFACTURER')}
                      className="text-xs h-8"
                    >
                      {localDispensing ? 'Dispensing…' : 'Grant On-Chain Manufacturer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={localDispensing}
                      onClick={() => handleClaimLocalRole('DISTRIBUTOR')}
                      className="text-xs h-8"
                    >
                      {localDispensing ? 'Dispensing…' : 'Grant On-Chain Distributor'}
                    </Button>
                  </div>

                  {localTxHash && (
                    <div className="text-xs text-emerald-500 flex items-center gap-1.5 pt-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Role granted on-chain! Tx: <code className="font-mono text-[10px]">{localTxHash.slice(0, 10)}…</code></span>
                    </div>
                  )}

                  {dispenseError && (
                    <div className="text-xs text-destructive flex items-center gap-1.5 pt-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{dispenseError}</span>
                    </div>
                  )}
                </div>
              )}

              {demoPersona && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Active Sandbox Persona: <strong className="text-primary">{demoPersona}</strong>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectDemoPersona(null)}
                    className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  >
                    Reset to Guest
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
