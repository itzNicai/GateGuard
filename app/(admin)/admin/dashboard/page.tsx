'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { ChevronRight, Shield, LogOut, Settings, Menu, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { useRouter } from 'next/navigation'

interface Stats {
  totalHomeowners: number
  pendingRegistrations: number
  activeGuards: number
  todayVisitors: number
}

function StatCard({ title, value, color, href }: { title: string; value: number; color: string; href: string }) {
  return (
    <Link href={href} className="rounded-xl bg-[#4a3f35]/80 backdrop-blur-md border border-[#d4c5b0]/20 shadow-xl hover:shadow-2xl hover:border-[#c9a962]/30 transition-all p-4 group relative overflow-hidden">
      <div className="relative z-10">
        <p className="text-[10px] text-[#d4c5b0] font-medium uppercase tracking-wider">{title}</p>
        <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        <div className="flex items-center gap-1 mt-2 text-[10px] text-[#d4c5b0]/60 group-hover:text-[#c9a962] transition-colors">
          <span>View</span>
          <ChevronRight className="h-3 w-3" />
        </div>
      </div>
    </Link>
  )
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()

  const handleChange = useCallback(() => setRefreshKey((k) => k + 1), [])
  
  useRealtime({ table: 'profiles', event: '*', onData: handleChange })
  useRealtime({ table: 'visitors', event: '*', onData: handleChange })

  useEffect(() => {
    async function loadStats() {
      const supabase = createClient()
      const [homeowners, pending, guards, visitors] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'homeowner').eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'homeowner').eq('status', 'pending'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'guard'),
        supabase.from('visitors').select('id', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
      ])
      setStats({
        totalHomeowners: homeowners.count ?? 0,
        pendingRegistrations: pending.count ?? 0,
        activeGuards: guards.count ?? 0,
        todayVisitors: visitors.count ?? 0,
      })
    }
    loadStats()
  }, [refreshKey])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[#3d3229]">
      
      <header className="sticky top-0 z-50 border-b border-[#d4c5b0]/20 bg-[#3d3229]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#d4c5b0]/20 backdrop-blur-md border border-[#e8dcc8]/30 rounded-xl flex items-center justify-center group-hover:bg-[#d4c5b0]/30 transition-all duration-300">
              <Shield className="w-5 h-5 text-[#f5e6d3]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold text-[#f5e6d3] leading-none tracking-wide">GateGuard</span>
              <span className="text-[12px] text-[#d4c5b0] leading-tight mt-1 font-medium tracking-wider uppercase">Sabang Dexterville</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <Link 
              href="/admin/settings" 
              className="px-5 py-2.5 text-[14px] text-[#e8dcc8] hover:text-[#f5e6d3] transition-colors rounded-full border border-[#d4c5b0]/30 hover:border-[#e8dcc8]/50 hover:bg-[#d4c5b0]/10"
            >
              Settings
            </Link>
            <button 
              onClick={handleLogout}
              className="group relative px-6 py-3 bg-gradient-to-r from-[#c9a962] to-[#d4b978] text-[#3d3229] text-[14px] font-bold rounded-full hover:shadow-lg hover:shadow-[#c9a962]/30 transition-all duration-300 flex items-center gap-2 overflow-hidden"
            >
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></span>
              <LogOut className="w-4 h-4 relative z-10" />
              <span className="relative z-10">Log Out</span>
            </button>
          </div>

          <button 
            className="md:hidden p-2.5 text-[#f5e6d3] hover:bg-[#d4c5b0]/20 rounded-xl border border-[#d4c5b0]/30"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#4a3f35]/95 backdrop-blur-md border-t border-[#d4c5b0]/20 px-6 py-6 space-y-3">
            <Link 
              href="/admin/settings" 
              className="block py-3 text-[14px] text-[#e8dcc8] hover:text-[#f5e6d3] text-center rounded-xl border border-[#d4c5b0]/30"
              onClick={() => setMobileMenuOpen(false)}
            >
              Settings
            </Link>
            <button 
              onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
              className="w-full py-3.5 bg-gradient-to-r from-[#c9a962] to-[#d4b978] text-[#3d3229] text-[14px] font-bold rounded-xl text-center"
            >
              Log Out
            </button>
          </div>
        )}
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        
        <div className="rounded-xl bg-gradient-to-r from-[#c9a962] to-[#d4b978] text-[#3d3229] p-4 shadow-xl">
          <h1 className="text-sm lg:text-base font-semibold">Dashboard</h1>
          <p className="text-[#3d3229]/70 text-[11px] mt-0.5">Overview of Sabang Dexterville Subdivision</p>
        </div>
        
        {!stats ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl bg-[#4a3f35]/50" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard title="Homeowners" value={stats.totalHomeowners} color="text-[#f5e6d3]" href="/admin/homeowners" />
            <StatCard title="Pending" value={stats.pendingRegistrations} color="text-[#c9a962]" href="/admin/homeowners" />
            <StatCard title="Guards" value={stats.activeGuards} color="text-[#d4b978]" href="/admin/guards" />
            <StatCard title="Today's Visitors" value={stats.todayVisitors} color="text-[#c9a962]" href="/admin/logs" />
          </div>
        )}
      </main>
    </div>
  )
}