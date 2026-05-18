'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Header from '@/components/Header'
import {
  Anchor, Clock, Package, Users, ArrowLeft,
  CheckCircle, Ship, Lock, DollarSign
} from 'lucide-react'

interface Pool {
  id: string
  pool_number: number
  origin_city: string
  destination: string
  current_volume_m3: number
  participants: number
  day_number: number
  status: 'active' | 'closed' | 'shipped'
  carrier_rate: number
  created_at: string
}

interface Member {
  id: string
  volume_m3: number
  price_per_m3: number
  joined_at: string
  client: { name: string; client_code: string }
  shipment: { volume_m3: number; weight_kg: number; origin_city: string; arrived_at: string }
}

const CITY_LABEL: Record<string, string> = {
  shanghai: 'Shanghai', guangzhou: 'Guangzhou', shenzhen: 'Shenzhen',
}

const STATUS_CONFIG = {
  active:  { label: 'Abierto — recibiendo carga',  icon: Anchor,       color: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  closed:  { label: 'Cerrado — listo para embarque', icon: Lock,        color: 'text-yellow-400',  ring: 'ring-yellow-500/30'  },
  shipped: { label: 'Embarcado — en alta mar',       icon: Ship,        color: 'text-blue-400',    ring: 'ring-blue-500/30'    },
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PoolDetailPage() {
  const params = useParams()
  const poolNumber = params.pool_number as string

  const [pool, setPool] = useState<Pool | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  async function load() {
    try {
      const res = await fetch(`/api/pools/${poolNumber}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPool(data.pool)
      setMembers(data.members)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [poolNumber])

  async function updateStatus(newStatus: 'closed' | 'shipped') {
    if (!pool) return
    setUpdating(true)
    const res = await fetch('/api/pools', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pool_id: pool.id, status: newStatus }),
    })
    if (res.ok) await load()
    setUpdating(false)
  }

  if (loading) return (
    <><Header /><div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-600">Cargando pool...</div></>
  )
  if (error || !pool) return (
    <><Header /><div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">{error}</div></>
  )

  const cfg = STATUS_CONFIG[pool.status]
  const StatusIcon = cfg.icon
  const daysLeft = Math.max(0, 10 - pool.day_number)
  const pct = Math.min(100, (pool.current_volume_m3 / 20) * 100)
  const savings = 100 - pool.carrier_rate
  const totalRevenue = members.reduce((s, m) => s + (m.price_per_m3 - pool.carrier_rate) * m.volume_m3, 0)

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-950 px-4 py-10">
        <div className="max-w-2xl mx-auto">

          {/* Back */}
          <a href="../pools" className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Todos los pools
          </a>

          {/* Pool header */}
          <div className={`bg-gray-900 rounded-2xl ring-1 ${cfg.ring} p-6 mb-4`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                  <h1 className="text-2xl font-mono font-bold text-white">
                    Pool #{String(pool.pool_number).padStart(3, '0')}
                  </h1>
                </div>
                <p className="text-gray-400">{CITY_LABEL[pool.origin_city]} → {pool.destination}</p>
                <p className={`text-sm font-medium mt-1 ${cfg.color}`}>{cfg.label}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">Creado</p>
                <p className="text-gray-300 text-sm">{new Date(pool.created_at).toLocaleDateString('es-PA')}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>{pool.current_volume_m3.toFixed(2)} m³ consolidado</span>
                <span>capacidad ~20 m³</span>
              </div>
              <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <Users className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <p className="text-white font-bold">{pool.participants}</p>
                <p className="text-gray-600 text-xs">envíos</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <p className={`font-bold ${daysLeft <= 2 ? 'text-red-400' : daysLeft <= 4 ? 'text-yellow-400' : 'text-white'}`}>
                  {pool.status === 'active' ? `${daysLeft}d` : `D${pool.day_number}`}
                </p>
                <p className="text-gray-600 text-xs">{pool.status === 'active' ? 'días rest.' : 'día cierre'}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <Package className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <p className={`font-bold ${savings > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {savings > 0 ? `-$${savings}` : '$0'}
                </p>
                <p className="text-gray-600 text-xs">ahorro/m³</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 text-center">
                <DollarSign className="w-4 h-4 text-gray-500 mx-auto mb-1" />
                <p className="text-emerald-400 font-bold">${totalRevenue.toFixed(0)}</p>
                <p className="text-gray-600 text-xs">margen</p>
              </div>
            </div>

            {/* Admin actions */}
            {pool.status === 'active' && (
              <button
                onClick={() => updateStatus('closed')}
                disabled={updating}
                className="mt-4 w-full py-2.5 rounded-xl border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {updating ? 'Cerrando...' : '🔒 Cerrar pool (no acepta más carga)'}
              </button>
            )}
            {pool.status === 'closed' && (
              <button
                onClick={() => updateStatus('shipped')}
                disabled={updating}
                className="mt-4 w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-sm font-bold transition-colors disabled:opacity-50"
              >
                {updating ? 'Procesando...' : '🚢 Marcar como embarcado — barco zarpó'}
              </button>
            )}
            {pool.status === 'shipped' && (
              <div className="mt-4 flex items-center justify-center gap-2 text-blue-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Embarcado — todos los clientes notificados
              </div>
            )}
          </div>

          {/* Package list */}
          <div>
            <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">
              Paquetes en este pool ({members.length})
            </p>
            {members.length === 0 && (
              <div className="text-center py-10 text-gray-700">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Sin paquetes aún</p>
              </div>
            )}
            <div className="space-y-2">
              {members.map((m, idx) => (
                <div key={m.id} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600 text-sm font-mono w-6">#{idx + 1}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{m.client.name}</p>
                        <p className="text-gray-500 text-xs font-mono">{m.client.client_code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-mono text-sm">{m.volume_m3.toFixed(3)} m³</p>
                      <p className="text-emerald-400 text-xs font-bold">${m.price_per_m3}/m³</p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-600">
                    <span>Peso: {m.shipment?.weight_kg} kg</span>
                    <span>Llegó: {m.shipment?.arrived_at ? new Date(m.shipment.arrived_at).toLocaleDateString('es-PA') : '—'}</span>
                    <span>Unido: {fmt(m.joined_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {members.length > 0 && (
              <div className="mt-3 bg-gray-900 rounded-xl border border-gray-800 p-4 flex justify-between text-sm">
                <span className="text-gray-400">Total consolidado</span>
                <span className="text-white font-bold font-mono">{pool.current_volume_m3.toFixed(3)} m³ · {pool.participants} envíos</span>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
