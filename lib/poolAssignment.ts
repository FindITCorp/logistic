import { createServerClient } from './supabase/client'
import { getCarrierRate, calculateClientPrice, DEFAULT_VOLUME_TIERS, ProviderRate } from './pricing'
import type { Pool, OriginCity } from './supabase/database.types'

export interface AssignmentResult {
  pool: Pool
  pricePerM3: number
  reason: string
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

  const { pool, pricePerM3 } = result

  const providerRates: ProviderRate[] = pool.provider_id
    ? await getProviderRates(db, pool.provider_id, shipment.origin_city)
    : []

  await db.from('shipments').update({
    pool_id: pool.id,
    status: 'assigned',
    price_per_m3: pricePerM3,
    assigned_at: new Date().toISOString(),
  }).eq('id', shipmentId)

  await db.from('pool_members').insert({
    pool_id: pool.id,
    shipment_id: shipmentId,
    client_id: shipment.client_id,
    volume_m3: shipment.volume_m3,
    price_per_m3: pricePerM3,
  })

  await db.from('pools').update({
    current_volume_m3: pool.current_volume_m3 + shipment.volume_m3,
    participants: pool.participants + 1,
    carrier_rate: getCarrierRate(pool.current_volume_m3 + shipment.volume_m3, providerRates),
  }).eq('id', pool.id)

  return result
}
