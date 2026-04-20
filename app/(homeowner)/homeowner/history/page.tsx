'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_COLORS: Record<string, string> = {
  registered: 'text-muted-foreground',
  pending: 'text-secondary',
  approved: 'text-accent',
  denied: 'text-destructive',
}

function StatusText({ status }: { status: string }) {
  return (
    <span className={`text-[9px] font-medium ${STATUS_COLORS[status] ?? 'text-muted-foreground'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}
import { ProofGallery } from '@/components/shared/proof-gallery'
import { ImageCarousel } from '@/components/shared/image-carousel'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Car, Clock, LogIn, LogOut, SlidersHorizontal, X, Phone, Eye, ChevronLeft, ChevronRight } from 'lucide-react'

interface VisitRecord {
  id: string
  visitor_name: string
  phone: string | null
  purpose: string
  vehicle_plate: string | null
  proof_urls: string[]
  denial_reason: string | null
  status: string
  entry_time: string | null
  exit_time: string | null
  created_at: string
}

const STATUS_AVATARS: Record<string, string> = {
  pending: '/illustrations/notif-at-gate.png',
  approved: '/illustrations/pfp.png',
  denied: '/illustrations/notif-denied.png',
  exited: '/illustrations/notif-exited.png',
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function HistoryPage() {
  const [records, setRecords] = useState<VisitRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [userId, setUserId] = useState<string | null>(null)
  const [statusFilter, setStatusFilterRaw] = useState('all')
  const [search, setSearchRaw] = useState('')
  const [dateFrom, setDateFromRaw] = useState('')
  const [dateTo, setDateToRaw] = useState('')

  // Wrap filter setters to reset page
  const setSearch = (v: string) => { setSearchRaw(v); setCurrentPage(1) }
  const setStatusFilter = (v: string) => { setStatusFilterRaw(v); setCurrentPage(1) }
  const setDateFrom = (v: string) => { setDateFromRaw(v); setCurrentPage(1) }
  const setDateTo = (v: string) => { setDateToRaw(v); setCurrentPage(1) }
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<VisitRecord | null>(null)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      supabase
        .from('visitors')
        .select('id, name, phone, purpose, vehicle_plate, proof_urls, denial_reason, status, created_at')
        .eq('homeowner_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data: visitors }) => {
          if (!visitors) { setLoading(false); return }

          const visitorIds = visitors.map((v) => v.id)

          if (visitorIds.length === 0) {
            setRecords([])
            setLoading(false)
            return
          }

          supabase
            .from('visit_logs')
            .select('visitor_id, entry_time, exit_time')
            .in('visitor_id', visitorIds)
            .then(({ data: logs }) => {
              const logMap = new Map<string, { entry_time: string | null; exit_time: string | null }>()
              logs?.forEach((log) => { logMap.set(log.visitor_id, log) })

              const combined: VisitRecord[] = visitors.map((v) => {
                const log = logMap.get(v.id)
                return {
                  id: v.id,
                  visitor_name: v.name,
                  phone: v.phone,
                  purpose: v.purpose,
                  vehicle_plate: v.vehicle_plate,
                  proof_urls: v.proof_urls ?? [],
                  denial_reason: v.denial_reason,
                  status: v.status,
                  entry_time: log?.entry_time ?? null,
                  exit_time: log?.exit_time ?? null,
                  created_at: v.created_at,
                }
              })

              setRecords(combined)
              setLoading(false)
            })
        })
    })
  }, [refreshKey])

  const handleRealtimeChange = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useRealtime({ table: 'visitors', event: '*', filter: userId ? `homeowner_id=eq.${userId}` : undefined, onData: handleRealtimeChange })
  useRealtime({ table: 'visit_logs', event: '*', onData: handleRealtimeChange })

  const filtered = records.filter((r) => {
    if (search && !r.visitor_name.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (dateFrom && r.created_at.split('T')[0] < dateFrom) return false
    if (dateTo && r.created_at.split('T')[0] > dateTo) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginatedDesktop = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-4">
      {/* Mobile: Search + filter */}
      <div className="lg:hidden space-y-3">
        {/* Search with filter toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search visitor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 text-[16px] placeholder:text-[13px] rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card border-0"
            />
          </div>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors shadow-card ${
              (dateFrom || dateTo) ? 'bg-primary text-white ring-1 ring-primary' : 'bg-card text-muted-foreground ring-1 ring-foreground/[0.06]'
            }`}
          >
            {showDateFilter ? <X className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
          </button>
        </div>

        {/* Status chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          {(['all', 'registered', 'pending', 'approved', 'denied'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground ring-1 ring-foreground/[0.06]'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Date filter expand */}
        {showDateFilter && (
          <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card p-3 space-y-2.5 animate-fade-in">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Date Range</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-muted-foreground">From</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-[14px] rounded-lg bg-muted/30 ring-0 border-0 px-2.5" />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-[10px] text-muted-foreground">To</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-[14px] rounded-lg bg-muted/30 ring-0 border-0 px-2.5" />
              </div>
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="w-full h-8 rounded-lg text-[11px] font-medium text-destructive bg-destructive/5 active:bg-destructive/10 transition-colors"
              >
                Clear Dates
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop: Unified filter bar */}
      <div className="hidden lg:flex items-center gap-4 rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card px-4 py-2.5">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search visitor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-[12px] rounded-lg bg-muted/30 ring-0 shadow-none border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
          />
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border/50 shrink-0" />

        {/* Status chips */}
        <div className="flex gap-1.5 shrink-0">
          {(['all', 'registered', 'pending', 'approved', 'denied'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-border/50 shrink-0" />

        {/* Date range */}
        <div className="flex items-center gap-2 shrink-0">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[130px] h-8 text-[12px] rounded-lg bg-muted/30 ring-0 shadow-none border-0 px-2.5 focus-visible:ring-1 focus-visible:ring-primary/30" />
          <span className="text-[11px] text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[130px] h-8 text-[12px] rounded-lg bg-muted/30 ring-0 shadow-none border-0 px-2.5 focus-visible:ring-1 focus-visible:ring-primary/30" />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo('') }}
              className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        /* Empty state with illustration */
        <div className="flex flex-col items-center py-8">
          <Image
            src="/illustrations/no-history.png"
            alt=""
            width={180}
            height={180}
            className="opacity-80 mb-4"
          />
          <p className="text-sm font-medium text-foreground">No records yet</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {search || statusFilter !== 'all' || dateFrom || dateTo
              ? 'Try adjusting your filters'
              : 'Visit history will appear here'}
          </p>
        </div>
      ) : (
        <div>
          {/* Count */}
          <p className="text-[10px] lg:text-xs text-muted-foreground px-1 mb-2">
            {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
          </p>

          {/* Desktop table view */}
          <div className="hidden lg:block rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 w-[20%]">Visitor</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[14%]">Purpose</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[10%]">Status</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[11%]">Vehicle</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[9%]">Entry</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[9%]">Exit</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[12%]">Date</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 w-[15%]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {paginatedDesktop.map((r, i) => (
                  <tr
                    key={r.id}
                    className={`hover:bg-primary/[0.02] transition-colors ${i % 2 === 1 ? 'bg-muted/15' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full overflow-hidden bg-muted/30 shrink-0">
                          <Image src={STATUS_AVATARS[r.status] || STATUS_AVATARS.pending} alt="" width={28} height={28} className="h-full w-full object-cover" />
                        </div>
                        <p className="text-[12px] font-medium truncate">{r.visitor_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-0">
                      <p className="text-[12px] text-muted-foreground truncate">{r.purpose}</p>
                    </td>
                    <td className="px-4 py-3"><StatusText status={r.status} /></td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{r.vehicle_plate || '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {r.entry_time
                        ? new Date(r.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">
                      {r.exit_time
                        ? new Date(r.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground/60 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        onClick={() => setSelectedRecord(r)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Desktop pagination */}
          {totalPages > 1 && (
            <div className="hidden lg:flex items-center justify-between mt-4">
              <p className="text-[12px] text-muted-foreground">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, idx) =>
                    typeof p === 'string' ? (
                      <span key={`dot-${idx}`} className="px-1 text-[12px] text-muted-foreground/50">...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`h-8 min-w-8 px-2 rounded-lg text-[12px] font-medium transition-colors ${
                          currentPage === p
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Detail dialog */}
          <Dialog open={!!selectedRecord && !carouselOpen} onOpenChange={(open) => { if (!open) setSelectedRecord(null) }}>
            <DialogContent className="sm:max-w-md p-0">
              {selectedRecord && (
                <>
                  {/* Header */}
                  <div className="px-4 pt-4 pb-3">
                    <DialogHeader>
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                          <Image src={STATUS_AVATARS[selectedRecord.status] || STATUS_AVATARS.pending} alt="" width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <DialogTitle className="text-[14px] font-semibold">{selectedRecord.visitor_name}</DialogTitle>
                        </div>
                      </div>
                    </DialogHeader>
                  </div>

                  {/* Visitor details */}
                  <div className="px-4 pb-3">
                    <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Visitor Details</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Purpose</span>
                        <p className="text-[12px] font-medium mt-0.5">{selectedRecord.purpose}</p>
                      </div>
                      <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Vehicle</span>
                        <p className="text-[12px] font-medium mt-0.5">{selectedRecord.vehicle_plate || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> Phone</span>
                        <p className="text-[12px] font-medium mt-0.5">{selectedRecord.phone || '—'}</p>
                      </div>
                      <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Registered</span>
                        <p className="text-[12px] font-medium mt-0.5">{new Date(selectedRecord.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Gate activity */}
                  <div className="px-4 pb-3">
                    <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Gate Activity</p>
                    <div className="rounded-lg bg-muted/20 divide-y divide-border/30">
                      <div className="flex items-center justify-between px-2.5 py-2">
                        <span className="text-[11px] text-accent flex items-center gap-1.5"><LogIn className="h-3 w-3" /> Entry</span>
                        <span className="text-[11px] font-medium">
                          {selectedRecord.entry_time
                            ? new Date(selectedRecord.entry_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : <span className="text-muted-foreground/40 font-normal">—</span>}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-2.5 py-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><LogOut className="h-3 w-3 text-muted-foreground/50" /> Exit</span>
                        <span className="text-[11px] font-medium">
                          {selectedRecord.exit_time
                            ? new Date(selectedRecord.exit_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : <span className="text-muted-foreground/40 font-normal">—</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="px-4 pb-3">
                    <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Status</p>
                    {selectedRecord.status === 'registered' && (
                      <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                        <p className="text-[12px] text-muted-foreground font-medium">Registered — not yet at gate</p>
                      </div>
                    )}
                    {selectedRecord.status === 'pending' && (
                      <div className="rounded-lg bg-secondary/5 border border-secondary/20 px-3 py-2.5 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-secondary shrink-0" />
                        <p className="text-[12px] text-secondary font-medium">Waiting at the gate</p>
                      </div>
                    )}
                    {selectedRecord.status === 'approved' && (
                      <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2.5 flex items-center gap-2">
                        <LogIn className="h-4 w-4 text-accent shrink-0" />
                        <p className="text-[12px] text-accent font-medium">Approved — entry granted</p>
                      </div>
                    )}
                    {selectedRecord.status === 'denied' && (
                      <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5 flex items-center gap-2">
                        <X className="h-4 w-4 text-destructive shrink-0" />
                        <p className="text-[12px] text-destructive font-medium">
                          Entry denied{selectedRecord.denial_reason ? ` — ${selectedRecord.denial_reason}` : ''}
                        </p>
                      </div>
                    )}
                  </div>

                  {(selectedRecord.proof_urls?.length ?? 0) > 0 && (
                    <div className="px-4 pb-4">
                      <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Proof Photos</p>
                      <ProofGallery
                        urls={selectedRecord.proof_urls ?? []}
                        onImageClick={(i) => { setCarouselIndex(i); setCarouselOpen(true) }}
                      />
                    </div>
                  )}

                  {(selectedRecord.proof_urls?.length ?? 0) === 0 && <div className="h-1" />}
                </>
              )}
            </DialogContent>
          </Dialog>

          <ImageCarousel
            urls={selectedRecord?.proof_urls ?? []}
            initialIndex={carouselIndex}
            open={carouselOpen}
            onClose={() => setCarouselOpen(false)}
          />

          {/* Mobile card view */}
          <div className="lg:hidden space-y-2.5">
          {filtered.map((r) => (
              <div key={r.id} className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card p-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                    <Image src={STATUS_AVATARS[r.status] || STATUS_AVATARS.pending} alt="" width={40} height={40} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{r.visitor_name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusText status={r.status} />
                      <span className="text-[9px] text-muted-foreground/50">{timeAgo(r.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecord(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-primary bg-primary/5 active:bg-primary/10 transition-colors shrink-0"
                  >
                    <Eye className="h-3 w-3" />
                    View
                  </button>
                </div>
              </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}
