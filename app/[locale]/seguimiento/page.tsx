'use client'

import { useState } from 'react'
import { Search, Package, CheckCircle, Ship, Clock, MapPin } from 'lucide-react'

interface Shipment {
  id: string
  client_code: string
  volume_m3: number
  weight_kg: number
  origin_city: string
  status: string
  price_per_m3: number | null
  arrived_at: string
  assigned_at: string | null
  pool?: {
    origin_city: string
    destination: string
    day_number: number
    status: string
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; desc: string }> = {
  received: {
    label: 'En bodega China',
    icon: Package,
    color: 'text-yellow-400',
    desc: 'Tu mercancía llegó a nuestra bodega y está siendo procesada',
  },
  assigned: {
    label: 'En pool — En tránsito pronto',
    icon: Ship,
    color: 'text-blue-400',
    desc: 'Tu carga está consolidada y esperando el próximo embarque',
  },
  shipped: {
    label: 'En camino a Panamá',
    icon: CheckCircle,
    color: 'text-emerald-400',
    desc: 'Tu carga está en alta mar. Tiempo estimado: 25-30 días',
  },
}

const CITY_LABEL: Record<string, string> = {
  shanghai: 'Shanghai',
  guangzhou: 'Guangzhou',
  shenzhen: 'Shenzhen',
}

export default function SeguimientoPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shipments, setShipments] = useState<Shipment[] | null>(null)
  const [clientName, setClientName] = useState('')

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setShipments(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/seguimiento?code=${encodeURIComponent(code.toUpperCase())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShipments(data.shipments)
      setClientName(data.client_name)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Código no encontrado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-500/10 p-2 rounded-xl">
            <MapPin className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Seguimiento</h1>
            <p className="text-gray-400 text-sm">Consulta el estado de tu mercancía</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Tu código FDT-0000"
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white font-mono uppercase placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || !code}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-5 rounded-xl transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {shipments && (
          <div>
            <p className="text-gray-400 text-sm mb-4">
              Hola <span className="text-white font-semibold">{clientName}</span> — {shipments.length === 0 ? 'Sin envíos registrados' : `${shipments.length} envío${shipments.length > 1 ? 's' : ''} activo${shipments.length > 1 ? 's' : ''}`}
            </p>

            {shipments.length === 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8 text-center">
                <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">Aún no tienes mercancía registrada.</p>
                <p className="text-gray-600 text-sm mt-1">Cuando tu paquete llegue a nuestra bodega aparecerá aquí.</p>
              </div>
            )}

            <div className="space-y-3">
              {shipments.map((s) => {
                const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.received
                const Icon = cfg.icon
                return (
                  <div key={s.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                        <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      {s.price_per_m3 && (
                        <span className="text-emerald-400 font-bold font-mono text-sm">${s.price_per_m3}/m³</span>
                      )}
                    </div>

                    <p className="text-gray-500 text-xs mb-3">{cfg.desc}</p>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-gray-800 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Origen</p>
                        <p className="text-white font-medium">{CITY_LABEL[s.origin_city] ?? s.origin_city}</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Volumen</p>
                        <p className="text-white font-medium">{s.volume_m3} m³</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Peso</p>
                        <p className="text-white font-medium">{s.weight_kg} kg</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-2">
                        <p className="text-gray-500 text-xs">Llegó a bodega</p>
                        <p className="text-white font-medium">{new Date(s.arrived_at).toLocaleDateString('es-PA')}</p>
                      </div>
                    </div>

                    {s.pool && s.status === 'assigned' && (
                      <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-400">
                        Pool día {s.pool.day_number}/10 · {CITY_LABEL[s.pool.origin_city]} → {s.pool.destination}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
