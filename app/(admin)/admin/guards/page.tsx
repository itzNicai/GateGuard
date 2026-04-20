'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AddGuardDialog } from '@/components/admin/add-guard-dialog'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { GuardShiftsTable } from '@/components/admin/guard-shifts-table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TablePagination } from '@/components/admin/table-pagination'
import { Plus, Search, MoreHorizontal, ShieldCheck, ShieldOff, Trash2, Shield, Clock } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile, GuardShift } from '@/types'

const STATUS_COLORS: Record<string, string> = { active: 'text-accent', rejected: 'text-destructive' }
function StatusText({ status }: { status: string }) {
  return <span className={`text-[9px] font-medium ${STATUS_COLORS[status] ?? 'text-muted-foreground'}`}>{status === 'rejected' ? 'Deactivated' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

function ShiftPill({ openShift }: { openShift: GuardShift | undefined }) {
  if (openShift) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent">
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
        On shift
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
      <Clock className="h-2.5 w-2.5" />
      Off shift
    </span>
  )
}

export default function GuardsPage() {
  const [guards, setGuards] = useState<Profile[]>([])
  const [openShifts, setOpenShifts] = useState<Record<string, GuardShift>>({})
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [searchRaw, setSearchRaw] = useState('')
  const [statusFilterRaw, setStatusFilterRaw] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 20
  const search = searchRaw; const statusFilter = statusFilterRaw
  const setSearch = (v: string) => { setSearchRaw(v); setCurrentPage(1) }
  const setStatusFilter = (v: string) => { setStatusFilterRaw(v); setCurrentPage(1) }
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null)

  const handleRealtimeChange = useCallback(() => setRefreshKey((k) => k + 1), [])
  useRealtime({ table: 'profiles', event: '*', onData: handleRealtimeChange })
  useRealtime({ table: 'guard_shifts', event: '*', onData: handleRealtimeChange })

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [guardsRes, shiftsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'guard').order('created_at', { ascending: false }),
        fetch('/api/admin/shifts?status=active'),
      ])
      setGuards((guardsRes.data ?? []) as Profile[])
      const shiftsData: GuardShift[] = shiftsRes.ok ? await shiftsRes.json() : []
      const map: Record<string, GuardShift> = {}
      for (const s of shiftsData) map[s.guard_id] = s
      setOpenShifts(map)
      setLoading(false)
    }
    load()
  }, [refreshKey])

  async function handleAddGuard(data: { fullName: string; email: string; password: string }) {
    const res = await fetch('/api/admin/guards', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to create guard') }
    setRefreshKey((k) => k + 1)
  }

  async function handleToggleStatus(guard: Profile) {
    setActionLoading(true)
    try {
      const newStatus = guard.status === 'active' ? 'rejected' : 'active'
      await fetch(`/api/admin/guards/${guard.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) })
      toast.success(`Guard ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
    } catch { toast.error('Something went wrong') }
    setActionLoading(false); setRefreshKey((k) => k + 1)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionLoading(true)
    try { await fetch(`/api/admin/guards/${deleteTarget.id}`, { method: 'DELETE' }); toast.success('Guard removed') }
    catch { toast.error('Failed to remove guard') }
    setActionLoading(false); setDeleteTarget(null); setRefreshKey((k) => k + 1)
  }

  const filtered = guards.filter((g) => {
    if (search && !g.full_name.toLowerCase().includes(search.toLowerCase()) && !g.email.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && g.status !== statusFilter) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const totalCount = guards.length
  const activeCount = guards.filter((g) => g.status === 'active').length
  const deactivatedCount = guards.filter((g) => g.status === 'rejected').length
  const onShiftCount = Object.keys(openShifts).length

  if (loading) {
    return <div className="space-y-3"><Skeleton className="h-10 w-48 rounded-lg" /><Skeleton className="h-64 rounded-xl" /></div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] overflow-hidden -mb-8">
      <div className="shrink-0 flex items-center justify-between pb-3">
        <div>
          <h1 className="text-sm lg:text-base font-semibold">Guards</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-muted-foreground">{totalCount} total</span>
            <span className="text-[11px] text-accent font-medium">{activeCount} active</span>
            <span className="text-[11px] text-destructive font-medium">{deactivatedCount} deactivated</span>
            <span className="text-[11px] text-accent font-medium">{onShiftCount} on shift</span>
          </div>
        </div>
        <Button size="sm" className="text-[11px] h-7 rounded-lg px-2.5" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 h-3 w-3" />
          Add Guard
        </Button>
      </div>

      <Tabs defaultValue="roster" className="flex-1 min-h-0 flex flex-col">
        <TabsList className="shrink-0 self-start">
          <TabsTrigger value="roster">Roster</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="mt-3 flex flex-col min-h-0">
          <div className="shrink-0 flex items-center gap-2 pb-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-[12px] rounded-lg" />
            </div>
            <div className="flex gap-1 shrink-0">
              {(['all', 'active', 'rejected'] as const).map((f) => (
                <button key={f} onClick={() => setStatusFilter(f)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${statusFilter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>
                  {f === 'all' ? 'All' : f === 'rejected' ? 'Deactivated' : 'Active'}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card">
              <Shield className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">No guards found</p>
              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Add a guard to get started'}</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0">
              <p className="text-[10px] text-muted-foreground px-0.5 mb-1.5 shrink-0">{filtered.length} {filtered.length === 1 ? 'guard' : 'guards'}</p>
              <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-auto flex-1">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted border-b border-border/50">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Name</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Email</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Shift</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Added</th>
                        <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2.5 w-[50px]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {paginated.map((guard, i) => (
                        <tr key={guard.id} className={`transition-colors hover:bg-primary/[0.02] ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-[9px] font-bold text-primary">{guard.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                              </div>
                              <span className="text-[12px] font-medium truncate">{guard.full_name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[12px] text-muted-foreground truncate max-w-0">{guard.email}</td>
                          <td className="px-3 py-2"><StatusText status={guard.status} /></td>
                          <td className="px-3 py-2"><ShiftPill openShift={openShifts[guard.id]} /></td>
                          <td className="px-3 py-2 text-[11px] text-muted-foreground/60 whitespace-nowrap">
                            {new Date(guard.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="text-center px-2 py-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/40 hover:bg-muted hover:text-foreground transition-colors">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleToggleStatus(guard)} disabled={actionLoading}>
                                  {guard.status === 'active' ? <><ShieldOff className="mr-2 h-3.5 w-3.5" /> Deactivate</> : <><ShieldCheck className="mr-2 h-3.5 w-3.5" /> Activate</>}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteTarget(guard)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <TablePagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="shifts" className="mt-3 flex flex-col min-h-0">
          <GuardShiftsTable guards={guards} />
        </TabsContent>
      </Tabs>

      <AddGuardDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={handleAddGuard} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove Guard" description={`Remove ${deleteTarget?.full_name}? This will permanently delete their account and cannot be undone.`} confirmLabel="Remove" loading={actionLoading} />
    </div>
  )
}
