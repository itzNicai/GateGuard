'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { TablePagination } from '@/components/admin/table-pagination'
import { Search, Plus, Trash2, MapPin, Home } from 'lucide-react'
import { toast } from 'sonner'

interface BlockLotItem {
  id: string
  block: string
  lot: string
  is_occupied: boolean
  occupied_by: string | null
  created_at: string
  occupant_name: string | null
}

export default function BlocksLotsPage() {
  const [items, setItems] = useState<BlockLotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchRaw, setSearchRaw] = useState('')
  const [filterRaw, setFilterRaw] = useState<'all' | 'available' | 'occupied'>('all')
  const [selectedBlockRaw, setSelectedBlockRaw] = useState<string | null>(null)
  const search = searchRaw
  const filter = filterRaw
  const selectedBlock = selectedBlockRaw
  const setSearch = (v: string) => { setSearchRaw(v); setCurrentPage(1) }
  const setFilter = (v: 'all' | 'available' | 'occupied') => { setFilterRaw(v); setCurrentPage(1) }
  const setSelectedBlock = (v: string | null) => { setSelectedBlockRaw(v); setCurrentPage(1) }
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 20

  const [showAdd, setShowAdd] = useState(false)
  const [addBlock, setAddBlock] = useState('')
  const [addLot, setAddLot] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [bulkBlock, setBulkBlock] = useState('')
  const [bulkLotFrom, setBulkLotFrom] = useState('')
  const [bulkLotTo, setBulkLotTo] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<BlockLotItem | null>(null)
  const [showBulkDelete, setShowBulkDelete] = useState(false)
  const [bulkDeleteConfirmText, setBulkDeleteConfirmText] = useState('')
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/blocks-lots')
      if (res.ok) setItems(await res.json())
      setLoading(false)
    }
    load()
  }, [refreshKey])

  const handleRealtimeChange = useCallback(() => setRefreshKey((k) => k + 1), [])
  useRealtime({ table: 'blocks_lots', event: '*', onData: handleRealtimeChange })

  function numericPart(s: string): number { return parseInt(s.replace(/\D/g, '') || '0') }

  const blocks = [...new Set(items.map((i) => i.block))].sort((a, b) => numericPart(a) - numericPart(b))

  const filtered = items
    .filter((item) => {
      if (selectedBlock && item.block !== selectedBlock) return false
      if (search) { const q = search.toLowerCase(); if (!item.block.toLowerCase().includes(q) && !item.lot.toLowerCase().includes(q)) return false }
      if (filter === 'available' && item.is_occupied) return false
      if (filter === 'occupied' && !item.is_occupied) return false
      return true
    })
    .sort((a, b) => { const d = numericPart(a.block) - numericPart(b.block); return d !== 0 ? d : numericPart(a.lot) - numericPart(b.lot) })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selectableFiltered = paginated.filter((i) => !i.is_occupied)
  const allSelectableChecked = selectableFiltered.length > 0 && selectableFiltered.every((i) => selectedIds.has(i.id))
  const selectedCount = [...selectedIds].filter((id) => items.some((i) => i.id === id && !i.is_occupied)).length

  function toggleSelect(id: string) { setSelectedIds((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n }) }
  function toggleSelectAll() {
    if (allSelectableChecked) setSelectedIds((p) => { const n = new Set(p); selectableFiltered.forEach((i) => n.delete(i.id)); return n })
    else setSelectedIds((p) => { const n = new Set(p); selectableFiltered.forEach((i) => n.add(i.id)); return n })
  }

  async function handleAdd() {
    if (!addBlock.trim() || !addLot.trim()) { toast.error('Block and lot are required'); return }
    setAddLoading(true)
    const res = await fetch('/api/admin/blocks-lots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ block: addBlock.trim(), lot: addLot.trim() }) })
    const data = await res.json(); setAddLoading(false)
    if (!res.ok) { toast.error(data.error || 'Failed to add'); return }
    toast.success(`${addBlock.trim()}, ${addLot.trim()} added`); setAddBlock(''); setAddLot(''); setShowAdd(false); setRefreshKey((k) => k + 1)
  }

  async function handleBulkAdd() {
    if (!bulkBlock.trim() || !bulkLotFrom.trim() || !bulkLotTo.trim()) { toast.error('All fields are required'); return }
    const from = parseInt(bulkLotFrom), to = parseInt(bulkLotTo)
    if (isNaN(from) || isNaN(to) || from > to || from < 1) { toast.error('Invalid lot range'); return }
    setBulkLoading(true); let added = 0, skipped = 0
    for (let i = from; i <= to; i++) { const r = await fetch('/api/admin/blocks-lots', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ block: bulkBlock.trim(), lot: `Lot ${i}` }) }); if (r.ok) added++; else skipped++ }
    setBulkLoading(false); toast.success(`Added ${added} lots${skipped > 0 ? `, ${skipped} skipped` : ''}`); setBulkBlock(''); setBulkLotFrom(''); setBulkLotTo(''); setShowBulkAdd(false); setRefreshKey((k) => k + 1)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await fetch('/api/admin/blocks-lots', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
    const data = await res.json()
    if (!res.ok) toast.error(data.error || 'Failed to delete'); else { toast.success(`${deleteTarget.block}, ${deleteTarget.lot} removed`); setRefreshKey((k) => k + 1) }
    setDeleteTarget(null)
  }

  async function handleBulkDelete() {
    if (bulkDeleteConfirmText !== 'DELETE') return
    setBulkDeleteLoading(true)
    const ids = [...selectedIds].filter((id) => items.some((i) => i.id === id && !i.is_occupied))
    const res = await fetch('/api/admin/blocks-lots', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
    const data = await res.json(); setBulkDeleteLoading(false)
    if (!res.ok) { toast.error(data.error || 'Failed to delete'); return }
    toast.success(`${data.deleted} lot(s) removed`); setSelectedIds(new Set()); setBulkDeleteConfirmText(''); setShowBulkDelete(false); setRefreshKey((k) => k + 1)
  }

  const totalCount = items.length
  const availableCount = items.filter((i) => !i.is_occupied).length
  const occupiedCount = items.filter((i) => i.is_occupied).length

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-3 gap-3"><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /><Skeleton className="h-16 rounded-xl" /></div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-52px)] overflow-hidden -mb-8">
      <div className="shrink-0 space-y-3 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm lg:text-base font-semibold">Blocks & Lots</h1>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-muted-foreground">{totalCount} total</span>
              <span className="text-[11px] text-accent font-medium">{availableCount} available</span>
              <span className="text-[11px] text-secondary font-medium">{occupiedCount} occupied</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {selectedCount > 0 && (
              <Button size="sm" variant="outline" className="text-[11px] h-7 rounded-lg text-destructive border-destructive/30 hover:bg-destructive/5 px-2.5" onClick={() => setShowBulkDelete(true)}>
                <Trash2 className="mr-1 h-3 w-3" />
                Delete {selectedCount}
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-[11px] h-7 rounded-lg px-2.5" onClick={() => setShowBulkAdd(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Bulk Add
            </Button>
            <Button size="sm" className="text-[11px] h-7 rounded-lg px-2.5" onClick={() => setShowAdd(true)}>
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-[12px] rounded-lg" />
          </div>
          <div className="flex gap-1 shrink-0">
            {(['all', 'available', 'occupied'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${filter === f ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}`}>
                {f === 'all' ? 'All' : f === 'available' ? 'Available' : 'Occupied'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
          <button onClick={() => setSelectedBlock(null)} className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${!selectedBlock ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-muted'}`}>
            All
          </button>
          {blocks.map((block) => {
            const count = items.filter((i) => i.block === block).length
            const occ = items.filter((i) => i.block === block && i.is_occupied).length
            return (
              <button key={block} onClick={() => setSelectedBlock(selectedBlock === block ? null : block)} className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${selectedBlock === block ? 'bg-primary/10 text-primary ring-1 ring-primary/20' : 'text-muted-foreground hover:bg-muted'}`}>
                {block} <span className="opacity-50">{occ}/{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card">
          <MapPin className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No results</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">{search || selectedBlock ? 'Try adjusting your filters' : 'Add blocks and lots to get started'}</p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <p className="text-[10px] text-muted-foreground px-0.5 mb-1.5 shrink-0">{filtered.length} {filtered.length === 1 ? 'lot' : 'lots'}</p>
          <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-muted border-b border-border/50">
                    <th className="text-center px-2 py-2.5 w-[36px]">
                      <input type="checkbox" checked={allSelectableChecked} onChange={toggleSelectAll} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                    </th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Block</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Lot</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Status</th>
                    <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Homeowner</th>
                    <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-2.5 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {paginated.map((item, i) => (
                    <tr key={item.id} className={`transition-colors ${selectedIds.has(item.id) ? 'bg-primary/[0.04]' : i % 2 === 1 ? 'bg-muted/10' : ''} hover:bg-primary/[0.02]`}>
                      <td className="text-center px-2 py-2">
                        {!item.is_occupied ? (
                          <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer" />
                        ) : (
                          <span />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[12px] font-medium">{item.block}</span>
                      </td>
                      <td className="px-3 py-2 text-[12px] text-muted-foreground">{item.lot}</td>
                      <td className="px-3 py-2">
                        {item.is_occupied ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-secondary"><Home className="h-2.5 w-2.5" /> Occupied</span>
                        ) : (
                          <span className="text-[9px] font-medium text-accent">Available</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-muted-foreground truncate max-w-0">
                        {item.is_occupied && item.occupant_name ? item.occupant_name : <span className="text-muted-foreground/30">—</span>}
                      </td>
                      <td className="text-center px-2 py-2">
                        {!item.is_occupied && (
                          <button onClick={() => setDeleteTarget(item)} className="inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
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

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="px-5 pt-5 pb-3"><DialogHeader><DialogTitle className="text-[14px] font-semibold">Add Block & Lot</DialogTitle></DialogHeader></div>
          <div className="px-5 pb-5 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium">Block</label>
              <Input placeholder="e.g. Block 11" value={addBlock} onChange={(e) => setAddBlock(e.target.value)} className="h-10 lg:h-9 rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium">Lot</label>
              <Input placeholder="e.g. Lot 1" value={addLot} onChange={(e) => setAddLot(e.target.value)} className="h-10 lg:h-9 rounded-lg" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleAdd} disabled={addLoading} className="flex-1 h-10 text-sm rounded-lg">{addLoading ? 'Adding...' : 'Add'}</Button>
              <Button variant="outline" onClick={() => setShowAdd(false)} className="h-10 text-sm rounded-lg">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="px-5 pt-5 pb-3">
            <DialogHeader><DialogTitle className="text-[14px] font-semibold">Bulk Add Lots</DialogTitle></DialogHeader>
            <p className="text-[11px] text-muted-foreground mt-1">Add multiple lots for a block at once.</p>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium">Block</label>
              <Input placeholder="e.g. Block 11" value={bulkBlock} onChange={(e) => setBulkBlock(e.target.value)} className="h-10 lg:h-9 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><label className="text-[12px] font-medium">From</label><Input type="number" placeholder="1" value={bulkLotFrom} onChange={(e) => setBulkLotFrom(e.target.value)} className="h-10 lg:h-9 rounded-lg" /></div>
              <div className="space-y-1.5"><label className="text-[12px] font-medium">To</label><Input type="number" placeholder="20" value={bulkLotTo} onChange={(e) => setBulkLotTo(e.target.value)} className="h-10 lg:h-9 rounded-lg" /></div>
            </div>
            {bulkBlock && bulkLotFrom && bulkLotTo && parseInt(bulkLotTo) >= parseInt(bulkLotFrom) && (
              <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-2">
                Will add <strong>{parseInt(bulkLotTo) - parseInt(bulkLotFrom) + 1}</strong> lots ({bulkBlock}, Lot {bulkLotFrom}–{bulkLotTo}). Duplicates skipped.
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleBulkAdd} disabled={bulkLoading} className="flex-1 h-10 text-sm rounded-lg">{bulkLoading ? 'Adding...' : 'Add Lots'}</Button>
              <Button variant="outline" onClick={() => setShowBulkAdd(false)} className="h-10 text-sm rounded-lg">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBulkDelete} onOpenChange={(open) => { if (!open) { setShowBulkDelete(false); setBulkDeleteConfirmText('') } }}>
        <DialogContent className="sm:max-w-sm p-0">
          <div className="px-5 pt-5 pb-3">
            <DialogHeader><DialogTitle className="text-[14px] font-semibold text-destructive">Delete {selectedCount} Lot(s)</DialogTitle></DialogHeader>
            <p className="text-[11px] text-muted-foreground mt-1">This cannot be undone. Selected available lots will be permanently removed.</p>
          </div>
          <div className="px-5 pb-5 space-y-3">
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
              <p className="text-[12px] text-destructive font-medium">Type DELETE to confirm</p>
            </div>
            <Input placeholder="Type DELETE" value={bulkDeleteConfirmText} onChange={(e) => setBulkDeleteConfirmText(e.target.value)} className="h-10 lg:h-9 rounded-lg" />
            <div className="flex gap-2 pt-1">
              <Button onClick={handleBulkDelete} disabled={bulkDeleteConfirmText !== 'DELETE' || bulkDeleteLoading} variant="destructive" className="flex-1 h-10 text-sm rounded-lg">
                {bulkDeleteLoading ? 'Deleting...' : `Delete ${selectedCount} Lot(s)`}
              </Button>
              <Button variant="outline" onClick={() => { setShowBulkDelete(false); setBulkDeleteConfirmText('') }} className="h-10 text-sm rounded-lg">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Remove Block & Lot" description={`Remove ${deleteTarget?.block}, ${deleteTarget?.lot}? This cannot be undone.`} confirmLabel="Remove" variant="destructive" />
    </div>
  )
}