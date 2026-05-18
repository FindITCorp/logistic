'use client'

import { useState } from 'react'
import { ScanLine, CheckCircle, AlertCircle, Package } from 'lucide-react'

interface ShipmentResult {
  assigned: boolean
  client: { name: string; client_code: string; assignment_mode: string }
  pool?: { origin_city: string; day_number: number; current_volume_m3: number }
  price_per_m3?: number
  reason?: string
  select_url?: string
  shipment: { id: string; volume_m3: number; weight_kg: number }
}

export default function AdminPage() {
  const [form, setForm] = useState({
    client_code: '',
    weight_kg: '',
    volume_m3: '',
    origin_city: 'guangzhou' as 'shanghai' | 'guangzhou' | 'shenzhen',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ShipmentResult | null>(null)

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
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setForm({ client_code: '', weight_kg: '', volume_m3: '', origin_city: 'guangzhou' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
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
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-500/10 p-2 rounded-xl">
            <ScanLine className="text-blue-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Panel Operador</h1>
            <p className="text-gray-400 text-sm">Registrar llegada de mercancía a bodega</p>
          </div>
        </div>

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
                  <p className="text-yellow-400 text-xs font-medium mb-1">Link enviado al cliente para que elija su pool:</p>
                  <p className="font-mono text-white text-xs break-all">{`${process.env.NEXT_PUBLIC_SITE_URL || 'https://tu-sitio.vercel.app'}${result.select_url}`}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
