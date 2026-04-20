'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AddGuardDialog } from '@/components/admin/add-guard-dialog'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TablePagination } from '@/components/admin/table-pagination'
import { Plus, Search, MoreHorizontal, ShieldCheck, ShieldOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types'

const STATUS_COLORS: Record<string, string> = { active: 'text-[#c9a962]', rejected: 'text-red-400' }

function StatusText({ status }: { status: string }) {
  return <span className={`text-xs font-medium ${STATUS_COLORS[status] ?? 'text-[#d4c5b0]'}`}>{status === 'rejected' ? 'Deactivated' : status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

export default function GuardsPage() {
  const [guards, setGuards] = useState<Profile[]>([])
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

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').eq('role', 'guard').order('created_at', { ascending: false })
      .then(({ data }) => { setGuards((data ?? []) as Profile[]); setLoading(false) })
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#3d3229] flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-6">
          <Skeleton className="h-8 w-48 mx-auto rounded-lg bg-[#4a3f35]" />
          <Skeleton className="h-64 rounded-xl bg-[#4a3f35]/60" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#3d3229]">
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-[#f5e6d3] tracking-tight">
            Guard <span className="text-[#c9a962] italic font-serif">Directory</span>
          </h1>

          <div className="flex items-center justify-center gap-4 pt-4">
            <Button 
              onClick={() => setDialogOpen(true)} 
              className="bg-[#c9a962] text-[#3d3229] hover:bg-[#d4b978] rounded-full px-6 py-3 h-auto text-sm font-semibold flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New Guard
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-[#f5e6d3]">{totalCount}</p>
            <p className="text-xs text-[#d4c5b0] uppercase tracking-wider">Total</p>
          </div>
          <div className="w-px h-8 bg-[#d4c5b0]/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-[#c9a962]">{activeCount}</p>
            <p className="text-xs text-[#d4c5b0] uppercase tracking-wider">Active</p>
          </div>
          <div className="w-px h-8 bg-[#d4c5b0]/20" />
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{deactivatedCount}</p>
            <p className="text-xs text-[#d4c5b0] uppercase tracking-wider">Deactivated</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#d4c5b0]" />
            <Input 
              placeholder="Search guards..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-11 pr-4 py-3 h-12 bg-[#4a3f35]/40 border-[#d4c5b0]/20 text-[#f5e6d3] placeholder:text-[#d4c5b0]/50 rounded-full text-sm focus:border-[#c9a962]/50 focus:ring-[#c9a962]/20" 
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'rejected'] as const).map((f) => (
              <button 
                key={f} 
                onClick={() => setStatusFilter(f)} 
                className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  statusFilter === f 
                    ? 'bg-[#c9a962] text-[#3d3229] shadow-lg shadow-[#c9a962]/20' 
                    : 'bg-[#4a3f35]/40 text-[#d4c5b0] border border-[#d4c5b0]/20 hover:border-[#c9a962]/40'
                }`}
              >
                {f === 'all' ? 'All' : f === 'rejected' ? 'Deactivated' : 'Active'}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-2xl bg-[#4a3f35]/20 border border-[#d4c5b0]/10">
            <ShieldOff className="h-12 w-12 text-[#d4c5b0]/30 mb-4" />
            <p className="text-lg font-medium text-[#d4c5b0]">No guards found</p>
            <p className="text-sm text-[#d4c5b0]/60 mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Add a guard to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center text-sm text-[#d4c5b0]">
              Showing <span className="text-[#f5e6d3] font-medium">{filtered.length}</span> {filtered.length === 1 ? 'guard' : 'guards'}
            </div>
            
            <div className="rounded-2xl border border-[#d4c5b0]/10 overflow-hidden bg-[#4a3f35]/20 backdrop-blur-sm">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#d4c5b0]/10">
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-6 py-4">Guard</th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-6 py-4">Status</th>
                    <th className="text-left text-xs font-semibold text-[#d4c5b0] uppercase tracking-wider px-6 py-4">Added</th>
                    <th className="w-20 px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d4c5b0]/5">
                  {paginated.map((guard) => (
                    <tr key={guard.id} className="hover:bg-[#4a3f35]/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-[#c9a962]/15 flex items-center justify-center shrink-0 ring-2 ring-[#c9a962]/10 group-hover:ring-[#c9a962]/30 transition-all">
                            <span className="text-sm font-bold text-[#c9a962]">
                              {guard.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#f5e6d3] group-hover:text-white transition-colors">{guard.full_name}</p>
                            <p className="text-xs text-[#d4c5b0]/70">{guard.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          guard.status === 'active' 
                            ? 'bg-[#c9a962]/15 text-[#c9a962]' 
                            : 'bg-red-400/10 text-red-400'
                        }`}>
                          {guard.status === 'active' ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#d4c5b0]/70">
                        {new Date(guard.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-9 w-9 flex items-center justify-center rounded-full hover:bg-[#4a3f35] transition-colors text-[#d4c5b0] hover:text-[#f5e6d3]">
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#4a3f35] border-[#d4c5b0]/20 rounded-xl">
                            <DropdownMenuItem onClick={() => handleToggleStatus(guard)} disabled={actionLoading} className="text-[#f5e6d3] focus:bg-[#c9a962]/20 focus:text-[#f5e6d3] rounded-lg">
                              {guard.status === 'active' ? (
                                <><ShieldOff className="mr-2 h-4 w-4" /> Deactivate</>
                              ) : (
                                <><ShieldCheck className="mr-2 h-4 w-4" /> Activate</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#d4c5b0]/10" />
                            <DropdownMenuItem onClick={() => setDeleteTarget(guard)} className="text-red-400 focus:text-red-400 focus:bg-red-400/10 rounded-lg">
                              <Trash2 className="mr-2 h-4 w-4" /> Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
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

        <AddGuardDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onAdd={handleAddGuard} />
        <ConfirmDialog 
          open={!!deleteTarget} 
          onClose={() => setDeleteTarget(null)} 
          onConfirm={handleDelete} 
          title="Remove Guard" 
          description={`Remove ${deleteTarget?.full_name}? This will permanently delete their account and cannot be undone.`} 
          confirmLabel="Remove" 
          loading={actionLoading} 
        />
      </main>
    </div>
  )
}