'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordValues) {
    const supabase = createClient()
    setLoading(true)
    setError(null)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${siteUrl}/auth/callback?type=recovery`,
    })

    if (error) {
      setError('Unable to send reset email. Please check the address.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-accent to-accent/80 px-5 py-6 flex flex-col items-center relative overflow-hidden">
          <Image src="/illustrations/pfp.png" alt="" width={140} height={140} className="absolute -right-4 -bottom-4 opacity-15 object-contain" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Check Your Email</h2>
          </div>
        </div>
        <div className="p-5 space-y-4 text-center">
          <p className="text-[12px] text-muted-foreground">
            We sent a password reset link to <strong>{form.getValues('email')}</strong>. Click the link in the email to set a new password.
          </p>
          <Link href="/login">
            <Button variant="outline" className="rounded-lg">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Reset Password</h1>
          <p className="text-[12px] lg:text-sm text-muted-foreground mt-0.5">
            Enter your email and we&apos;ll send a reset link.
          </p>
        </div>
        <Image src="/illustrations/logo1.png" alt="" width={70} height={70} className="object-contain shrink-0 opacity-90" />
      </div>

      <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
        {error && (
          <div className="mx-5 mt-5 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
            <p className="text-[12px] text-destructive font-medium">{error}</p>
          </div>
        )}
        <div className="p-5 lg:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="email" render={({ field }) => (
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
              )} />
              <Button type="submit" className="w-full h-11 text-sm rounded-lg shadow-sm" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                Send Reset Link
              </Button>
            </form>
          </Form>
        </div>
        <div className="px-5 pb-5 lg:px-6 lg:pb-6">
          <div className="border-t border-border/40 pt-4 text-center">
            <Link href="/login" className="text-[12px] text-primary hover:underline font-medium">Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
