'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { visitorSchema, type VisitorValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { HomeownerSearch } from '@/components/visitor/homeowner-search'
import { QRDisplay } from '@/components/visitor/qr-display'
import { FileUpload } from '@/components/shared/file-upload'
import { QrCode, AlertCircle, Loader2, User, Phone, Car, FileText, Home } from 'lucide-react'

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

interface HomeownerOption {
  id: string
  full_name: string
  block: string | null
  lot: string | null
}

interface VisitorResult {
  qr_code: string
  name: string
  expires_at: string
  homeowner_name: string
}

export default function VisitorPortalPage() {
  const [selectedHomeowner, setSelectedHomeowner] = useState<HomeownerOption | null>(null)
  const [proofFiles, setProofFiles] = useState<File[]>([])
  const [proofError, setProofError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VisitorResult | null>(null)

  const form = useForm<VisitorValues>({
    resolver: zodResolver(visitorSchema),
    defaultValues: { name: '', phone: '', purpose: '', vehiclePlate: '', homeownerId: '' },
  })

  async function onSubmit(values: VisitorValues) {
    setError(null)
    setProofError(null)

    if (proofFiles.length === 0) {
      setProofError('Please attach at least one photo as proof (selfie or item photo).')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Upload all files in parallel
      const uploadResults = await Promise.all(
        proofFiles.map(async (file) => {
          const fileExt = file.name.split('.').pop()
          const filePath = `${generateId()}.${fileExt}`
          const { error: uploadError } = await supabase.storage
            .from('visitor-proof')
            .upload(filePath, file)
          if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`)
          const { data: urlData } = supabase.storage.from('visitor-proof').getPublicUrl(filePath)
          return urlData.publicUrl
        })
      )

      const res = await fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          phone: values.phone || null,
          purpose: values.purpose,
          vehicle_plate: values.vehiclePlate || null,
          homeowner_id: values.homeownerId,
          proof_urls: uploadResults,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error || 'Something went wrong.')
        setLoading(false)
        return
      }

      const data = await res.json()
      setResult({
        qr_code: data.visitor.qr_code,
        name: data.visitor.name,
        expires_at: data.visitor.expires_at,
        homeowner_name: data.homeowner_name,
      })
    } catch (err) {
      console.error('[visitor] submit error:', err)
      setError(err instanceof Error ? err.message : 'Network error — please try again.')
    }
    setLoading(false)
  }

  function handleReset() {
    form.reset()
    setSelectedHomeowner(null)
    setProofFiles([])
    setProofError(null)
    setResult(null)
    setError(null)
  }

  if (result) {
    return (
      <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
        <div className="p-5 lg:p-6">
          <QRDisplay
            qrCode={result.qr_code}
            visitorName={result.name}
            homeownerName={result.homeowner_name}
            expiresAt={result.expires_at}
            onReset={handleReset}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h1 className="text-lg lg:text-xl font-bold text-foreground">Visitor Check-In</h1>
          <p className="text-[12px] lg:text-sm text-muted-foreground mt-0.5">
            Fill in your details to get a QR code for gate entry.
          </p>
        </div>
        <Image
          src="/illustrations/waiting.png"
          alt=""
          width={80}
          height={80}
          className="object-contain shrink-0 opacity-90"
        />
      </div>

      {/* Form */}
      <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
        {error && (
          <div className="mx-5 mt-5 rounded-lg bg-destructive/5 border border-destructive/20 px-3 py-2.5 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <p className="text-[12px] text-destructive font-medium">{error}</p>
          </div>
        )}

        <div className="p-5 lg:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Personal info section */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Personal Information</p>
                <div className="space-y-3">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <User className="h-3 w-3 text-muted-foreground" />
                        Your Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Full name" {...field} className="h-10 lg:h-9 rounded-lg" />
                      </FormControl>
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
                      <FormControl>
                        <Input type="tel" placeholder="09XX XXX XXXX" {...field} className="h-10 lg:h-9 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Visit details section */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Visit Details</p>
                <div className="space-y-3">
                  <FormField control={form.control} name="purpose" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        Purpose of Visit
                      </FormLabel>
                      <FormControl>
                        <Textarea placeholder="e.g. Delivery, Guest visit, Maintenance" {...field} className="rounded-lg min-h-[72px] resize-none" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vehiclePlate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <Car className="h-3 w-3 text-muted-foreground" />
                        Vehicle Plate
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. ABC 1234" {...field} className="h-10 lg:h-9 rounded-lg" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="homeownerId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5 text-[12px]">
                        <Home className="h-3 w-3 text-muted-foreground" />
                        Homeowner You&apos;re Visiting
                      </FormLabel>
                      <FormControl>
                        <HomeownerSearch
                          selected={selectedHomeowner}
                          onSelect={(ho) => {
                            setSelectedHomeowner(ho)
                            field.onChange(ho?.id ?? '')
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Proof section */}
              <div>
                <p className="text-[9px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3">Verification</p>
                <div className="space-y-1.5">
                  <p className="text-[12px] font-medium flex items-center gap-1.5">
                    Proof Photo <span className="text-destructive">*</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Take a selfie or photo of the item you are delivering.
                  </p>
                  <FileUpload
                    multiple
                    onFilesSelect={(files) => { setProofFiles(files); if (files.length > 0) setProofError(null) }}
                    maxFiles={5}
                    accept="image/*"
                    label="Take or upload a photo"
                  />
                  {proofError && (
                    <p className="text-xs text-destructive">{proofError}</p>
                  )}
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" className="w-full h-11 text-sm rounded-lg shadow-sm" disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Get QR Code
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  )
}
