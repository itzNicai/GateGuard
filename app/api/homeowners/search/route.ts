import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const q = (await request.nextUrl).searchParams.get('q') ?? ''

  const supabase = createAdminClient()

  let query = supabase
    .from('profiles')
    .select('id, full_name, block, lot')
    .eq('role', 'homeowner')
    .eq('status', 'active')
    .order('full_name')
    .limit(20)

  if (q.trim()) {
    query = query.ilike('full_name', `%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
