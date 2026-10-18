import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRole } from '@/hooks/useRole'
import { PackagePlus, ArrowRightLeft, Search, ShieldCheck, Loader2, Building2, Sparkles } from 'lucide-react'
import { HeroSection, TechStackSection } from '@/components/ui/hero-section'
import { RoleOnboardingDialog } from '@/components/RoleOnboardingDialog'

export default function Dashboard() {
  const {
    isConnected,
    address,
    isManufacturer,
    isDistributor,
    isRetailer,
    isAdmin,
    hasOnChainRole,
    demoPersona,
    isLoading,
  } = useRole()

  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingTab, setOnboardingTab] = useState<'apply' | 'demo'>('apply')

  const openOnboarding = (tab: 'apply' | 'demo') => {
    setOnboardingTab(tab)
    setOnboardingOpen(true)
  }

  if (!isConnected && !demoPersona) {
    return (
      <div className="relative -mx-4 -mt-8 overflow-hidden">
        <HeroSection />
        <div className="flex justify-center -mt-16 mb-8 relative z-20">
          <Button
            size="lg"
            variant="outline"
            onClick={() => openOnboarding('demo')}
            className="rounded-full gap-2 border-primary/50 bg-background/80 backdrop-blur shadow-lg hover:bg-primary/10 text-sm h-11 px-6"
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            🧪 Try Instant Demo Persona (Sandbox Mode)
          </Button>
        </div>
        <TechStackSection />
        <RoleOnboardingDialog
          open={onboardingOpen}
          onOpenChange={setOnboardingOpen}
          initialTab={onboardingTab}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground font-mono text-sm mt-0.5">{address}</p>
        </div>
        <div className="flex items-center gap-2">
          {demoPersona && (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-500/10 text-amber-500 text-xs">
              🧪 Sandbox Persona: {demoPersona}
            </Badge>
          )}
          {!hasOnChainRole && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openOnboarding('apply')}
              className="text-xs h-8 gap-1.5"
            >
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Apply for Role
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Detecting on-chain permissions…</span>
        </div>
      )}

      {/* ── Enterprise Onboarding & Sandbox Gateway Banner for Guests ── */}
      {!hasOnChainRole && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-background shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Supply Chain Identity & Role Authorization</CardTitle>
              </div>
              <Badge variant="outline" className="border-amber-500/60 text-amber-500 text-xs">
                {demoPersona ? `Sandbox Active: ${demoPersona}` : 'Status: Unverified / Guest'}
              </Badge>
            </div>
            <CardDescription className="text-sm text-foreground/80 mt-1">
              Physical product batch tokenization and chain-of-custody transfers require cryptographically verified roles on Ethereum.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3 pt-0">
            <Button onClick={() => openOnboarding('apply')} className="gap-2">
              <Building2 className="h-4 w-4" />
              Apply for Enterprise Role
            </Button>
            <Button
              variant="outline"
              onClick={() => openOnboarding('demo')}
              className="gap-2 border-primary/40 hover:bg-primary/10"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              🧪 Try Instant Demo Persona (Sandbox)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Action Cards Grid ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Mint Card */}
        <Card className={isManufacturer ? 'border-primary/20' : 'opacity-70'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-primary" />
              Mint Batch
            </CardTitle>
            <CardDescription>
              Create a new product batch as an ERC-1155 token with IPFS metadata & QR code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isManufacturer ? (
              <Button asChild className="w-full">
                <Link to="/mint">Go to Mint</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => openOnboarding('demo')}
                className="w-full text-xs border-dashed gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Claim Manufacturer Role
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Transfer Card */}
        <Card className={(isManufacturer || isDistributor || isRetailer) ? 'border-primary/20' : 'opacity-70'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-primary" />
              Transfer Batch
            </CardTitle>
            <CardDescription>
              Transfer custody of a batch to the next verified actor in the supply chain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(isManufacturer || isDistributor || isRetailer) ? (
              <Button asChild variant="secondary" className="w-full">
                <Link to="/transfer">Go to Transfer</Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => openOnboarding('demo')}
                className="w-full text-xs border-dashed gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Claim Transfer Role
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Explore Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Explore Batches
            </CardTitle>
            <CardDescription>
              Browse all minted batches, active statuses, and custody histories on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/explore">Explore All Batches</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Admin Card */}
        {(isAdmin || !isLoading) && (
          <Card className={isAdmin ? 'border-primary/20' : 'opacity-60'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Admin Panel
              </CardTitle>
              <CardDescription>
                Circuit breaker, emergency recall, and enterprise role application approvals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <Button asChild variant="destructive" className="w-full">
                  <Link to="/admin">Go to Admin Panel</Link>
                </Button>
              ) : (
                <Button variant="ghost" disabled className="w-full text-xs">
                  Requires Admin Role
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Onboarding & Sandbox Dialog */}
      <RoleOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        initialTab={onboardingTab}
      />
    </div>
  )
}
