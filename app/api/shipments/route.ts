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

    if (client.assignment_mode === 'auto') {
      // Auto-assign to best pool immediately
      const result = await assignShipmentToPool(shipment.id)
      return NextResponse.json({
        shipment,
        assigned: true,
        pool: result.pool,
        price_per_m3: result.pricePerM3,
        reason: result.reason,
        client,
      }, { status: 201 })
    } else {
      // Manual mode — find best suggestion but don't assign yet
      const suggestion = await findBestPool(input.origin_city, input.volume_m3)
      return NextResponse.json({
        shipment,
        assigned: false,
        suggestion,
        client,
        select_url: `/pools/unirme?shipment=${shipment.id}`,
      }, { status: 201 })
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
