import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'

// GET /api/admin/settlement — real per-pool P&L from the pool_settlement view.
// Revenue (sum of locked client prices) vs cost (carrier at final volume +
// $620 fixed overhead) = FINDIT's true margin per pool. Admin-only.
export async function GET(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const db = createServerClient()
  const { data, error } = await db
    .from('pool_settlement')
    .select('*')
    .order('pool_number', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const totals = (data ?? []).reduce(
    (acc, p) => ({
      revenue_usd: acc.revenue_usd + Number(p.revenue_usd ?? 0),
      cost_usd: acc.cost_usd + Number(p.cost_usd ?? 0),
      margin_usd: acc.margin_usd + Number(p.margin_usd ?? 0),
    }),
    { revenue_usd: 0, cost_usd: 0, margin_usd: 0 },
  )

  return NextResponse.json({
    pools: data ?? [],
    totals: {
      revenue_usd: +totals.revenue_usd.toFixed(2),
      cost_usd: +totals.cost_usd.toFixed(2),
      margin_usd: +totals.margin_usd.toFixed(2),
      margin_pct: totals.revenue_usd > 0 ? +((totals.margin_usd / totals.revenue_usd) * 100).toFixed(1) : 0,
    },
  })
}
