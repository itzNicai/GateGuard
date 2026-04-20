'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Dialog as BulkDialog, DialogContent as BulkDialogContent, DialogHeader as BulkDialogHeader, DialogTitle as BulkDialogTitle } from '@/components/ui/dialog'
import { TablePagination } from '@/components/admin/table-pagination'
import { ProofGallery } from '@/components/shared/proof-gallery'
import { ImageCarousel } from '@/components/shared/image-carousel'
import { Button } from '@/components/ui/button'
import { Search, Clock, Eye, QrCode, LogIn, LogOut, MapPin, User, Car, Shield, ScanLine, X, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_AVATARS: Record<string, string> = {
  registered: '/illustrations/notif-at-gate.png',
  pending: '/illustrations/notif-at-gate.png',
  approved: '/illustrations/notif-approved.png',
  denied: '/illustrations/notif-denied.png',
}

const STATUS_COLORS: Record<string, string> = {
  registered: 'text-muted-foreground',
  pending: 'text-secondary',
  approved: 'text-accent',
  denied: 'text-destructive',
  inside: 'text-primary',
  completed: 'text-muted-foreground',
}

interface LogEntry {
  id: string
  visitor_name: string
  visitor_phone: string | null
  purpose: string
  vehicle_plate: string | null
  visitor_status: string
  qr_code: string | null
  proof_urls: string[]
  expires_at: string | null
  homeowner_name: string | null
  homeowner_block: string | null
  homeowner_lot: string | null
  guard_name: string | null
  entry_time: string | null
  exit_time: string | null
  created_at: string
  source: 'log' | 'visitor'
}

function getDisplayStatus(log: LogEntry): string {
  if (log.exit_time && log.entry_time) return 'completed'
  if (log.entry_time && !log.exit_time) return 'inside'
  return log.visitor_status
}

function StatusText({ status }: { status: string }) {
  const labels: Record<string, string> = { completed: 'Completed', inside: 'Inside', registered: 'Registered', pending: 'Pending', approved: 'Approved', denied: 'Denied' }
  return (
    <span className={`text-[9px] font-medium ${STATUS_COLORS[status] ?? 'text-muted-foreground'}`}>
      {labels[status] ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchRaw, setSearchRaw] = useState('')
  const [statusFilterRaw, setStatusFilterRaw] = useState('all')
  const [dateFromRaw, setDateFromRaw] = useState('')
  const [dateToRaw, setDateToRaw] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 20
  const search = searchRaw; const statusFilter = statusFilterRaw; const dateFrom = dateFromRaw; const dateTo = dateToRaw
  const setSearch = (v: string) => { setSearchRaw(v); setCurrentPage(1) }
  const setStatusFilter = (v: string) => { setStatusFilterRaw(v); setCurrentPage(1) }
  const setDateFrom = (v: string) => { setDateFromRaw(v); setCurrentPage(1) }
  const setDateTo = (v: string) => { setDateToRaw(v); setCurrentPage(1) }
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [selected, setSelected] = useState<LogEntry | null>(null)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  // Selection & bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('')
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

  const handleRealtimeChange = useCallback(() => setRefreshKey((k) => k + 1), [])
  useRealtime({ table: 'visitors', event: '*', onData: handleRealtimeChange })
  useRealtime({ table: 'visit_logs', event: '*', onData: handleRealtimeChange })

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: logData } = await supabase
        .from('visit_logs')
        .select(`
          id, entry_time, exit_time, created_at,
          visitor:visitors(id, name, phone, purpose, vehicle_plate, status, qr_code, proof_urls, expires_at,
            homeowner:profiles!visitors_homeowner_id_fkey(full_name, block, lot)
          ),
          guard:profiles!visit_logs_guard_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(200)

      const { data: visitorData } = await supabase
        .from('visitors')
        .select(`
          id, name, phone, purpose, vehicle_plate, status, qr_code, proof_urls, expires_at, created_at,
          homeowner:profiles!visitors_homeowner_id_fkey(full_name, block, lot)
        `)
        .order('created_at', { ascending: false })
        .limit(300)

      const entries: LogEntry[] = []
      const visitorsWithLogs = new Set<string>()

      if (logData) {
        for (const log of logData) {
          const visitor = log.visitor as unknown as {
            id: string; name: string; phone: string | null; purpose: string; vehicle_plate: string | null;
            status: string; qr_code: string | null; proof_urls: string[] | null; expires_at: string | null;
            homeowner: { full_name: string; block: string | null; lot: string | null } | null
          } | null
          const guard = log.guard as unknown as { full_name: string } | null
          if (visitor?.id) visitorsWithLogs.add(visitor.id)
          entries.push({
            id: log.id,
            visitor_name: visitor?.name ?? 'Unknown',
            visitor_phone: visitor?.phone ?? null,
            purpose: visitor?.purpose ?? '',
            vehicle_plate: visitor?.vehicle_plate ?? null,
            visitor_status: visitor?.status ?? 'pending',
            qr_code: visitor?.qr_code ?? null,
            proof_urls: visitor?.proof_urls ?? [],
            expires_at: visitor?.expires_at ?? null,
            homeowner_name: visitor?.homeowner?.full_name ?? null,
            homeowner_block: visitor?.homeowner?.block ?? null,
            homeowner_lot: visitor?.homeowner?.lot ?? null,
            guard_name: guard?.full_name ?? null,
            entry_time: log.entry_time,
            exit_time: log.exit_time,
            created_at: log.created_at,
            source: 'log',
          })
        }
      }

      if (visitorData) {
        for (const v of visitorData) {
          if (visitorsWithLogs.has(v.id)) continue
          const homeowner = v.homeowner as unknown as { full_name: string; block: string | null; lot: string | null } | null
          entries.push({
            id: v.id, visitor_name: v.name, visitor_phone: v.phone, purpose: v.purpose,
            vehicle_plate: v.vehicle_plate, visitor_status: v.status, qr_code: v.qr_code,
            proof_urls: v.proof_urls ?? [], expires_at: v.expires_at,
            homeowner_name: homeowner?.full_name ?? null, homeowner_block: homeowner?.block ?? null,
            homeowner_lot: homeowner?.lot ?? null, guard_name: null,
            entry_time: null, exit_time: null, created_at: v.created_at, source: 'visitor',
          })
        }
      }

      entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setLogs(entries)
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const filtered = logs.filter((log) => {
    if (search && !log.visitor_name.toLowerCase().includes(search.toLowerCase()) && !log.homeowner_name?.toLowerCase().includes(search.toLowerCase())) return false
    const ds = getDisplayStatus(log)
    if (statusFilter !== 'all' && ds !== statusFilter) return false
    if (dateFrom) { const d = (log.entry_time ?? log.created_at).split('T')[0]; if (d < dateFrom) return false }
    if (dateTo) { const d = (log.entry_time ?? log.created_at).split('T')[0]; if (d > dateTo) return false }
    return true
  })

  // Selection helpers
  const allFilteredChecked = filtered.length > 0 && filtered.every((l) => selectedIds.has(`${l.source}-${l.id}`))
  const selectedCount = [...selectedIds].length

  function toggleSelect(key: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next })
  }
  function toggleSelectAll() {
    if (allFilteredChecked) {
      setSelectedIds((prev) => { const next = new Set(prev); filtered.forEach((l) => next.delete(`${l.source}-${l.id}`)); return next })
    } else {
      setSelectedIds((prev) => { const next = new Set(prev); filtered.forEach((l) => next.add(`${l.source}-${l.id}`)); return next })
    }
  }

  async function handleBulkDelete() {
    if (bulkDeleteConfirmText !== 'DELETE') return
    setBulkDeleteLoading(true)
    const logIds: string[] = []
    const visitorIds: string[] = []
    for (const key of selectedIds) {
      const entry = logs.find((l) => `${l.source}-${l.id}` === key)
      if (!entry) continue
      if (entry.source === 'log') logIds.push(entry.id)
      else visitorIds.push(entry.id)
    }
    const res = await fetch('/api/admin/logs', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ log_ids: logIds, visitor_ids: visitorIds }) })
    const data = await res.json()
    setBulkDeleteLoading(false)
    if (!res.ok) { toast.error(data.error || 'Failed to delete'); return }
    toast.success(`Deleted ${(data.deletedLogs ?? 0) + (data.deletedVisitors ?? 0)} record(s)`)
    setSelectedIds(new Set()); setBulkDeleteConfirmText(''); setShowBulkDelete(false)
    setRefreshKey((k) => k + 1)
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const stats = {
    total: logs.length,
    inside: logs.filter((l) => getDisplayStatus(l) === 'inside').length,
    completed: logs.filter((l) => getDisplayStatus(l) === 'completed').length,
    pending: logs.filter((l) => getDisplayStatus(l) === 'pending').length,
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-3"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] overflow-hidden -mb-8">
      <div className="shrink-0 space-y-3 pb-3">
        {/* Row 1: Header + actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm lg:text-base font-semibold">Activity Logs</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-muted-foreground">{stats.total} total</span>
              <span className="text-[11px] text-primary font-medium">{stats.inside} inside</span>
              <span className="text-[11px] text-accent font-medium">{stats.completed} completed</span>
              <span className="text-[11px] text-secondary font-medium">{stats.pending} pending</span>
            </div>
          </div>
          {selectedCount > 0 && (
            <Button size="sm" variant="outline" className="text-[11px] h-7 rounded-lg px-2.5 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowBulkDelete(true)}>
              <Trash2 className="mr-1 h-3 w-3" />
              Delete {selectedCount}
            </Button>
          )}
        </div>

        {/* Row 2: Search + status chips + date toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-[12px] rounded-lg" />
          </div>
          <div className="flex gap-1 shrink-0">
            {(['all', 'pending', 'approved', 'inside', 'completed', 'denied'] as const).map((f) => (
              <button key={f} onClick={() => setStatusFilter(f)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${statusFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className={`shrink-0 h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${(dateFrom || dateTo) ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-muted'}`}
          >
            {showDateFilter ? <X className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Row 3: Date filter (collapsible) */}
        {showDateFilter && (
          <div className="flex items-center gap-2 animate-fade-in">
            <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[130px] h-7 text-[11px] rounded-lg bg-muted/30 ring-0 border-0 px-2" />
            <span className="text-[10px] text-muted-foreground">to</span>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[130px] h-7 text-[11px] rounded-lg bg-muted/30 ring-0 border-0 px-2" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo('') }} className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card">
          <Image src="/illustrations/no-history.png" alt="" width={120} height={120} className="opacity-60 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No logs found</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            {search || statusFilter !== 'all' || dateFrom || dateTo ? 'Try adjusting your filters' : 'Activity will appear here'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <p className="text-[10px] text-muted-foreground px-0.5 mb-1.5 shrink-0">{filtered.length} {filtered.length === 1 ? 'record' : 'records'}</p>
          <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted border-b border-border/50">
                    <th className="text-center px-2 py-2.5 w-[36px]">
                      <input type="checkbox" checked={allFilteredChecked} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                    </th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Visitor</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Homeowner</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Guard</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Entry</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Exit</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Date</th>
                    <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2.5 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {paginated.map((log, i) => {
                    const ds = getDisplayStatus(log)
                    const key = `${log.source}-${log.id}`
                    return (
                      <tr key={key} className={`transition-colors hover:bg-primary/[0.02] ${selectedIds.has(key) ? 'bg-primary/[0.04]' : i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                        <td className="text-center px-2 py-2">
                          <input type="checkbox" checked={selectedIds.has(key)} onChange={() => toggleSelect(key)} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full overflow-hidden bg-muted/30 shrink-0">
                              <Image src={STATUS_AVATARS[log.visitor_status] || STATUS_AVATARS.pending} alt="" width={24} height={24} className="h-full w-full object-cover" />
                            </div>
                            <span className="text-[12px] font-medium truncate">{log.visitor_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[12px] text-muted-foreground truncate max-w-0">
                          {log.homeowner_name || <span className="text-muted-foreground/30">—</span>}
                        </td>
                        <td className="px-3 py-2"><StatusText status={ds} /></td>
                        <td className="px-3 py-2 text-[12px] text-muted-foreground truncate max-w-0">{log.guard_name || <span className="text-muted-foreground/30">—</span>}</td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground/60">
                          {log.entry_time ? new Date(log.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-muted-foreground/30">—</span>}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground/60">
                          {log.exit_time ? new Date(log.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-muted-foreground/30">—</span>}
                        </td>
                        <td className="px-3 py-2 text-[11px] text-muted-foreground/60 whitespace-nowrap">{timeAgo(log.created_at)}</td>
                        <td className="text-center px-2 py-2">
                          <button onClick={() => setSelected(log)} className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/40 hover:text-primary hover:bg-primary/5 transition-colors">
                            <Eye className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected && !carouselOpen} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-md p-0">
          {selected && (() => {
            const ds = getDisplayStatus(selected)
            return (
              <>
                {/* Header */}
                <div className="px-4 pt-4 pb-3">
                  <DialogHeader>
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                        <Image src={STATUS_AVATARS[selected.visitor_status] || STATUS_AVATARS.pending} alt="" width={40} height={40} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <DialogTitle className="text-[14px] font-semibold">{selected.visitor_name}</DialogTitle>
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
                      <p className="text-[12px] font-medium mt-0.5">{selected.purpose}</p>
                    </div>
                    <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Vehicle</span>
                      <p className="text-[12px] font-medium mt-0.5">{selected.vehicle_plate || '—'}</p>
                    </div>
                    <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><MapPin className="h-2.5 w-2.5" /> Homeowner</span>
                      <p className="text-[12px] font-medium mt-0.5">
                        {selected.homeowner_name || '—'}
                        {selected.homeowner_block && <span className="text-muted-foreground font-normal"> ({selected.homeowner_block}, {selected.homeowner_lot})</span>}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                      <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Shield className="h-2.5 w-2.5" /> Guard</span>
                      <p className="text-[12px] font-medium mt-0.5">{selected.guard_name || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Gate activity */}
                <div className="px-4 pb-3">
                  <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Gate Activity</p>
                  <div className="rounded-lg bg-muted/20 divide-y divide-border/30">
                    <div className="flex items-center justify-between px-2.5 py-2">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><ScanLine className="h-3 w-3 text-muted-foreground/50" /> Registered</span>
                      <span className="text-[11px] font-medium">{new Date(selected.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {selected.entry_time && (
                      <div className="flex items-center justify-between px-2.5 py-2">
                        <span className="text-[11px] text-accent flex items-center gap-1.5"><LogIn className="h-3 w-3" /> Entry</span>
                        <span className="text-[11px] font-medium text-accent">{new Date(selected.entry_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {selected.exit_time && (
                      <div className="flex items-center justify-between px-2.5 py-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5"><LogOut className="h-3 w-3" /> Exit</span>
                        <span className="text-[11px] font-medium">{new Date(selected.exit_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="px-4 pb-3">
                  <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Status</p>
                  {ds === 'pending' && (
                    <div className="rounded-lg bg-secondary/5 border border-secondary/20 px-3 py-2.5 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-secondary shrink-0" />
                      <p className="text-[12px] text-secondary font-medium">Waiting for homeowner approval</p>
                    </div>
                  )}
                  {ds === 'approved' && (
                    <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2.5 flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-accent shrink-0" />
                      <p className="text-[12px] text-accent font-medium">Approved — awaiting guard confirmation</p>
                    </div>
                  )}
                  {ds === 'inside' && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 flex items-center gap-2">
                      <LogIn className="h-4 w-4 text-primary shrink-0" />
                      <p className="text-[12px] text-primary font-medium">Visitor is inside the subdivision</p>
                    </div>
                  )}
                  {ds === 'completed' && (
                    <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5 flex items-center gap-2">
                      <LogOut className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-[12px] text-muted-foreground font-medium">Visit completed</p>
                    </div>
                  )}
                  {ds === 'denied' && (
                    <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5 flex items-center gap-2">
                      <X className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-[12px] text-destructive font-medium">Entry denied by homeowner</p>
                    </div>
                  )}
                  {ds === 'registered' && (
                    <div className="rounded-lg bg-muted/30 border border-border px-3 py-2.5 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-[12px] text-muted-foreground font-medium">Registered — not yet at gate</p>
                    </div>
                  )}
                </div>

                {/* QR + Proof */}
                {(selected.qr_code || (selected.proof_urls?.length ?? 0) > 0) && (
                  <div className="px-4 pb-4">
                    {selected.qr_code && (
                      <div className="rounded-lg bg-muted/20 p-3 flex flex-col items-center mb-2">
                        <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1 mb-2"><QrCode className="h-2.5 w-2.5" /> QR Code</span>
                        <QRCodeSVG value={selected.qr_code} size={100} level="H" includeMargin imageSettings={{ src: '/logo.png', width: 20, height: 20, excavate: true }} />
                      </div>
                    )}
                    {(selected.proof_urls?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Proof Photos</p>
                        <ProofGallery
                          urls={selected.proof_urls ?? []}
                          onImageClick={(i) => { setCarouselIndex(i); setCarouselOpen(true) }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {!selected.qr_code && (selected.proof_urls?.length ?? 0) === 0 && <div className="h-1" />}
              </>
            )
          })()}
        </DialogContent>
      </Dialog>

      <ImageCarousel
        urls={selected?.proof_urls ?? []}
        initialIndex={carouselIndex}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
      />

      {/* Bulk delete dialog — double confirmation */}
      <BulkDialog open={showBulkDelete} onOpenChange={(open) => { if (!open) { setShowBulkDelete(false); setBulkDeleteConfirmText('') } }}>
        <BulkDialogContent className="sm:max-w-sm p-0">
          <div className="px-4 pt-4 pb-3">
            <BulkDialogHeader><BulkDialogTitle className="text-[14px] font-semibold text-destructive">Delete {selectedCount} Record(s)</BulkDialogTitle></BulkDialogHeader>
            <p className="text-[11px] text-muted-foreground mt-1">This action cannot be undone. All selected visit logs and visitor records will be permanently removed.</p>
          </div>
          <div className="px-4 pb-4 space-y-3">
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
              <p className="text-[12px] text-destructive font-medium">Type DELETE to confirm</p>
            </div>
            <Input placeholder="Type DELETE" value={bulkDeleteConfirmText} onChange={(e) => setBulkDeleteConfirmText(e.target.value)} className="h-10 lg:h-9 rounded-lg" />
            <div className="flex gap-2 pt-1">
              <Button onClick={handleBulkDelete} disabled={bulkDeleteConfirmText !== 'DELETE' || bulkDeleteLoading} variant="destructive" className="flex-1 h-10 text-sm rounded-lg">
                {bulkDeleteLoading ? 'Deleting...' : `Delete ${selectedCount} Record(s)`}
              </Button>
              <Button variant="outline" onClick={() => { setShowBulkDelete(false); setBulkDeleteConfirmText('') }} className="h-10 text-sm rounded-lg">Cancel</Button>
            </div>
          </div>
        </BulkDialogContent>
      </BulkDialog>
    </div>
  )
}
