import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'
import { joinPoolAtomic, mapJoinError } from '@/lib/poolAssignment'
import { optimizeAssignment, type OptShipment, type OptPool } from '@/lib/poolOptimizer'
import type { ProviderRate } from '@/lib/pricing'

// POST /api/admin/optimize-assignment
// Optimiza la asignación CONJUNTA de los envíos pendientes a los pools activos
// usando el GA evolutivo. Por defecto es dry-run (propone, no ejecuta).
//   body: { apply?: boolean, weights?: {margin,savings,fill}, generations?: number }
const schema = z.object({
  apply: z.boolean().optional(),
  generations: z.number().int().min(10).max(300).optional(),
  weights: z.object({
    margin: z.number().min(0),
    savings: z.number().min(0),
    fill: z.number().min(0),
  }).optional(),
})

export async function POST(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  try {
    const input = schema.parse(await req.json().catch(() => ({})))
    const db = createServerClient()

    // Envíos pendientes de asignar (llegaron a bodega, sin pool).
    const { data: shipments } = await db
      .from('shipments')
      .select('id, origin_city, volume_m3')
      .eq('status', 'received')
      .is('pool_id', null)

    // Pools activos candidatos.
    const { data: pools } = await db
      .from('pools')
      .select('id, pool_number, origin_city, current_volume_m3, day_number, provider_id')
      .eq('status', 'active')
      .lt('day_number', 10)

    if (!shipments?.length) return NextResponse.json({ ok: true, message: 'No hay envíos pendientes', assignments: [] })
    if (!pools?.length) return NextResponse.json({ ok: true, message: 'No hay pools activos', assignments: [] })

    // Cargar tarifas por proveedor para los pools que las tengan.
    const optPools: OptPool[] = []
    for (const p of pools) {
      let rates: ProviderRate[] = []
      if (p.provider_id) {
        const { data } = await db
          .from('provider_rates')
          .select('min_volume_m3, max_volume_m3, rate_per_m3')
          .eq('provider_id', p.provider_id)
          .eq('origin_city', p.origin_city)
          .order('min_volume_m3')
        rates = (data ?? []) as ProviderRate[]
      }
      optPools.push({
        id: p.id, pool_number: p.pool_number, origin_city: p.origin_city,
        current_volume_m3: p.current_volume_m3, day_number: p.day_number, providerRates: rates,
      })
    }

    const optShipments: OptShipment[] = shipments.map(s => ({
      id: s.id, origin_city: s.origin_city, volume_m3: s.volume_m3,
    }))

    // Seed fijo → resultado reproducible para el mismo input (auditable).
    const result = optimizeAssignment(optShipments, optPools, {
      seed: 0x5f3759df,
      generations: input.generations,
      weights: input.weights,
    })

    // Dry-run: solo propuesta.
    if (!input.apply) {
      return NextResponse.json({ ok: true, applied: false, ...result })
    }

    // Apply: ejecuta cada asignación atómicamente. Recolecta éxitos/errores.
    const committed: typeof result.assignments = []
    const failed: Array<{ shipment_id: string; error: string }> = []
    for (const a of result.assignments) {
      const { error } = await joinPoolAtomic(db, a.pool_id, a.shipment_id)
      if (error) failed.push({ shipment_id: a.shipment_id, error: mapJoinError(error).message })
      else committed.push(a)
    }

    return NextResponse.json({
      ok: true, applied: true,
      committed_count: committed.length, failed_count: failed.length,
      committed, failed,
      breakdown: result.breakdown, perPool: result.perPool,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
