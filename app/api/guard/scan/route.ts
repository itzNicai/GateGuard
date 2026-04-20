import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyHomeowner } from '@/lib/brevo'
import { visitorAtGateEmail } from '@/lib/email-templates'
import { hasOpenShift } from '@/lib/shifts'

export async function POST(request: NextRequest) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.sabangdeterville.com'
    const { qr_code, guard_id } = await request.json()

    if (!qr_code || !guard_id) {
      return NextResponse.json({ error: 'QR code and guard ID required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    if (!(await hasOpenShift(supabase, guard_id))) {
      return NextResponse.json(
        { error: 'NOT_ON_SHIFT', message: 'You must clock in before scanning visitors.' },
        { status: 403 }
      )
    }

    // Look up visitor by QR code
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('*, homeowner:profiles!visitors_homeowner_id_fkey(id, full_name, email, block, lot, phone)')
      .eq('qr_code', qr_code)
      .single()

    if (visitorError || !visitor) {
      return NextResponse.json({ error: 'INVALID_QR', message: 'QR code not found' }, { status: 404 })
    }

    // Check expiration
    if (new Date(visitor.expires_at) < new Date()) {
      return NextResponse.json({ error: 'EXPIRED_QR', message: 'QR code has expired' }, { status: 410 })
    }

    // Check if visitor was already denied — QR code cannot be reused
    if (visitor.status === 'denied') {
      return NextResponse.json({
        error: 'DENIED_VISITOR',
        message: `${visitor.name} was denied entry. This QR code can no longer be used.`,
      }, { status: 403 })
    }

    // Check if visitor already completed a visit (entry + exit both recorded) — one-time use
    const { data: completedLog } = await supabase
      .from('visit_logs')
      .select('id')
      .eq('visitor_id', visitor.id)
      .not('entry_time', 'is', null)
      .not('exit_time', 'is', null)
      .maybeSingle()

    if (completedLog) {
      return NextResponse.json({
        error: 'QR_USED',
        message: `${visitor.name} has already completed a visit. This QR code can no longer be used.`,
      }, { status: 403 })
    }

    // Check if visitor already has a pending visit log (waiting for approval)
    const { data: pendingLog } = await supabase
      .from('visit_logs')
      .select('id')
      .eq('visitor_id', visitor.id)
      .is('entry_time', null)
      .is('exit_time', null)
      .maybeSingle()

    if (pendingLog) {
      // If visitor is approved but guard hasn't confirmed entry yet, let them know
      if (visitor.status === 'approved') {
        return NextResponse.json({
          error: 'AWAITING_CONFIRM',
          message: `${visitor.name} is approved — confirm entry on the dashboard`,
        }, { status: 409 })
      }
      return NextResponse.json({
        error: 'ALREADY_PENDING',
        message: `${visitor.name} is already waiting for homeowner approval`,
      }, { status: 409 })
    }

    // Check if visitor has a visit log with entry but no exit (meaning this is an exit scan)
    const { data: activeLog } = await supabase
      .from('visit_logs')
      .select('id')
      .eq('visitor_id', visitor.id)
      .not('entry_time', 'is', null)
      .is('exit_time', null)
      .maybeSingle()

    if (activeLog) {
      // EXIT SCAN — return pending exit for guard to confirm
      const exitHomeowner = visitor.homeowner as unknown as {
        id: string; full_name: string; email: string | null; block: string | null; lot: string | null; phone: string | null
      } | null

      return NextResponse.json({
        scan_type: 'PENDING_EXIT',
        visitor: {
          id: visitor.id,
          name: visitor.name,
          purpose: visitor.purpose,
          vehicle_plate: visitor.vehicle_plate,
          homeowner: exitHomeowner ? {
            full_name: exitHomeowner.full_name,
            block: exitHomeowner.block,
            lot: exitHomeowner.lot,
          } : null,
        },
        visit_log_id: activeLog.id,
        message: `${visitor.name} — Confirm exit?`,
      })
    }

    // ENTRY SCAN — need homeowner approval
    const { data: visitLog, error: logError } = await supabase
      .from('visit_logs')
      .insert({
        visitor_id: visitor.id,
        guard_id,
        entry_time: null,
        exit_time: null,
      })
      .select('id')
      .single()

    if (logError) {
      console.error('[scan] visit_log insert error:', logError.message)
      return NextResponse.json({ error: 'Failed to create visit log', message: logError.message }, { status: 500 })
    }

    // Update visitor status to pending (triggers realtime for guard to wait)
    await supabase
      .from('visitors')
      .update({ status: 'pending' })
      .eq('id', visitor.id)

    // Notify homeowner (in-app)
    await supabase.from('notifications').insert({
      user_id: visitor.homeowner_id,
      title: 'Visitor at gate',
      message: `${visitor.name} is at the gate and waiting for your approval.`,
      type: 'visitor_at_gate',
      related_visitor_id: visitor.id,
    })

    // Notify homeowner via SMS (priority) + email
    const homeowner = visitor.homeowner as unknown as {
      id: string; full_name: string; email: string | null; block: string | null; lot: string | null; phone: string | null
    } | null

    if (homeowner) {
      try {
        await notifyHomeowner({
          phone: homeowner.phone,
          email: homeowner.email,
          name: homeowner.full_name,
          smsContent: `[GateGuard] ${visitor.name} is at the gate waiting for your approval. Purpose: ${visitor.purpose}. Login: ${siteUrl}/login`,
          emailSubject: `Visitor at Gate: ${visitor.name}`,
          emailHtml: visitorAtGateEmail(visitor.name, visitor.purpose, visitor.vehicle_plate, `${siteUrl}/homeowner/visitors`),
        })
      } catch (notifyErr) {
        console.error('[scan] notify error:', notifyErr)
      }
    }

    return NextResponse.json({
      scan_type: 'ENTRY',
      visitor: {
        id: visitor.id,
        name: visitor.name,
        purpose: visitor.purpose,
        vehicle_plate: visitor.vehicle_plate,
        status: visitor.status,
        homeowner_id: visitor.homeowner_id,
        homeowner: homeowner ? {
          full_name: homeowner.full_name,
          block: homeowner.block,
          lot: homeowner.lot,
        } : null,
      },
      visit_log_id: visitLog?.id,
      message: 'Waiting for homeowner approval',
    })
  } catch (err) {
    console.error('[scan] Unhandled error:', err)
    return NextResponse.json(
      { error: 'Internal server error', message: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
