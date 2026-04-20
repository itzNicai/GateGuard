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
import { LogIn, Loader2, Mail, Lock, ArrowRight } from 'lucide-react'

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
    <div className="w-full max-w-[480px] mx-auto relative">
      {/* Ambient background glows */}
      <div className="absolute -inset-20 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-[#c9a962]/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#c9a962]/10 rounded-full blur-[100px] animate-pulse" />
      </div>

      <div className="flex items-start justify-between mb-8 relative">
        <div>
          <h1 className="text-[28px] font-bold text-[#f5e6d3] mb-2 drop-shadow-[0_0_10px_rgba(201,169,98,0.3)]">Welcome Back</h1>
          <p className="text-[15px] text-[#d4c5b0]">
            Sign in to your GateGuard account.
          </p>
        </div>
        <div className="relative w-20 h-20 shrink-0 group">
          <div className="absolute inset-0 bg-[#c9a962]/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500 scale-125" />
          <Image
            src="/illustrations/logo1.png"
            alt=""
            fill
            className="object-contain opacity-90 relative z-10"
          />
        </div>
      </div>

      {/* Glowing card container */}
      <div className="relative group">
        {/* Outer glow layers */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#c9a962]/30 via-[#c9a962]/60 to-[#c9a962]/30 rounded-2xl blur-lg opacity-40 group-hover:opacity-80 transition duration-1000 group-hover:duration-200 animate-pulse" />
        <div className="absolute -inset-2 bg-gradient-to-r from-[#c9a962]/20 via-[#c9a962]/40 to-[#c9a962]/20 rounded-2xl blur-xl opacity-30 group-hover:opacity-60 transition duration-700" />
        <div className="absolute -inset-1 bg-[#c9a962]/20 rounded-2xl blur-md opacity-20 group-hover:opacity-50 transition duration-500" />
        
        {/* Rotating gradient border effect */}
        <div className="absolute -inset-[2px] bg-gradient-to-r from-[#c9a962]/0 via-[#c9a962]/80 to-[#c9a962]/0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-[2px]" />

        <div className="rounded-2xl bg-[#4a3f35] border-2 border-[#c9a962]/30 p-8 shadow-[0_0_40px_rgba(201,169,98,0.15)] overflow-hidden relative group-hover:border-[#c9a962]/50 group-hover:shadow-[0_0_60px_rgba(201,169,98,0.25)] transition-all duration-500">
          {/* Animated top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c9a962] to-transparent shadow-[0_0_10px_rgba(201,169,98,0.8)]" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#c9a962]/0 via-[#c9a962]/50 to-[#c9a962]/0 blur-sm" />
          
          {/* Corner glows */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-[#c9a962]/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-[#c9a962]/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" />
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#c9a962]/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#c9a962]/10 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
          
          {/* Side glows */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gradient-to-b from-transparent via-[#c9a962]/30 to-transparent blur-sm" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-gradient-to-b from-transparent via-[#c9a962]/30 to-transparent blur-sm" />

          {statusMsg && (
            <div className={`mb-6 rounded-lg px-4 py-3 border ${
              statusMsg.type === 'warning'
                ? 'bg-[#c9a962]/10 border-[#c9a962]/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <p className={`text-[13px] font-medium ${
                statusMsg.type === 'warning' ? 'text-[#c9a962]' : 'text-red-400'
              }`}>{statusMsg.text}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
              <p className="text-[13px] text-red-400 font-medium">{error}</p>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 relative z-10">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="flex items-center gap-2 text-[14px] text-[#e8dcc8] font-semibold">
                      <Mail className="h-4 w-4 text-[#c9a962]" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="you@example.com" 
                        autoComplete="email" 
                        className="h-12 rounded-xl bg-white border-0 text-[#3d3229] placeholder:text-[#3d3229]/40 focus:ring-2 focus:ring-[#c9a962] shadow-[0_0_15px_rgba(201,169,98,0.1)] focus:shadow-[0_0_20px_rgba(201,169,98,0.3)] transition-all duration-300" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-[12px]" />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FormLabel className="flex items-center gap-2 text-[14px] text-[#e8dcc8] font-semibold">
                        <Lock className="h-4 w-4 text-[#c9a962]" />
                        Password
                      </FormLabel>
                      <Link href="/forgot-password" className="text-[13px] text-[#c9a962] hover:text-[#d4b978] hover:underline font-medium relative group/link">
                        <span className="absolute inset-0 bg-[#c9a962]/10 rounded blur-md opacity-0 group-hover/link:opacity-100 transition-all duration-300 -m-1" />
                        <span className="relative z-10 drop-shadow-[0_0_5px_rgba(201,169,98,0.5)]">Forgot password?</span>
                      </Link>
                    </div>
                    <FormControl>
                      <PasswordInput 
                        placeholder="Enter your password" 
                        autoComplete="current-password" 
                        className="h-12 rounded-xl bg-white border-0 text-[#3d3229] placeholder:text-[#3d3229]/40 focus:ring-2 focus:ring-[#c9a962] shadow-[0_0_15px_rgba(201,169,98,0.1)] focus:shadow-[0_0_20px_rgba(201,169,98,0.3)] transition-all duration-300" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-[12px]" />
                  </FormItem>
                )}
              />
              
              {/* Glowing Sign In Button */}
              <div className="relative group/btn pt-2">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#c9a962]/40 via-[#c9a962]/60 to-[#c9a962]/40 rounded-xl blur-lg opacity-0 group-hover/btn:opacity-100 transition-all duration-300" />
                <div className="absolute -inset-1 bg-[#c9a962]/30 rounded-xl blur-md opacity-0 group-hover/btn:opacity-100 transition-all duration-500" />
                
                <Button 
                  type="submit" 
                  className="relative w-full h-14 text-[16px] font-semibold rounded-xl bg-[#c9a962] hover:bg-[#d4b978] text-[#3d3229] transition-all duration-300 disabled:opacity-50 shadow-[0_0_20px_rgba(201,169,98,0.3)] hover:shadow-[0_0_40px_rgba(201,169,98,0.6)] border-2 border-transparent hover:border-[#c9a962]/50 overflow-hidden group-active/btn:scale-[0.98]" 
                  disabled={loading}
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="mr-2 h-5 w-5 drop-shadow-[0_0_3px_rgba(61,50,41,0.5)]" />
                  )}
                  <span className="relative z-10 drop-shadow-[0_0_3px_rgba(61,50,41,0.3)]">Sign In</span>
                </Button>
              </div>
            </form>
          </Form>

          <div className="mt-8 pt-6 border-t border-[#d4c5b0]/30 relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#c9a962]/30 to-transparent" />
            <p className="text-[14px] text-[#d4c5b0] text-center">
              New homeowner?{' '}
              <Link href="/register" className="text-[#c9a962] hover:text-[#d4b978] hover:underline font-semibold relative inline-block group/reg">
                <span className="absolute inset-0 bg-[#c9a962]/20 rounded blur-lg opacity-0 group-hover/reg:opacity-100 transition-all duration-300 -m-2" />
                <span className="relative z-10 drop-shadow-[0_0_8px_rgba(201,169,98,0.6)]">Register here</span>
              </Link>
            </p>
          </div>

          {/* Bottom intense glow line */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[2px] bg-gradient-to-r from-transparent via-[#c9a962] to-transparent shadow-[0_0_15px_rgba(201,169,98,0.8)]" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-4 bg-[#c9a962]/20 blur-xl" />
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