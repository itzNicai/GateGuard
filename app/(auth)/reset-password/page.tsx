'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { PasswordInput } from '@/components/shared/password-input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Loader2, Lock, CheckCircle2, LogIn } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  async function onSubmit(values: ChangePasswordValues) {
    const supabase = createClient()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password: values.newPassword })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
        <div className="bg-gradient-to-r from-accent to-accent/80 px-5 py-6 flex flex-col items-center relative overflow-hidden">
          <Image src="/illustrations/notif-approved.png" alt="" width={140} height={140} className="absolute -right-4 -bottom-4 opacity-15 object-contain" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Password Updated</h2>
          </div>
        </div>
        <div className="p-5 space-y-4 text-center">
          <p className="text-[12px] text-muted-foreground">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <Button onClick={() => router.push('/login')} className="rounded-lg h-10 text-sm">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Set New Password</h1>
          <p className="text-[12px] lg:text-sm text-muted-foreground mt-0.5">
            Choose a strong password for your account.
          </p>
        </div>
        <Image src="/illustrations/profile.png" alt="" width={70} height={70} className="object-contain shrink-0 opacity-90" />
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
              <FormField control={form.control} name="newPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-[12px]">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    New Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="Min. 8 characters" className="h-10 lg:h-9 rounded-lg" {...field} />
                  </FormControl>
                  <FormMessage />
                  <p className="text-[10px] text-muted-foreground mt-1">Must include uppercase, lowercase, and a number.</p>
                </FormItem>
              )} />
              <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5 text-[12px]">
                    <Lock className="h-3 w-3 text-muted-foreground" />
                    Confirm Password
                  </FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="Re-enter password" className="h-10 lg:h-9 rounded-lg" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full h-11 text-sm rounded-lg shadow-sm" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                Reset Password
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
