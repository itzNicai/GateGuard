import type { SupabaseClient } from '@supabase/supabase-js'

export const MAX_SHIFT_HOURS = 16

// Close any open shifts older than MAX_SHIFT_HOURS, marking them as auto_closed.
// Sets clocked_out_at = clocked_in_at + MAX_SHIFT_HOURS so the recorded duration
// is exactly the cap, not the moment the cleanup ran.
export async function closeStaleShifts(supabase: SupabaseClient) {
  const cutoff = new Date(Date.now() - MAX_SHIFT_HOURS * 60 * 60 * 1000).toISOString()
  const { data: stale } = await supabase
    .from('guard_shifts')
    .select('id, clocked_in_at')
    .is('clocked_out_at', null)
    .lt('clocked_in_at', cutoff)

  if (!stale || stale.length === 0) return

  await Promise.all(
    stale.map((s) =>
      supabase
        .from('guard_shifts')
        .update({
          clocked_out_at: new Date(new Date(s.clocked_in_at).getTime() + MAX_SHIFT_HOURS * 60 * 60 * 1000).toISOString(),
          auto_closed: true,
        })
        .eq('id', s.id)
    )
  )
}

// Returns true if the guard currently has an open (non-stale) shift.
export async function hasOpenShift(supabase: SupabaseClient, guardId: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - MAX_SHIFT_HOURS * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('guard_shifts')
    .select('id')
    .eq('guard_id', guardId)
    .is('clocked_out_at', null)
    .gte('clocked_in_at', cutoff)
    .maybeSingle()
  return !!data
}
