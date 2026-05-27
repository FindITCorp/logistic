import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase/client'
import { getClientByCode } from '@/lib/clients'
import { assignShipmentToPool, findBestPool } from '@/lib/poolAssignment'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'

const schema = z.object({
  client_code: z.string().regex(/^FDT-\d{4}$/),
  weight_kg: z.number().positive(),
  volume_m3: z.number().positive(),
  length_cm: z.number().positive().optional(),
  width_cm: z.number().positive().optional(),
  height_cm: z.number().positive().optional(),
  product_description: z.string().max(300).optional(),
  declared_value_usd: z.number().positive().optional(),
  origin_city: z.enum(['shanghai', 'guangzhou', 'shenzhen']),
  supplier_tracking: z.string().optional(),
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

    // Generate invoice upload token (valid 7 days)
    const invoiceToken = crypto.randomBytes(24).toString('hex')
    const invoiceTokenExp = new Date(Date.now() + 7 * 86400000).toISOString()

    // Register shipment arrival
    const { data: shipment, error } = await db
      .from('shipments')
      .insert({
        client_id: client.id,
        client_code: client.client_code,
        weight_kg: input.weight_kg,
        volume_m3: input.volume_m3,
        length_cm: input.length_cm ?? null,
        width_cm: input.width_cm ?? null,
        height_cm: input.height_cm ?? null,
        product_description: input.product_description ?? null,
        declared_value: input.declared_value_usd ?? null,
        origin_city: input.origin_city,
        status: 'received',
        invoice_token: invoiceToken,
        invoice_token_exp: invoiceTokenExp,
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

export async function GET(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const db = createServerClient()
  const poolId = req.nextUrl.searchParams.get('pool_id')
  const clientCode = req.nextUrl.searchParams.get('client_code')

  let query = db
    .from('shipments')
    .select('*, client:clients(name, whatsapp)')
    .order('created_at', { ascending: false })
    .limit(200)

  if (poolId) query = query.eq('pool_id', poolId)
  if (clientCode) query = query.eq('client_code', clientCode)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shipments: data ?? [] })
}
