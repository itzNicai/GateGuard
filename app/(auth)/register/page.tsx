'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerSchema, type RegisterValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/shared/password-input'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileUpload } from '@/components/shared/file-upload'
import { UserPlus, Loader2, User, Mail, Phone, Lock, MapPin, FileText, CheckCircle2 } from 'lucide-react'
import type { BlockLot } from '@/types'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export default function RegisterPage() {
  const router = useRouter()
  const [blocksLots, setBlocksLots] = useState<BlockLot[]>([])
  const [proofFiles, setProofFiles] = useState<File[]>([])
  const [proofError, setProofError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '', email: '', phone: '', password: '',
      confirmPassword: '', block: '', lot: '',
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedBlock = form.watch('block')

  useEffect(() => {
    fetch('/api/blocks-lots')
      .then((res) => res.json())
      .then((data) => setBlocksLots(data))
      .catch(() => {})
  }, [])

  const blocks = [...new Set(blocksLots.map((bl) => bl.block))].sort(
    (a, b) => parseInt(a.replace('Block ', '')) - parseInt(b.replace('Block ', ''))
  )
  const lotsForBlock = blocksLots
    .filter((bl) => bl.block === selectedBlock)
    .sort((a, b) => parseInt(a.lot.replace('Lot ', '')) - parseInt(b.lot.replace('Lot ', '')))

  async function onSubmit(values: RegisterValues) {
    setLoading(true)
    setError(null)
    setProofError(null)

    if (proofFiles.length === 0) {
      setProofError('Please upload at least one valid ID or proof of residency.')
      setLoading(false)
      return
    }

    const supabase = createClient()

    let uploadedUrls: string[]
    try {
      uploadedUrls = await Promise.all(
        proofFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop()
          const filePath = `${generateId()}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('proof-of-id')
            .upload(filePath, file)
          if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          const { data: urlData } = supabase.storage.from('proof-of-id').getPublicUrl(filePath)
          return urlData.publicUrl
        })
      )
    } catch {
      setError('Failed to upload ID documents. Please try again.')
      setLoading(false)
      return
    }
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const { error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback`,
        data: {
          full_name: values.fullName,
          phone: values.phone || null,
          block: values.block,
          lot: values.lot,
          role: 'homeowner',
          proof_of_id_urls: uploadedUrls,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
        {/* Success banner */}
        <div className="bg-gradient-to-r from-accent to-accent/80 px-5 py-6 flex flex-col items-center relative overflow-hidden">
          <Image src="/illustrations/notif-approved.png" alt="" width={160} height={160} className="absolute -right-4 -bottom-4 opacity-15 object-contain" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Registration Submitted</h2>
          </div>
        </div>

        {/* Steps */}
        <div className="p-5 lg:p-6 space-y-4">
          <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider">What happens next</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-primary">1</span>
              </div>
              <div>
                <p className="text-[13px] font-medium">Verify your email</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Check your inbox and click the verification link we sent you.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-secondary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-secondary">2</span>
              </div>
              <div>
                <p className="text-[13px] font-medium">Admin review</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">An admin will verify your identity and approve your account.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[11px] font-bold text-accent">3</span>
              </div>
              <div>
                <p className="text-[13px] font-medium">You&apos;re in!</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Once approved, sign in and start managing your visitors.</p>
              </div>
            </div>
          </div>

          <Button onClick={() => router.push('/login')} className="w-full h-11 text-sm rounded-lg shadow-sm mt-2">
            <Mail className="mr-2 h-4 w-4" />
            Back to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Homeowner Registration</h1>
          <p className="text-[12px] lg:text-sm text-muted-foreground mt-0.5">
            Register to manage visitors for your home.
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
        {error && (
          <div className="mx-5 mt-5 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5">
            <p className="text-[12px] text-destructive font-medium">{error}</p>
          </div>
        )}

        <div className="p-5 lg:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Personal info */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Personal Information</p>
                <div className="space-y-3">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <User className="h-3 w-3 text-muted-foreground" />
                        Full Name
                      </FormLabel>
                      <FormControl><Input placeholder="Juan Dela Cruz" className="h-10 lg:h-9 rounded-lg" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        Email
                      </FormLabel>
                      <FormControl><Input type="email" placeholder="you@example.com" autoComplete="email" className="h-10 lg:h-9 rounded-lg" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        Phone
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl><Input type="tel" placeholder="09XX XXX XXXX" className="h-10 lg:h-9 rounded-lg" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Address */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Address</p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="block" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        Block
                      </FormLabel>
                      <Select value={field.value} onValueChange={(val) => { field.onChange(val ?? ''); form.setValue('lot', '') }}>
                        <FormControl><SelectTrigger className="h-10 lg:h-9 rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {blocks.map((block) => (
                            <SelectItem key={block} value={block}>{block}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="lot" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        Lot
                      </FormLabel>
                      <Select value={field.value} onValueChange={(val) => field.onChange(val ?? '')} disabled={!selectedBlock}>
                        <FormControl><SelectTrigger className="h-10 lg:h-9 rounded-lg"><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {lotsForBlock.map((bl) => (
                            <SelectItem key={bl.id} value={bl.lot}>{bl.lot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Verification */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Verification</p>
                <div className="space-y-1.5">
                  <p className="text-[12px] font-medium flex items-center gap-1.5">
                    <FileText className="h-3 w-3 text-muted-foreground" />
                    Valid ID / Proof of Residency <span className="text-destructive">*</span>
                  </p>
                  <FileUpload
                    multiple
                    onFilesSelect={(files) => { setProofFiles(files); if (files.length > 0) setProofError(null) }}
                    maxFiles={5}
                  />
                  {proofError && (
                    <p className="text-xs text-destructive">{proofError}</p>
                  )}
                </div>
              </div>

              {/* Security */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Security</p>
                <div className="space-y-3">
                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        Password
                      </FormLabel>
                      <FormControl><PasswordInput placeholder="Min. 8 characters" className="h-10 lg:h-9 rounded-lg" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        Confirm Password
                      </FormLabel>
                      <FormControl><PasswordInput placeholder="Re-enter password" className="h-10 lg:h-9 rounded-lg" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full h-11 text-sm rounded-lg shadow-sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Submit Application
              </Button>
            </form>
          </Form>
        </div>

        {/* Footer link */}
        <div className="px-5 pb-5 lg:px-6 lg:pb-6">
          <div className="border-t border-border/40 pt-4 text-center">
            <p className="text-[12px] text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
