import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateQRToken } from '@/lib/qr'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, phone, purpose, vehicle_plate, homeowner_id, proof_urls } = body

  if (!name || !purpose || !homeowner_id) {
    return NextResponse.json({ error: 'Name, purpose, and homeowner are required' }, { status: 400 })
  }

  if (!Array.isArray(proof_urls) || proof_urls.length === 0 || proof_urls.length > 5 || !proof_urls.every((u: unknown) => typeof u === 'string' && u.length > 0)) {
    return NextResponse.json({ error: 'Between 1 and 5 proof photo URLs are required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify homeowner exists and is active
  const { data: homeowner } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', homeowner_id)
    .eq('role', 'homeowner')
    .eq('status', 'active')
    .single()

  if (!homeowner) {
    return NextResponse.json({ error: 'Homeowner not found' }, { status: 404 })
  }

  const qr_code = generateQRToken()
  const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24h from now

  const { data: visitor, error } = await supabase
    .from('visitors')
    .insert({
      name,
      phone: phone || null,
      purpose,
      vehicle_plate: vehicle_plate || null,
      homeowner_id,
      qr_code,
      status: 'registered',
      expires_at,
      proof_urls: proof_urls,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ visitor, homeowner_name: homeowner.full_name })
}
