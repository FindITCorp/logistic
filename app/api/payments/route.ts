import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'

const paymentSchema = z.object({
  shipment_id: z.string().uuid(),
  stage: z.enum(['advance', 'final']),
  amount_usd: z.number().positive(),
  method: z.enum(['yappy', 'bank_transfer', 'cash', 'other']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  idempotency_key: z.string().min(8).optional(),
})

// POST /api/payments — mark a shipment payment as received (admin only)
export async function POST(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  try {
    const body = await req.json()
    const input = paymentSchema.parse(body)

    const db = createServerClient()

    // Idempotency: si llega la misma clave dos veces, no dupliques el pago.
    const idemKey = input.idempotency_key
      ?? `${input.shipment_id}:${input.stage}:${input.amount_usd}`
    const { data: existing } = await db
      .from('payments')
      .select('id')
      .eq('idempotency_key', idemKey)
      .maybeSingle()
    if (existing) {
      return NextResponse.json({ ok: true, deduped: true })
    }

    // Update shipment payment fields
    const updateFields =
      input.stage === 'advance'
        ? { advance_paid: true, advance_amount: input.amount_usd, advance_paid_at: new Date().toISOString() }
        : { final_paid: true, final_amount: input.amount_usd, final_paid_at: new Date().toISOString() }

    const { error } = await db
      .from('shipments')
      .update(updateFields)
      .eq('id', input.shipment_id)

    if (error) throw new Error(error.message)

    // Log payment record (idempotency_key bloquea duplicados a nivel DB).
    const { error: insErr } = await db.from('payments').insert({
      shipment_id: input.shipment_id,
      stage: input.stage,
      amount_usd: input.amount_usd,
      method: input.method,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      recorded_by: session!.email,
      idempotency_key: idemKey,
    })
    // Carrera: si otro request insertó la misma clave entre el check y el insert,
    // el índice único lo rechaza — lo tratamos como dedupe, no como error.
    if (insErr && !/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message)

    return NextResponse.json({ ok: true, deduped: !!insErr })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 400 },
    )
  }
}

// GET /api/payments?shipment_id=xxx — get payment history for a shipment
export async function GET(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const shipmentId = req.nextUrl.searchParams.get('shipment_id')
  if (!shipmentId) return NextResponse.json({ error: 'shipment_id required' }, { status: 400 })

  const db = createServerClient()
  const { data } = await db
    .from('payments')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('created_at', { ascending: false })

  return NextResponse.json({ payments: data ?? [] })
}
