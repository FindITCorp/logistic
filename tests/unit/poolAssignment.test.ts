import { describe, it, expect } from 'vitest'
import { mapJoinError } from '../../lib/poolAssignment'
import { buildShippingAddress, WAREHOUSE_CHINA } from '../../lib/clients'

// ─── mapJoinError — traducción de errores SQL a HTTP ─────────────────────────

describe('mapJoinError', () => {
  it('POOL_NOT_FOUND → 404', () => {
    const { message, status } = mapJoinError('POOL_NOT_FOUND')
    expect(status).toBe(404)
    expect(message).toMatch(/pool/i)
  })

  it('POOL_CLOSED → 400', () => {
    const { status } = mapJoinError('error: POOL_CLOSED')
    expect(status).toBe(400)
  })

  it('SHIPMENT_NOT_FOUND → 404', () => {
    const { status } = mapJoinError('SHIPMENT_NOT_FOUND')
    expect(status).toBe(404)
  })

  it('SHIPMENT_ALREADY_ASSIGNED → 409 (idempotencia)', () => {
    const { status } = mapJoinError('SHIPMENT_ALREADY_ASSIGNED')
    expect(status).toBe(409)
  })

  it('ALREADY_ASSIGNED (alias) → 409', () => {
    const { status } = mapJoinError('ALREADY_ASSIGNED')
    expect(status).toBe(409)
  })

  it('error genérico → 400 con mensaje del error', () => {
    const raw = 'Unexpected DB error'
    const { message, status } = mapJoinError(raw)
    expect(status).toBe(400)
    expect(message).toBe(raw)
  })

  it('string vacío → 400 con fallback', () => {
    const { status, message } = mapJoinError('')
    expect(status).toBe(400)
    expect(message.length).toBeGreaterThan(0)
  })
})

// ─── buildShippingAddress ─────────────────────────────────────────────────────

describe('buildShippingAddress', () => {
  const mockClient = {
    id: 'uuid-test',
    name: 'Carlos López',
    client_code: 'FDT-1234',
    whatsapp: '+507600001',
    email: 'carlos@test.com',
    assignment_mode: 'auto' as const,
    notify_by: 'whatsapp' as const,
    referral_code: 'FDT-1234',
    referred_by_code: null,
    notes: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  it('incluye nombre y código del cliente', () => {
    const addr = buildShippingAddress(mockClient as any)
    expect(addr).toContain('Carlos López')
    expect(addr).toContain('FDT-1234')
  })

  it('incluye información de la bodega en China', () => {
    const addr = buildShippingAddress(mockClient as any)
    expect(addr).toContain(WAREHOUSE_CHINA.city)
    expect(addr).toContain(WAREHOUSE_CHINA.name)
  })

  it('es una cadena multilinea', () => {
    const addr = buildShippingAddress(mockClient as any)
    expect(addr.split('\n').length).toBeGreaterThan(3)
  })
})

// ─── WAREHOUSE_CHINA — datos de bodega ───────────────────────────────────────

describe('WAREHOUSE_CHINA', () => {
  it('tiene todos los campos requeridos', () => {
    expect(WAREHOUSE_CHINA.name).toBeTruthy()
    expect(WAREHOUSE_CHINA.address).toBeTruthy()
    expect(WAREHOUSE_CHINA.city).toMatch(/Guangzhou|Guangdong/i)
    expect(WAREHOUSE_CHINA.country).toMatch(/China/i)
    expect(WAREHOUSE_CHINA.phone).toBeTruthy()
  })
})
