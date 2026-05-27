import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import crypto from 'crypto'

// POST /api/shipments/[id]/invoice — admin generates/refreshes upload token
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = createServerClient()

  const { data: shipment } = await db
    .from('shipments')
    .select('*, client:clients(name, whatsapp, email)')
    .eq('id', params.id)
    .single()

  if (!shipment) return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 })

  // Generate unique token valid for 7 days
  const token = crypto.randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()

  await db.from('shipments').update({
    invoice_token: token,
    invoice_token_exp: expiresAt,
  }).eq('id', params.id)

  const uploadUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logistic-six-alpha.vercel.app'}/factura/${token}`

  // Build WhatsApp notification message
  const clientName = (shipment.client as { name: string })?.name ?? 'Cliente'
  const message = `Hola ${clientName} 👋\n\nTu mercancía *${shipment.client_code}* llegó a nuestra bodega en ${shipment.origin_city}.\n\n📦 Peso: ${shipment.weight_kg} kg | Volumen: ${shipment.volume_m3} m³\n\nPara liberar tu carga en aduana Panamá necesitamos tu *factura comercial*.\n\n📄 Súbela aquí (válido 7 días):\n${uploadUrl}\n\n_FINDIT Logistics — China → Panamá_`

  const client = shipment.client as { whatsapp?: string | null }
  const waLink = client?.whatsapp
    ? `https://wa.me/${client.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    : null

  return NextResponse.json({ token, uploadUrl, waLink, expiresAt })
}

// GET /api/shipments/[id]/invoice — get invoice status
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const db = createServerClient()
  const { data } = await db
    .from('invoices')
    .select('*')
    .eq('shipment_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ invoice: data })
}
