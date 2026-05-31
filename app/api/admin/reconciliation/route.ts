import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'

// GET /api/admin/reconciliation — deuda por cobrar agregada desde outstanding_debt.
// Devuelve el detalle por envío + totales por etapa para el panel de cobranza.
export async function GET(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const db = createServerClient()
  const { data: rows, error } = await db
    .from('outstanding_debt')
    .select('*')
    .order('pool_number', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const debt = rows ?? []

  const advancePending = debt.filter(d => d.debt_stage === 'advance_pending')
  const finalPending = debt.filter(d => d.debt_stage === 'final_pending')

  const sum = (arr: typeof debt, field: 'advance_estimate_usd' | 'final_estimate_usd') =>
    +arr.reduce((s, d) => s + (Number(d[field]) || 0), 0).toFixed(2)

  return NextResponse.json({
    totals: {
      advance_pending_count: advancePending.length,
      advance_pending_usd: sum(advancePending, 'advance_estimate_usd'),
      final_pending_count: finalPending.length,
      final_pending_usd: sum(finalPending, 'final_estimate_usd'),
      outstanding_total_usd: +(sum(advancePending, 'advance_estimate_usd') + sum(finalPending, 'final_estimate_usd')).toFixed(2),
    },
    debt,
  })
}
