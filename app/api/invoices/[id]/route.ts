import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'

const updateSchema = z.object({
  cif_value_usd: z.number().optional(),
  arancel_pct: z.number().min(0).max(15).optional(),
  arancel_usd: z.number().optional(),
  itbms_usd: z.number().optional(),
  total_taxes_usd: z.number().optional(),
  hs_code: z.string().optional(),
  status: z.enum(['pending', 'uploaded', 'reviewed', 'approved']).optional(),
  notes: z.string().optional(),
})

// PATCH /api/invoices/[id] — admin updates tax calculations
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await req.json()
    const input = updateSchema.parse(body)

    const db = createServerClient()
    const { error } = await db
      .from('invoices')
      .update({ ...input, reviewed_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 400 },
    )
  }
}
