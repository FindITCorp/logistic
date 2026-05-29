import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { joinPoolAtomic, mapJoinError } from '@/lib/poolAssignment'

const schema = z.object({ pool_id: z.string().uuid() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { pool_id } = schema.parse(await req.json())
    const order_id = params.id
    const db = createServerClient()

    // Load order with shipment
    const { data: order } = await db
      .from('orders')
      .select('*, shipment:shipments(*)')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    if (order.status !== 'at_warehouse') return NextResponse.json({ error: 'El pedido debe estar en bodega para unirse a un pool' }, { status: 400 })
    if (!order.shipment_id) return NextResponse.json({ error: 'Sin envío registrado — contacta al operador' }, { status: 400 })

    const shipment = order.shipment as { id: string }

    // Atomic, race-free assignment via join_pool() SQL function.
    const { data, error } = await joinPoolAtomic(db, pool_id, shipment.id)
    if (error) {
      const { message, status } = mapJoinError(error)
      return NextResponse.json({ error: message }, { status })
    }

    // Reflect assignment on the order (separate aggregate, not part of pool math).
    await db.from('orders').update({
      status: 'in_pool',
      pool_id,
      price_per_m3: data!.price_per_m3,
      assigned_pool_at: new Date().toISOString(),
    }).eq('id', order_id)

    return NextResponse.json({ price_per_m3: data!.price_per_m3, pool_number: data!.pool_number })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
