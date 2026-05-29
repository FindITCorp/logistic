import { test, expect } from '@playwright/test'
import { calculateClientPrice } from '../lib/pricing'

// Guards against drift between lib/pricing.ts (frontend estimates) and the
// authoritative SQL pricing (findit_client_price in migration 012, used by
// join_pool for billing). If you change one, change the other — this test fails
// the moment they diverge.

// Mirror of the SQL functions findit_carrier_rate + findit_client_price.
function sqlCarrier(v: number): number {
  if (v >= 41.25) return 3200 / Math.max(v, 1)
  if (v >= 20) return 2000 / Math.max(v, 1)
  if (v >= 15) return 101
  if (v >= 5) return 106
  return 121
}
function sqlPrice(day: number, v: number): number {
  const c = sqlCarrier(v)
  const o = 620 / Math.max(Math.max(v, 1), 5)
  const min = c + o + c * 0.3
  const max = Math.max(252, min)
  const dist = Math.max(0, max - min)
  const d = Math.min(Math.max(day, 1), 10)
  const pct: Record<number, number> = { 1: 90, 2: 80, 3: 70, 4: 60, 5: 50, 6: 40, 7: 30, 8: 20, 9: 10, 10: 10 }
  return Math.round((max - (dist * pct[d]) / 100) * 100) / 100
}

test('SQL pricing matches TypeScript pricing engine to the cent', () => {
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
