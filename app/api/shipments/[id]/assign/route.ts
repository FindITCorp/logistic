import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken } from '@/lib/adminAuth'
import { getCarrierRate, calculateClientPrice } from '@/lib/pricing'

const schema = z.object({ pool_id: z.string().uuid() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifyAdminToken(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await req.json()
    const { pool_id } = schema.parse(body)
    const shipment_id = params.id

    const db = createServerClient()

    const { data: shipment } = await db
      .from('shipments')
      .select('*')
      .eq('id', shipment_id)
      .single()

    if (!shipment) return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 })
    if (shipment.status !== 'received') return NextResponse.json({ error: 'Envío ya asignado' }, { status: 400 })

    const { data: pool } = await db.from('pools').select('*').eq('id', pool_id).single()
    if (!pool) return NextResponse.json({ error: 'Pool no encontrado' }, { status: 404 })
    if (pool.status !== 'active') return NextResponse.json({ error: 'Pool cerrado' }, { status: 400 })

    const volumeAfter = pool.current_volume_m3 + shipment.volume_m3
    const { clientPrice } = calculateClientPrice(pool.day_number, volumeAfter)

    await db.from('shipments').update({
      pool_id,
      status: 'assigned',
      price_per_m3: clientPrice,
      assigned_at: new Date().toISOString(),
    }).eq('id', shipment_id)

    await db.from('pool_members').insert({
      pool_id,
      shipment_id,
      client_id: shipment.client_id,
      volume_m3: shipment.volume_m3,
      price_per_m3: clientPrice,
    })

    await db.from('pools').update({
      current_volume_m3: volumeAfter,
      participants: pool.participants + 1,
      carrier_rate: getCarrierRate(volumeAfter),
    }).eq('id', pool_id)

    return NextResponse.json({ price_per_m3: clientPrice, pool_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
