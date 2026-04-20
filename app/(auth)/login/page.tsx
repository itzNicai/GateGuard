'use client'

import { Suspense, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, type LoginValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { getDashboardPath } from '@/lib/routes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/shared/password-input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { LogIn, Loader2, Mail, Lock } from 'lucide-react'

const STATUS_MESSAGES: Record<string, { text: string; type: 'warning' | 'error' }> = {
  awaiting_approval: { text: 'Your account is awaiting admin approval.', type: 'warning' },
  rejected: { text: 'Your registration was not approved. Contact admin for assistance.', type: 'error' },
  auth_error: { text: 'Authentication failed. The link may have expired.', type: 'error' },
  email_not_confirmed: { text: 'Please confirm your email address first. Check your inbox for the verification link.', type: 'warning' },
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const message = searchParams.get('message')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginValues) {
    setLoading(true)
    setError(null)

    // Step 1: Rate-limited server check
    try {
      const rateRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })

      if (!rateRes.ok) {
        const data = await rateRes.json()
        setError(data.message || 'Invalid email or password.')
        setLoading(false)
        return
      }
    } catch {
      setError('Network error — please try again.')
      setLoading(false)
      return
    }

    // Step 2: Create client session (rate limit passed)
    const supabase = createClient()
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(values)

    if (signInError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    const user = signInData.user
    if (!user) { setLoading(false); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, email_confirmed')
      .eq('id', user.id)
      .single()

    if (!profile) {
      setError('Unable to load your account. Please try again.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (profile.role === 'homeowner' && !profile.email_confirmed) {
      setError(STATUS_MESSAGES.email_not_confirmed.text)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (profile.role === 'homeowner' && profile.status === 'pending') {
      setError(STATUS_MESSAGES.awaiting_approval.text)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (profile.role === 'homeowner' && profile.status === 'rejected') {
      setError(STATUS_MESSAGES.rejected.text)
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    router.push(getDashboardPath(profile.role))
  }

  const statusMsg = message ? STATUS_MESSAGES[message] : null

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-[12px] lg:text-sm text-muted-foreground mt-0.5">
            Sign in to your GateGuard account.
          </p>
        </div>
        <Image
          src="/illustrations/profile.png"
          alt=""
          width={80}
          height={80}
          className="object-contain shrink-0 opacity-90"
        />
      </div>

      {/* Form card */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
        {/* Status message banner */}
        {statusMsg && (
          <div className={`mx-5 mt-5 rounded-lg px-3 py-2.5 flex items-start gap-2 ${
            statusMsg.type === 'warning'
              ? 'bg-secondary/5 border border-secondary/20'
              : 'bg-destructive/5 border border-destructive/20'
          }`}>
            <p className={`text-[12px] font-medium ${
              statusMsg.type === 'warning' ? 'text-secondary' : 'text-destructive'
            }`}>{statusMsg.text}</p>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-5 mt-5 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
            <p className="text-[12px] text-destructive font-medium">{error}</p>
          </div>
        )}

        <div className="p-5 lg:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5 text-[12px]">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" autoComplete="email" className="h-10 lg:h-9 rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        Password
                      </FormLabel>
                      <Link href="/forgot-password" className="text-[11px] text-primary hover:underline font-medium">
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput placeholder="Enter your password" autoComplete="current-password" className="h-10 lg:h-9 rounded-lg" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-11 text-sm rounded-lg shadow-sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-4 w-4" />
                )}
                Sign In
              </Button>
            </form>
          </Form>
        </div>

        {/* Footer links */}
        <div className="px-5 pb-5 lg:px-6 lg:pb-6">
          <div className="border-t border-border/40 pt-4 text-center">
            <p className="text-[12px] text-muted-foreground">
              New homeowner?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
