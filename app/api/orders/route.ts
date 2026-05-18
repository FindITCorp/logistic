import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { getClientByCode } from '@/lib/clients'

const schema = z.object({
  client_code: z.string().regex(/^FDT-\d{4}$/),
  product_description: z.string().min(3).max(200),
  supplier_name: z.string().optional(),
  supplier_tracking: z.string().optional(),
  origin_city: z.enum(['shanghai', 'guangzhou', 'shenzhen']),
  declared_value_usd: z.number().positive().optional(),
  estimated_weight_kg: z.number().positive().optional(),
  estimated_volume_m3: z.number().positive().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)

    const client = await getClientByCode(input.client_code)
    if (!client) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

    const db = createServerClient()
    const { data, error } = await db
      .from('orders')
      .insert({
        client_id: client.id,
        client_code: client.client_code,
        product_description: input.product_description,
        supplier_name: input.supplier_name,
        supplier_tracking: input.supplier_tracking,
        origin_city: input.origin_city,
        declared_value_usd: input.declared_value_usd,
        estimated_weight_kg: input.estimated_weight_kg,
        estimated_volume_m3: input.estimated_volume_m3,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ order: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  const db = createServerClient()
  const { data: orders } = await db
    .from('orders')
    .select('*, pool:pools(origin_city, destination, day_number, current_volume_m3, carrier_rate)')
    .eq('client_code', code.toUpperCase())
    .order('created_at', { ascending: false })

  return NextResponse.json({ orders: orders ?? [] })
}
