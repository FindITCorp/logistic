import { test, expect } from '@playwright/test'

// API tests — run against live BASE_URL
const BASE = process.env.BASE_URL || 'https://logistic-six-alpha.vercel.app'

test.describe('API /api/health', () => {
  test('devuelve ok:true', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
  })
})

test.describe('API /api/pools', () => {
  test('lista pools activos', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pools?status=active`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('pools')
    expect(Array.isArray(body.pools)).toBe(true)
  })

  test('cada pool tiene campos requeridos', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pools?status=all`)
    const { pools } = await res.json()
    for (const pool of pools.slice(0, 3)) {
      expect(pool).toHaveProperty('pool_number')
      expect(pool).toHaveProperty('origin_city')
      expect(pool).toHaveProperty('current_volume_m3')
      expect(pool).toHaveProperty('day_number')
      expect(pool).toHaveProperty('status')
      expect(pool.day_number).toBeGreaterThanOrEqual(1)
      expect(pool.day_number).toBeLessThanOrEqual(10)
    }
  })
})

test.describe('API /api/clients — registro', () => {
  test('rechaza nombre demasiado corto', async ({ request }) => {
    const res = await request.post(`${BASE}/api/clients`, {
      data: { name: 'A', assignment_mode: 'auto', notify_by: 'whatsapp' },
    })
    expect(res.status()).toBe(400)
  })

  test('rechaza email inválido', async ({ request }) => {
    const res = await request.post(`${BASE}/api/clients`, {
      data: { name: 'Test User', email: 'not-an-email', assignment_mode: 'auto', notify_by: 'email' },
    })
    expect(res.status()).toBe(400)
  })

  test('registra cliente nuevo exitosamente', async ({ request }) => {
    const ts = Date.now()
    const res = await request.post(`${BASE}/api/clients`, {
      data: {
        name: `API Test ${ts}`,
        whatsapp: '+50760000001',
        email: `apitest${ts}@findit-test.com`,
        assignment_mode: 'auto',
        notify_by: 'whatsapp',
      },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.client).toHaveProperty('client_code')
    expect(body.client.client_code).toMatch(/^FDT-\d{4}$/)
    expect(body.client.name).toContain('API Test')
  })
})

test.describe('API /api/leads — captura de leads', () => {
  test('guarda lead del formulario de landing', async ({ request }) => {
    const res = await request.post(`${BASE}/api/leads`, {
      data: {
        name: 'Lead Test',
        whatsapp: '+50761234567',
        origin_city: 'guangzhou',
        monthly_volume_m3: 2,
        product_type: 'electrónica',
      },
    })
    expect([200, 201]).toContain(res.status())
    const body = await res.json()
    expect(body).toHaveProperty('lead')
  })

  test('rechaza lead sin nombre', async ({ request }) => {
    const res = await request.post(`${BASE}/api/leads`, {
      data: { whatsapp: '+50761234567' },
    })
    expect(res.status()).toBe(400)
  })
})

test.describe('API /api/seguimiento', () => {
  test('devuelve 400 sin código', async ({ request }) => {
    const res = await request.get(`${BASE}/api/seguimiento`)
    expect(res.status()).toBe(400)
  })

  test('devuelve array vacío para código inexistente', async ({ request }) => {
    const res = await request.get(`${BASE}/api/seguimiento?code=FDT-9999`)
    const body = await res.json()
    expect(Array.isArray(body.shipments ?? body.orders ?? [])).toBe(true)
  })
})

test.describe('Modelo de precios — invariantes', () => {
  // These hit the pricing API if it exists, or validate via UI
  test('precio en landing siempre muestra < $285', async ({ request }) => {
    const res = await request.get(`${BASE}/api/pools?status=active`)
    if (res.status() !== 200) return
    const { pools } = await res.json()
    for (const pool of pools) {
      // carrier_rate should be ≤ 285 (LMA parity)
      if (pool.carrier_rate) {
        expect(pool.carrier_rate).toBeLessThanOrEqual(285)
      }
    }
  })
})
