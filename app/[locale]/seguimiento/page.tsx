'use client'

import { useState } from 'react'
import { Search, Package, Layers, Ship, Anchor, ShieldCheck, CheckCircle2, Clock, MapPin, TrendingDown } from 'lucide-react'

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
    pool_number: number
    origin_city: string
    destination: string
    day_number: number
    status: string
    dispatched_at?: string | null
    arrived_colon_at?: string | null
    arrived_tocumen_at?: string | null
    completed_at?: string | null
  } | null
}

const STEPS = [
  {
    key: 'received',
    label: 'En bodega China',
    sub: 'Mercancía recibida y procesada',
    icon: Package,
  },
  {
    key: 'assigned',
    label: 'Consolidado en pool',
    sub: 'Carga asignada, esperando zarpe',
    icon: Layers,
  },
  {
    key: 'in_transit',
    label: 'Barco zarpó',
    sub: '~35 días de tránsito marítimo',
    icon: Ship,
  },
  {
    key: 'at_colon',
    label: 'Puerto de Colón',
    sub: 'Llegó a Panamá, coordinando despacho',
    icon: Anchor,
  },
  {
    key: 'at_tocumen',
    label: 'Aduana Tocumen',
    sub: 'Proceso de liberación aduanal',
    icon: ShieldCheck,
  },
  {
    key: 'delivered',
    label: 'Listo para retirar',
    sub: 'Tu carga está disponible',
    icon: CheckCircle2,
  },
] as const

type StepKey = typeof STEPS[number]['key']

const STATUS_ORDER: StepKey[] = ['received', 'assigned', 'in_transit', 'at_colon', 'at_tocumen', 'delivered']

const CITY_LABEL: Record<string, string> = {
  shanghai: 'Shanghai', guangzhou: 'Guangzhou', shenzhen: 'Shenzhen',
}

// ETA acumulado a partir del paso actual (días estimados)
const ETA_FROM_STEP: Record<StepKey, number> = {
  received: 50, assigned: 45, in_transit: 35, at_colon: 8, at_tocumen: 3, delivered: 0,
}

function currentStepIndex(status: string): number {
  const idx = STATUS_ORDER.indexOf(status as StepKey)
  return idx >= 0 ? idx : 0
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
      const res = await fetch(`/api/seguimiento?code=${encodeURIComponent(code.trim().toUpperCase())}`)
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
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl">
            <MapPin className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Seguimiento de carga</h1>
            <p className="text-gray-400 text-sm">China → Panamá · Actualizado en tiempo real</p>
          </div>
        </div>

        {/* Buscador */}
        <form onSubmit={handleSearch} className="flex gap-2 mb-8">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Tu código FDT-0000"
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white font-mono uppercase placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-5 rounded-xl transition-colors flex items-center gap-2"
          >
            {loading
              ? <Clock className="w-5 h-5 animate-spin" />
              : <Search className="w-5 h-5" />}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-6">
            {error}
          </div>
        )}

        {shipments && (
          <div>
            <p className="text-gray-400 text-sm mb-6">
              Hola <span className="text-white font-semibold">{clientName}</span>
              {' — '}
              {shipments.length === 0
                ? 'Sin envíos registrados'
                : `${shipments.length} envío${shipments.length > 1 ? 's' : ''}`}
            </p>

            {shipments.length === 0 && (
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-10 text-center">
                <Clock className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400">Aún no tienes mercancía registrada.</p>
                <p className="text-gray-600 text-sm mt-1">
                  Cuando tu paquete llegue a nuestra bodega en China aparecerá aquí.
                </p>
              </div>
            )}

            <div className="space-y-6">
              {shipments.map((s) => (
                <ShipmentCard key={s.id} shipment={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ShipmentCard({ shipment: s }: { shipment: Shipment }) {
  const stepIdx = currentStepIndex(s.status)
  const eta = ETA_FROM_STEP[s.status as StepKey] ?? 0
  const ahorroTotal = s.price_per_m3 ? (420 - s.price_per_m3) * s.volume_m3 : null

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">

      {/* Top bar: volumen + precio + ETA */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div>
          <p className="text-white font-bold">
            {s.volume_m3} m³ · {CITY_LABEL[s.origin_city] ?? s.origin_city} → Colón
          </p>
          <p className="text-gray-500 text-xs">
            {s.weight_kg} kg · llegó {new Date(s.arrived_at).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <div className="text-right">
          {s.price_per_m3 ? (
            <>
              <p className="text-emerald-400 font-bold font-mono">${s.price_per_m3}/m³</p>
              {eta > 0 && (
                <p className="text-gray-500 text-xs">~{eta} días restantes</p>
              )}
            </>
          ) : (
            <p className="text-gray-600 text-xs">Precio por confirmar</p>
          )}
        </div>
      </div>

      {/* Timeline visual */}
      <div className="px-5 py-5">
        <div className="relative">
          {/* Línea vertical de fondo */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-800" />
          {/* Línea de progreso */}
          <div
            className="absolute left-4 top-0 w-px bg-emerald-500 transition-all duration-700"
            style={{ height: `${(stepIdx / (STEPS.length - 1)) * 100}%` }}
          />

          <div className="space-y-0">
            {STEPS.map((step, idx) => {
              const done = idx < stepIdx
              const active = idx === stepIdx
              const Icon = step.icon
              return (
                <div key={step.key} className="relative flex items-start gap-4 pb-5 last:pb-0">
                  {/* Nodo */}
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 transition-all ${
                    done
                      ? 'bg-emerald-500 border-emerald-500'
                      : active
                        ? 'bg-gray-900 border-emerald-400 ring-4 ring-emerald-500/20'
                        : 'bg-gray-900 border-gray-700'
                  }`}>
                    <Icon className={`w-3.5 h-3.5 ${
                      done ? 'text-white' : active ? 'text-emerald-400' : 'text-gray-600'
                    }`} />
                  </div>

                  {/* Texto */}
                  <div className="pt-0.5">
                    <p className={`text-sm font-semibold ${
                      done ? 'text-gray-400' : active ? 'text-white' : 'text-gray-600'
                    }`}>
                      {step.label}
                      {active && (
                        <span className="ml-2 inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                          Ahora
                        </span>
                      )}
                    </p>
                    <p className={`text-xs mt-0.5 ${
                      active ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {step.sub}
                    </p>
                    {/* Datos del pool si está asignado */}
                    {step.key === 'assigned' && s.pool && (active || done) && (
                      <p className="text-xs text-blue-400 mt-0.5">
                        Pool #{s.pool.pool_number} · Día {s.pool.day_number}/10
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Ahorro vs casillero */}
      {ahorroTotal !== null && ahorroTotal > 0 && (
        <div className="mx-5 mb-5 bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
          <TrendingDown className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="text-emerald-300 text-xs font-semibold">
              Ahorraste ${ahorroTotal.toFixed(0)} vs casillero
            </p>
            <p className="text-emerald-500/70 text-xs">
              ${s.price_per_m3}/m³ FINDIT vs $420/m³ casillero · {s.volume_m3} m³
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
