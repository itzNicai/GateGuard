'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/shared/status-badge'
import { ProofGallery } from '@/components/shared/proof-gallery'
import { ImageCarousel } from '@/components/shared/image-carousel'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { Profile } from '@/types'

interface HomeownerReviewDialogProps {
  homeowner: Profile | null
  open: boolean
  onClose: () => void
  onAction: (id: string, action: 'approve' | 'reject', reason?: string) => Promise<void>
}

export function HomeownerReviewDialog({ homeowner, open, onClose, onAction }: HomeownerReviewDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [carouselOpen, setCarouselOpen] = useState(false)
  const [carouselIndex, setCarouselIndex] = useState(0)

  if (!homeowner) return null

  async function handleAction(action: 'approve' | 'reject') {
    setLoading(true)
    await onAction(homeowner!.id, action, action === 'reject' ? rejectionReason : undefined)
    setLoading(false)
    setShowRejectForm(false)
    setRejectionReason('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Homeowner Application</DialogTitle>
          <DialogDescription>Review the details and proof of ID before approving or rejecting.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{homeowner.full_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{homeowner.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{homeowner.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Location</p>
              <p className="font-medium">{homeowner.block && homeowner.lot ? `${homeowner.block}, ${homeowner.lot}` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusBadge status={homeowner.status} />
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              {homeowner.email_confirmed ? (
                <span className="inline-flex items-center text-xs font-medium text-accent">Confirmed</span>
              ) : (
                <span className="inline-flex items-center text-xs font-medium text-destructive">Not confirmed</span>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Registered</p>
              <p className="font-medium">{new Date(homeowner.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {(homeowner.proof_of_id_urls?.length ?? 0) > 0 ? (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Proof of ID</p>
              <ProofGallery
                urls={homeowner.proof_of_id_urls ?? []}
                onImageClick={(i) => { setCarouselIndex(i); setCarouselOpen(true) }}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No proof of ID uploaded.</p>
          )}

          <ImageCarousel
            urls={homeowner.proof_of_id_urls ?? []}
            initialIndex={carouselIndex}
            open={carouselOpen}
            onClose={() => setCarouselOpen(false)}
          />

          {showRejectForm && (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}

          {homeowner.status === 'pending' && (
            <div className="flex gap-3 pt-2">
              {!showRejectForm ? (
                <>
                  <Button
                    onClick={() => handleAction('approve')}
                    className="flex-1 bg-accent hover:bg-accent/90 text-white"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    Approve
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(true)}
                    variant="destructive"
                    className="flex-1"
                    disabled={loading}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => handleAction('reject')}
                    variant="destructive"
                    className="flex-1"
                    disabled={loading || !rejectionReason.trim()}
                  >
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Confirm Rejection
                  </Button>
                  <Button
                    onClick={() => setShowRejectForm(false)}
                    variant="outline"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
