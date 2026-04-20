import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { notifyHomeowner } from '@/lib/brevo'
import { registrationApprovedEmail, registrationRejectedEmail } from '@/lib/email-templates'

async function verifyAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const { status, reason } = await request.json()

  if (!['active', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, phone, block, lot, status')
    .eq('id', id)
    .eq('role', 'homeowner')
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Homeowner not found' }, { status: 404 })
  }

  // Update profile status
  const { error } = await supabase
    .from('profiles')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update block/lot occupancy
  if (profile.block && profile.lot) {
    if (status === 'active') {
      await supabase
        .from('blocks_lots')
        .update({ is_occupied: true, occupied_by: id })
        .eq('block', profile.block)
        .eq('lot', profile.lot)
    } else {
      await supabase
        .from('blocks_lots')
        .update({ is_occupied: false, occupied_by: null })
        .eq('block', profile.block)
        .eq('lot', profile.lot)
    }
  }

  // Ban/unban auth user
  if (status === 'rejected') {
    await supabase.auth.admin.updateUserById(id, { ban_duration: '87600h' })
  } else {
    await supabase.auth.admin.updateUserById(id, { ban_duration: 'none' })
  }

  // Send notification + email for registration approval/rejection
  // Only send for first-time approval (was pending) or explicit admin action
  if (status === 'active') {
    await supabase.from('notifications').insert({
      user_id: id,
      title: 'Registration Approved',
      message: 'Your homeowner registration has been approved. Welcome to Sabang Dexterville!',
      type: 'registration_approved',
    })

    try {
      await notifyHomeowner({
        phone: profile.phone,
        email: profile.email,
        name: profile.full_name,
        smsContent: `[GateGuard] Your homeowner registration has been approved! You can now sign in to GateGuard. Welcome to Sabang Dexterville!`,
        emailSubject: 'Registration Approved — GateGuard',
        emailHtml: registrationApprovedEmail(profile.full_name),
      })
    } catch { /* non-blocking */ }
  } else if (status === 'rejected') {
    const rejectionMsg = reason || 'Your homeowner registration has been rejected.'
    await supabase.from('notifications').insert({
      user_id: id,
      title: 'Registration Rejected',
      message: rejectionMsg,
      type: 'registration_rejected',
    })

    try {
      await notifyHomeowner({
        phone: profile.phone,
        email: profile.email,
        name: profile.full_name,
        smsContent: `[GateGuard] Your homeowner registration was not approved.${reason ? ' Reason: ' + reason : ''} Contact the admin for details.`,
        emailSubject: 'Registration Update — GateGuard',
        emailHtml: registrationRejectedEmail(profile.full_name, reason),
      })
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin()
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('block, lot, full_name')
    .eq('id', id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: 'Homeowner not found' }, { status: 404 })
  }

  // 1. Get all visitor IDs for this homeowner
  const { data: visitors } = await supabase
    .from('visitors')
    .select('id')
    .eq('homeowner_id', id)

  const visitorIds = (visitors ?? []).map((v) => v.id)

  // 2. Delete visit logs for these visitors
  if (visitorIds.length > 0) {
    await supabase.from('visit_logs').delete().in('visitor_id', visitorIds)
  }

  // 3. Delete all visitors
  if (visitorIds.length > 0) {
    await supabase.from('visitors').delete().in('id', visitorIds)
  }

  // 4. Delete all notifications for this user
  await supabase.from('notifications').delete().eq('user_id', id)

  // 5. Free the block/lot
  if (profile.block && profile.lot) {
    await supabase
      .from('blocks_lots')
      .update({ is_occupied: false, occupied_by: null })
      .eq('block', profile.block)
      .eq('lot', profile.lot)
  }

  // 6. Delete auth user (cascades to profile)
  const { error } = await supabase.auth.admin.deleteUser(id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, name: profile.full_name })
}
