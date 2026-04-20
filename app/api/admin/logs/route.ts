import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// DELETE — remove visit logs and/or visitors by IDs
export async function DELETE(request: NextRequest) {
  const supabase = createAdminClient()

  const { log_ids, visitor_ids } = await request.json()

  let deletedLogs = 0
  let deletedVisitors = 0

  // Delete visit logs
  if (log_ids && log_ids.length > 0) {
    const { error } = await supabase
      .from('visit_logs')
      .delete()
      .in('id', log_ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    deletedLogs = log_ids.length
  }

  // Delete visitors (only those without remaining visit logs)
  if (visitor_ids && visitor_ids.length > 0) {
    const { error } = await supabase
      .from('visitors')
      .delete()
      .in('id', visitor_ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    deletedVisitors = visitor_ids.length
  }

  return NextResponse.json({ success: true, deletedLogs, deletedVisitors })
}
