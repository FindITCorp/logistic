# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: api.spec.ts >> API /api/pools >> lista pools activos
- Location: tests/api.spec.ts:16:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 200
Received: 403
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | 
  3   | // API tests — run against live BASE_URL
  4   | const BASE = process.env.BASE_URL || 'https://logistic-six-alpha.vercel.app'
  5   | 
  6   | test.describe('API /api/health', () => {
  7   |   test('devuelve ok:true', async ({ request }) => {
  8   |     const res = await request.get(`${BASE}/api/health`)
  9   |     expect(res.status()).toBe(200)
  10  |     const body = await res.json()
  11  |     expect(body.ok).toBe(true)
  12  |   })
  13  | })
  14  | 
  15  | test.describe('API /api/pools', () => {
  16  |   test('lista pools activos', async ({ request }) => {
  17  |     const res = await request.get(`${BASE}/api/pools?status=active`)
> 18  |     expect(res.status()).toBe(200)
      |                          ^ Error: expect(received).toBe(expected) // Object.is equality
  19  |     const body = await res.json()
  20  |     expect(body).toHaveProperty('pools')
  21  |     expect(Array.isArray(body.pools)).toBe(true)
  22  |   })
  23  | 
  24  |   test('cada pool tiene campos requeridos', async ({ request }) => {
  25  |     const res = await request.get(`${BASE}/api/pools?status=all`)
  26  |     const { pools } = await res.json()
  27  |     for (const pool of pools.slice(0, 3)) {
  28  |       expect(pool).toHaveProperty('pool_number')
  29  |       expect(pool).toHaveProperty('origin_city')
  30  |       expect(pool).toHaveProperty('current_volume_m3')
  31  |       expect(pool).toHaveProperty('day_number')
  32  |       expect(pool).toHaveProperty('status')
  33  |       expect(pool.day_number).toBeGreaterThanOrEqual(1)
  34  |       expect(pool.day_number).toBeLessThanOrEqual(10)
  35  |     }
  36  |   })
  37  | })
  38  | 
  39  | test.describe('API /api/clients — registro', () => {
  40  |   test('rechaza nombre demasiado corto', async ({ request }) => {
  41  |     const res = await request.post(`${BASE}/api/clients`, {
  42  |       data: { name: 'A', assignment_mode: 'auto', notify_by: 'whatsapp' },
  43  |     })
  44  |     expect(res.status()).toBe(400)
  45  |   })
  46  | 
  47  |   test('rechaza email inválido', async ({ request }) => {
  48  |     const res = await request.post(`${BASE}/api/clients`, {
  49  |       data: { name: 'Test User', email: 'not-an-email', assignment_mode: 'auto', notify_by: 'email' },
  50  |     })
  51  |     expect(res.status()).toBe(400)
  52  |   })
  53  | 
  54  |   test('registra cliente nuevo exitosamente', async ({ request }) => {
  55  |     const ts = Date.now()
  56  |     const res = await request.post(`${BASE}/api/clients`, {
  57  |       data: {
  58  |         name: `API Test ${ts}`,
  59  |         whatsapp: '+50760000001',
  60  |         email: `apitest${ts}@findit-test.com`,
  61  |         assignment_mode: 'auto',
  62  |         notify_by: 'whatsapp',
  63  |       },
  64  |     })
  65  |     expect(res.status()).toBe(201)
  66  |     const body = await res.json()
  67  |     expect(body.client).toHaveProperty('client_code')
  68  |     expect(body.client.client_code).toMatch(/^FDT-\d{4}$/)
  69  |     expect(body.client.name).toContain('API Test')
  70  |   })
  71  | })
  72  | 
  73  | test.describe('API /api/leads — captura de leads', () => {
  74  |   test('guarda lead del formulario de landing', async ({ request }) => {
  75  |     const res = await request.post(`${BASE}/api/leads`, {
  76  |       data: {
  77  |         name: 'Lead Test',
  78  |         whatsapp: '+50761234567',
  79  |         origin_city: 'guangzhou',
  80  |         monthly_volume_m3: 2,
  81  |         product_type: 'electrónica',
  82  |       },
  83  |     })
  84  |     expect([200, 201]).toContain(res.status())
  85  |     const body = await res.json()
  86  |     expect(body).toHaveProperty('lead')
  87  |   })
  88  | 
  89  |   test('rechaza lead sin nombre', async ({ request }) => {
  90  |     const res = await request.post(`${BASE}/api/leads`, {
  91  |       data: { whatsapp: '+50761234567' },
  92  |     })
  93  |     expect(res.status()).toBe(400)
  94  |   })
  95  | })
  96  | 
  97  | test.describe('API /api/seguimiento', () => {
  98  |   test('devuelve 400 sin código', async ({ request }) => {
  99  |     const res = await request.get(`${BASE}/api/seguimiento`)
  100 |     expect(res.status()).toBe(400)
  101 |   })
  102 | 
  103 |   test('devuelve array vacío para código inexistente', async ({ request }) => {
  104 |     const res = await request.get(`${BASE}/api/seguimiento?code=FDT-9999`)
  105 |     const body = await res.json()
  106 |     expect(Array.isArray(body.shipments ?? body.orders ?? [])).toBe(true)
  107 |   })
  108 | })
  109 | 
  110 | test.describe('Modelo de precios — invariantes', () => {
  111 |   // These hit the pricing API if it exists, or validate via UI
  112 |   test('precio en landing siempre muestra < $285', async ({ request }) => {
  113 |     const res = await request.get(`${BASE}/api/pools?status=active`)
  114 |     if (res.status() !== 200) return
  115 |     const { pools } = await res.json()
  116 |     for (const pool of pools) {
  117 |       // carrier_rate should be ≤ 285 (LMA parity)
  118 |       if (pool.carrier_rate) {
```