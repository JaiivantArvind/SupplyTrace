import { useTheme } from '@/lib/theme'
import { useDisconnect, useAccount } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sun, Moon, Monitor, LogOut, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'light' as const, label: 'Light',  Icon: Sun },
  { value: 'dark'  as const, label: 'Dark',   Icon: Moon },
  { value: 'system'as const, label: 'System', Icon: Monitor },
]

export default function Settings() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { disconnect } = useDisconnect()
  const { isConnected, address } = useAccount()
  const navigate = useNavigate()

  const handleLogout = () => {
    disconnect()
    navigate('/')
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your preferences</p>
      </div>

      {/* ── Appearance ── */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how SupplyTrace looks. Currently rendering in{' '}
            <span className="font-medium text-foreground capitalize">{resolvedTheme}</span> mode.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {THEME_OPTIONS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 text-sm font-medium transition-all duration-150',
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-muted hover:text-foreground',
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            ))}
          </div>

          {/* Live preview swatch */}
          <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
            <div className="flex gap-1.5">
              {['bg-background','bg-card','bg-primary','bg-secondary','bg-accent'].map((c) => (
                <span key={c} className={cn('size-5 rounded-full border', c)} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Live colour preview</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Wallet / Logout ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="size-4" />
            Wallet
          </CardTitle>
          <CardDescription>
            {isConnected
              ? <span>Connected as <span className="font-mono text-xs text-foreground break-all">{address}</span></span>
              : 'No wallet connected.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <Button variant="destructive" onClick={handleLogout} className="gap-2">
              <LogOut className="size-4" />
              Disconnect Wallet
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Connect your wallet from the header.</p>
          )}
        </CardContent>
      </Card>

      {/* ── Contract info ── */}
      <Card>
        <CardHeader>
          <CardTitle>Contract</CardTitle>
          <CardDescription>Deployed on Ethereum Sepolia testnet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Proxy</span>
            <span className="font-mono text-xs break-all">0x2d6e1979c944DdfCBF34FE1f172DED5e600bEc60</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Implementation</span>
            <span className="font-mono text-xs break-all">0x64641Ed583aB4aC7AAAa84213522f130F5e4FD64</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
