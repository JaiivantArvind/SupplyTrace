import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { WalletButton } from '@/components/WalletButton'
import { RoleBadge } from '@/components/RoleBadge'
import { Button, buttonVariants } from '@/components/ui/button'
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon'
import { useScroll } from '@/components/ui/use-scroll'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Sun, Moon, Settings } from 'lucide-react'

const NAV_LINKS = [
  { to: '/',         label: 'Dashboard' },
  { to: '/mint',     label: 'Mint' },
  { to: '/transfer', label: 'Transfer' },
  { to: '/explore',  label: 'Explore' },
  { to: '/admin',    label: 'Admin' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const scrolled = useScroll(10)
  const { resolvedTheme, setTheme, theme } = useTheme()

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    } else {
      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
    }
  }

  React.useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  React.useEffect(() => { setMenuOpen(false) }, [pathname])

  return (
    <div className="min-h-screen bg-background">
      {/* ── Sticky header ── */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b border-transparent transition-all duration-200',
          scrolled && 'bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 border-border shadow-sm',
        )}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo + desktop nav */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="font-bold text-lg tracking-tight hover:opacity-80 transition-opacity text-foreground"
            >
              SupplyTrace
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }),
                    pathname === to
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="text-muted-foreground hover:text-foreground"
            >
              {resolvedTheme === 'dark'
                ? <Sun className="size-4" />
                : <Moon className="size-4" />}
            </Button>

            {/* Settings icon */}
            <Link
              to="/settings"
              aria-label="Settings"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'icon' }),
                'text-muted-foreground hover:text-foreground',
                pathname === '/settings' && 'bg-accent text-accent-foreground',
              )}
            >
              <Settings className="size-4" />
            </Link>

            {/* Desktop: role + wallet */}
            <div className="hidden sm:flex items-center gap-2">
              <RoleBadge />
              <WalletButton />
            </div>

            {/* Mobile hamburger */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setMenuOpen((v) => !v)}
              className="sm:hidden"
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
            >
              <MenuToggleIcon open={menuOpen} className="size-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu (portal) ── */}
      {menuOpen && typeof window !== 'undefined' && createPortal(
        <div className="fixed top-14 inset-x-0 bottom-0 z-40 flex flex-col bg-background/95 backdrop-blur-lg border-t sm:hidden">
          <div className="animate-in fade-in slide-in-from-top-2 duration-200 ease-out flex flex-col justify-between h-full p-4 gap-4">
            <nav className="grid gap-1">
              {[...NAV_LINKS, { to: '/settings', label: 'Settings' }].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    buttonVariants({ variant: 'ghost' }),
                    'justify-start text-base',
                    pathname === to && 'bg-accent text-accent-foreground font-medium',
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="flex flex-col gap-2 pb-4">
              <RoleBadge />
              <WalletButton />
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* ── Page content ── */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
