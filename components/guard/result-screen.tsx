'use client'

import { useEffect } from 'react'
import { CheckCircle2, XCircle, LogOut } from 'lucide-react'

type ResultType = 'APPROVED' | 'DENIED' | 'EXIT_CLEARED' | 'INVALID'

interface ResultScreenProps {
  type: ResultType
  message?: string
  denialReason?: string
  onDismiss: () => void
  autoDismissMs?: number
}

const config: Record<ResultType, { icon: typeof CheckCircle2; bg: string; text: string; label: string }> = {
  APPROVED: {
    icon: CheckCircle2,
    bg: 'bg-accent',
    text: 'text-white',
    label: 'APPROVED',
  },
  DENIED: {
    icon: XCircle,
    bg: 'bg-destructive',
    text: 'text-white',
    label: 'DENIED',
  },
  EXIT_CLEARED: {
    icon: LogOut,
    bg: 'bg-accent',
    text: 'text-white',
    label: 'EXIT CLEARED',
  },
  INVALID: {
    icon: XCircle,
    bg: 'bg-destructive',
    text: 'text-white',
    label: 'INVALID QR',
  },
}

export function ResultScreen({ type, message, denialReason, onDismiss, autoDismissMs = 5000 }: ResultScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, autoDismissMs)
    return () => clearTimeout(timer)
  }, [onDismiss, autoDismissMs])

  const { icon: Icon, bg, text, label } = config[type]

  return (
    <button
      onClick={onDismiss}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${bg} ${text} cursor-pointer animate-fade-in-scale`}
    >
      <Icon className="h-24 w-24 mb-4" strokeWidth={1.5} />
      <h1 className="text-3xl font-bold tracking-tight mb-1">{label}</h1>
      {message && <p className="text-lg opacity-90">{message}</p>}
      {type === 'DENIED' && denialReason && (
        <p className="text-sm opacity-75 mt-2 max-w-xs text-center">
          Reason: {denialReason}
        </p>
      )}
      <p className="mt-8 text-xs opacity-60">Tap anywhere to dismiss</p>
    </button>
  )
}
