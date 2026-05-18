import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { getCarrierRate, calculateClientPrice } from '@/lib/pricing'

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

    const { data: pool } = await db.from('pools').select('*').eq('id', pool_id).single()
    if (!pool) return NextResponse.json({ error: 'Pool no encontrado' }, { status: 404 })
    if (pool.status !== 'active') return NextResponse.json({ error: 'Este pool ya está cerrado' }, { status: 400 })

    const shipment = order.shipment as { id: string; volume_m3: number; client_id: string }
    const volumeAfter = pool.current_volume_m3 + shipment.volume_m3
    const { clientPrice } = calculateClientPrice(pool.day_number, volumeAfter)

    // Assign shipment to pool
    await db.from('shipments').update({
      pool_id,
      status: 'assigned',
      price_per_m3: clientPrice,
      assigned_at: new Date().toISOString(),
    }).eq('id', shipment.id)

    // Add pool member record
    await db.from('pool_members').insert({
      pool_id,
      shipment_id: shipment.id,
      client_id: shipment.client_id,
      volume_m3: shipment.volume_m3,
      price_per_m3: clientPrice,
    })

    // Update pool totals
    await db.from('pools').update({
      current_volume_m3: volumeAfter,
      participants: pool.participants + 1,
      carrier_rate: getCarrierRate(volumeAfter),
    }).eq('id', pool_id)

    // Update order status
    await db.from('orders').update({
      status: 'in_pool',
      pool_id,
      price_per_m3: clientPrice,
      assigned_pool_at: new Date().toISOString(),
    }).eq('id', order_id)

    return NextResponse.json({ price_per_m3: clientPrice, pool_number: pool.pool_number })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
