import {
  calculateClientPrice,
  MARKET_RATE_CASILLERO,
  FCL_BREAKEVEN_M3,
  FCL_40FT_CAPACITY,
  type ProviderRate,
} from './pricing'

// ─── Optimizador evolutivo de asignación de envíos a pools ────────────────────
//
// Patrón DEAP portado a TypeScript (ejecutable en Vercel, sin Python):
//   - Individual  : vector de asignación. individual[i] = índice del pool al que
//                   se asigna el envío i (entre los pools candidatos de su ruta).
//   - Fitness     : escalarización multi-objetivo (NSGA-II-style weights):
//                     w1·margen_FINDIT + w2·ahorro_cliente + w3·bonus_llenado
//   - Operadores  : selección por torneo, cruce uniforme, mutación por reasignación,
//                   elitismo.
//
// Cuando llegan varios envíos en lote, decidir uno por uno (greedy, findBestPool)
// puede dejar plata en la mesa: este optimizador busca la asignación CONJUNTA que
// desbloquea saltos de tarifa (LCL→FCL) y llena contenedores de forma óptima.

export interface OptShipment {
  id: string
  origin_city: string
  volume_m3: number
}

export interface OptPool {
  id: string
  pool_number: number
  origin_city: string
  current_volume_m3: number
  day_number: number
  providerRates?: ProviderRate[]
}

export interface OptWeights {
  margin: number   // peso del margen FINDIT
  savings: number  // peso del ahorro al cliente
  fill: number     // peso del bonus por llenar contenedor (cruzar umbral FCL)
}

export const DEFAULT_WEIGHTS: OptWeights = { margin: 1.0, savings: 0.5, fill: 0.3 }

export interface OptConfig {
  populationSize: number
  generations: number
  cxProb: number      // prob. de cruce
  mutProb: number     // prob. de mutación por individuo
  tournamentSize: number
  eliteCount: number
  seed?: number       // RNG determinista (tests/reproducibilidad)
  weights?: OptWeights
}

export const DEFAULT_CONFIG: OptConfig = {
  populationSize: 60,
  generations: 80,
  cxProb: 0.7,
  mutProb: 0.3,
  tournamentSize: 3,
  eliteCount: 2,
}

export interface Assignment {
  shipment_id: string
  pool_id: string
  pool_number: number
}

export interface OptResult {
  assignments: Assignment[]
  fitness: number
  breakdown: { totalMargin: number; totalSavings: number; fillBonus: number }
  perPool: Array<{
    pool_number: number
    volume_before: number
    volume_after: number
    client_price_m3: number
    findit_margin_m3: number
    assigned_volume: number
    crossed_fcl: boolean
  }>
  generationsRun: number
}

// ─── RNG determinista (mulberry32) — reproducible con seed ───────────────────
function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Para cada envío, lista de índices de pool candidatos (misma ruta). */
function buildCandidates(shipments: OptShipment[], pools: OptPool[]): number[][] {
  return shipments.map(s =>
    pools.reduce<number[]>((acc, p, idx) => {
      if (p.origin_city === s.origin_city) acc.push(idx)
      return acc
    }, []),
  )
}

/** Evalúa el fitness de un individuo (vector de asignación). */
function evaluate(
  individual: number[],
  shipments: OptShipment[],
  pools: OptPool[],
  weights: OptWeights,
): OptResult {
  // Volumen asignado a cada pool por este individuo.
  const assignedVol = new Array(pools.length).fill(0)
  for (let i = 0; i < individual.length; i++) {
    const p = individual[i]
    if (p >= 0) assignedVol[p] += shipments[i].volume_m3
  }

  let totalMargin = 0
  let totalSavings = 0
  let fillBonus = 0
  const perPool: OptResult['perPool'] = []

  for (let p = 0; p < pools.length; p++) {
    if (assignedVol[p] === 0) continue
    const pool = pools[p]
    const volBefore = pool.current_volume_m3
    const volAfter = volBefore + assignedVol[p]

    const { clientPrice, finditMargin } = calculateClientPrice(pool.day_number, volAfter, pool.providerRates)

    // Margen y ahorro se acreditan sobre el volumen NUEVO asignado.
    const marginContribution = finditMargin * assignedVol[p]
    const savingsContribution = (MARKET_RATE_CASILLERO - clientPrice) * assignedVol[p]

    // Bonus por cruzar umbrales donde la unidad económica salta (LCL→FCL20→FCL40).
    const crossedFcl =
      (volBefore < FCL_BREAKEVEN_M3 && volAfter >= FCL_BREAKEVEN_M3) ||
      (volBefore < FCL_40FT_CAPACITY * 0.75 && volAfter >= FCL_40FT_CAPACITY * 0.75)
    if (crossedFcl) fillBonus += 1

    totalMargin += marginContribution
    totalSavings += savingsContribution

    perPool.push({
      pool_number: pool.pool_number,
      volume_before: +volBefore.toFixed(2),
      volume_after: +volAfter.toFixed(2),
      client_price_m3: +clientPrice.toFixed(2),
      findit_margin_m3: +finditMargin.toFixed(2),
      assigned_volume: +assignedVol[p].toFixed(2),
      crossed_fcl: crossedFcl,
    })
  }

  const fitness = weights.margin * totalMargin + weights.savings * totalSavings + weights.fill * fillBonus * 100

  const assignments: Assignment[] = individual.map((p, i) => ({
    shipment_id: shipments[i].id,
    pool_id: pools[p].id,
    pool_number: pools[p].pool_number,
  }))

  return {
    assignments,
    fitness,
    breakdown: {
      totalMargin: +totalMargin.toFixed(2),
      totalSavings: +totalSavings.toFixed(2),
      fillBonus,
    },
    perPool,
    generationsRun: 0,
  }
}

/**
 * Optimiza la asignación conjunta de un lote de envíos a pools activos.
 * Devuelve el mejor individuo encontrado por el GA. Determinista si pasas seed.
 */
export function optimizeAssignment(
  shipments: OptShipment[],
  pools: OptPool[],
  config: Partial<OptConfig> = {},
): OptResult {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const weights = cfg.weights ?? DEFAULT_WEIGHTS
  const rng = makeRng(cfg.seed ?? 0x9e3779b9)

  const candidates = buildCandidates(shipments, pools)

  // Envíos sin pool candidato (ninguna ruta coincide) se marcan -1 y se ignoran.
  const assignable = candidates.map(c => c.length > 0)
  if (!assignable.some(Boolean)) {
    // Nada que asignar.
    return { assignments: [], fitness: 0, breakdown: { totalMargin: 0, totalSavings: 0, fillBonus: 0 }, perPool: [], generationsRun: 0 }
  }

  const randomGene = (i: number): number => {
    const c = candidates[i]
    if (c.length === 0) return -1
    return c[Math.floor(rng() * c.length)]
  }

  const randomIndividual = (): number[] =>
    shipments.map((_, i) => randomGene(i))

  const fitnessOf = (ind: number[]): number => evaluate(ind, shipments, pools, weights).fitness

  // ── Población inicial ──
  let population = Array.from({ length: cfg.populationSize }, randomIndividual)

  const tournament = (): number[] => {
    let best: number[] | null = null
    let bestFit = -Infinity
    for (let k = 0; k < cfg.tournamentSize; k++) {
      const cand = population[Math.floor(rng() * population.length)]
      const f = fitnessOf(cand)
      if (f > bestFit) { bestFit = f; best = cand }
    }
    return best!.slice()
  }

  const crossover = (a: number[], b: number[]): [number[], number[]] => {
    const c1 = a.slice(), c2 = b.slice()
    for (let i = 0; i < a.length; i++) {
      if (rng() < 0.5) { const t = c1[i]; c1[i] = c2[i]; c2[i] = t }
    }
    return [c1, c2]
  }

  const mutate = (ind: number[]): void => {
    const i = Math.floor(rng() * ind.length)
    if (candidates[i].length > 1) ind[i] = randomGene(i)
  }

  let bestEver = population[0].slice()
  let bestEverFit = fitnessOf(bestEver)

  for (let gen = 0; gen < cfg.generations; gen++) {
    // Elitismo: conserva los mejores N.
    const sorted = population
      .map(ind => ({ ind, fit: fitnessOf(ind) }))
      .sort((x, y) => y.fit - x.fit)

    if (sorted[0].fit > bestEverFit) {
      bestEverFit = sorted[0].fit
      bestEver = sorted[0].ind.slice()
    }

    const next: number[][] = sorted.slice(0, cfg.eliteCount).map(s => s.ind.slice())

    while (next.length < cfg.populationSize) {
      let a = tournament()
      let b = tournament()
      if (rng() < cfg.cxProb) [a, b] = crossover(a, b)
      if (rng() < cfg.mutProb) mutate(a)
      if (rng() < cfg.mutProb) mutate(b)
      next.push(a)
      if (next.length < cfg.populationSize) next.push(b)
    }
    population = next
  }

  const result = evaluate(bestEver, shipments, pools, weights)
  result.generationsRun = cfg.generations
  return result
}
