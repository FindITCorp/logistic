import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { getClientByCode } from '@/lib/clients'
import { assignShipmentToPool, findBestPool } from '@/lib/poolAssignment'

const schema = z.object({
  client_code: z.string().regex(/^FDT-\d{4}$/),
  weight_kg: z.number().positive(),
  volume_m3: z.number().positive(),
  origin_city: z.enum(['shanghai', 'guangzhou', 'shenzhen']),
  supplier_tracking: z.string().optional(), // link to pre-registered order
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)

    const client = await getClientByCode(input.client_code)
    if (!client) {
      return NextResponse.json({ error: `Cliente ${input.client_code} no encontrado` }, { status: 404 })
    }

    const db = createServerClient()

    // Register shipment arrival
    const { data: shipment, error } = await db
      .from('shipments')
      .insert({
        client_id: client.id,
        client_code: client.client_code,
        weight_kg: input.weight_kg,
        volume_m3: input.volume_m3,
        origin_city: input.origin_city,
        status: 'received',
      })
      .select()
      .single()

    if (error || !shipment) throw new Error(error?.message ?? 'Error al registrar envío')

    // Link to pre-registered order if tracking provided or by client_code + pending status
    let order: { id: string } | null = null
    if (input.supplier_tracking) {
      const { data } = await db
        .from('orders')
        .select('id')
        .eq('supplier_tracking', input.supplier_tracking)
        .eq('status', 'in_transit_to_warehouse')
        .maybeSingle()
      order = data
    }
    if (!order) {
      // Match oldest pending order for this client
      const { data } = await db
        .from('orders')
        .select('id')
        .eq('client_code', client.client_code)
        .in('status', ['ordered', 'in_transit_to_warehouse'])
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      order = data
    }

    if (order) {
      await db.from('orders').update({
        status: 'at_warehouse',
        shipment_id: shipment.id,
        arrived_warehouse_at: new Date().toISOString(),
      }).eq('id', order.id)
    }

    if (client.assignment_mode === 'auto') {
      const result = await assignShipmentToPool(shipment.id)

      // Update order status to in_pool
      if (order) {
        await db.from('orders').update({
          status: 'in_pool',
          pool_id: result.pool.id,
          price_per_m3: result.pricePerM3,
          assigned_pool_at: new Date().toISOString(),
        }).eq('id', order.id)
      }

      return NextResponse.json({
        shipment, assigned: true,
        pool: result.pool, price_per_m3: result.pricePerM3,
        reason: result.reason, client,
      }, { status: 201 })
    } else {
      const suggestion = await findBestPool(input.origin_city, input.volume_m3)
      return NextResponse.json({
        shipment, assigned: false,
        suggestion, client,
        select_url: `/pools/unirme?shipment=${shipment.id}`,
      }, { status: 201 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
