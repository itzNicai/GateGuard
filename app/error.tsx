'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary/[0.03] via-background to-background px-4">
      <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-destructive" />
      </div>
      <h1 className="text-lg font-bold mb-1">Something went wrong</h1>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-xs">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline" size="sm">
          Try again
        </Button>
        <Link href="/">
          <Button size="sm">Go home</Button>
        </Link>
      </div>
    </div>
  )
}
