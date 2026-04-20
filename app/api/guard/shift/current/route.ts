import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { closeStaleShifts } from '@/lib/shifts'

export async function GET(request: NextRequest) {
  try {
    const guardId = request.nextUrl.searchParams.get('guard_id')
    if (!guardId) {
      return NextResponse.json({ error: 'guard_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()
    await closeStaleShifts(supabase)

    const { data, error } = await supabase
      .from('guard_shifts')
      .select('id, guard_id, clocked_in_at, clocked_out_at, auto_closed, created_at')
      .eq('guard_id', guardId)
      .is('clocked_out_at', null)
      .maybeSingle()

    if (error) {
      console.error('[shift/current] query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shift: data ?? null })
  } catch (err) {
    console.error('[shift/current] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
