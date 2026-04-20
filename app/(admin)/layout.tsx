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
    <div className="min-h-screen flex bg-[#3d3229]">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 bg-[#4a3f35]/95 backdrop-blur-md flex flex-col border-r border-[#d4c5b0]/20 transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:flex'
        )}
      >
        <div className="h-16 flex items-center px-4 border-b border-[#d4c5b0]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d4c5b0]/20 backdrop-blur-md border border-[#e8dcc8]/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#f5e6d3]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-[#f5e6d3] leading-none tracking-wide">GateGuard</span>
              <span className="text-[10px] text-[#d4c5b0] leading-tight mt-1 font-medium tracking-wider uppercase">Admin Portal</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-widest text-[#d4c5b0]/70">
            Main Menu
          </p>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300',
                pathname === item.href
                  ? 'bg-gradient-to-r from-[#c9a962] to-[#d4b978] text-[#3d3229] shadow-lg shadow-[#c9a962]/20'
                  : 'text-[#e8dcc8] hover:bg-[#d4c5b0]/10 hover:text-[#f5e6d3]'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-[#d4c5b0]/20 p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2.5 text-left hover:bg-[#d4c5b0]/10 transition-colors border border-transparent hover:border-[#d4c5b0]/20">
              {adminUser?.avatar_url ? (
                <img src={adminUser.avatar_url} alt={adminUser.full_name} className="h-9 w-9 rounded-lg object-cover shrink-0 border border-[#d4c5b0]/30" />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#c9a962] to-[#d4b978] flex items-center justify-center text-xs font-bold text-[#3d3229] shrink-0">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#f5e6d3] truncate">{adminUser?.full_name ?? 'Admin'}</p>
                <p className="text-[11px] text-[#d4c5b0] truncate">{adminUser?.email ?? ''}</p>
              </div>
              <ChevronsUpDown className="h-3.5 w-3.5 text-[#d4c5b0] shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-[#4a3f35] border-[#d4c5b0]/20 text-[#f5e6d3]">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-[#f5e6d3]">{adminUser?.full_name}</p>
                <p className="text-xs text-[#d4c5b0]">{adminUser?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-[#d4c5b0]/20" />
              <DropdownMenuItem onClick={() => router.push('/admin/settings')} className="text-[#e8dcc8] focus:text-[#f5e6d3] focus:bg-[#d4c5b0]/10">
                <Settings className="mr-2 h-4 w-4 text-[#c9a962]" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#d4c5b0]/20" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:text-red-300 focus:bg-red-500/10"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#3d3229]/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-[#d4c5b0]/20 flex items-center gap-3 px-4 bg-[#4a3f35]/80 backdrop-blur-md sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden -ml-2 h-8 w-8 text-[#f5e6d3] hover:bg-[#d4c5b0]/10 hover:text-[#f5e6d3]"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <nav className="flex items-center gap-1 text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3 text-[#d4c5b0]" />}
                {i === breadcrumbs.length - 1 ? (
                  <span className="font-semibold text-[#f5e6d3]">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} className="text-[#d4c5b0] hover:text-[#f5e6d3] transition-colors">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </header>
        <main className="flex-1 p-5 pt-6 pb-8 overflow-auto bg-[#3d3229]/50">{children}</main>
      </div>
    </div>
  )
}