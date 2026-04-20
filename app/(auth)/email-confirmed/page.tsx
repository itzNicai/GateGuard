'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CheckCircle2, LogIn, Clock } from 'lucide-react'

export default function EmailConfirmedPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.signOut().catch(() => {})
  }, [])

  return (
    <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
      {/* Success banner */}
      <div className="bg-gradient-to-r from-accent to-accent/80 px-5 py-6 flex flex-col items-center relative overflow-hidden">
        <Image src="/illustrations/pfp.png" alt="" width={140} height={140} className="absolute -right-4 -bottom-4 opacity-15 object-contain" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">Email Confirmed!</h2>
        </div>
      </div>

      {/* Steps */}
      <div className="p-5 space-y-4">
        <p className="text-[12px] text-muted-foreground text-center">
          Your email has been verified successfully.
        </p>

        <div className="rounded-lg bg-secondary/5 border border-secondary/20 px-3 py-2.5 flex items-start gap-2">
          <Clock className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="text-[12px] text-secondary font-medium">Awaiting Admin Approval</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">An admin will review and approve your account. You&apos;ll be notified once approved.</p>
          </div>
        </div>

        <Button onClick={() => router.push('/login')} className="w-full h-10 text-sm rounded-lg">
          <LogIn className="mr-2 h-4 w-4" />
          Go to Sign In
        </Button>
      </div>
    </div>
  )
}
