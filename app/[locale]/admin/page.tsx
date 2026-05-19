'use client'

import { useState, useEffect } from 'react'
import { ScanLine, CheckCircle, AlertCircle, Package, MessageCircle, PlusCircle, Truck, Users } from 'lucide-react'
import { buildWhatsAppLink, buildAssignmentMessage, buildArrivalMessage } from '@/lib/notifications'

interface Provider {
  id: string
  name: string
  contact_name: string | null
}

interface ShipmentResult {
  assigned: boolean
  client: { name: string; client_code: string; assignment_mode: string; whatsapp: string | null }
  pool?: { origin_city: string; day_number: number; current_volume_m3: number }
  price_per_m3?: number
  reason?: string
  select_url?: string
  shipment: { id: string; volume_m3: number; weight_kg: number }
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'arrival' | 'pool'>('arrival')
  const [providers, setProviders] = useState<Provider[]>([])

  const [form, setForm] = useState({
    client_code: '',
    weight_kg: '',
    volume_m3: '',
    origin_city: 'guangzhou' as 'shanghai' | 'guangzhou' | 'shenzhen',
    supplier_tracking: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ShipmentResult | null>(null)

  const [poolForm, setPoolForm] = useState({
    origin_city: 'guangzhou' as 'shanghai' | 'guangzhou' | 'shenzhen',
    provider_id: '',
    reference_price_m3: '100',
    departure_date: '',
  })
  const [poolLoading, setPoolLoading] = useState(false)
  const [poolError, setPoolError] = useState('')
  const [poolCreated, setPoolCreated] = useState<{ pool_number: number; origin_city: string } | null>(null)

  useEffect(() => {
    fetch('/api/providers').then(r => r.json()).then(d => setProviders(d.providers ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_code: form.client_code.toUpperCase(),
          weight_kg: parseFloat(form.weight_kg),
          volume_m3: parseFloat(form.volume_m3),
          origin_city: form.origin_city,
          supplier_tracking: form.supplier_tracking || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setForm({ client_code: '', weight_kg: '', volume_m3: '', origin_city: 'guangzhou', supplier_tracking: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreatePool(e: React.FormEvent) {
    e.preventDefault()
    setPoolError('')
    setPoolCreated(null)
    setPoolLoading(true)
    try {
      const res = await fetch('/api/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_city: poolForm.origin_city,
          provider_id: poolForm.provider_id || undefined,
          reference_price_m3: parseFloat(poolForm.reference_price_m3),
          departure_date: poolForm.departure_date || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPoolCreated({ pool_number: data.pool.pool_number, origin_city: data.pool.origin_city })
      setPoolForm({ origin_city: 'guangzhou', provider_id: '', reference_price_m3: '100', departure_date: '' })
    } catch (err: unknown) {
      setPoolError(err instanceof Error ? err.message : 'Error al crear pool')
    } finally {
      setPoolLoading(false)
    }
  }

  const cityLabel: Record<string, string> = {
    shanghai: 'Shanghai',
    guangzhou: 'Guangzhou',
    shenzhen: 'Shenzhen',
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-500/10 p-2 rounded-xl">
            <ScanLine className="text-blue-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Panel Operador</h1>
            <p className="text-gray-400 text-sm">Gestión de operaciones FINDIT</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <a href="/admin/pools" className="flex items-center gap-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors">
            <Package className="w-3.5 h-3.5" /> Gestión de pools
          </a>
          <a href="/admin/leads" className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors">
            <Users className="w-3.5 h-3.5" /> Leads
          </a>
          <a href="/admin/proveedores" className="flex items-center gap-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 px-3 py-1.5 text-xs font-medium text-purple-400 transition-colors">
            <Truck className="w-3.5 h-3.5" /> Proveedores
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('arrival')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'arrival' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            <Package className="w-4 h-4" />
            Registrar llegada
          </button>
          <button
            onClick={() => setActiveTab('pool')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === 'pool' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            <PlusCircle className="w-4 h-4" />
            Crear pool
          </button>
        </div>

        {activeTab === 'pool' && (
          <div className="mb-6">
            <form onSubmit={handleCreatePool} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
              <h2 className="text-white font-bold text-lg">Nuevo pool de consolidación</h2>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Ciudad de origen *</label>
                <select
                  value={poolForm.origin_city}
                  onChange={(e) => setPoolForm({ ...poolForm, origin_city: e.target.value as typeof poolForm.origin_city })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="guangzhou">Guangzhou</option>
                  <option value="shanghai">Shanghai</option>
                  <option value="shenzhen">Shenzhen</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Proveedor logístico</label>
                <select
                  value={poolForm.provider_id}
                  onChange={(e) => setPoolForm({ ...poolForm, provider_id: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value="">— Sin asignar (tarifas por defecto) —</option>
                  {providers.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.contact_name ? ` (${p.contact_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Precio referencia ($/m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={poolForm.reference_price_m3}
                    onChange={(e) => setPoolForm({ ...poolForm, reference_price_m3: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    placeholder="100.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Fecha de salida</label>
                  <input
                    type="date"
                    value={poolForm.departure_date}
                    onChange={(e) => setPoolForm({ ...poolForm, departure_date: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {poolError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {poolError}
                </div>
              )}

              {poolCreated && (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Pool #{String(poolCreated.pool_number).padStart(3, '0')} creado — {cityLabel[poolCreated.origin_city]} → Colón
                </div>
              )}

              <button
                type="submit"
                disabled={poolLoading}
                className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Truck className="w-4 h-4" />
                {poolLoading ? 'Creando...' : 'Crear pool'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'arrival' && (<>
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Código de cliente *</label>
            <input
              type="text"
              required
              value={form.client_code}
              onChange={(e) => setForm({ ...form, client_code: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono uppercase"
              placeholder="FDT-0000"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Peso (kg) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={form.weight_kg}
                onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="12.5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Volumen (m³) *</label>
              <input
                type="number"
                step="0.001"
                required
                value={form.volume_m3}
                onChange={(e) => setForm({ ...form, volume_m3: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                placeholder="0.250"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tracking del proveedor</label>
            <input
              type="text"
              value={form.supplier_tracking}
              onChange={(e) => setForm({ ...form, supplier_tracking: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
              placeholder="LY123456789CN (opcional, vincula al pedido pre-registrado)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Ciudad de origen *</label>
            <select
              value={form.origin_city}
              onChange={(e) => setForm({ ...form, origin_city: e.target.value as typeof form.origin_city })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 text-sm"
            >
              <option value="guangzhou">Guangzhou</option>
              <option value="shanghai">Shanghai</option>
              <option value="shenzhen">Shenzhen</option>
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Procesando...' : 'Registrar llegada'}
          </button>
        </form>

        {result && (
          <div className={`rounded-2xl border p-6 ${result.assigned ? 'bg-green-500/5 border-green-500/30' : 'bg-yellow-500/5 border-yellow-500/30'}`}>
            <div className="flex items-center gap-3 mb-4">
              {result.assigned
                ? <CheckCircle className="text-green-400 w-6 h-6" />
                : <Package className="text-yellow-400 w-6 h-6" />
              }
              <div>
                <p className="font-bold text-white">
                  {result.assigned ? 'Asignado automáticamente' : 'Esperando selección del cliente'}
                </p>
                <p className="text-sm text-gray-400">{result.client.name} — {result.client.client_code}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-300">
                <span>Volumen registrado</span>
                <span className="font-mono text-white">{result.shipment.volume_m3} m³</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Peso</span>
                <span className="font-mono text-white">{result.shipment.weight_kg} kg</span>
              </div>

              {result.assigned && result.pool && (
                <>
                  <div className="flex justify-between text-gray-300">
                    <span>Pool asignado</span>
                    <span className="font-mono text-white capitalize">{cityLabel[result.pool.origin_city]} — Colón</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Precio confirmado</span>
                    <span className="font-mono text-emerald-400 font-bold">${result.price_per_m3}/m³</span>
                  </div>
                  <p className="text-gray-500 text-xs mt-2">{result.reason}</p>
                </>
              )}

              {!result.assigned && result.select_url && (
                <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                  <p className="text-yellow-400 text-xs font-medium mb-1">Link para que el cliente elija su pool:</p>
                  <p className="font-mono text-white text-xs break-all">{`${process.env.NEXT_PUBLIC_SITE_URL || ''}${result.select_url}`}</p>
                </div>
              )}

              {result.client.whatsapp && (
                <a
                  href={buildWhatsAppLink(
                    result.client.whatsapp,
                    result.assigned && result.pool && result.price_per_m3
                      ? buildAssignmentMessage({
                          clientName: result.client.name,
                          clientCode: result.client.client_code,
                          originCity: result.pool.origin_city,
                          poolDay: result.pool.day_number,
                          pricePerM3: result.price_per_m3,
                          volumeM3: result.shipment.volume_m3,
                        })
                      : buildArrivalMessage({
                          clientName: result.client.name,
                          clientCode: result.client.client_code,
                          originCity: result.pool?.origin_city ?? 'guangzhou',
                          volumeM3: result.shipment.volume_m3,
                          selectUrl: `${process.env.NEXT_PUBLIC_SITE_URL || ''}${result.select_url ?? ''}`,
                        })
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Notificar por WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
        </>)}
      </div>
    </div>
  )
}
