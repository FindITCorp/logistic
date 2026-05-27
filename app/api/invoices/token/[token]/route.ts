import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

// GET /api/invoices/token/[token] — validate upload token and return shipment info
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const db = createServerClient()

  const { data: shipment } = await db
    .from('shipments')
    .select('id, client_code, origin_city, weight_kg, volume_m3, client:clients(name)')
    .eq('invoice_token', params.token)
    .gt('invoice_token_exp', new Date().toISOString())
    .single()

  if (!shipment) {
    return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 404 })
  }

  return NextResponse.json({
    shipment: {
      client_code: shipment.client_code,
      origin_city: shipment.origin_city,
      weight_kg: shipment.weight_kg,
      volume_m3: shipment.volume_m3,
      client_name: (shipment.client as unknown as { name: string })?.name ?? '',
    },
  })
}
