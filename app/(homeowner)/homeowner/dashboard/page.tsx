'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { useRealtime } from '@/hooks/use-realtime'
import {
  CheckCheck, ChevronRight,
  ChevronLeft, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Notification, NotificationType } from '@/types'

interface Stats {
  pendingVisitors: number
  totalVisits: number
  unreadNotifications: number
  totalNotifications: number
}

const NOTIFICATION_LINKS: Record<string, string> = {
  visitor_at_gate: '/homeowner/visitors',
  visitor_approved: '/homeowner/visitors',
  visitor_denied: '/homeowner/visitors',
  visitor_exited: '/homeowner/history',
  registration_approved: '/homeowner/profile',
  registration_rejected: '/homeowner/profile',
}

const NOTIFICATION_AVATARS: Record<NotificationType, string> = {
  visitor_at_gate: '/illustrations/notif-at-gate.png',
  visitor_approved: '/illustrations/notif-approved.png',
  visitor_denied: '/illustrations/notif-denied.png',
  visitor_exited: '/illustrations/notif-exited.png',
  registration_approved: '/illustrations/notif-reg-approved.png',
  registration_rejected: '/illustrations/notif-reg-rejected.png',
}

const PAGE_SIZE = 8

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.floor((now - then) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function groupByDate(notifications: Notification[]): { label: string; items: Notification[] }[] {
  const groups: Record<string, Notification[]> = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  for (const n of notifications) {
    const d = new Date(n.created_at).toDateString()
    let label: string
    if (d === today) label = 'Today'
    else if (d === yesterday) label = 'Yesterday'
    else label = new Date(n.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric' })

    if (!groups[label]) groups[label] = []
    groups[label].push(n)
  }

  return Object.entries(groups).map(([label, items]) => ({ label, items }))
}

export default function HomeownerDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [notifPage, setNotifPage] = useState(1)
  const NOTIF_PER_PAGE = 5

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      Promise.all([
        supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('homeowner_id', user.id).eq('status', 'pending'),
        supabase.from('visitors').select('id', { count: 'exact', head: true }).eq('homeowner_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(PAGE_SIZE),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_read', false),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]).then(([pending, visits, notifs, unread, total]) => {
        setStats({
          pendingVisitors: pending.count ?? 0,
          totalVisits: visits.count ?? 0,
          unreadNotifications: unread.count ?? 0,
          totalNotifications: total.count ?? 0,
        })
        const items = (notifs.data ?? []) as Notification[]
        setNotifications(items)
        setHasMore(items.length >= PAGE_SIZE)
      })
    })
  }, [refreshKey])

  const handleNewNotification = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useRealtime({
    table: 'notifications',
    event: 'INSERT',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    onData: handleNewNotification,
  })

  async function loadMore() {
    if (!userId || !hasMore || loadingMore) return
    setLoadingMore(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(notifications.length, notifications.length + PAGE_SIZE - 1)

    const items = (data ?? []) as Notification[]
    setNotifications((prev) => [...prev, ...items])
    setHasMore(items.length >= PAGE_SIZE)
    setLoadingMore(false)
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.is_read && userId) {
      const supabase = createClient()
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id)
      setRefreshKey((k) => k + 1)
    }
    const link = NOTIFICATION_LINKS[n.type]
    if (link) router.push(link)
  }

  async function handleMarkAllRead() {
    if (!userId) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    setRefreshKey((k) => k + 1)
    toast.success('All notifications marked as read')
  }

  if (!stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  const allDisplayed = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications
  const notifTotalPages = Math.ceil(allDisplayed.length / NOTIF_PER_PAGE)
  const displayed = allDisplayed.slice((notifPage - 1) * NOTIF_PER_PAGE, notifPage * NOTIF_PER_PAGE)
  const grouped = groupByDate(displayed)

  return (
    <div className="space-y-8 lg:space-y-0">
      <div className="lg:grid lg:grid-cols-[340px_1fr] lg:gap-6">
        {/* Left column on desktop */}
        <div className="lg:space-y-4">
          {/* Hero stat */}
          <Link href="/homeowner/visitors">
            <div className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-white p-4 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer overflow-hidden relative">
              <div className="flex items-center justify-between">
                <div className="relative z-10">
                  <p className="text-white/70 text-xs lg:text-sm font-medium">Pending at Gate</p>
                  <p className="text-3xl lg:text-4xl font-bold mt-0.5">{stats.pendingVisitors}</p>
                  <p className="text-white/60 text-[11px] lg:text-xs mt-1">
                    {stats.pendingVisitors === 0 ? 'No visitors waiting' : 'Tap to review'}
                  </p>
                </div>
                <Image
                  src="/illustrations/waiting.png"
                  alt=""
                  width={130}
                  height={130}
                  className="object-contain opacity-90 -mr-3 -my-2"
                  priority
                />
              </div>
            </div>
          </Link>

          {/* Stats summary - desktop only */}
          <div className="hidden lg:grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-gradient-to-br from-accent to-accent/80 ring-1 ring-accent/20 shadow-card p-4 overflow-hidden relative">
              <div className="relative z-10">
                <p className="text-xs text-white/70 font-medium uppercase tracking-wider">Total Visits</p>
                <p className="text-2xl font-bold mt-1 text-white">{stats.totalVisits}</p>
              </div>
              <Image src="/illustrations/stat-visits.png" alt="" width={80} height={80} className="absolute -right-1 -bottom-2 opacity-20 object-contain" />
            </div>
            <div className="rounded-xl bg-gradient-to-br from-secondary to-secondary/80 ring-1 ring-secondary/20 shadow-card p-4 overflow-hidden relative">
              <div className="relative z-10">
                <p className="text-xs text-white/70 font-medium uppercase tracking-wider">Notifications</p>
                <p className="text-2xl font-bold mt-1 text-white">{stats.totalNotifications}</p>
              </div>
              <Image src="/illustrations/stat-notifications.png" alt="" width={80} height={80} className="absolute -right-1 -bottom-2 opacity-20 object-contain" />
            </div>
          </div>
        </div>

      {/* Notifications - right column on desktop */}
      <div className="pt-8 lg:pt-0">
        {/* Header with filter tabs */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xs lg:text-sm font-semibold uppercase tracking-wider text-muted-foreground">Notifications</h2>
            {stats.unreadNotifications > 0 && (
              <span className="h-4 min-w-4 px-1 rounded-full bg-primary text-white text-[9px] lg:text-[11px] font-bold flex items-center justify-center lg:h-5 lg:min-w-5">
                {stats.unreadNotifications}
              </span>
            )}
          </div>
          {stats.unreadNotifications > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[10px] lg:text-xs text-primary font-medium hover:underline"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </button>
          )}
        </div>

        {/* All / Unread tabs */}
        <div className="flex gap-1.5 mb-3">
          {(['all', 'unread'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setFilter(t); setNotifPage(1) }}
              className={`px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-medium transition-colors ${
                filter === t
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-card text-muted-foreground ring-1 ring-foreground/[0.06]'
              }`}
            >
              {t === 'all' ? 'All' : 'Unread'}
            </button>
          ))}
        </div>

        {displayed.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <Image
              src="/illustrations/no-notifications.png"
              alt=""
              width={180}
              height={180}
              className="opacity-80 mb-4"
            />
            <p className="text-sm font-medium text-foreground">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {filter === 'unread' ? 'You have no unread notifications' : 'Notifications will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] lg:text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5 px-1">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((n) => {
                    const avatar = NOTIFICATION_AVATARS[n.type] ?? '/illustrations/notif-at-gate.png'
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full flex items-center gap-2.5 lg:gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl ring-1 ring-foreground/[0.06] shadow-card text-left transition-colors active:bg-muted/50 ${!n.is_read ? 'bg-card border-l-2 border-l-primary' : 'bg-card'}`}
                      >
                        <div className="h-9 w-9 lg:h-10 lg:w-10 rounded-full overflow-hidden bg-muted/30 shrink-0">
                          <Image src={avatar} alt="" width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className={`text-[12px] lg:text-[13px] leading-snug truncate ${!n.is_read ? 'font-semibold' : 'font-medium'}`}>
                              {n.title}
                            </p>
                            {!n.is_read && (
                              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] lg:text-[11px] text-muted-foreground truncate mt-0.5">{n.message}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] lg:text-[11px] text-muted-foreground/50">{timeAgo(n.created_at)}</span>
                          <ChevronRight className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground/30" />
                        </div>
                      </button>
                    )
                  })}
                </div>

              </div>
            ))}

            {/* Pagination */}
            {(notifTotalPages > 1 || hasMore) && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-[10px] lg:text-[11px] text-muted-foreground">
                  {(notifPage - 1) * NOTIF_PER_PAGE + 1}–{Math.min(notifPage * NOTIF_PER_PAGE, allDisplayed.length)} of {allDisplayed.length}{hasMore ? '+' : ''}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setNotifPage((p) => Math.max(1, p - 1))}
                    disabled={notifPage === 1}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[11px] lg:text-[12px] font-medium px-1">{notifPage} / {notifTotalPages}</span>
                  <button
                    onClick={() => {
                      if (notifPage === notifTotalPages && hasMore) {
                        loadMore().then(() => setNotifPage((p) => p + 1))
                      } else {
                        setNotifPage((p) => Math.min(notifTotalPages, p + 1))
                      }
                    }}
                    disabled={notifPage === notifTotalPages && !hasMore}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
