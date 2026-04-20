'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { HomeownerReviewDialog } from '@/components/admin/homeowner-review-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TablePagination } from '@/components/admin/table-pagination'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Eye, Search, MoreHorizontal, UserCheck, UserX, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-secondary',
  active: 'text-accent',
  rejected: 'text-destructive',
}

function StatusText({ status }: { status: string }) {
  return (
    <span className={`text-[9px] font-medium ${STATUS_COLORS[status] ?? 'text-muted-foreground'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

export default function HomeownersPage() {
  const [homeowners, setHomeowners] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedHO, setSelectedHO] = useState<Profile | null>(null)
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
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)

  const handleRealtimeChange = useCallback(() => setRefreshKey((k) => k + 1), [])
  useRealtime({ table: 'profiles', event: '*', onData: handleRealtimeChange })

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'homeowner')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setHomeowners((data ?? []) as Profile[])
        setLoading(false)
      })
  }, [refreshKey])

  async function handleAction(id: string, action: 'approve' | 'reject', reason?: string) {
    try {
      const newStatus = action === 'approve' ? 'active' : 'rejected'
      await fetch(`/api/admin/homeowners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, reason }),
      })
      toast.success(`Homeowner ${action === 'approve' ? 'approved' : 'rejected'}`)
    } catch { toast.error('Something went wrong') }
    setRefreshKey((k) => k + 1)
  }

  async function handleToggleStatus(ho: Profile) {
    setActionLoading(true)
    try {
      const newStatus = ho.status === 'active' ? 'rejected' : 'active'
      await fetch(`/api/admin/homeowners/${ho.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      toast.success(`Homeowner ${newStatus === 'active' ? 're-activated' : 'deactivated'}`)
    } catch { toast.error('Something went wrong') }
    setActionLoading(false)
    setRefreshKey((k) => k + 1)
  }

  async function handleDelete() {
    if (!deleteTarget || deleteConfirmText !== 'DELETE') return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/homeowners/${deleteTarget.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`${deleteTarget.full_name} has been permanently removed`)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to remove homeowner')
      }
    } catch { toast.error('Failed to remove homeowner') }
    setDeleteLoading(false)
    setDeleteTarget(null)
    setDeleteConfirmText('')
    setRefreshKey((k) => k + 1)
  }

  const filtered = homeowners.filter((h) => {
    if (search && !h.full_name.toLowerCase().includes(search.toLowerCase()) && !h.email.toLowerCase().includes(search.toLowerCase())) return false
    if (statusFilter !== 'all' && h.status !== statusFilter) return false
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const totalCount = homeowners.length
  const pendingCount = homeowners.filter((h) => h.status === 'pending').length
  const activeCount = homeowners.filter((h) => h.status === 'active').length
  const rejectedCount = homeowners.filter((h) => h.status === 'rejected').length

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
        {/* Row 1: Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm lg:text-base font-semibold">Homeowners</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-muted-foreground">{totalCount} total</span>
              <span className="text-[11px] text-secondary font-medium">{pendingCount} pending</span>
              <span className="text-[11px] text-accent font-medium">{activeCount} active</span>
              <span className="text-[11px] text-destructive font-medium">{rejectedCount} rejected</span>
            </div>
          </div>
        </div>

        {/* Row 2: Search + status chips */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-[12px] rounded-lg" />
          </div>
          <div className="flex gap-1 shrink-0">
            {([
              { value: 'all', label: 'All' },
              { value: 'pending', label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
              { value: 'active', label: 'Active' },
              { value: 'rejected', label: 'Rejected' },
            ]).map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${statusFilter === f.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card">
          <Users className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No homeowners found</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Homeowner registrations will appear here'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <p className="text-[10px] text-muted-foreground px-0.5 mb-1.5 shrink-0">{filtered.length} {filtered.length === 1 ? 'homeowner' : 'homeowners'}</p>
          <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted border-b border-border/50">
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Name</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Email</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Block / Lot</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Registered</th>
                    <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2.5 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {paginated.map((ho, i) => (
                    <tr key={ho.id} className={`transition-colors hover:bg-primary/[0.02] ${i % 2 === 1 ? 'bg-muted/10' : ''}`}>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-primary">{ho.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-[12px] font-medium truncate block">{ho.full_name}</span>
                            {ho.phone && <span className="text-[10px] text-muted-foreground/50 truncate block">{ho.phone}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-muted-foreground truncate max-w-0">{ho.email}</td>
                      <td className="px-3 py-2 text-[12px] text-muted-foreground">
                        {ho.block && ho.lot ? `${ho.block}, ${ho.lot}` : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="px-3 py-2"><StatusText status={ho.status} /></td>
                      <td className="px-3 py-2 text-[11px] text-muted-foreground/60 whitespace-nowrap">
                        {new Date(ho.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="text-center px-2 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/40 hover:bg-muted hover:text-foreground transition-colors">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {ho.status === 'pending' && (
                              <DropdownMenuItem onClick={() => { setSelectedHO(ho); setDialogOpen(true) }}>
                                <Eye className="mr-2 h-3.5 w-3.5" /> Review
                              </DropdownMenuItem>
                            )}
                            {ho.status === 'active' && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(ho)} disabled={actionLoading}>
                                <UserX className="mr-2 h-3.5 w-3.5" /> Deactivate
                              </DropdownMenuItem>
                            )}
                            {ho.status === 'rejected' && (
                              <DropdownMenuItem onClick={() => handleToggleStatus(ho)} disabled={actionLoading}>
                                <UserCheck className="mr-2 h-3.5 w-3.5" /> Re-activate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTarget(ho)} className="text-destructive focus:text-destructive">
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

      <HomeownerReviewDialog
        homeowner={selectedHO}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedHO(null) }}
        onAction={handleAction}
      />

      {/* Delete — double confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText('') } }}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="px-5 pt-5 pb-3">
            <DialogHeader>
              <DialogTitle className="text-[14px] font-semibold text-destructive">Remove Homeowner</DialogTitle>
            </DialogHeader>
            <p className="text-[11px] text-muted-foreground mt-1">
              This will permanently delete <strong>{deleteTarget?.full_name}</strong> and all their data:
            </p>
            <ul className="text-[11px] text-muted-foreground mt-2 space-y-1 list-disc pl-4">
              <li>Profile and account</li>
              <li>All visitors and visit logs</li>
              <li>All notifications</li>
              <li>Block/lot will be freed ({deleteTarget?.block && deleteTarget?.lot ? `${deleteTarget.block}, ${deleteTarget.lot}` : 'N/A'})</li>
            </ul>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
              <p className="text-[12px] text-destructive font-medium">Type DELETE to confirm</p>
            </div>
            <Input
              placeholder="Type DELETE"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="h-10 lg:h-9 rounded-lg"
            />
            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleDelete}
                disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
                variant="destructive"
                className="flex-1 h-10 text-sm rounded-lg"
              >
                {deleteLoading ? 'Removing...' : 'Remove Permanently'}
              </Button>
              <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirmText('') }} className="h-10 text-sm rounded-lg">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
