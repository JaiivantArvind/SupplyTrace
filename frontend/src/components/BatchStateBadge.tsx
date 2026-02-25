import { Badge } from '@/components/ui/badge'

const STATE_CONFIG: Record<number, { label: string; className: string }> = {
  0: { label: 'CREATED',     className: 'bg-green-100 text-green-800 border-green-200' },
  1: { label: 'DISTRIBUTED', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  2: { label: 'RETAIL',      className: 'bg-purple-100 text-purple-800 border-purple-200' },
  3: { label: 'SOLD',        className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  4: { label: 'CLOSED',      className: 'bg-red-100 text-red-800 border-red-200' },
}

export function BatchStateBadge({ state }: { state: number }) {
  const config = STATE_CONFIG[state] ?? { label: String(state), className: '' }
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}
