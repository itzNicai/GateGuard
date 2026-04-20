import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const guardId = request.nextUrl.searchParams.get('guard_id')
    if (!guardId) {
      return NextResponse.json({ error: 'guard_id required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Fetch visit logs with visitor + homeowner data using admin client (bypasses RLS)
    const { data: logs, error } = await supabase
      .from('visit_logs')
      .select('id, visitor_id, entry_time, exit_time, created_at, visitor:visitors!visit_logs_visitor_id_fkey(id, name, purpose, vehicle_plate, status, homeowner:profiles!visitors_homeowner_id_fkey(full_name, block, lot))')
      .eq('guard_id', guardId)
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[guard-dashboard] query error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Safely map the data with null checks
    const entries = (logs ?? []).map((log) => {
      const v = log.visitor as unknown as {
        id: string; name: string; purpose: string; vehicle_plate: string | null;
        status: string; homeowner: { full_name: string; block: string | null; lot: string | null } | null
      } | null

      return {
        id: log.id,
        visitor_id: v?.id ?? '',
        visitor_name: v?.name ?? 'Unknown',
        purpose: v?.purpose ?? '',
        vehicle_plate: v?.vehicle_plate ?? null,
        visitor_status: v?.status ?? 'pending',
        homeowner_name: v?.homeowner?.full_name ?? null,
        homeowner_block: v?.homeowner?.block ?? null,
        homeowner_lot: v?.homeowner?.lot ?? null,
        entry_time: log.entry_time,
        exit_time: log.exit_time,
        created_at: log.created_at,
      }
    })

    return NextResponse.json(entries)
  } catch (err) {
    console.error('[guard-dashboard] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
