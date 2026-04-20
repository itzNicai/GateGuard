'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { addGuardSchema, type AddGuardValues } from '@/lib/validations'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { CheckCircle2, Loader2, Copy } from 'lucide-react'

interface AddGuardDialogProps {
  open: boolean
  onClose: () => void
  onAdd: (data: { fullName: string; email: string; password: string }) => Promise<void>
}

export function AddGuardDialog({ open, onClose, onAdd }: AddGuardDialogProps) {
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<AddGuardValues>({
    resolver: zodResolver(addGuardSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  })

  async function onSubmit(values: AddGuardValues) {
    setLoading(true)
    setError(null)
    try {
      await onAdd(values)
      setCreated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create guard')
    }
    setLoading(false)
  }

  function handleClose() {
    form.reset()
    setCreated(false)
    setError(null)
    onClose()
  }

  function copyCredentials() {
    const v = form.getValues()
    navigator.clipboard.writeText(`Email: ${v.email}\nPassword: ${v.password}`)
  }

  if (created) {
    const v = form.getValues()
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guard Created</DialogTitle>
            <DialogDescription>Share these credentials with the guard.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-accent/30 bg-accent/5">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <AlertDescription className="text-accent">
                Account for <strong>{v.fullName}</strong> created.
              </AlertDescription>
            </Alert>
            <div className="bg-muted rounded-md p-3 space-y-1 text-sm font-mono">
              <p>Email: {v.email}</p>
              <p>Password: {v.password}</p>
            </div>
            <div className="flex gap-3">
              <Button onClick={copyCredentials} variant="outline" className="flex-1">
                <Copy className="mr-2 h-4 w-4" /> Copy
              </Button>
              <Button onClick={handleClose} className="flex-1">Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Guard</DialogTitle>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl><Input placeholder="Guard full name" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" placeholder="guard@example.com" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl><Input type="text" placeholder="Set a password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Guard
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
