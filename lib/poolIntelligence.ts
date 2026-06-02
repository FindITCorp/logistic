import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateClientPrice } from './pricing'

// ─── Pool Intelligence Engine ─────────────────────────────────────────────────
// Análisis en tiempo real de cada pool activo: velocidad de llenado, predicción
// de cruce al umbral FCL (LCL→FCL_20ft) y selección de leads óptimos para alertar.
//
// Diferenciador clave: ningún consolidador detecta proactivamente "este pool va a
// cruzar FCL en 2 días — alerta ya a los leads" y lo hace automáticamente.

const FCL_THRESHOLD_M3 = 20   // umbral LCL → FCL 20ft
const VELOCITY_WINDOW_DAYS = 3 // días de historial para calcular velocidad

export interface PoolSnapshot {
  id: string
  pool_number: number
  origin_city: string
  current_volume_m3: number
  day_number: number
}

export interface PoolIntelligence {
  poolId: string
  poolNumber: number
  originCity: string
  currentVolumeM3: number
  dayNumber: number
  daysRemaining: number
  fillRatePct: number               // currentVol / FCL_THRESHOLD * 100
  velocityM3PerDay: number          // m³/día promedio últimos 3 días
  predictedDaysToFCL: number | null // null si sin velocidad o ya FCL
  fclCrossingProbability: number    // 0–1
  recommendedAction: 'join_now' | 'wait_for_fcl' | 'already_fcl' | 'low_data'
  priceNow: number                  // precio actual para 1 m³ adicional
  priceFCL: number                  // precio si el pool cruzara FCL hoy
  savingsPerM3AtFCL: number         // diferencia priceNow − priceFCL
}

/** Analiza un pool individual: velocidad, predicción FCL, acción recomendada. */
export async function analyzePool(
  db: SupabaseClient,
  pool: PoolSnapshot,
): Promise<PoolIntelligence> {
  const windowStart = new Date(Date.now() - VELOCITY_WINDOW_DAYS * 86_400_000).toISOString()
  const { data: recentJoins } = await db
    .from('pool_members')
    .select('volume_m3')
    .eq('pool_id', pool.id)
    .gte('joined_at', windowStart)

  const recentVolume = (recentJoins ?? []).reduce(
    (s: number, m: { volume_m3: number }) => s + (m.volume_m3 ?? 0), 0,
  )
  const velocityM3PerDay = recentVolume / VELOCITY_WINDOW_DAYS

  const daysRemaining = Math.max(0, 10 - pool.day_number)
  const fillRatePct = Math.min(100, (pool.current_volume_m3 / FCL_THRESHOLD_M3) * 100)
  const remainingToFCL = FCL_THRESHOLD_M3 - pool.current_volume_m3

  const priceNow = calculateClientPrice(pool.day_number, pool.current_volume_m3 + 1).clientPrice
  const priceFCL = calculateClientPrice(pool.day_number, FCL_THRESHOLD_M3 + 1).clientPrice
  const savingsPerM3AtFCL = Math.max(0, priceNow - priceFCL)

  let predictedDaysToFCL: number | null = null
  let fclCrossingProbability = 0
  let recommendedAction: PoolIntelligence['recommendedAction'] = 'low_data'

  if (pool.current_volume_m3 >= FCL_THRESHOLD_M3) {
    recommendedAction = 'already_fcl'
    fclCrossingProbability = 1
  } else if (velocityM3PerDay > 0.1) {
    predictedDaysToFCL = remainingToFCL / velocityM3PerDay
    if (predictedDaysToFCL <= daysRemaining) {
      const margin = daysRemaining - predictedDaysToFCL
      // Probabilidad crece cuanto más margen de tiempo hay
      fclCrossingProbability = Math.min(0.95, 0.5 + (margin / Math.max(daysRemaining, 1)) * 0.45)
      recommendedAction = fclCrossingProbability >= 0.65 ? 'wait_for_fcl' : 'join_now'
    } else {
      // No llegaría a FCL naturalmente
      fclCrossingProbability = Math.max(0, (daysRemaining / predictedDaysToFCL) * 0.35)
      recommendedAction = 'join_now'
    }
  } else if (pool.day_number >= 7) {
    recommendedAction = 'join_now' // tarde en el ciclo, sin datos de velocidad
  }

  return {
    poolId: pool.id,
    poolNumber: pool.pool_number,
    originCity: pool.origin_city,
    currentVolumeM3: pool.current_volume_m3,
    dayNumber: pool.day_number,
    daysRemaining,
    fillRatePct,
    velocityM3PerDay,
    predictedDaysToFCL,
    fclCrossingProbability,
    recommendedAction,
    priceNow,
    priceFCL,
    savingsPerM3AtFCL,
  }
}

/** Analiza todos los pools activos. */
export async function getAllPoolsIntelligence(db: SupabaseClient): Promise<PoolIntelligence[]> {
  const { data: pools } = await db
    .from('pools')
    .select('id, pool_number, origin_city, current_volume_m3, day_number')
    .eq('status', 'active')

  if (!pools?.length) return []
  return Promise.all(pools.map(p => analyzePool(db, p as PoolSnapshot)))
}

export interface PoolAlert {
  leadId: string
  leadName: string
  leadWhatsapp: string | null
  leadEmail: string | null
  leadOptoutToken: string | null
  poolNumber: number
  poolOriginCity: string
  fillRatePct: number
  fclCrossingProbability: number
  potentialSavingsUsd: number
}

/**
 * Encuentra leads que deben recibir una alerta proactiva:
 * su pool de origen está ≥60% lleno y trending hacia FCL.
 * Solo incluye leads activos, sin opt-out y con volumen declarado.
 */
export async function findAlertCandidates(db: SupabaseClient): Promise<PoolAlert[]> {
  const intelligences = await getAllPoolsIntelligence(db)

  const alertPools = intelligences.filter(p =>
    p.fillRatePct >= 60 &&
    p.fillRatePct < 100 &&
    p.daysRemaining >= 2 &&
    p.recommendedAction !== 'already_fcl',
  )

  if (!alertPools.length) return []

  const alerts: PoolAlert[] = []

  for (const pool of alertPools) {
    const { data: leads } = await db
      .from('leads')
      .select('id, name, whatsapp, email, monthly_volume_m3, optout_token')
      .eq('origin_city', pool.originCity)
      .eq('status', 'new')
      .eq('opted_out', false)
      .not('monthly_volume_m3', 'is', null)
      .limit(30)

    for (const lead of leads ?? []) {
      const vol = (lead.monthly_volume_m3 as number) ?? 1
      const priceIfJoinNow = calculateClientPrice(pool.dayNumber, pool.currentVolumeM3 + vol).clientPrice
      const priceAtFCL = calculateClientPrice(pool.dayNumber, FCL_THRESHOLD_M3 + vol).clientPrice
      // Ahorro de entrar ahora vs no entrar (FCL que no cruza) — o ahorro de cruzar FCL ellos
      const potentialSavingsUsd = Math.max(
        (priceIfJoinNow - priceAtFCL) * vol,  // si pool cruza FCL
        pool.savingsPerM3AtFCL * vol,           // ahorro FCL por m³
      )

      if (potentialSavingsUsd > 5) {
        alerts.push({
          leadId: lead.id as string,
          leadName: lead.name as string,
          leadWhatsapp: lead.whatsapp as string | null,
          leadEmail: lead.email as string | null,
          leadOptoutToken: lead.optout_token as string | null,
          poolNumber: pool.poolNumber,
          poolOriginCity: pool.originCity,
          fillRatePct: pool.fillRatePct,
          fclCrossingProbability: pool.fclCrossingProbability,
          potentialSavingsUsd,
        })
      }
    }
  }

  return alerts
}
