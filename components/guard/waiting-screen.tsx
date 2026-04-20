'use client'

import { useCallback, useState, useEffect } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import { Loader2, User, MapPin, Car, Clock, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface WaitingVisitor {
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

interface WaitingScreenProps {
  visitor: WaitingVisitor
  onResult: (status: 'approved' | 'denied', denialReason?: string) => void
  onTimeout?: () => void
}

export function WaitingScreen({ visitor, onResult, onTimeout }: WaitingScreenProps) {
  const [timeLeft, setTimeLeft] = useState(120)
  const [timedOut, setTimedOut] = useState(false)

  const handleData = useCallback(
    (payload: { new?: Record<string, unknown> }) => {
      const updated = payload.new as { status?: string; denial_reason?: string } | undefined
      if (updated?.status === 'approved') onResult('approved')
      if (updated?.status === 'denied') onResult('denied', updated.denial_reason ?? undefined)
    },
    [onResult]
  )

  useRealtime({
    table: 'visitors',
    event: 'UPDATE',
    filter: `id=eq.${visitor.id}`,
    onData: handleData,
  })

  // Countdown timer
  useEffect(() => {
    if (timedOut) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setTimedOut(true)
          clearInterval(interval)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timedOut])

  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center animate-fade-in">
        <div className="h-12 w-12 rounded-full bg-secondary/10 flex items-center justify-center">
          <Clock className="h-6 w-6 text-secondary" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold">No Response</h2>
          <p className="text-xs text-muted-foreground max-w-xs">
            The homeowner hasn&apos;t responded within 2 minutes.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setTimedOut(false); setTimeLeft(120) }}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Wait Longer
          </Button>
          <Button size="sm" onClick={() => onTimeout?.()}>
            Dismiss
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center animate-fade-in">
      <div className="relative">
        <Loader2 className="h-10 w-10 animate-spin text-secondary" />
      </div>
      <div className="space-y-0.5">
        <h2 className="text-base font-semibold">Waiting for Approval</h2>
        <p className="text-xs text-muted-foreground">The homeowner has been notified</p>
      </div>

      {timeLeft <= 60 && (
        <p className="text-[11px] text-muted-foreground/70">Auto-dismiss in {timeLeft}s</p>
      )}

      <div className="bg-card rounded-lg p-4 max-w-sm w-full space-y-3 text-left text-sm shadow-card ring-1 ring-border/60">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Visitor</p>
            <p className="text-[13px] font-medium">{visitor.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <MapPin className="h-3.5 w-3.5 text-accent" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Visiting</p>
            <p className="text-[13px] font-medium">
              {visitor.homeowner?.full_name ?? 'Unknown'}
              {visitor.homeowner?.block && ` — ${visitor.homeowner.block}, ${visitor.homeowner.lot}`}
            </p>
          </div>
        </div>
        {visitor.vehicle_plate && (
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
              <Car className="h-3.5 w-3.5 text-secondary" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Vehicle</p>
              <p className="text-[13px] font-medium">{visitor.vehicle_plate}</p>
            </div>
          </div>
        )}
        <div className="pl-10">
          <p className="text-[11px] text-muted-foreground">Purpose</p>
          <p className="text-[13px] font-medium">{visitor.purpose}</p>
        </div>
      </div>
    </div>
  )
}
