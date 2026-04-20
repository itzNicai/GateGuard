'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { profileSchema, changePasswordSchema, type ProfileValues, type ChangePasswordValues } from '@/lib/validations'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/shared/password-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { ConfirmDialog } from '@/components/admin/confirm-dialog'
import { Loader2, Camera, LogOut, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types'

export default function GuardProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [email, setEmail] = useState('')
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: string; confirmLabel?: string; variant?: 'destructive' | 'default'; action: () => void } | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: '', phone: '' },
  })

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        const p = data as Profile
        setProfile(p)
        setEmail(p.email)
        profileForm.reset({ fullName: p.full_name, phone: p.phone || '' })
      }
      setLoading(false)
    }
    loadProfile()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function uploadAvatar(file: File) {
    if (!profile) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }

    setAvatarUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `${profile.id}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      toast.error('Failed to upload avatar')
      setAvatarUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`

    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
    setProfile({ ...profile, avatar_url: avatarUrl })
    setAvatarUploading(false)
    toast.success('Avatar updated')
  }

  function handleAvatarClick() {
    if (profile?.avatar_url) {
      setConfirmAction({
        title: 'Change Profile Picture',
        description: 'Remove your current profile picture first, then upload a new one.',
        confirmLabel: 'Remove Picture',
        action: async () => {
          if (!profile) return
          setAvatarUploading(true)
          const supabase = createClient()
          const extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif']
          const paths = extensions.map((ext) => `${profile.id}.${ext}`)
          await supabase.storage.from('avatars').remove(paths)
          await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id)
          setProfile({ ...profile, avatar_url: null })
          setAvatarUploading(false)
          setConfirmAction(null)
          toast.success('Profile picture removed')
        },
      })
    } else {
      avatarInputRef.current?.click()
    }
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadAvatar(file)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  function requestSaveProfile() {
    setConfirmAction({
      title: 'Save Changes',
      description: 'Are you sure you want to update your profile details?',
      confirmLabel: 'Save',
      variant: 'default',
      action: async () => {
        const values = profileForm.getValues()
        if (!profile) return
        setSaving(true)
        const supabase = createClient()
        const { error } = await supabase
          .from('profiles')
          .update({ full_name: values.fullName, phone: values.phone || null })
          .eq('id', profile.id)
        setSaving(false)
        if (error) toast.error(error.message)
        else { toast.success('Profile updated'); setProfile({ ...profile, full_name: values.fullName, phone: values.phone || null }) }
        setConfirmAction(null)
      },
    })
  }

  function requestEmailChange() {
    if (email === profile?.email) {
      toast.error('Email is the same')
      return
    }
    setConfirmAction({
      title: 'Change Email',
      description: `A confirmation will be sent to ${email}. You must verify the new email before it takes effect.`,
      confirmLabel: 'Send Verification',
      variant: 'default',
      action: async () => {
        setSavingEmail(true)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ email })
        setSavingEmail(false)
        if (error) toast.error(error.message)
        else toast.success('Verification email sent to ' + email)
        setConfirmAction(null)
      },
    })
  }

  function requestPasswordChange() {
    setConfirmAction({
      title: 'Change Password',
      description: 'Are you sure you want to change your password?',
      confirmLabel: 'Update Password',
      variant: 'default',
      action: async () => {
        const values = passwordForm.getValues()
        setSavingPassword(true)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: values.newPassword })
        setSavingPassword(false)
        if (error) toast.error(error.message)
        else { toast.success('Password updated'); passwordForm.reset() }
        setConfirmAction(null)
      },
    })
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <Skeleton className="h-64 rounded-xl" />
  if (!profile) return null

  const initials = profile.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-8">
      {/* Left column — profile card */}
      <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
        <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card overflow-hidden">
          <div className="h-24 lg:h-28 bg-gradient-to-r from-primary to-primary/80 relative overflow-hidden">
            <Image src="/illustrations/profile.png" alt="" width={160} height={160} className="absolute right-0 -bottom-4 opacity-20 object-contain" />
          </div>
          <div className="px-4 pb-4 -mt-10 flex flex-col items-center">
            <div className="relative">
              {profile.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-20 w-20 rounded-full object-cover ring-4 ring-card"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-card">
                  <span className="text-xl font-bold text-primary">{initials}</span>
                </div>
              )}
              <button
                onClick={handleAvatarClick}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
              >
                {avatarUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : profile.avatar_url ? (
                  <Trash2 className="h-3 w-3" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
            </div>
            <p className="text-sm font-semibold mt-2.5">{profile.full_name}</p>
            <p className="text-[11px] text-muted-foreground">Guard</p>
            {!profile.avatar_url && (
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="text-[11px] text-primary font-medium hover:underline mt-1.5"
              >
                Upload profile picture
              </button>
            )}
          </div>
        </div>

        {/* Quick info — desktop only */}
        <div className="hidden lg:block rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-card p-4 space-y-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium truncate ml-4">{profile.email}</span>
          </div>
          <div className="h-px bg-border/30" />
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Phone</span>
            <span className="font-medium">{profile.phone || '—'}</span>
          </div>
          <div className="h-px bg-border/30" />
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">Security Guard</span>
          </div>
        </div>

        {/* End Shift — desktop only */}
        <Button
          variant="outline"
          className="hidden lg:flex w-full text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={() => setConfirmAction({
            title: 'End Shift & Sign Out',
            description: 'Are you sure you want to end your shift and sign out?',
            confirmLabel: 'End Shift',
            action: handleLogout,
          })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          End Shift
        </Button>
      </div>

      {/* Right column — forms */}
      <div className="space-y-4 mt-5 lg:mt-0">
        <Card>
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(() => requestSaveProfile())}
                className="space-y-3"
              >
                <FormField control={profileForm.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} className="text-[16px] lg:text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={profileForm.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input placeholder="09XX XXX XXXX" {...field} className="text-[16px] lg:text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 text-[16px] lg:text-sm"
                />
                <Button
                  size="sm"
                  onClick={requestEmailChange}
                  disabled={savingEmail || email === profile.email}
                >
                  {savingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5">A confirmation email will be sent to verify the new address.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(() => requestPasswordChange())}
                  className="space-y-3"
                >
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl><PasswordInput placeholder="Min. 8 characters" {...field} className="text-[16px] lg:text-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl><PasswordInput placeholder="Re-enter password" {...field} className="text-[16px] lg:text-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" size="sm" disabled={savingPassword}>
                    {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Update Password
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* End Shift — mobile only */}
        <Button
          variant="outline"
          className="w-full lg:hidden text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={() => setConfirmAction({
            title: 'End Shift & Sign Out',
            description: 'Are you sure you want to end your shift and sign out?',
            confirmLabel: 'End Shift',
            action: handleLogout,
          })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          End Shift
        </Button>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={() => confirmAction?.action()}
        title={confirmAction?.title ?? ''}
        description={confirmAction?.description ?? ''}
        confirmLabel={confirmAction?.confirmLabel ?? 'Confirm'}
        variant={confirmAction?.variant ?? 'destructive'}
      />
    </div>
  )
}
