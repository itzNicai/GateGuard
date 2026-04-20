'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2, LogOut, User, MapPin, X } from 'lucide-react'

type QueueStatus = 'waiting' | 'approved' | 'denied' | 'exited' | 'timeout'

interface QueueVisitor {
  id: string
  name: string
  purpose: string
  vehicle_plate: string | null
  homeowner: {
    full_name: string
    block: string | null
    lot: string | null
  } | null
}

interface QueueCardProps {
  visitor: QueueVisitor
  scanType: 'ENTRY' | 'EXIT'
  onDismiss: (visitorId: string) => void
}

export function QueueCard({ visitor, scanType, onDismiss }: QueueCardProps) {
  const [status, setStatus] = useState<QueueStatus>(scanType === 'EXIT' ? 'exited' : 'waiting')
  const [denialReason, setDenialReason] = useState<string | undefined>()
  const [timeLeft, setTimeLeft] = useState(120)
  const [flash, setFlash] = useState(false)

  // Listen for realtime visitor status changes
  const handleData = useCallback(
    (payload: { new?: Record<string, unknown> }) => {
      const updated = payload.new as { status?: string; denial_reason?: string } | undefined
      if (updated?.status === 'approved') {
        setStatus('approved')
        setFlash(true)
      }
      if (updated?.status === 'denied') {
        setStatus('denied')
        setDenialReason(updated.denial_reason ?? undefined)
        setFlash(true)
      }
    },
    []
  )

  useRealtime({
    table: 'visitors',
    event: 'UPDATE',
    filter: status === 'waiting' ? `id=eq.${visitor.id}` : undefined,
    onData: handleData,
  })

  // Countdown for waiting status
  useEffect(() => {
    if (status !== 'waiting') return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setStatus('timeout')
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [status])

  // Clear flash after animation
  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(false), 1000)
    return () => clearTimeout(t)
  }, [flash])

  const borderColor = {
    waiting: 'border-secondary/40',
    approved: 'border-accent/50',
    denied: 'border-destructive/50',
    exited: 'border-border',
    timeout: 'border-secondary/30',
  }[status]

  const bgFlash = flash
    ? status === 'approved' ? 'bg-accent/5' : 'bg-destructive/5'
    : ''

  return (
    <Card className={`border ${borderColor} ${bgFlash} transition-all duration-500 relative`}>
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          {/* Status icon */}
          <div className="shrink-0 mt-0.5">
            {status === 'waiting' && <Loader2 className="h-5 w-5 animate-spin text-secondary" />}
            {status === 'approved' && <CheckCircle2 className="h-5 w-5 text-accent" />}
            {status === 'denied' && <XCircle className="h-5 w-5 text-destructive" />}
            {status === 'exited' && <LogOut className="h-5 w-5 text-muted-foreground" />}
            {status === 'timeout' && <Loader2 className="h-5 w-5 text-muted-foreground" />}
          </div>

          {/* Visitor info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">{visitor.name}</p>
              {status === 'waiting' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-secondary/10 text-secondary border border-secondary/30 shrink-0">
                  Waiting
                </span>
              )}
              {status === 'approved' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent border border-accent/30 shrink-0">
                  Approved
                </span>
              )}
              {status === 'denied' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-destructive/10 text-destructive border border-destructive/30 shrink-0">
                  Denied
                </span>
              )}
              {status === 'exited' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground shrink-0">
                  Exited
                </span>
              )}
              {status === 'timeout' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground shrink-0">
                  No response
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {visitor.homeowner && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 shrink-0" />
                  {visitor.homeowner.full_name}
                  {visitor.homeowner.block && ` (${visitor.homeowner.block}, ${visitor.homeowner.lot})`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <User className="h-3 w-3 shrink-0" />
                {visitor.purpose}
              </span>
              {visitor.vehicle_plate && (
                <span className="truncate">{visitor.vehicle_plate}</span>
              )}
            </div>

            {/* Status-specific content */}
            {status === 'approved' && (
              <p className="text-xs font-medium text-accent mt-1.5">Open the gate</p>
            )}
            {status === 'denied' && denialReason && (
              <p className="text-xs text-destructive mt-1.5">Reason: {denialReason}</p>
            )}
            {status === 'waiting' && timeLeft <= 60 && (
              <p className="text-[11px] text-muted-foreground/60 mt-1">Auto-dismiss in {timeLeft}s</p>
            )}
          </div>

          {/* Dismiss button */}
          {status !== 'waiting' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 -mr-1 -mt-0.5"
              onClick={() => onDismiss(visitor.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
