import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronDown,
  Code2,
  LayoutDashboard,
  LogOut,
  MailCheck,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'

import { Logo } from '@/components/Logo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/developer', label: 'Developer', icon: Code2 },
] as const

export function Navbar() {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    toast({ title: 'Signed out', variant: 'info' })
    navigate('/login')
  }

  const initial = (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 -bottom-px h-px transition-[opacity,box-shadow] duration-300',
          scrolled ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background:
            'linear-gradient(90deg, transparent, var(--glow-accent), var(--glow-violet), var(--glow-cyan), transparent)',
          boxShadow: scrolled ? '0 0 12px -1px var(--glow-accent)' : 'none',
        }}
      />
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          to="/dashboard"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Logo />
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'relative inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="size-4" />
                  <span className="hidden sm:inline">{label}</span>
                  {isActive ? (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="grid size-7 place-items-center rounded-full bg-canvas text-xs font-semibold text-white">
              {initial}
            </span>
            <span className="hidden max-w-40 truncate text-muted-foreground sm:inline">
              {user?.email}
            </span>
            <ChevronDown
              className={cn(
                'size-3.5 text-muted-foreground transition-transform',
                menuOpen && 'rotate-180',
              )}
            />
          </button>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                role="menu"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
              >
                <div className="border-b border-border p-4">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user?.email}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                    id #{user?.id ?? '—'}
                  </p>
                  <span
                    className={cn(
                      'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                      user?.is_verified
                        ? 'bg-status-done/15 text-status-done'
                        : 'bg-status-partial/15 text-status-partial',
                    )}
                  >
                    <MailCheck className="size-3" />
                    {user?.is_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  <LogOut className="size-4 text-muted-foreground" />
                  Log out
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
