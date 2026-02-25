import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRole } from '@/hooks/useRole'
import { PackagePlus, ArrowRightLeft, Search, ShieldCheck, Loader2 } from 'lucide-react'
import { HeroSection, TechStackSection } from '@/components/ui/hero-section'

export default function Dashboard() {
  const { isConnected, address, isManufacturer, isDistributor, isRetailer, isAdmin, isLoading } = useRole()

  if (!isConnected) {
    return (
      <div className="relative -mx-4 -mt-8 overflow-hidden">
        <HeroSection />
        <TechStackSection />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">{address}</p>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Detecting roles…</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(isManufacturer || !isLoading) && (
          <Card className={isManufacturer ? '' : 'opacity-40 pointer-events-none'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackagePlus className="w-5 h-5" />
                Mint Batch
              </CardTitle>
              <CardDescription>
                Create a new product batch as an ERC-1155 token with IPFS metadata.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/mint">Go to Mint</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {((isManufacturer || isDistributor || isRetailer) || !isLoading) && (
          <Card className={(isManufacturer || isDistributor || isRetailer) ? '' : 'opacity-40 pointer-events-none'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" />
                Transfer Batch
              </CardTitle>
              <CardDescription>
                Transfer custody of a batch to the next actor in the supply chain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/transfer">Go to Transfer</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Explore Batches
            </CardTitle>
            <CardDescription>
              Browse all minted batches and their current status on-chain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/explore">Explore</Link>
            </Button>
          </CardContent>
        </Card>

        {(isAdmin || !isLoading) && (
          <Card className={isAdmin ? '' : 'opacity-40 pointer-events-none'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" />
                Admin Panel
              </CardTitle>
              <CardDescription>
                Recall batches and manage role assignments for supply chain actors.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="destructive" className="w-full">
                <Link to="/admin">Admin Panel</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
