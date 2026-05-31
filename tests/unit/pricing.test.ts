import { describe, it, expect } from 'vitest'
import {
  calculateClientPrice,
  selectShippingMode,
  getCarrierRate,
  getClientSavingsPct,
  getCarrierCostByMode,
  DEFAULT_VOLUME_TIERS,
  MARKET_RATE_CASILLERO,
  MARKET_RATE_LMA,
  MAX_CLIENT_PRICE,
  FCL_BREAKEVEN_M3,
  FCL_40FT_CAPACITY,
  FINDIT_MARGIN_FLOOR_PCT,
  FIXED_OVERHEAD_PER_POOL,
  MIN_OVERHEAD_VOLUME_M3,
  DAY_CLIENT_SAVINGS_PCT,
} from '../../lib/pricing'

// ─── Shipping mode selection ──────────────────────────────────────────────────

describe('selectShippingMode', () => {
  it('devuelve LCL por debajo del breakeven (20 m³)', () => {
    expect(selectShippingMode(0)).toBe('LCL')
    expect(selectShippingMode(5)).toBe('LCL')
    expect(selectShippingMode(19.9)).toBe('LCL')
  })

  it('devuelve FCL_20 en rango 20–41 m³', () => {
    expect(selectShippingMode(20)).toBe('FCL_20')
    expect(selectShippingMode(30)).toBe('FCL_20')
    expect(selectShippingMode(41)).toBe('FCL_20')
  })

  it('devuelve FCL_40 en volúmenes grandes (≥75% de 55 m³ = 41.25)', () => {
    expect(selectShippingMode(41.25)).toBe('FCL_40')
    expect(selectShippingMode(55)).toBe('FCL_40')
    expect(selectShippingMode(100)).toBe('FCL_40')
  })
})

// ─── Carrier rate tiers ───────────────────────────────────────────────────────

describe('getCarrierRate (LCL tiers)', () => {
  it('primer tramo: 0–5 m³ → $121', () => {
    expect(getCarrierRate(0)).toBe(121)
    expect(getCarrierRate(1)).toBe(121)
    expect(getCarrierRate(4.9)).toBe(121)
  })

  it('segundo tramo: 5–15 m³ → $106', () => {
    expect(getCarrierRate(5)).toBe(106)
    expect(getCarrierRate(10)).toBe(106)
    expect(getCarrierRate(14.9)).toBe(106)
  })

  it('tercer tramo: 15–20 m³ → $101', () => {
    expect(getCarrierRate(15)).toBe(101)
    expect(getCarrierRate(18)).toBe(101)
    expect(getCarrierRate(19.9)).toBe(101)
  })

  it('tramo final: ≥20 m³ → $101', () => {
    expect(getCarrierRate(20)).toBe(101)
    expect(getCarrierRate(30)).toBe(101)
  })

  it('acepta provider rates personalizados', () => {
    const customRates = [
      { min_volume_m3: 0,  max_volume_m3: 5,    rate_per_m3: 90 },
      { min_volume_m3: 5,  max_volume_m3: null,  rate_per_m3: 75 },
    ]
    expect(getCarrierRate(2, customRates)).toBe(90)
    expect(getCarrierRate(10, customRates)).toBe(75)
  })

  it('con array vacío usa DEFAULT_VOLUME_TIERS', () => {
    expect(getCarrierRate(2, [])).toBe(getCarrierRate(2))
  })
})

// ─── Day savings percentage ───────────────────────────────────────────────────

describe('getClientSavingsPct', () => {
  it('día 1 → 90% al cliente', () => expect(getClientSavingsPct(1)).toBe(90))
  it('día 5 → 50% al cliente', () => expect(getClientSavingsPct(5)).toBe(50))
  it('día 10 → 10% al cliente', () => expect(getClientSavingsPct(10)).toBe(10))
  it('clamp inferior (día 0 → trata como día 1)', () => expect(getClientSavingsPct(0)).toBe(90))
  it('clamp superior (día 11 → trata como día 10)', () => expect(getClientSavingsPct(11)).toBe(10))

  it('decrementa 10% por día del 1 al 9', () => {
    for (let d = 1; d <= 9; d++) {
      expect(getClientSavingsPct(d)).toBe(DAY_CLIENT_SAVINGS_PCT[d])
    }
  })
})

// ─── calculateClientPrice — invariantes de negocio ───────────────────────────

describe('calculateClientPrice — invariantes críticos', () => {
  const CASES: Array<[number, number]> = [
    [1, 0.5], [1, 2], [1, 5], [3, 8], [5, 10],
    [1, 15], [7, 18], [1, 20], [5, 24], [10, 30], [1, 42], [3, 50],
  ]

  it('clientPrice ≤ MAX_CLIENT_PRICE ($252) — nunca cobramos más que el techo', () => {
    for (const [day, vol] of CASES) {
      const { clientPrice } = calculateClientPrice(day, vol)
      expect(clientPrice, `día ${day} vol ${vol}m³`).toBeLessThanOrEqual(MAX_CLIENT_PRICE)
    }
  })

  it('clientPrice < MARKET_RATE_CASILLERO ($420) — siempre más barato que competidor', () => {
    for (const [day, vol] of CASES) {
      const { clientPrice } = calculateClientPrice(day, vol)
      expect(clientPrice, `día ${day} vol ${vol}m³`).toBeLessThan(MARKET_RATE_CASILLERO)
    }
  })

  it('finditMargin > 0 — FINDIT siempre gana algo', () => {
    for (const [day, vol] of CASES) {
      const { finditMargin } = calculateClientPrice(day, vol)
      expect(finditMargin, `día ${day} vol ${vol}m³`).toBeGreaterThan(0)
    }
  })

  it('clientPrice día 1 ≤ clientPrice día 10 — early bird es siempre más barato', () => {
    for (const vol of [2, 5, 10, 20]) {
      const d1 = calculateClientPrice(1, vol).clientPrice
      const d10 = calculateClientPrice(10, vol).clientPrice
      expect(d1, `vol ${vol}m³`).toBeLessThanOrEqual(d10)
    }
  })

  it('advancePerM3 + finalPerM3 = clientPrice (two-stage payment)', () => {
    for (const [day, vol] of CASES) {
      const { clientPrice, advancePerM3, finalPerM3 } = calculateClientPrice(day, vol)
      expect(Math.abs(advancePerM3 + finalPerM3 - clientPrice)).toBeLessThan(0.001)
    }
  })

  it('savingVsCompetitor = $420 - clientPrice', () => {
    for (const [day, vol] of CASES) {
      const { clientPrice, savingVsCompetitor } = calculateClientPrice(day, vol)
      expect(Math.abs(MARKET_RATE_CASILLERO - clientPrice - savingVsCompetitor)).toBeLessThan(0.001)
    }
  })

  it('overhead mínimo garantizado a 5 m³ (no spike en pools pequeños)', () => {
    const tiny = calculateClientPrice(1, 0.5)
    const five = calculateClientPrice(1, 5)
    // Both should use MIN_OVERHEAD_VOLUME_M3 floor
    expect(tiny.overheadPerM3).toBeCloseTo(five.overheadPerM3, 2)
  })
})

// ─── Paridad SQL ↔ TypeScript ─────────────────────────────────────────────────

describe('paridad con lógica SQL (migración 012)', () => {
  // Mirror of findit_carrier_rate + findit_client_price SQL functions
  function sqlCarrier(v: number): number {
    if (v >= 41.25) return 3200 / Math.max(v, 1)
    if (v >= 20) return 2000 / Math.max(v, 1)
    if (v >= 15) return 101
    if (v >= 5) return 106
    return 121
  }
  function sqlPrice(day: number, v: number): number {
    const c = sqlCarrier(v)
    const o = 620 / Math.max(Math.max(v, 1), 8)
    const min = c + o + c * 0.3
    const max = Math.max(252, min)
    const dist = Math.max(0, max - min)
    const d = Math.min(Math.max(day, 1), 10)
    const pct: Record<number, number> = { 1: 90, 2: 80, 3: 70, 4: 60, 5: 50, 6: 40, 7: 30, 8: 20, 9: 10, 10: 10 }
    return Math.round((max - (dist * pct[d]) / 100) * 100) / 100
  }

  it('SQL y TypeScript coinciden al centavo en todos los casos de prueba', () => {
    const cases: Array<[number, number]> = [
      [1, 2], [1, 5], [3, 8], [5, 10], [1, 15], [7, 18],
      [1, 20], [5, 24], [10, 30], [1, 42], [3, 50], [10, 1],
    ]
    for (const [day, vol] of cases) {
      const ts = Math.round(calculateClientPrice(day, vol).clientPrice * 100) / 100
      const sql = sqlPrice(day, vol)
      expect(Math.abs(ts - sql), `día ${day} vol ${vol}m³: TS=${ts} SQL=${sql}`).toBeLessThan(0.02)
    }
  })
})

// ─── FCL vs LCL ──────────────────────────────────────────────────────────────

describe('modo de envío FCL vs LCL', () => {
  it('20 m³ usa FCL_20 y costo es $2000/vol', () => {
    const { mode, costPerM3 } = getCarrierCostByMode(20)
    expect(mode).toBe('FCL_20')
    expect(costPerM3).toBeCloseTo(2000 / 20, 1)
  })

  it('55 m³ usa FCL_40 y costo es $3200/vol', () => {
    const { mode, costPerM3 } = getCarrierCostByMode(55)
    expect(mode).toBe('FCL_40')
    expect(costPerM3).toBeCloseTo(3200 / 55, 1)
  })

  it('precio FCL_40 a 55 m³ es el más bajo de todos los modos', () => {
    const lcl = calculateClientPrice(1, 10).clientPrice
    const fcl20 = calculateClientPrice(1, 24).clientPrice
    const fcl40 = calculateClientPrice(1, 55).clientPrice
    // FCL_40 at high volume should be cheapest per m³
    expect(fcl40).toBeLessThan(fcl20)
    expect(fcl20).toBeLessThan(lcl)
  })
})

// ─── Constantes de mercado ────────────────────────────────────────────────────

describe('constantes de benchmarks competitivos', () => {
  it('casillero competidor = $420/m³', () => expect(MARKET_RATE_CASILLERO).toBe(420))
  it('LMA = $285/m³ (techo de precio de referencia)', () => expect(MARKET_RATE_LMA).toBe(285))
  it('precio máximo cliente = 60% de $420 = $252', () => expect(MAX_CLIENT_PRICE).toBe(252))
  it('margen mínimo FINDIT = 30%', () => expect(FINDIT_MARGIN_FLOOR_PCT).toBe(0.30))
  it('overhead fijo por pool = $620 (aduanas $420 + transporte $200)', () => {
    expect(FIXED_OVERHEAD_PER_POOL).toBe(620)
  })
})
