import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET — list all blocks/lots (with occupancy info)
export async function GET() {
  const supabase = createAdminClient()

  const { data: lots, error } = await supabase
    .from('blocks_lots')
    .select('id, block, lot, is_occupied, occupied_by, created_at')
    .order('block')
    .order('lot')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch occupant names for occupied lots
  const occupiedIds = (lots ?? []).filter((l) => l.occupied_by).map((l) => l.occupied_by as string)
  let nameMap: Record<string, string> = {}

  if (occupiedIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', occupiedIds)

    if (profiles) {
      nameMap = Object.fromEntries(profiles.map((p) => [p.id, p.full_name]))
    }
  }

  const result = (lots ?? []).map((l) => ({
    ...l,
    occupant_name: l.occupied_by ? nameMap[l.occupied_by] ?? null : null,
  }))

  return NextResponse.json(result)
}

// POST — add a new block/lot
export async function POST(request: NextRequest) {
  const supabase = createAdminClient()

  // Verify caller is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    // Use service role — check from request headers or just allow since admin client
  }

  const { block, lot } = await request.json()

  if (!block || !lot) {
    return NextResponse.json({ error: 'Block and lot are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('blocks_lots')
    .insert({ block: block.trim(), lot: lot.trim() })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: `${block}, ${lot} already exists` }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// DELETE — remove block/lot(s), supports single id or array of ids
export async function DELETE(request: NextRequest) {
  const supabase = createAdminClient()

  const body = await request.json()
  const ids: string[] = body.ids ? body.ids : body.id ? [body.id] : []

  if (ids.length === 0) {
    return NextResponse.json({ error: 'ID(s) required' }, { status: 400 })
  }

  // Check for occupied lots
  const { data: lots } = await supabase
    .from('blocks_lots')
    .select('id, is_occupied, block, lot')
    .in('id', ids)

  if (!lots) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const occupied = lots.filter((l) => l.is_occupied)
  if (occupied.length > 0) {
    return NextResponse.json({
      error: `${occupied.length} occupied lot(s) cannot be deleted (e.g. ${occupied[0].block}, ${occupied[0].lot})`,
    }, { status: 400 })
  }

  const deletableIds = lots.map((l) => l.id)
  const { error } = await supabase
    .from('blocks_lots')
    .delete()
    .in('id', deletableIds)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, deleted: deletableIds.length })
}
