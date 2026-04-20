'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
const STATUS_COLORS: Record<string, string> = {
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, XCircle, Loader2, Car, Phone, Clock, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { ProofGallery, ProofThumbnail } from '@/components/shared/proof-gallery'
import { ImageCarousel } from '@/components/shared/image-carousel'
import type { Visitor } from '@/types'

const STATUS_AVATARS: Record<string, string> = {
  pending: '/illustrations/notif-at-gate.png',
  approved: '/illustrations/notif-approved.png',
  denied: '/illustrations/notif-denied.png',
  exited: '/illustrations/notif-exited.png',
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [denyReason, setDenyReason] = useState<Record<string, string>>({})
  const [customReason, setCustomReason] = useState<Record<string, string>>({})
  const [showDenyFor, setShowDenyFor] = useState<string | null>(null)
  const [approveTarget, setApproveTarget] = useState<Visitor | null>(null)
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      supabase
        .from('visitors')
        .select('*')
        .eq('homeowner_id', user.id)
        .in('status', ['pending'])
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setVisitors((data ?? []) as Visitor[])
          setLoading(false)
        })
    })
  }, [refreshKey])

  const handleVisitorChange = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useRealtime({
    table: 'visitors',
    event: '*',
    filter: userId ? `homeowner_id=eq.${userId}` : undefined,
    onData: handleVisitorChange,
  })

  async function handleApprove(visitorId: string) {
    setActionLoading(visitorId)
    const supabase = createClient()

    await supabase
      .from('visitors')
      .update({ status: 'approved' })
      .eq('id', visitorId)

    // entry_time is now recorded when the guard confirms entry at the gate

    setActionLoading(null)
    setSelectedVisitor(null)
    setRefreshKey((k) => k + 1)
    toast.success('Visitor approved — entry granted')
  }

  async function handleDeny(visitorId: string) {
    setActionLoading(visitorId)
    const supabase = createClient()
    const selected = denyReason[visitorId]
    const reason = selected === 'Other reason'
      ? (customReason[visitorId]?.trim() || 'Other reason')
      : (selected || 'Not expecting this visitor')

    await supabase
      .from('visitors')
      .update({ status: 'denied', denial_reason: reason })
      .eq('id', visitorId)

    setActionLoading(null)
    setShowDenyFor(null)
    setSelectedVisitor(null)
    setRefreshKey((k) => k + 1)
    toast.success('Visitor denied')
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <h2 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Pending Visitors
        </h2>
        {visitors.length > 0 && (
          <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-secondary text-white text-[10px] lg:text-xs font-bold">
            {visitors.length}
          </span>
        )}
      </div>

      {visitors.length === 0 ? (
        <div className="flex flex-col items-center py-8 lg:py-16">
          <Image src="/illustrations/no-visitors.png" alt="" width={200} height={200} className="opacity-80 mb-4" />
          <p className="text-sm font-medium text-foreground">All clear!</p>
          <p className="text-[11px] lg:text-sm text-muted-foreground mt-0.5">No visitors waiting at the gate</p>
        </div>
      ) : (
        <div>
          {/* Count */}
          <p className="text-[10px] lg:text-xs text-muted-foreground px-1 mb-2">
            {visitors.length} {visitors.length === 1 ? 'visitor' : 'visitors'} waiting
          </p>

          {/* Desktop table view */}
          <div className="hidden lg:block rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
            <table className="w-full table-fixed">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 w-[22%]">Visitor</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[15%]">Purpose</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[10%]">Status</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[12%]">Vehicle</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[12%]">Arrived</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 w-[6%]">Photo</th>
                  <th className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 w-[23%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {visitors.map((v, i) => (
                  <tr
                    key={v.id}
                    className={`hover:bg-primary/[0.02] transition-colors ${i % 2 === 1 ? 'bg-muted/15' : ''}`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full overflow-hidden bg-muted/30 shrink-0">
                          <Image src={STATUS_AVATARS[v.status] || STATUS_AVATARS.pending} alt="" width={28} height={28} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium truncate">{v.name}</p>
                          {v.phone && <p className="text-[10px] text-muted-foreground/60 truncate">{v.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-0">
                      <p className="text-[12px] text-muted-foreground truncate">{v.purpose}</p>
                    </td>
                    <td className="px-4 py-3"><StatusText status={v.status} /></td>
                    <td className="px-4 py-3 text-[12px] text-muted-foreground">{v.vehicle_plate || '—'}</td>
                    <td className="px-4 py-3 text-[11px] text-muted-foreground/60 whitespace-nowrap">
                      {timeAgo(v.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <ProofThumbnail
                        urls={v.proof_urls ?? []}
                        onClick={() => { setSelectedVisitor(v); setCarouselIndex(0); setCarouselOpen(true) }}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedVisitor(v)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                        <button
                          onClick={() => setApproveTarget(v)}
                          disabled={actionLoading === v.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-accent bg-accent/5 hover:bg-accent/10 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => { setSelectedVisitor(v); setShowDenyFor(v.id) }}
                          disabled={actionLoading === v.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-destructive bg-destructive/5 hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-3 w-3" />
                          Deny
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="lg:hidden space-y-2.5">
            {visitors.map((v) => (
              <div key={v.id} className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card p-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                    <Image src={STATUS_AVATARS[v.status] || STATUS_AVATARS.pending} alt="" width={40} height={40} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold truncate">{v.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusText status={v.status} />
                      <span className="text-[9px] text-muted-foreground/50">{timeAgo(v.created_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedVisitor(v)}
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

      {/* Detail dialog */}
      <Dialog open={!!selectedVisitor && !carouselOpen && showDenyFor !== selectedVisitor?.id} onOpenChange={(open) => { if (!open) setSelectedVisitor(null) }}>
        <DialogContent className="sm:max-w-md p-0">
          {selectedVisitor && (
            <>
              {/* Header */}
              <div className="px-4 pt-4 pb-3">
                <DialogHeader>
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                      <Image src={STATUS_AVATARS[selectedVisitor.status] || STATUS_AVATARS.pending} alt="" width={40} height={40} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-[14px] font-semibold">{selectedVisitor.name}</DialogTitle>
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
                    <p className="text-[12px] font-medium mt-0.5">{selectedVisitor.purpose}</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Car className="h-2.5 w-2.5" /> Vehicle</span>
                    <p className="text-[12px] font-medium mt-0.5">{selectedVisitor.vehicle_plate || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Phone className="h-2.5 w-2.5" /> Phone</span>
                    <p className="text-[12px] font-medium mt-0.5">{selectedVisitor.phone || '—'}</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 px-2.5 py-2">
                    <span className="text-[9px] text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> Registered</span>
                    <p className="text-[12px] font-medium mt-0.5">{new Date(selectedVisitor.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </div>

              {/* Status banner */}
              <div className="px-4 pb-3">
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Status</p>
                {selectedVisitor.status === 'pending' && (
                  <div className="rounded-lg bg-secondary/5 border border-secondary/20 px-3 py-2.5 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-secondary shrink-0" />
                    <p className="text-[12px] text-secondary font-medium">Waiting for your approval</p>
                  </div>
                )}
                {selectedVisitor.status === 'approved' && (
                  <div className="rounded-lg bg-accent/5 border border-accent/20 px-3 py-2.5 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                    <p className="text-[12px] text-accent font-medium">Approved — visitor may enter</p>
                  </div>
                )}
                {selectedVisitor.status === 'denied' && (
                  <div className="rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-[12px] text-destructive font-medium">
                      Entry denied{selectedVisitor.denial_reason ? ` — ${selectedVisitor.denial_reason}` : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Proof photos */}
              {(selectedVisitor.proof_urls?.length ?? 0) > 0 && (
                <div className="px-4 pb-3">
                  <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">Proof Photos</p>
                  <ProofGallery
                    urls={selectedVisitor.proof_urls ?? []}
                    onImageClick={(i) => { setCarouselIndex(i); setCarouselOpen(true) }}
                  />
                </div>
              )}

              {/* Actions */}
              <div className="px-4 pb-4">
                <div className="flex gap-2">
                  <Button
                    onClick={() => setApproveTarget(selectedVisitor)}
                    className="flex-1 bg-accent hover:bg-accent/90 text-white h-10 text-xs lg:text-sm rounded-lg"
                    disabled={actionLoading === selectedVisitor.id}
                  >
                    <CheckCircle className="mr-1.5 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => { setShowDenyFor(selectedVisitor.id); setSelectedVisitor(null) }}
                    variant="outline"
                    className="flex-1 h-10 text-xs lg:text-sm rounded-lg text-destructive border-destructive/30 hover:bg-destructive/5"
                    disabled={actionLoading === selectedVisitor.id}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Deny
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ImageCarousel
        urls={selectedVisitor?.proof_urls ?? []}
        initialIndex={carouselIndex}
        open={carouselOpen}
        onClose={() => setCarouselOpen(false)}
      />

      {/* Deny dialog */}
      <Dialog open={!!showDenyFor} onOpenChange={(open) => { if (!open) { setShowDenyFor(null); setCustomReason({}) } }}>
        <DialogContent className="sm:max-w-md p-0">
          {showDenyFor && (
            <>
              <div className="px-4 pt-4 pb-3">
                <DialogHeader>
                  <DialogTitle className="text-[14px] font-semibold">Deny Visitor</DialogTitle>
                </DialogHeader>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Select a reason for denying {visitors.find((v) => v.id === showDenyFor)?.name ?? 'this visitor'}.
                </p>
              </div>

              <div className="px-4 pb-4 space-y-2.5">
                <Select
                  value={denyReason[showDenyFor] || ''}
                  onValueChange={(val) => setDenyReason((prev) => ({ ...prev, [showDenyFor]: val ?? '' }))}
                >
                  <SelectTrigger className="h-10 text-xs lg:text-sm rounded-lg">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not expecting this visitor">Not Expecting</SelectItem>
                    <SelectItem value="Not home right now">Not Home</SelectItem>
                    <SelectItem value="Do not know this person">Unknown Person</SelectItem>
                    <SelectItem value="Other reason">Other (type reason)</SelectItem>
                  </SelectContent>
                </Select>
                {denyReason[showDenyFor] === 'Other reason' && (
                  <Input
                    placeholder="Type your reason..."
                    value={customReason[showDenyFor] || ''}
                    onChange={(e) => setCustomReason((prev) => ({ ...prev, [showDenyFor]: e.target.value }))}
                    className="h-10 text-[16px] lg:text-sm rounded-lg"
                    autoFocus
                  />
                )}
                <div className="flex gap-2 pt-1">
                  <Button
                    onClick={() => handleDeny(showDenyFor)}
                    variant="destructive"
                    className="flex-1 h-10 text-xs lg:text-sm rounded-lg"
                    disabled={
                      actionLoading === showDenyFor ||
                      !denyReason[showDenyFor] ||
                      (denyReason[showDenyFor] === 'Other reason' && !customReason[showDenyFor]?.trim())
                    }
                  >
                    {actionLoading === showDenyFor ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <XCircle className="mr-1.5 h-4 w-4" />}
                    Confirm Denial
                  </Button>
                  <Button
                    variant="outline"
                    className="h-10 text-xs lg:text-sm rounded-lg"
                    onClick={() => { setShowDenyFor(null); setCustomReason((prev) => ({ ...prev, [showDenyFor]: '' })) }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        onConfirm={async () => {
          if (approveTarget) {
            await handleApprove(approveTarget.id)
            setApproveTarget(null)
          }
        }}
        title="Approve Visitor"
        description={`Allow ${approveTarget?.name ?? 'this visitor'} to enter the subdivision?`}
        confirmLabel="Approve Entry"
        variant="default"
        loading={!!actionLoading}
      />
    </div>
  )
}
