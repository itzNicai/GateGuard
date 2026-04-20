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
  registered: '/illustrations/pfp.png',
  pending: '/illustrations/pfp.png',
  approved: '/illustrations/pfp.png',
  denied: '/illustrations/pfp.png',
}

const STATUS_COLORS: Record<string, string> = {
  registered: 'text-[#d4c5b0]',
  pending: 'text-[#c9a962]',
  approved: 'text-[#c9a962]',
  denied: 'text-red-400',
  inside: 'text-[#f5e6d3]',
  completed: 'text-[#d4c5b0]',
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
    <span className={`text-xs font-medium ${STATUS_COLORS[status] ?? 'text-[#d4c5b0]'}`}>
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
      <div className="min-h-screen bg-[#3d3229]">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <Skeleton className="h-16 rounded-xl bg-[#4a3f35]/50" />
            <Skeleton className="h-16 rounded-xl bg-[#4a3f35]/50" />
            <Skeleton className="h-16 rounded-xl bg-[#4a3f35]/50" />
            <Skeleton className="h-16 rounded-xl bg-[#4a3f35]/50" />
          </div>
          <Skeleton className="h-64 rounded-xl bg-[#4a3f35]/50" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#3d3229]">
      <header className="border-b border-[#d4c5b0]/20 bg-[#3d3229]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#d4c5b0]/20 backdrop-blur-md border border-[#e8dcc8]/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#f5e6d3]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[16px] font-bold text-[#f5e6d3] leading-none tracking-wide">GateGuard</span>
              <span className="text-[12px] text-[#d4c5b0] leading-tight mt-1 font-medium tracking-wider uppercase">Sabang Dexterville</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#f5e6d3] tracking-tight">
            Activity <span className="text-[#c9a962] italic font-serif">Logs</span>
          </h1>
          <p className="text-[#d4c5b0] mt-2 text-sm">Monitor visitor activity and gate access history</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-[#4a3f35]/60 backdrop-blur-md border border-[#d4c5b0]/20 p-4 text-center">
            <p className="text-[10px] text-[#d4c5b0] uppercase tracking-wider font-medium">Total Records</p>
            <p className="text-2xl font-bold text-[#f5e6d3] mt-1">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-[#4a3f35]/60 backdrop-blur-md border border-[#d4c5b0]/20 p-4 text-center">
            <p className="text-[10px] text-[#d4c5b0] uppercase tracking-wider font-medium">Inside</p>
            <p className="text-2xl font-bold text-[#f5e6d3] mt-1">{stats.inside}</p>
          </div>
          <div className="rounded-xl bg-[#4a3f35]/60 backdrop-blur-md border border-[#d4c5b0]/20 p-4 text-center">
            <p className="text-[10px] text-[#d4c5b0] uppercase tracking-wider font-medium">Completed</p>
            <p className="text-2xl font-bold text-[#c9a962] mt-1">{stats.completed}</p>
          </div>
          <div className="rounded-xl bg-[#4a3f35]/60 backdrop-blur-md border border-[#d4c5b0]/20 p-4 text-center">
            <p className="text-[10px] text-[#d4c5b0] uppercase tracking-wider font-medium">Pending</p>
            <p className="text-2xl font-bold text-[#c9a962] mt-1">{stats.pending}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4c5b0]" />
            <Input 
              placeholder="Search visitors or homeowners..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-10 bg-[#4a3f35] border-[#d4c5b0]/20 text-[#f5e6d3] placeholder:text-[#d4c5b0]/50 rounded-full" 
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'approved', 'inside', 'completed', 'denied'] as const).map((f) => (
              <button 
                key={f} 
                onClick={() => setStatusFilter(f)} 
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  statusFilter === f 
                    ? 'bg-[#c9a962] text-[#3d3229]' 
                    : 'bg-[#4a3f35] text-[#d4c5b0] border border-[#d4c5b0]/20 hover:border-[#c9a962]/50'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`h-9 w-9 rounded-full flex items-center justify-center transition-all border ${
                (dateFrom || dateTo) 
                  ? 'bg-[#c9a962] text-[#3d3229] border-[#c9a962]' 
                  : 'bg-[#4a3f35] text-[#d4c5b0] border-[#d4c5b0]/20 hover:border-[#c9a962]/50'
              }`}
            >
              {showDateFilter ? <X className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showDateFilter && (
          <div className="flex items-center gap-3 animate-fade-in bg-[#4a3f35]/40 rounded-xl p-4 border border-[#d4c5b0]/10">
            <Clock className="h-4 w-4 text-[#d4c5b0]" />
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
                className="w-auto bg-[#3d3229] border-[#d4c5b0]/20 text-[#f5e6d3] rounded-lg text-sm" 
              />
              <span className="text-[#d4c5b0] text-sm">to</span>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                className="w-auto bg-[#3d3229] border-[#d4c5b0]/20 text-[#f5e6d3] rounded-lg text-sm" 
              />
            </div>
            {(dateFrom || dateTo) && (
              <button 
                onClick={() => { setDateFrom(''); setDateTo('') }} 
                className="h-8 w-8 rounded-full flex items-center justify-center text-[#d4c5b0] hover:bg-red-400/10 hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {selectedCount > 0 && (
          <div className="flex items-center justify-between bg-red-400/10 border border-red-400/20 rounded-xl p-4">
            <span className="text-sm text-red-400 font-medium">{selectedCount} record(s) selected</span>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-red-400 border-red-400/30 hover:bg-red-400/10 rounded-full" 
              onClick={() => setShowBulkDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          </div>
        )}


        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl bg-[#4a3f35]/40 border border-[#d4c5b0]/10">
            <Image src="/illustrations/no-history.png" alt="" width={120} height={120} className="opacity-60 mb-4" />
            <p className="text-lg font-medium text-[#d4c5b0]">No logs found</p>
            <p className="text-sm text-[#d4c5b0]/60 mt-1">
              {search || statusFilter !== 'all' || dateFrom || dateTo ? 'Try adjusting your filters' : 'Activity will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-[#d4c5b0]">
              Showing {filtered.length} {filtered.length === 1 ? 'record' : 'records'}
            </div>
            
            <div className="rounded-xl border border-[#d4c5b0]/20 overflow-hidden bg-[#4a3f35]/40 backdrop-blur-sm">
              <table className="w-full">
                <thead className="bg-[#4a3f35]">
                  <tr>
                    <th className="text-center px-4 py-3 w-12">
                      <input 
                        type="checkbox" 
                        checked={allFilteredChecked} 
                        onChange={toggleSelectAll} 
                        className="h-4 w-4 rounded border-[#d4c5b0]/30 accent-[#c9a962] cursor-pointer" 
                      />
                    </th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-4 py-3">Visitor</th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-4 py-3">Homeowner</th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-4 py-3">Guard</th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-4 py-3">Entry</th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-4 py-3">Exit</th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="w-16 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4c5b0]/10">
                  {paginated.map((log) => {
                    const ds = getDisplayStatus(log)
                    const key = `${log.source}-${log.id}`
                    return (
                      <tr key={key} className={`hover:bg-[#4a3f35]/60 transition-colors ${selectedIds.has(key) ? 'bg-[#c9a962]/5' : ''}`}>
                        <td className="text-center px-4 py-3">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.has(key)} 
                            onChange={() => toggleSelect(key)} 
                            className="h-4 w-4 rounded border-[#d4c5b0]/30 accent-[#c9a962] cursor-pointer" 
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full overflow-hidden bg-[#4a3f35] shrink-0">
                              <Image 
                                src={STATUS_AVATARS[log.visitor_status] || STATUS_AVATARS.pending} 
                                alt="" 
                                width={32} 
                                height={32} 
                                className="h-full w-full object-cover" 
                              />
                            </div>
                            <span className="text-sm font-medium text-[#f5e6d3]">{log.visitor_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-[#d4c5b0]">
                          {log.homeowner_name || <span className="text-[#d4c5b0]/30">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StatusText status={ds} />
                        </td>
                        <td className="px-4 py-3 text-sm text-[#d4c5b0]">
                          {log.guard_name || <span className="text-[#d4c5b0]/30">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#d4c5b0]">
                          {log.entry_time ? new Date(log.entry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-[#d4c5b0]/30">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#d4c5b0]">
                          {log.exit_time ? new Date(log.exit_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : <span className="text-[#d4c5b0]/30">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-[#d4c5b0] whitespace-nowrap">
                          {timeAgo(log.created_at)}
                        </td>
                        <td className="text-center px-4 py-3">
                          <button 
                            onClick={() => setSelected(log)} 
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full text-[#d4c5b0] hover:text-[#c9a962] hover:bg-[#c9a962]/10 transition-all"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            <TablePagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              totalItems={filtered.length} 
              pageSize={PAGE_SIZE} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}

        <Dialog open={!!selected && !carouselOpen} onOpenChange={(open) => { if (!open) setSelected(null) }}>
          <DialogContent className="sm:max-w-md bg-[#4a3f35] border-[#d4c5b0]/20 text-[#f5e6d3]">
            {selected && (() => {
              const ds = getDisplayStatus(selected)
              return (
                <div className="space-y-6">
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full overflow-hidden bg-[#3d3229]">
                        <Image 
                          src={STATUS_AVATARS[selected.visitor_status] || STATUS_AVATARS.pending} 
                          alt="" 
                          width={48} 
                          height={48} 
                          className="h-full w-full object-cover" 
                        />
                      </div>
                      <div>
                        <DialogTitle className="text-lg font-semibold text-[#f5e6d3]">{selected.visitor_name}</DialogTitle>
                        <StatusText status={ds} />
                      </div>
                    </div>
                  </DialogHeader>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#3d3229] rounded-lg p-3 border border-[#d4c5b0]/10">
                      <span className="text-xs text-[#d4c5b0] uppercase tracking-wider flex items-center gap-1">
                        <User className="h-3 w-3" /> Purpose
                      </span>
                      <p className="text-sm font-medium text-[#f5e6d3] mt-1">{selected.purpose}</p>
                    </div>
                    <div className="bg-[#3d3229] rounded-lg p-3 border border-[#d4c5b0]/10">
                      <span className="text-xs text-[#d4c5b0] uppercase tracking-wider flex items-center gap-1">
                        <Car className="h-3 w-3" /> Vehicle
                      </span>
                      <p className="text-sm font-medium text-[#f5e6d3] mt-1">{selected.vehicle_plate || '—'}</p>
                    </div>
                    <div className="bg-[#3d3229] rounded-lg p-3 border border-[#d4c5b0]/10">
                      <span className="text-xs text-[#d4c5b0] uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Homeowner
                      </span>
                      <p className="text-sm font-medium text-[#f5e6d3] mt-1">
                        {selected.homeowner_name || '—'}
                        {selected.homeowner_block && <span className="text-[#d4c5b0]"> ({selected.homeowner_block}, {selected.homeowner_lot})</span>}
                      </p>
                    </div>
                    <div className="bg-[#3d3229] rounded-lg p-3 border border-[#d4c5b0]/10">
                      <span className="text-xs text-[#d4c5b0] uppercase tracking-wider flex items-center gap-1">
                        <Shield className="h-3 w-3" /> Guard
                      </span>
                      <p className="text-sm font-medium text-[#f5e6d3] mt-1">{selected.guard_name || '—'}</p>
                    </div>
                  </div>

                  <div className="bg-[#3d3229] rounded-lg p-4 border border-[#d4c5b0]/10 space-y-3">
                    <p className="text-xs text-[#d4c5b0] uppercase tracking-wider font-semibold">Timeline</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#d4c5b0] flex items-center gap-2">
                        <ScanLine className="h-4 w-4" /> Registered
                      </span>
                      <span className="text-sm text-[#f5e6d3]">
                        {new Date(selected.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {selected.entry_time && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#c9a962] flex items-center gap-2">
                          <LogIn className="h-4 w-4" /> Entry
                        </span>
                        <span className="text-sm text-[#f5e6d3]">
                          {new Date(selected.entry_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    {selected.exit_time && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#d4c5b0] flex items-center gap-2">
                          <LogOut className="h-4 w-4" /> Exit
                        </span>
                        <span className="text-sm text-[#f5e6d3]">
                          {new Date(selected.exit_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className={`rounded-lg p-4 border flex items-center gap-3 ${
                    ds === 'inside' ? 'bg-[#c9a962]/10 border-[#c9a962]/30' :
                    ds === 'completed' ? 'bg-[#4a3f35] border-[#d4c5b0]/20' :
                    ds === 'denied' ? 'bg-red-400/10 border-red-400/30' :
                    'bg-[#c9a962]/10 border-[#c9a962]/30'
                  }`}>
                    {ds === 'inside' && <LogIn className="h-5 w-5 text-[#c9a962]" />}
                    {ds === 'completed' && <LogOut className="h-5 w-5 text-[#d4c5b0]" />}
                    {ds === 'denied' && <X className="h-5 w-5 text-red-400" />}
                    {ds === 'pending' && <Clock className="h-5 w-5 text-[#c9a962]" />}
                    <p className={`text-sm font-medium ${
                      ds === 'inside' ? 'text-[#c9a962]' :
                      ds === 'completed' ? 'text-[#d4c5b0]' :
                      ds === 'denied' ? 'text-red-400' :
                      'text-[#c9a962]'
                    }`}>
                      {ds === 'inside' ? 'Visitor is currently inside' :
                       ds === 'completed' ? 'Visit completed' :
                       ds === 'denied' ? 'Entry denied by homeowner' :
                       ds === 'pending' ? 'Waiting for approval' :
                       'Registered — not yet at gate'}
                    </p>
                  </div>

                  {(selected.qr_code || (selected.proof_urls?.length ?? 0) > 0) && (
                    <div className="space-y-4">
                      {selected.qr_code && (
                        <div className="bg-[#3d3229] rounded-lg p-4 border border-[#d4c5b0]/10 flex flex-col items-center">
                          <span className="text-xs text-[#d4c5b0] uppercase tracking-wider flex items-center gap-1 mb-3">
                            <QrCode className="h-3 w-3" /> QR Code
                          </span>
                          <QRCodeSVG 
                            value={selected.qr_code} 
                            size={120} 
                            level="H" 
                            includeMargin 
                            imageSettings={{ src: '/logo.png', width: 24, height: 24, excavate: true }} 
                          />
                        </div>
                      )}
                      {(selected.proof_urls?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs text-[#d4c5b0] uppercase tracking-wider mb-2">Proof Photos</p>
                          <ProofGallery
                            urls={selected.proof_urls ?? []}
                            onImageClick={(i) => { setCarouselIndex(i); setCarouselOpen(true) }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

        <BulkDialog open={showBulkDelete} onOpenChange={(open) => { if (!open) { setShowBulkDelete(false); setBulkDeleteConfirmText('') } }}>
          <BulkDialogContent className="bg-[#4a3f35] border-[#d4c5b0]/20 text-[#f5e6d3]">
            <BulkDialogHeader>
              <BulkDialogTitle className="text-destructive">Delete {selectedCount} Record(s)</BulkDialogTitle>
            </BulkDialogHeader>
            <p className="text-sm text-[#d4c5b0] mt-2">This action cannot be undone. All selected records will be permanently removed.</p>
            <div className="mt-4 space-y-3">
              <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-3">
                <p className="text-sm text-red-400 font-medium">Type DELETE to confirm</p>
              </div>
              <Input 
                placeholder="Type DELETE" 
                value={bulkDeleteConfirmText} 
                onChange={(e) => setBulkDeleteConfirmText(e.target.value)} 
                className="bg-[#3d3229] border-[#d4c5b0]/20 text-[#f5e6d3]" 
              />
              <div className="flex gap-2">
                <Button 
                  onClick={handleBulkDelete} 
                  disabled={bulkDeleteConfirmText !== 'DELETE' || bulkDeleteLoading} 
                  variant="destructive" 
                  className="flex-1"
                >
                  {bulkDeleteLoading ? 'Deleting...' : `Delete ${selectedCount}`}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => { setShowBulkDelete(false); setBulkDeleteConfirmText('') }}
                  className="border-[#d4c5b0]/20 text-[#f5e6d3] hover:bg-[#4a3f35]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </BulkDialogContent>
        </BulkDialog>
      </main>
    </div>
  )
}