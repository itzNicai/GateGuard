import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { guard_id } = await request.json()
    if (!guard_id) {
      return NextResponse.json({ error: 'guard_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: open } = await supabase
      .from('guard_shifts')
      .select('id')
      .eq('guard_id', guard_id)
      .is('clocked_out_at', null)
      .maybeSingle()

    if (!open) {
      return NextResponse.json({ closed: false, message: 'No open shift' })
    }

    const { error: updateErr } = await supabase
      .from('guard_shifts')
      .update({ clocked_out_at: new Date().toISOString() })
      .eq('id', open.id)

    if (updateErr) {
      console.error('[clock-out] update error:', updateErr.message)
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ closed: true, shift_id: open.id })
  } catch (err) {
    console.error('[clock-out] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
