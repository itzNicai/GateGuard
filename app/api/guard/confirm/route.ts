import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyHomeowner } from '@/lib/brevo'
import { visitorExitedEmail } from '@/lib/email-templates'

export async function PATCH(request: NextRequest) {
  try {
    const { visit_log_id, action } = await request.json()

    if (!visit_log_id || !action) {
      return NextResponse.json({ error: 'visit_log_id and action required' }, { status: 400 })
    }

    if (action !== 'entry' && action !== 'exit') {
      return NextResponse.json({ error: 'action must be "entry" or "exit"' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get the visit log with visitor + homeowner info
    const { data: log, error: logError } = await supabase
      .from('visit_logs')
      .select('id, visitor_id, entry_time, exit_time, visitor:visitors!visit_logs_visitor_id_fkey(id, name, status, homeowner_id, homeowner:profiles!visitors_homeowner_id_fkey(id, full_name, email, phone))')
      .eq('id', visit_log_id)
      .single()

    if (logError || !log) {
      return NextResponse.json({ error: 'Visit log not found' }, { status: 404 })
    }

    const visitor = log.visitor as unknown as {
      id: string; name: string; status: string; homeowner_id: string
      homeowner: { id: string; full_name: string; email: string | null; phone: string | null } | null
    }

    if (action === 'entry') {
      // Validate: visitor must be approved, entry_time must be null
      if (visitor.status !== 'approved') {
        return NextResponse.json({ error: 'Visitor is not approved' }, { status: 400 })
      }
      if (log.entry_time) {
        return NextResponse.json({ error: 'Entry already recorded' }, { status: 409 })
      }

      // Record entry time
      await supabase
        .from('visit_logs')
        .update({ entry_time: new Date().toISOString() })
        .eq('id', visit_log_id)

      return NextResponse.json({
        success: true,
        action: 'entry',
        message: `${visitor.name} — Entry confirmed`,
      })
    }

    if (action === 'exit') {
      // Validate: must have entry_time, no exit_time
      if (!log.entry_time) {
        return NextResponse.json({ error: 'No entry recorded yet' }, { status: 400 })
      }
      if (log.exit_time) {
        return NextResponse.json({ error: 'Exit already recorded' }, { status: 409 })
      }

      // Record exit time
      await supabase
        .from('visit_logs')
        .update({ exit_time: new Date().toISOString() })
        .eq('id', visit_log_id)

      // Notify homeowner (in-app)
      await supabase.from('notifications').insert({
        user_id: visitor.homeowner_id,
        title: 'Visitor has exited',
        message: `${visitor.name} has safely exited the subdivision.`,
        type: 'visitor_exited',
        related_visitor_id: visitor.id,
      })

      // Notify homeowner via SMS + email
      const homeowner = visitor.homeowner
      if (homeowner) {
        const exitTime = new Date().toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        try {
          await notifyHomeowner({
            phone: homeowner.phone,
            email: homeowner.email,
            name: homeowner.full_name,
            smsContent: `[GateGuard] ${visitor.name} has exited the subdivision at ${exitTime}.`,
            emailSubject: `Visitor Exited: ${visitor.name}`,
            emailHtml: visitorExitedEmail(visitor.name, exitTime),
          })
        } catch (notifyErr) {
          console.error('[confirm] notify error:', notifyErr)
        }
      }

      return NextResponse.json({
        success: true,
        action: 'exit',
        message: `${visitor.name} — Exit confirmed`,
      })
    }
  } catch (err) {
    console.error('[confirm] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
