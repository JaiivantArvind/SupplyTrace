import { Badge } from '@/components/ui/badge'
import { useRole } from '@/hooks/useRole'

export function RoleBadge() {
  const { isManufacturer, isDistributor, isRetailer, isAdmin, isInspector, isConnected, isLoading } = useRole()

  if (!isConnected || isLoading) return null

  const roles: string[] = []
  if (isAdmin)        roles.push('Admin')
  if (isManufacturer) roles.push('Manufacturer')
  if (isDistributor)  roles.push('Distributor')
  if (isRetailer)     roles.push('Retailer')
  if (isInspector)    roles.push('Inspector')

  if (roles.length === 0) return <Badge variant="outline">No Role</Badge>

  return (
    <div className="flex gap-1 flex-wrap">
      {roles.map((r) => (
        <Badge key={r} variant="secondary">{r}</Badge>
      ))}
    </div>
  )
}
