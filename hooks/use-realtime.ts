'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

interface UseRealtimeOptions<T> {
  table: string
  event?: PostgresChangeEvent
  filter?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onData: (payload: RealtimePostgresChangesPayload<T & Record<string, any>>) => void
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useRealtime<T extends Record<string, any>>({
  table,
  event = '*',
  filter,
  onData,
}: UseRealtimeOptions<T>) {
  useEffect(() => {
    const supabase = createClient()

    const channelConfig: Record<string, string> = {
      event,
      schema: 'public',
      table,
    }
    if (filter) channelConfig.filter = filter

    const channel = supabase
      .channel(`realtime-${table}-${filter ?? 'all'}`)
      .on(
        'postgres_changes' as never,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<T>) => {
          onData(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, event, filter, onData])
}
