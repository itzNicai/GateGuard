'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { VisitorActivityChart } from '@/components/admin/charts/visitor-activity-chart'
import { VisitorStatusChart } from '@/components/admin/charts/visitor-status-chart'
import { GateActivityChart } from '@/components/admin/charts/gate-activity-chart'
import { ChevronRight } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface Stats {
  totalHomeowners: number
  pendingRegistrations: number
  activeGuards: number
  todayVisitors: number
}

function StatCard({ title, value, color, href, illustration }: { title: string; value: number; color: string; href: string; illustration: string }) {
  return (
    <Link href={href} className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card hover:shadow-card-hover transition-shadow p-3.5 group relative overflow-hidden">
      <Image src={illustration} alt="" width={80} height={80} className="absolute -right-2 -bottom-2 opacity-30 object-contain" />
      <div className="relative z-10">
        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{title}</p>
        <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
        <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/60 group-hover:text-primary transition-colors">
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

  return (
    <div className="space-y-4">
      {/* Header with illustration */}
      <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white p-4 shadow-card overflow-hidden relative">
        <div className="relative z-10">
          <h1 className="text-sm lg:text-base font-semibold">Dashboard</h1>
          <p className="text-white/60 text-[11px] mt-0.5">Overview of Sabang Dexterville Subdivision</p>
        </div>
        <Image src="/illustrations/stat-visits.png" alt="" width={120} height={120} className="absolute right-2 -bottom-2 opacity-20 object-contain" />
      </div>

      {/* Stat Cards */}
      {!stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Homeowners" value={stats.totalHomeowners} color="text-foreground" href="/admin/homeowners" illustration="/illustrations/profile.png" />
          <StatCard title="Pending" value={stats.pendingRegistrations} color="text-secondary" href="/admin/homeowners" illustration="/illustrations/notif-at-gate.png" />
          <StatCard title="Guards" value={stats.activeGuards} color="text-accent" href="/admin/guards" illustration="/illustrations/stat-visits.png" />
          <StatCard title="Today's Visitors" value={stats.todayVisitors} color="text-primary" href="/admin/logs" illustration="/illustrations/waiting.png" />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
        <div className="lg:col-span-4">
          <VisitorActivityChart />
        </div>
        <div className="lg:col-span-3">
          <VisitorStatusChart />
        </div>
      </div>

      <GateActivityChart />
    </div>
  )
}
