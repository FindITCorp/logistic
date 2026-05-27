import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'

const uploadSchema = z.object({
  token: z.string().min(10),
  declared_value_usd: z.number().positive(),
  description: z.string().min(3).max(300),
  product_type: z.string().optional(),
  currency: z.string().default('USD'),
  // file_url comes from Supabase Storage upload done client-side
  file_url: z.string().url().optional(),
  file_name: z.string().optional(),
})

// POST /api/invoices — client submits invoice via upload token
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = uploadSchema.parse(body)

    const db = createServerClient()

    // Verify token is valid and not expired
    const { data: shipment } = await db
      .from('shipments')
      .select('*, client:clients(*), pool_members(pool_id)')
      .eq('invoice_token', input.token)
      .gt('invoice_token_exp', new Date().toISOString())
      .single()

    if (!shipment) {
      return NextResponse.json(
        { error: 'Token inválido o expirado. Pídele a FINDIT un nuevo enlace.' },
        { status: 400 },
      )
    }

    const poolId = (shipment.pool_members as { pool_id: string }[])?.[0]?.pool_id ?? null

    const now = new Date().toISOString()

    // Upsert invoice record
    const { data: invoice, error } = await db
      .from('invoices')
      .upsert({
        shipment_id: shipment.id,
        client_id: shipment.client_id,
        client_code: shipment.client_code,
        pool_id: poolId,
        declared_value_usd: input.declared_value_usd,
        currency: input.currency,
        description: input.description,
        product_type: input.product_type ?? null,
        file_url: input.file_url ?? null,
        file_name: input.file_name ?? null,
        status: input.file_url ? 'uploaded' : 'pending',
        uploaded_at: input.file_url ? now : null,
      }, { onConflict: 'shipment_id' })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Mark shipment invoice as received
    await db.from('shipments').update({
      invoice_received: true,
      invoice_url: input.file_url ?? null,
      invoice_uploaded_at: now,
      declared_value: input.declared_value_usd,
    }).eq('id', shipment.id)

    return NextResponse.json({ ok: true, invoice }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 400 },
    )
  }
}

// GET /api/invoices?pool_id=xxx — admin gets all invoices for a pool (customs report)
export async function GET(req: NextRequest) {
  const poolId = req.nextUrl.searchParams.get('pool_id')
  const clientCode = req.nextUrl.searchParams.get('client_code')

  // pool_id queries are admin-only (customs export); client_code queries are public (client status page)
  if (poolId) {
    const session = await verifyAdminToken(req)
    const authError = requireAdmin(session)
    if (authError) return authError
  }

  const db = createServerClient()
  let query = db
    .from('invoices')
    .select('*, shipment:shipments(weight_kg, volume_m3, origin_city, advance_paid, final_paid)')
    .order('client_code')

  if (poolId) query = query.eq('pool_id', poolId)
  if (clientCode) query = query.eq('client_code', clientCode)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate totals for customs
  const totals = (data ?? []).reduce(
    (acc, inv) => ({
      total_declared_usd: acc.total_declared_usd + (inv.declared_value_usd ?? 0),
      total_cif_usd: acc.total_cif_usd + (inv.cif_value_usd ?? 0),
      total_arancel_usd: acc.total_arancel_usd + (inv.arancel_usd ?? 0),
      total_itbms_usd: acc.total_itbms_usd + (inv.itbms_usd ?? 0),
      total_taxes_usd: acc.total_taxes_usd + (inv.total_taxes_usd ?? 0),
      pending_count: acc.pending_count + (inv.status === 'pending' ? 1 : 0),
      uploaded_count: acc.uploaded_count + (inv.status !== 'pending' ? 1 : 0),
    }),
    { total_declared_usd: 0, total_cif_usd: 0, total_arancel_usd: 0, total_itbms_usd: 0, total_taxes_usd: 0, pending_count: 0, uploaded_count: 0 },
  )

  return NextResponse.json({ invoices: data ?? [], totals })
}
