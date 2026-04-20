'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Shield,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronsUpDown,
  ChevronRight,
  Settings,
  MapPin,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/homeowners', label: 'Homeowners', icon: Users },
  { href: '/admin/guards', label: 'Guards', icon: Shield },
  { href: '/admin/logs', label: 'Logs', icon: ClipboardList },
  { href: '/admin/blocks-lots', label: 'Blocks & Lots', icon: MapPin },
]

interface AdminUser {
  full_name: string
  email: string
  avatar_url: string | null
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function loadAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, avatar_url')
        .eq('id', user.id)
        .single()
      if (data) setAdminUser(data as AdminUser)
    }
    loadAdmin()
  }, [refreshKey])

  const handleProfileChange = useCallback(() => setRefreshKey((k) => k + 1), [])
  useRealtime({ table: 'profiles', event: 'UPDATE', filter: userId ? `id=eq.${userId}` : undefined, onData: handleProfileChange })

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Build breadcrumbs from pathname segments
  const segments = pathname.replace('/admin/', '').split('/').filter(Boolean)
  const breadcrumbs = segments.map((seg, i) => {
    const href = '/admin/' + segments.slice(0, i + 1).join('/')
    const label = navItems.find((item) => item.href === href)?.label ?? seg.charAt(0).toUpperCase() + seg.slice(1)
    return { href, label }
  })
  const initials = adminUser?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'AD'

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-card flex flex-col border-r border-border/50 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:flex'
        )}
      >
        {/* Sidebar Header */}
        <div className="h-13 flex items-center px-4 border-b border-border/50">
          <Logo />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            Main
          </p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Sidebar Footer — User info */}
        <div className="border-t border-border/50 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 w-full rounded-md px-2 py-2 text-left hover:bg-muted transition-colors">
              {adminUser?.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={adminUser.avatar_url} alt={adminUser.full_name} className="h-8 w-8 rounded-md object-cover shrink-0" />
              ) : (
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{adminUser?.full_name ?? 'Admin'}</p>
                <p className="text-[11px] text-muted-foreground truncate">{adminUser?.email ?? ''}</p>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{adminUser?.full_name}</p>
                <p className="text-xs text-muted-foreground">{adminUser?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-13 border-b border-border/50 flex items-center gap-3 px-4 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden -ml-2 h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-semibold">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="text-muted-foreground hover:text-foreground transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-5 pt-6 pb-8 overflow-auto animate-fade-in">{children}</main>
      </div>
    </div>
  )
}
