import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { closeStaleShifts } from '@/lib/shifts'

export async function POST(request: NextRequest) {
  try {
    const { guard_id } = await request.json()
    if (!guard_id) {
      return NextResponse.json({ error: 'guard_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify caller is an active guard
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('id, role, status')
      .eq('id', guard_id)
      .single()

    if (profileErr || !profile || profile.role !== 'guard' || profile.status !== 'active') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Auto-close abandoned shifts before checking for an open one
    await closeStaleShifts(supabase)

    const { data: existing } = await supabase
      .from('guard_shifts')
      .select('id, clocked_in_at')
      .eq('guard_id', guard_id)
      .is('clocked_out_at', null)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ shift: existing, already_open: true })
    }

    const { data: shift, error: insertErr } = await supabase
      .from('guard_shifts')
      .insert({ guard_id, clocked_in_at: new Date().toISOString() })
      .select('id, clocked_in_at')
      .single()

    if (insertErr) {
      console.error('[clock-in] insert error:', insertErr.message)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ shift, already_open: false })
  } catch (err) {
    console.error('[clock-in] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
