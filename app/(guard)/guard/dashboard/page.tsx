'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { ScanLine, Loader2, CheckCircle2, XCircle, LogOut, MapPin, User, Car, Eye, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { QRScanner } from '@/components/guard/qr-scanner'
import { toast } from 'sonner'

const STATUS_AVATARS: Record<string, string> = {
  pending: '/illustrations/notif-at-gate.png',
  approved: '/illustrations/pfp.png',
  denied: '/illustrations/notif-denied.png',
  inside: '/illustrations/pfp.png',
  pending_exit: '/illustrations/notif-exited.png',
  exited: '/illustrations/notif-exited.png',
}

interface VisitEntry {
  id: string
  visitor_id: string
  visitor_name: string
  purpose: string
  vehicle_plate: string | null
  visitor_status: string
  homeowner_name: string | null
  homeowner_block: string | null
  homeowner_lot: string | null
  entry_time: string | null
  exit_time: string | null
  created_at: string
  pending_exit?: boolean
}

interface Stats {
  totalToday: number
  pendingCount: number
  approvedCount: number
  exitedCount: number
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-secondary',
  approved: 'text-accent',
  denied: 'text-destructive',
  inside: 'text-primary',
  pending_exit: 'text-secondary',
  exited: 'text-muted-foreground',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  denied: 'Denied',
  inside: 'Inside',
  pending_exit: 'Exiting',
  exited: 'Exited',
}

function StatusText({ status }: { status: string }) {
  return (
    <span className={`text-[9px] font-medium ${STATUS_COLORS[status] ?? 'text-muted-foreground'}`}>
      {STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

// Sort priority: approved/denied/pending_exit at top, then pending, then inside, then exited
const SORT_PRIORITY: Record<string, number> = {
  approved: 0,
  denied: 0,
  pending_exit: 0,
  pending: 1,
  inside: 2,
  exited: 3,
}

function sortEntries(entries: VisitEntry[]): VisitEntry[] {
  return [...entries].sort((a, b) => {
    const aStatus = getDisplayStatus(a)
    const bStatus = getDisplayStatus(b)
    const aPriority = SORT_PRIORITY[aStatus] ?? 4
    const bPriority = SORT_PRIORITY[bStatus] ?? 4
    if (aPriority !== bPriority) return aPriority - bPriority
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

function getDisplayStatus(e: VisitEntry): string {
  if (e.pending_exit) return 'pending_exit'
  if (e.exit_time) return 'exited'
  if (e.entry_time) return 'inside'
  return e.visitor_status
}

export default function GuardDashboardPage() {
  const [guardId, setGuardId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [entries, setEntries] = useState<VisitEntry[]>([])
  const [stats, setStats] = useState<Stats>({ totalToday: 0, pendingCount: 0, approvedCount: 0, exitedCount: 0 })
  const [selectedEntry, setSelectedEntry] = useState<VisitEntry | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [flashIds, setFlashIds] = useState<Record<string, 'approved' | 'denied'>>({})
  const [confirmLoading, setConfirmLoading] = useState<string | null>(null)
  const prevEntriesRef = useRef<VisitEntry[]>([])

  useEffect(() => {
    async function init() {
      try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setGuardId(user.id)

      // Fetch via API route (uses admin client, bypasses RLS issues with nested joins)
      const res = await fetch(`/api/guard/dashboard?guard_id=${user.id}`)
      const entries = res.ok ? await res.json() : []

      if (Array.isArray(entries) && entries.length > 0) {
        const mapped: VisitEntry[] = entries as VisitEntry[]

        // Preserve pending_exit flags from previous state
        const prev = prevEntriesRef.current
        for (const entry of mapped) {
          const old = prev.find((p) => p.id === entry.id)
          if (old?.pending_exit && !entry.exit_time) {
            entry.pending_exit = true
          }
        }

        // Detect status changes for flash animation
        if (prev.length > 0) {
          const newFlash: Record<string, 'approved' | 'denied'> = {}
          for (const entry of mapped) {
            const old = prev.find((p) => p.id === entry.id)
            if (old && old.visitor_status === 'pending' && (entry.visitor_status === 'approved' || entry.visitor_status === 'denied')) {
              newFlash[entry.id] = entry.visitor_status as 'approved' | 'denied'
            }
          }
          if (Object.keys(newFlash).length > 0) {
            setFlashIds(newFlash)
            for (const entryId of Object.keys(newFlash)) {
              const entry = mapped.find((m) => m.id === entryId)
              if (!entry) continue
              if (newFlash[entryId] === 'approved') {
                toast.success(`${entry.visitor_name} — Approved! Confirm entry`, { duration: 5000 })
              } else {
                toast.error(`${entry.visitor_name} — Entry denied`, { duration: 5000 })
              }
            }
            setTimeout(() => setFlashIds({}), 1500)
          }
        }
        prevEntriesRef.current = mapped
        setEntries(mapped)

        const pending = mapped.filter((e) => e.visitor_status === 'pending' && !e.entry_time).length
        const approved = mapped.filter((e) => e.visitor_status === 'approved' && !e.entry_time).length
        const exited = mapped.filter((e) => !!e.exit_time).length
        setStats({ totalToday: mapped.length, pendingCount: pending, approvedCount: approved, exitedCount: exited })
      }

      setLoading(false)
      } catch (err) {
        console.error('[guard-dashboard] init error:', err)
        setLoading(false)
      }
    }
    init()
  }, [refreshKey])

  const handleRealtimeChange = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useRealtime({ table: 'visit_logs', event: '*', onData: handleRealtimeChange })
  useRealtime({ table: 'visitors', event: 'UPDATE', onData: handleRealtimeChange })

  const handleScan = useCallback(async (qrCode: string) => {
    setScanning(false)

    if (!guardId) {
      toast.error('Guard session not ready — please wait and try again')
      return
    }

    try {
      const res = await fetch('/api/guard/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qr_code: qrCode, guard_id: guardId }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error((data as { message?: string }).message || 'Invalid QR code')
        return
      }

      const visitorName = data.visitor?.name ?? 'Visitor'

      if (data.scan_type === 'PENDING_EXIT') {
        // Mark entry as pending exit so the confirm button shows
        if (data.visit_log_id) {
          setEntries((prev) => prev.map((e) =>
            e.id === data.visit_log_id ? { ...e, pending_exit: true } : e
          ))
          prevEntriesRef.current = prevEntriesRef.current.map((e) =>
            e.id === data.visit_log_id ? { ...e, pending_exit: true } : e
          )
        }
        toast.info(`${visitorName} — Confirm exit to record departure`)
        setRefreshKey((k) => k + 1)
      } else {
        setRefreshKey((k) => k + 1)
        toast.info(`${visitorName} — Waiting for homeowner approval`)
      }
    } catch {
      toast.error('Network error — please try again')
    }
  }, [guardId])

  async function handleConfirm(entry: VisitEntry, action: 'entry' | 'exit') {
    setConfirmLoading(entry.id)
    try {
      const res = await fetch('/api/guard/confirm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_log_id: entry.id, action }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        toast.error((data as { message?: string }).message || 'Failed to confirm')
        setConfirmLoading(null)
        return
      }

      if (action === 'entry') {
        toast.success(`${entry.visitor_name} — Entry confirmed`)
      } else {
        toast.success(`${entry.visitor_name} — Exit confirmed`)
      }

      // Clear pending_exit flag
      if (action === 'exit') {
        prevEntriesRef.current = prevEntriesRef.current.map((e) =>
          e.id === entry.id ? { ...e, pending_exit: false } : e
        )
      }

      setSelectedEntry(null)
      setRefreshKey((k) => k + 1)
    } catch {
      toast.error('Network error — please try again')
    }
    setConfirmLoading(null)
  }

  function handleDismiss(entryId: string) {
    setEntries((prev) => prev.filter((e) => e.id !== entryId))
    prevEntriesRef.current = prevEntriesRef.current.filter((e) => e.id !== entryId)
    setSelectedEntry(null)
  }

  const sorted = sortEntries(entries)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <div className="hidden lg:grid grid-cols-3 gap-3">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-8 lg:space-y-0">
      <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-6">
        {/* Left column — stats */}
        <div className="lg:space-y-4">
          {/* Hero stat card */}
          <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white p-4 shadow-card hover:shadow-card-hover transition-shadow overflow-hidden relative">
            <div className="flex items-center justify-between">
              <div className="relative z-10">
                <p className="text-white/70 text-xs lg:text-sm font-medium">Today&apos;s Scans</p>
                <p className="text-3xl lg:text-4xl font-bold mt-0.5">{stats.totalToday}</p>
                <p className="text-white/60 text-[11px] lg:text-xs mt-1">
                  {stats.totalToday === 0 ? 'No visitors scanned yet' : `${stats.pendingCount} pending · ${stats.approvedCount} to confirm`}
                </p>
              </div>
              <Image
                src="/illustrations/logo1.png"
                alt=""
                width={130}
                height={130}
                className="object-contain opacity-90 -mr-3 -my-2"
                priority
              />
            </div>
          </div>

          {/* Secondary stat cards — desktop */}
          <div className="hidden lg:grid grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl bg-gradient-to-br from-secondary to-secondary/80 ring-1 ring-secondary/20 shadow-card p-4 overflow-hidden relative">
              <div className="relative z-10">
                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-bold mt-1 text-white">{stats.pendingCount}</p>
              </div>
              <Image src="/illustrations/notif-at-gate.png" alt="" width={60} height={60} className="absolute -right-1 -bottom-2 opacity-20 object-contain" />
            </div>
            <div className="rounded-xl bg-gradient-to-br from-accent to-accent/80 ring-1 ring-accent/20 shadow-card p-4 overflow-hidden relative">
              <div className="relative z-10">
                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Approved</p>
                <p className="text-2xl font-bold mt-1 text-white">{stats.approvedCount}</p>
              </div>
              <Image src="/illustrations/pfp.png" alt="" width={60} height={60} className="absolute -right-1 -bottom-2 opacity-20 object-contain" />
            </div>
            <div className="rounded-xl bg-gradient-to-br from-muted-foreground/80 to-muted-foreground/60 ring-1 ring-muted-foreground/20 shadow-card p-4 overflow-hidden relative">
              <div className="relative z-10">
                <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Exited</p>
                <p className="text-2xl font-bold mt-1 text-white">{stats.exitedCount}</p>
              </div>
              <Image src="/illustrations/notif-exited.png" alt="" width={60} height={60} className="absolute -right-1 -bottom-2 opacity-20 object-contain" />
            </div>
          </div>

          {/* Scan button — desktop only */}
          <div className="hidden lg:block mt-4">
            <Button
              size="lg"
              className="w-full h-12 text-sm shadow-lg"
              disabled={!guardId}
              onClick={() => setScanning(true)}
            >
              <ScanLine className="mr-2 h-4 w-4" />
              Scan QR Code
            </Button>
          </div>
        </div>

        {/* Right column — scan queue */}
        <div className="pt-8 lg:pt-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Scan Queue
              </h2>
              {(stats.pendingCount + stats.approvedCount) > 0 && (
                <span className="h-4 min-w-4 px-1 rounded-full bg-secondary text-white text-[9px] lg:text-[11px] font-bold flex items-center justify-center lg:h-5 lg:min-w-5">
                  {stats.pendingCount + stats.approvedCount}
                </span>
              )}
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="flex flex-col items-center py-8 lg:py-16">
              <Image src="/illustrations/no-visitors.png" alt="" width={200} height={200} className="opacity-80 mb-4" />
              <p className="text-sm font-medium text-foreground">No scans yet</p>
              <p className="text-[11px] lg:text-sm text-muted-foreground mt-0.5">Scan a visitor&apos;s QR code to get started</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] lg:text-xs text-muted-foreground px-1 mb-2">
                {entries.length} {entries.length === 1 ? 'scan' : 'scans'} today
              </p>

              {/* Desktop table */}
              <div className="hidden lg:block rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/50">
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 w-[20%]">Visitor</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[13%]">Purpose</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[9%]">Status</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[14%]">Homeowner</th>
                      <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[10%]">Scanned</th>
                      <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 w-[24%]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {sorted.map((e, i) => {
                      const displayStatus = getDisplayStatus(e)
                      const needsAction = displayStatus === 'approved' || displayStatus === 'denied' || displayStatus === 'pending_exit'
                      return (
                        <tr
                          key={e.id}
                          className={`transition-colors ${needsAction ? 'bg-accent/[0.03]' : i % 2 === 1 ? 'bg-muted/15' : ''} ${flashIds[e.id] === 'approved' ? 'animate-flash-approved' : flashIds[e.id] === 'denied' ? 'animate-flash-denied' : ''}`}
                        >
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full overflow-hidden bg-muted/30 shrink-0">
                                <Image src={STATUS_AVATARS[displayStatus] || STATUS_AVATARS.pending} alt="" width={28} height={28} className="h-full w-full object-cover" />
                              </div>
                              <p className="text-[12px] font-medium truncate">{e.visitor_name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-0">
                            <p className="text-[12px] text-muted-foreground truncate">{e.purpose}</p>
                          </td>
                          <td className="px-4 py-3">
                            <StatusText status={displayStatus} />
                          </td>
                          <td className="px-4 py-3 max-w-0">
                            <p className="text-[12px] text-muted-foreground truncate">
                              {e.homeowner_name || '—'}
                              {e.homeowner_block && ` (${e.homeowner_block}, ${e.homeowner_lot})`}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-[11px] text-muted-foreground/60 whitespace-nowrap">
                            {timeAgo(e.created_at)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {displayStatus === 'approved' && (
                                <button
                                  onClick={() => handleConfirm(e, 'entry')}
                                  disabled={confirmLoading === e.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-accent hover:bg-accent/90 transition-colors disabled:opacity-50"
                                >
                                  {confirmLoading === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                                  Confirm Entry
                                </button>
                              )}
                              {displayStatus === 'pending_exit' && (
                                <button
                                  onClick={() => handleConfirm(e, 'exit')}
                                  disabled={confirmLoading === e.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                  {confirmLoading === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                                  Confirm Exit
                                </button>
                              )}
                              {displayStatus === 'denied' && (
                                <button
                                  onClick={() => handleDismiss(e.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-muted-foreground bg-muted hover:bg-muted/80 transition-colors"
                                >
                                  <XCircle className="h-3 w-3" />
                                  Dismiss
                                </button>
                              )}
                              {(displayStatus === 'pending' || displayStatus === 'inside' || displayStatus === 'exited') && (
                                <button
                                  onClick={() => setSelectedEntry(e)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="lg:hidden space-y-2.5">
                {sorted.map((e) => {
                  const displayStatus = getDisplayStatus(e)
                  return (
                    <div key={e.id} className={`rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card p-3.5 ${flashIds[e.id] === 'approved' ? 'animate-flash-approved' : flashIds[e.id] === 'denied' ? 'animate-flash-denied' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                          <Image src={STATUS_AVATARS[displayStatus] || STATUS_AVATARS.pending} alt="" width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate">{e.visitor_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <StatusText status={displayStatus} />
                            <span className="text-[9px] text-muted-foreground/50">{timeAgo(e.created_at)}</span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {displayStatus === 'approved' && (
                            <button
                              onClick={() => handleConfirm(e, 'entry')}
                              disabled={confirmLoading === e.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white bg-accent active:bg-accent/90 transition-colors disabled:opacity-50"
                            >
                              {confirmLoading === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />}
                              Confirm Entry
                            </button>
                          )}
                          {displayStatus === 'pending_exit' && (
                            <button
                              onClick={() => handleConfirm(e, 'exit')}
                              disabled={confirmLoading === e.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white bg-primary active:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {confirmLoading === e.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                              Confirm Exit
                            </button>
                          )}
                          {displayStatus === 'denied' && (
                            <button
                              onClick={() => handleDismiss(e.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground bg-muted active:bg-muted/80 transition-colors"
                            >
                              Dismiss
                            </button>
                          )}
                          {(displayStatus === 'pending' || displayStatus === 'inside' || displayStatus === 'exited') && (
                            <button
                              onClick={() => setSelectedEntry(e)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-primary bg-primary/5 active:bg-primary/10 transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => { if (!open) setSelectedEntry(null) }}>
        <DialogContent className="sm:max-w-md p-0">
          {selectedEntry && (() => {
            const displayStatus = getDisplayStatus(selectedEntry)
            return (
              <>
                {/* Header */}
                <div className="px-4 pt-4 pb-3">
                  <DialogHeader>
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                        <Image src={STATUS_AVATARS[displayStatus] || STATUS_AVATARS.pending} alt="" width={40} height={40} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <DialogTitle className="text-[14px] font-semibold">{selectedEntry.visitor_name}</DialogTitle>
                      </div>
                    </div>
                  </DialogHeader>
                </div>

                {/* Visitor details */}
                <div className="px-4 pb-3">
                  <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Visitor Details</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><User className="h-2.5 w-2.5" /> Purpose</span>
                      <p className="text-[12px] font-medium mt-0.5">{selectedEntry.purpose}</p>
                    </div>
                    <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Vehicle</span>
                      <p className="text-[12px] font-medium mt-0.5">{selectedEntry.vehicle_plate || '—'}</p>
                    </div>
                    <div className="rounded-lg bg-muted/20 px-2.5 py-2 col-span-2">
                      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> Homeowner</span>
                      <p className="text-[12px] font-medium mt-0.5">
                        {selectedEntry.homeowner_name || '—'}
                        {selectedEntry.homeowner_block && (
                          <span className="text-muted-foreground font-normal"> — Block {selectedEntry.homeowner_block}, Lot {selectedEntry.homeowner_lot}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gate activity timeline */}
                <div className="px-4 pb-3">
                  <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Gate Activity</p>
                  <div className="rounded-lg bg-muted/20 divide-y divide-border/30">
                    <div className="flex items-center justify-between px-2.5 py-2">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><ScanLine className="h-3 w-3 text-primary/60" /> Scanned at Gate</span>
                      <span className="text-[11px] font-medium">{new Date(selectedEntry.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {selectedEntry.entry_time && (
                      <div className="flex items-center justify-between px-2.5 py-2">
                        <span className="text-[11px] text-accent flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3" /> Entry Confirmed</span>
                        <span className="text-[11px] font-medium text-accent">{new Date(selectedEntry.entry_time).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {displayStatus === 'denied' && (
                      <div className="flex items-center justify-between px-2.5 py-2">
                        <span className="text-[11px] text-destructive flex items-center gap-1.5"><XCircle className="h-3 w-3" /> Entry Denied</span>
                        <span className="text-[11px] font-medium text-destructive">By homeowner</span>
                      </div>
                    )}
                    {selectedEntry.exit_time && (
                      <div className="flex items-center justify-between px-2.5 py-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><LogOut className="h-3 w-3" /> Exited</span>
                        <span className="text-[11px] font-medium">{new Date(selectedEntry.exit_time).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status banner */}
                <div className="px-4 pb-4">
                  {displayStatus === 'pending' && (
                    <div className="rounded-lg bg-secondary/5 border border-secondary/20 px-3 py-2.5 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-secondary shrink-0" />
                      <p className="text-[12px] text-secondary font-medium">Waiting for homeowner approval...</p>
                    </div>
                  )}
                  {displayStatus === 'approved' && (
                    <Button
                      onClick={() => handleConfirm(selectedEntry, 'entry')}
                      disabled={confirmLoading === selectedEntry.id}
                      className="w-full bg-accent hover:bg-accent/90 text-white h-10 text-xs lg:text-sm rounded-lg"
                    >
                      {confirmLoading === selectedEntry.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LogIn className="mr-1.5 h-4 w-4" />}
                      Confirm Entry
                    </Button>
                  )}
                  {displayStatus === 'denied' && (
                    <Button
                      onClick={() => handleDismiss(selectedEntry.id)}
                      variant="outline"
                      className="w-full h-10 text-xs lg:text-sm rounded-lg"
                    >
                      <XCircle className="mr-1.5 h-4 w-4" />
                      Dismiss
                    </Button>
                  )}
                  {displayStatus === 'inside' && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-[12px] text-primary font-medium">Visitor is inside the subdivision</p>
                    </div>
                  )}
                  {displayStatus === 'pending_exit' && (
                    <Button
                      onClick={() => handleConfirm(selectedEntry, 'exit')}
                      disabled={confirmLoading === selectedEntry.id}
                      className="w-full bg-primary hover:bg-primary/90 text-white h-10 text-xs lg:text-sm rounded-lg"
                    >
                      {confirmLoading === selectedEntry.id ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <LogOut className="mr-1.5 h-4 w-4" />}
                      Confirm Exit
                    </Button>
                  )}
                  {displayStatus === 'exited' && (
                    <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5 flex items-center gap-2">
                      <LogOut className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-[12px] text-muted-foreground font-medium">Visitor has exited the subdivision</p>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Mobile floating scan button */}
      <div className="lg:hidden fixed bottom-20 inset-x-0 px-4 z-10">
        <Button
          size="lg"
          className="w-full h-12 text-sm shadow-lg"
          disabled={loading || !guardId}
          onClick={() => setScanning(true)}
        >
          <ScanLine className="mr-2 h-4 w-4" />
          Scan QR Code
        </Button>
      </div>

      {/* Scanner Dialog — dashboard stays mounted underneath */}
      <Dialog open={scanning} onOpenChange={(open) => { if (!open) setScanning(false) }}>
        <DialogContent className="sm:max-w-md p-4">
          <DialogHeader className="sr-only"><DialogTitle>Scan QR Code</DialogTitle></DialogHeader>
          {scanning && (
            <QRScanner onScan={handleScan} onClose={() => setScanning(false)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
