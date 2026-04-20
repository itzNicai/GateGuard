import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { closeStaleShifts } from '@/lib/shifts'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    await closeStaleShifts(supabase)

    const params = request.nextUrl.searchParams
    const guardId = params.get('guard_id')
    const from = params.get('from')
    const to = params.get('to')
    const status = params.get('status') // 'active' | 'completed' | 'auto_closed' | null

    let query = supabase
      .from('guard_shifts')
      .select('id, guard_id, clocked_in_at, clocked_out_at, auto_closed, created_at, guard:profiles!guard_shifts_guard_id_fkey(id, full_name, email, avatar_url)')
      .order('clocked_in_at', { ascending: false })
      .limit(500)

    if (guardId) query = query.eq('guard_id', guardId)
    if (from) query = query.gte('clocked_in_at', from)
    if (to) query = query.lte('clocked_in_at', to)
    if (status === 'active') query = query.is('clocked_out_at', null)
    if (status === 'completed') query = query.not('clocked_out_at', 'is', null).eq('auto_closed', false)
    if (status === 'auto_closed') query = query.eq('auto_closed', true)

    const { data, error } = await query
    if (error) {
      console.error('[admin/shifts] query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[admin/shifts] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
