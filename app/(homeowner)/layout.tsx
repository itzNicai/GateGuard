'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  History,
  UserCircle,
} from 'lucide-react'

const navItems = [
  { href: '/homeowner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/homeowner/visitors', label: 'Visitors', icon: Users },
  { href: '/homeowner/history', label: 'History', icon: History },
  { href: '/homeowner/profile', label: 'Profile', icon: UserCircle },
]

interface UserInfo {
  full_name: string
  avatar_url: string | null
}

export default function HomeownerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return
      setUserId(authUser.id)
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', authUser.id).single()
      if (data) setUser(data as UserInfo)
    }
    load()
  }, [pathname, refreshKey])

  const handleProfileChange = useCallback(() => setRefreshKey((k) => k + 1), [])
  useRealtime({ table: 'profiles', event: 'UPDATE', filter: userId ? `id=eq.${userId}` : undefined, onData: handleProfileChange })

  const currentPage = navItems.find((item) => pathname === item.href)?.label ?? 'Home'
  const firstName = user?.full_name?.split(' ')[0] ?? ''
  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? ''

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Mobile header */}
      <header className="lg:hidden sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="GateGuard" width={28} height={28} className="shrink-0" />
            <div>
              <p className="text-[13px] font-semibold leading-tight">{currentPage}</p>
              {firstName && (
                <p className="text-[10px] text-muted-foreground leading-tight">Hi, {firstName}</p>
              )}
            </div>
          </div>
          <Link href="/homeowner/profile">
            {user?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary ring-1 ring-border">
                {initials}
              </div>
            )}
          </Link>
        </div>
      </header>

      {/* Desktop header */}
      <header className="hidden lg:block border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="GateGuard" width={30} height={30} />
            <div>
              <p className="text-[13px] font-bold text-primary tracking-tight">GateGuard</p>
              <p className="text-[10px] text-muted-foreground">Sabang Dexterville</p>
            </div>
          </div>
          <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 h-full">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex items-center gap-2 px-3 h-full text-[13px] font-medium transition-colors',
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 inset-x-1.5 h-[2px] rounded-full bg-primary" />
                  )}
                </Link>
              )
            })}
          </nav>
          <Link href="/homeowner/profile" className="flex items-center gap-2.5">
            <div className="text-right">
              <p className="text-[12px] font-medium">{user?.full_name}</p>
              <p className="text-[10px] text-muted-foreground">Homeowner</p>
            </div>
            {user?.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={user.avatar_url}
                alt={user.full_name ?? ''}
                className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary ring-1 ring-border">
                {initials}
              </div>
            )}
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24 lg:px-16 lg:pt-6 lg:pb-8 overflow-auto animate-fade-in">
        <div className="lg:max-w-5xl lg:mx-auto">
          {children}
        </div>
      </main>

      {/* Desktop footer */}
      <footer className="hidden lg:block border-t border-border/60 bg-card/80">
        <div className="max-w-6xl mx-auto px-8 py-10">
          <div className="grid grid-cols-4 gap-8">
            {/* Brand */}
            <div className="col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <Image src="/logo.png" alt="GateGuard" width={28} height={28} />
                <p className="text-[14px] font-bold text-primary tracking-tight">GateGuard</p>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Smart subdivision gate management system. Secure, fast, and convenient visitor access control.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Links</p>
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-[12px] text-muted-foreground hover:text-foreground transition-colors w-fit"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Community */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Community</p>
              <div className="space-y-2 text-[12px] text-muted-foreground">
                <p>Sabang Dexterville</p>
                <p>Homeowners Association</p>
              </div>
            </div>

            {/* Support */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Support</p>
              <div className="flex flex-col gap-2 text-[12px] text-muted-foreground">
                <a href="mailto:support@gateguard.app" className="hover:text-foreground transition-colors w-fit">support@gateguard.app</a>
                <a href="tel:+639123456789" className="hover:text-foreground transition-colors w-fit">(+63) 912 345 6789</a>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Mon–Fri, 8AM–5PM</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-border/40 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground/60">
              &copy; {new Date().getFullYear()} GateGuard. All rights reserved.
            </p>
            <p className="text-[11px] text-muted-foreground/60">
              Sabang Dexterville Subdivision
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-md border-t border-border/40 z-20 safe-area-inset-bottom">
        <div className="flex items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-xl mx-0.5 transition-all',
                  isActive
                    ? 'text-primary bg-primary/8'
                    : 'text-muted-foreground active:bg-muted/50'
                )}
              >
                <item.icon className={cn('h-5 w-5', isActive && 'text-primary')} />
                <span className={cn('text-[10px] leading-tight', isActive ? 'font-semibold' : 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
