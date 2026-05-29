import { createServerClient } from './supabase/client'
import { getCarrierRate, calculateClientPrice, DEFAULT_VOLUME_TIERS, ProviderRate } from './pricing'
import type { Pool, OriginCity } from './supabase/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AssignmentResult {
  pool: Pool
  pricePerM3: number
  reason: string
}

export interface JoinPoolResult {
  price_per_m3: number
  volume_after: number
  pool_number: number
  pool_id: string
}

/**
 * Atomic, race-free pool join via the join_pool() SQL function (migration 012).
 * Locks the pool row, recomputes volume + price serially, and writes the
 * member + shipment + pool updates in a single transaction. Replaces the old
 * read-modify-write pattern that silently lost concurrent volume updates.
 */
export async function joinPoolAtomic(
  db: SupabaseClient,
  poolId: string,
  shipmentId: string,
): Promise<{ data: JoinPoolResult | null; error: string | null }> {
  const { data, error } = await db.rpc('join_pool', {
    p_pool_id: poolId,
    p_shipment_id: shipmentId,
  })
  if (error) return { data: null, error: error.message }
  return { data: data as JoinPoolResult, error: null }
}

/** Translate join_pool() SQL exceptions into user-facing messages + HTTP status. */
export function mapJoinError(raw: string): { message: string; status: number } {
  if (raw.includes('POOL_NOT_FOUND')) return { message: 'Pool no encontrado', status: 404 }
  if (raw.includes('POOL_CLOSED')) return { message: 'Este pool ya está cerrado', status: 400 }
  if (raw.includes('SHIPMENT_NOT_FOUND')) return { message: 'Envío no encontrado', status: 404 }
  if (raw.includes('SHIPMENT_ALREADY_ASSIGNED') || raw.includes('ALREADY_ASSIGNED'))
    return { message: 'El envío ya fue asignado a un pool', status: 409 }
  return { message: raw || 'Error al asignar el envío', status: 400 }
}

async function getProviderRates(
  db: ReturnType<typeof createServerClient>,
  providerId: string,
  originCity: OriginCity,
): Promise<ProviderRate[]> {
  const { data } = await db
    .from('provider_rates')
    .select('min_volume_m3, max_volume_m3, rate_per_m3')
    .eq('provider_id', providerId)
    .eq('origin_city', originCity)
    .order('min_volume_m3')
  return (data ?? []) as ProviderRate[]
}

/**
 * Find the best active pool for a shipment.
 *
 * Priority:
 *  1. Adding this shipment's volume crosses into the next tier → best discount unlock
 *  2. Closest to the next tier threshold (most likely to cross soon)
 *  3. If tied, prefer pool with most days remaining
 *
 * Only considers pools with matching origin_city.
 */
export async function findBestPool(
  originCity: OriginCity,
  volumeM3: number,
): Promise<AssignmentResult | null> {
  const db = createServerClient()
  const { data: pools } = await db
    .from('pools')
    .select('*')
    .eq('status', 'active')
    .eq('origin_city', originCity)
    .lt('day_number', 10)

  if (!pools || pools.length === 0) return null

  type Scored = { pool: Pool; score: number; crossesTier: boolean; pricePerM3: number; reason: string }

  const scored: Scored[] = await Promise.all(pools.map(async (pool) => {
    const providerRates: ProviderRate[] = pool.provider_id
      ? await getProviderRates(db, pool.provider_id, originCity)
      : []

    const volumeAfter = pool.current_volume_m3 + volumeM3
    const rateBefore = getCarrierRate(pool.current_volume_m3, providerRates)
    const rateAfter = getCarrierRate(volumeAfter, providerRates)
    const crossesTier = rateAfter < rateBefore

    const tiers = providerRates.length > 0
      ? providerRates.map(r => ({ minM3: r.min_volume_m3, maxM3: r.max_volume_m3, carrierRate: r.rate_per_m3 }))
      : DEFAULT_VOLUME_TIERS
    const nextTier = tiers.find((t) => t.minM3 > pool.current_volume_m3)
    const gapToNextTier = nextTier ? nextTier.minM3 - pool.current_volume_m3 : Infinity

    const { clientPrice } = calculateClientPrice(pool.day_number, volumeAfter, providerRates)

    const score = crossesTier
      ? 10000 - gapToNextTier
      : 1000 - gapToNextTier + (10 - pool.day_number) * 10

    const reason = crossesTier
      ? `Agrega ${volumeM3}m³ y cruza al siguiente nivel de descuento`
      : `Pool más cercano al siguiente nivel (faltan ${gapToNextTier.toFixed(2)}m³)`

    return { pool, score, crossesTier, pricePerM3: clientPrice, reason }
  }))

  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]
  return { pool: best.pool, pricePerM3: best.pricePerM3, reason: best.reason }
}

export async function assignShipmentToPool(shipmentId: string): Promise<AssignmentResult> {
  const db = createServerClient()

  const { data: shipment, error: sErr } = await db
    .from('shipments')
    .select('*, client:clients(*)')
    .eq('id', shipmentId)
    .single()

  if (sErr || !shipment) throw new Error('Envío no encontrado')
  if (shipment.status !== 'received') throw new Error('Envío ya fue asignado')

  const result = await findBestPool(shipment.origin_city, shipment.volume_m3)
  if (!result) throw new Error('No hay pools activos para esta ruta')

  // Atomic assignment — serializes concurrent joins, no lost volume updates.
  const { data, error } = await joinPoolAtomic(db, result.pool.id, shipmentId)
  if (error) throw new Error(mapJoinError(error).message)

  return { ...result, pricePerM3: data!.price_per_m3 }
}
