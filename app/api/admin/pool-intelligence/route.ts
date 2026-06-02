import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'
import { getAllPoolsIntelligence, findAlertCandidates } from '@/lib/poolIntelligence'

// GET /api/admin/pool-intelligence
// Devuelve predicciones en tiempo real para todos los pools activos:
// velocidad de llenado, probabilidad de cruce FCL, y leads candidatos a alerta.

export async function GET(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  try {
    const db = createServerClient()
    const [intelligences, alerts] = await Promise.all([
      getAllPoolsIntelligence(db),
      findAlertCandidates(db),
    ])

    // Agrupar alertas por pool para la UI
    const alertsByPool: Record<number, number> = {}
    for (const a of alerts) {
      alertsByPool[a.poolNumber] = (alertsByPool[a.poolNumber] ?? 0) + 1
    }

    return NextResponse.json({
      ok: true,
      pools: intelligences.map(p => ({
        ...p,
        alertCandidateCount: alertsByPool[p.poolNumber] ?? 0,
      })),
      totalAlertCandidates: alerts.length,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 500 },
    )
  }
}
