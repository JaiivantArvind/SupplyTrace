import { Badge } from '@/components/ui/badge'
import { useRole } from '@/hooks/useRole'

export function RoleBadge({ onClick }: { onClick?: () => void }) {
  const {
    isManufacturer,
    isDistributor,
    isRetailer,
    isAdmin,
    isInspector,
    isConnected,
    isLoading,
    demoPersona,
    hasOnChainRole,
  } = useRole()

  if (!isConnected || isLoading) return null

  const roles: string[] = []
  if (isAdmin)        roles.push('Admin')
  if (isManufacturer && hasOnChainRole) roles.push('Manufacturer')
  if (isDistributor && hasOnChainRole)  roles.push('Distributor')
  if (isRetailer && hasOnChainRole)     roles.push('Retailer')
  if (isInspector && hasOnChainRole)    roles.push('Inspector')

  if (demoPersona && roles.length === 0) {
    return (
      <Badge
        variant="outline"
        onClick={onClick}
        className="cursor-pointer border-amber-500/60 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors"
      >
        Demo: {demoPersona}
      </Badge>
    )
  }

  if (roles.length === 0) {
    return (
      <Badge
        variant="outline"
        onClick={onClick}
        className="cursor-pointer border-dashed border-amber-500/60 text-amber-500 hover:bg-amber-500/10 transition-colors"
      >
        Guest (Get Role)
      </Badge>
    )
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {roles.map((r) => (
        <Badge key={r} variant="secondary">
          {r}
        </Badge>
      ))}
      {demoPersona && !hasOnChainRole && (
        <Badge
          variant="outline"
          onClick={onClick}
          className="cursor-pointer border-amber-500/50 text-amber-500"
        >
          Demo: {demoPersona}
        </Badge>
      )}
    </div>
  )
}
