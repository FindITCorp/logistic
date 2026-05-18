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
