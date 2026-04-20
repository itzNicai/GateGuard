'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { TablePagination } from '@/components/admin/table-pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { GuardShiftWithGuard, Profile } from '@/types'

type StatusFilter = 'all' | 'active' | 'completed' | 'auto_closed'

interface Props {
  guards: Profile[]
}

function formatDuration(start: string, end: string | null): string {
  const endTime = end ? new Date(end).getTime() : Date.now()
  const diffSec = Math.max(0, Math.floor((endTime - new Date(start).getTime()) / 1000))
  const h = Math.floor(diffSec / 3600)
  const m = Math.floor((diffSec % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function shiftStatus(s: GuardShiftWithGuard): 'active' | 'completed' | 'auto_closed' {
  if (!s.clocked_out_at) return 'active'
  if (s.auto_closed) return 'auto_closed'
  return 'completed'
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  completed: 'Completed',
  auto_closed: 'Auto-closed',
}

function StatusBadge({ status }: { status: 'active' | 'completed' | 'auto_closed' }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        Active
      </span>
    )
  }
  if (status === 'auto_closed') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary/10 text-secondary">
        <AlertTriangle className="h-2.5 w-2.5" />
        Auto-closed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
      <CheckCircle2 className="h-2.5 w-2.5" />
      Completed
    </span>
  )
}

export function GuardShiftsTable({ guards }: Props) {
  const [shifts, setShifts] = useState<GuardShiftWithGuard[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [guardFilter, setGuardFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const [fromDate, setFromDate] = useState<string>(sevenDaysAgo.toISOString().slice(0, 10))
  const [toDate, setToDate] = useState<string>(today.toISOString().slice(0, 10))
  const [currentPage, setCurrentPage] = useState(1)
  const [selected, setSelected] = useState<GuardShiftWithGuard | null>(null)
  const PAGE_SIZE = 20

  const handleRealtimeChange = useCallback(() => setRefreshKey((k) => k + 1), [])
  useRealtime({ table: 'guard_shifts', event: '*', onData: handleRealtimeChange })

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams()
      if (guardFilter !== 'all') params.set('guard_id', guardFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (fromDate) params.set('from', new Date(fromDate + 'T00:00:00').toISOString())
      if (toDate) params.set('to', new Date(toDate + 'T23:59:59').toISOString())
      const res = await fetch(`/api/admin/shifts?${params.toString()}`)
      const data = res.ok ? await res.json() : []
      setShifts(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    load()
  }, [guardFilter, statusFilter, fromDate, toDate, refreshKey])

  const counts = useMemo(() => ({
    total: shifts.length,
    active: shifts.filter((s) => shiftStatus(s) === 'active').length,
    autoClosed: shifts.filter((s) => shiftStatus(s) === 'auto_closed').length,
  }), [shifts])

  const totalPages = Math.ceil(shifts.length / PAGE_SIZE)
  const paginated = shifts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  function resetPage(setter: (v: string) => void) {
    return (v: string) => { setter(v); setCurrentPage(1) }
  }

  if (loading) {
    return <Skeleton className="h-64 rounded-xl" />
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Filters */}
      <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 pb-3">
        <select
          value={guardFilter}
          onChange={(e) => resetPage(setGuardFilter)(e.target.value)}
          className="h-8 text-[12px] rounded-lg border border-input bg-background px-2"
        >
          <option value="all">All guards</option>
          {guards.map((g) => (
            <option key={g.id} value={g.id}>{g.full_name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => resetPage((v: string) => setStatusFilter(v as StatusFilter))(e.target.value)}
          className="h-8 text-[12px] rounded-lg border border-input bg-background px-2"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="auto_closed">Auto-closed</option>
        </select>
        <Input type="date" value={fromDate} onChange={(e) => resetPage(setFromDate)(e.target.value)} className="h-8 text-[12px] rounded-lg" />
        <Input type="date" value={toDate} onChange={(e) => resetPage(setToDate)(e.target.value)} className="h-8 text-[12px] rounded-lg" />
      </div>

      <div className="shrink-0 flex items-center gap-3 mb-2 px-0.5">
        <span className="text-[11px] text-muted-foreground">{counts.total} shifts</span>
        <span className="text-[11px] text-accent font-medium">{counts.active} active</span>
        {counts.autoClosed > 0 && (
          <span className="text-[11px] text-secondary font-medium">{counts.autoClosed} auto-closed</span>
        )}
      </div>

      {shifts.length === 0 ? (
        <div className="flex flex-col items-center py-12 rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card">
          <Clock className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No shifts found</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">Try adjusting the filters</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted border-b border-border/50">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Guard</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Clocked In</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Clocked Out</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Duration</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {paginated.map((s, i) => {
                  const status = shiftStatus(s)
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className={`transition-colors cursor-pointer hover:bg-primary/[0.02] ${i % 2 === 1 ? 'bg-muted/10' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary">{s.guard?.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                          </div>
                          <span className="text-[12px] font-medium truncate">{s.guard?.full_name ?? 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-muted-foreground whitespace-nowrap">{formatDateTime(s.clocked_in_at)}</td>
                      <td className="px-3 py-2 text-[12px] text-muted-foreground whitespace-nowrap">
                        {s.clocked_out_at ? formatDateTime(s.clocked_out_at) : '—'}
                      </td>
                      <td className="px-3 py-2 text-[12px] font-medium whitespace-nowrap">{formatDuration(s.clocked_in_at, s.clocked_out_at)}</td>
                      <td className="px-3 py-2"><StatusBadge status={status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={shifts.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-md p-5">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm">{selected.guard?.full_name ?? 'Shift detail'}</DialogTitle>
              </DialogHeader>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={shiftStatus(selected)} />
                </div>
                <div className="h-px bg-border/30" />
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Clocked in</span>
                  <span className="font-medium">{formatDateTime(selected.clocked_in_at)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Clocked out</span>
                  <span className="font-medium">{selected.clocked_out_at ? formatDateTime(selected.clocked_out_at) : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">{formatDuration(selected.clocked_in_at, selected.clocked_out_at)}</span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium truncate ml-4">{selected.guard?.email ?? '—'}</span>
                </div>
                {selected.auto_closed && (
                  <div className="rounded-lg bg-secondary/5 border border-secondary/20 px-3 py-2 mt-2">
                    <p className="text-[11px] text-secondary">
                      This shift was auto-closed after exceeding the 16-hour limit. The guard likely forgot to clock out.
                    </p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground/60 mt-3">
                  Status: {STATUS_LABELS[shiftStatus(selected)]}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
