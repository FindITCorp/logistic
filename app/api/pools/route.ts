import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') // active | closed | shipped | all
  const db = createServerClient()

  let query = db.from('pools').select('*').order('pool_number', { ascending: true })
  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: pools, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pools })
}

const createSchema = z.object({
  origin_city: z.enum(['shanghai', 'guangzhou', 'shenzhen']),
  provider_id: z.string().uuid().optional(),
  reference_price_m3: z.number().positive().optional(),
  departure_date: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = createSchema.parse(body)
    const db = createServerClient()
    const { data, error } = await db
      .from('pools')
      .insert({
        origin_city: input.origin_city,
        destination_city: 'colon',
        status: 'active',
        provider_id: input.provider_id ?? null,
        reference_price_m3: input.reference_price_m3 ?? 100,
        departure_date: input.departure_date ?? null,
        current_volume_m3: 0,
        participants: 0,
        day_number: 1,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ pool: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}

const updateSchema = z.object({
  pool_id: z.string().uuid(),
  status: z.enum(['active', 'closed', 'shipped']),
})

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { pool_id, status } = updateSchema.parse(body)
    const db = createServerClient()

    await db.from('pools').update({ status }).eq('id', pool_id)

    // Propagate status to all orders in this pool
    const orderStatus =
      status === 'closed' ? 'in_pool' :
      status === 'shipped' ? 'in_transit_to_panama' : 'in_pool'

    if (status === 'shipped') {
      await db.from('orders')
        .update({
          status: 'in_transit_to_panama',
          shipped_to_panama_at: new Date().toISOString(),
        })
        .eq('pool_id', pool_id)
        .eq('status', 'in_pool')

      await db.from('shipments')
        .update({ status: 'shipped' })
        .eq('pool_id', pool_id)
    }

    return NextResponse.json({ ok: true, orderStatus })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
