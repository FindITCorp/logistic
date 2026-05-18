'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import { Anchor, Clock, Package, Users, ChevronRight, Ship } from 'lucide-react'
import { useLocale } from 'next-intl'

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

const CITY_LABEL: Record<string, string> = {
  shanghai: 'Shanghai', guangzhou: 'Guangzhou', shenzhen: 'Shenzhen',
}

const STATUS_CONFIG = {
  active:  { label: 'Abierto',   color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  closed:  { label: 'Cerrado',   color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30'  },
  shipped: { label: 'Embarcado', color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30'      },
}

function PoolRow({ pool, locale }: { pool: Pool; locale: string }) {
  const daysLeft = 10 - pool.day_number
  const pct = Math.min(100, (pool.current_volume_m3 / 20) * 100)
  const cfg = STATUS_CONFIG[pool.status]
  const savings = 100 - pool.carrier_rate
  const prefix = locale === 'es' ? '' : `/${locale}`

  return (
    <a
      href={`${prefix}/pools/${pool.pool_number}`}
      className={`block bg-gray-900 rounded-2xl border ${cfg.bg} p-5 hover:border-opacity-80 transition-all group`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono font-bold text-white text-lg">
              Pool #{String(pool.pool_number).padStart(3, '0')}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
          </div>
          <p className="text-gray-400 text-sm">{CITY_LABEL[pool.origin_city]} → {pool.destination}</p>
        </div>
        <ChevronRight className="text-gray-600 group-hover:text-gray-400 w-5 h-5 flex-shrink-0 mt-1 transition-colors" />
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{pool.current_volume_m3.toFixed(1)} m³ acumulado</span>
          <span>máx ~20 m³</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-800 rounded-xl p-2">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
            <Users className="w-3 h-3" />
          </div>
          <p className="text-white font-bold text-sm">{pool.participants}</p>
          <p className="text-gray-600 text-xs">envíos</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-2">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
            <Clock className="w-3 h-3" />
          </div>
          <p className={`font-bold text-sm ${daysLeft <= 2 ? 'text-red-400' : daysLeft <= 4 ? 'text-yellow-400' : 'text-white'}`}>
            {pool.status === 'active' ? `${daysLeft}d` : '—'}
          </p>
          <p className="text-gray-600 text-xs">{pool.status === 'active' ? 'días rest.' : `día ${pool.day_number}`}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-2">
          <div className="flex items-center justify-center gap-1 text-gray-400 mb-0.5">
            <Package className="w-3 h-3" />
          </div>
          <p className={`font-bold text-sm ${savings > 0 ? 'text-emerald-400' : 'text-gray-400'}`}>
            {savings > 0 ? `-$${savings}` : '$0'}
          </p>
          <p className="text-gray-600 text-xs">ahorro/m³</p>
        </div>
      </div>
    </a>
  )
}

export default function PoolsPage() {
  const locale = useLocale()
  const [pools, setPools] = useState<Pool[]>([])
  const [filter, setFilter] = useState<'active' | 'closed' | 'shipped' | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/pools?status=${filter}`)
      .then(r => r.json())
      .then(d => { setPools(d.pools ?? []); setLoading(false) })
  }, [filter])

  const active  = pools.filter(p => p.status === 'active')
  const closed  = pools.filter(p => p.status === 'closed')
  const shipped = pools.filter(p => p.status === 'shipped')

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-950 px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-500/10 p-2 rounded-xl">
              <Anchor className="text-emerald-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Pools de consolidación</h1>
              <p className="text-gray-400 text-sm">Todos los pools — activos, cerrados y embarcados</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {(['all', 'active', 'closed', 'shipped'] as const).map(f => (
              <button
                key={f}
                onClick={() => { setFilter(f); setLoading(true) }}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-emerald-500 text-black'
                    : 'bg-gray-900 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Abiertos' : f === 'closed' ? 'Cerrados' : 'Embarcados'}
                {f !== 'all' && !loading && (
                  <span className="ml-1.5 opacity-60">
                    {f === 'active' ? active.length : f === 'closed' ? closed.length : shipped.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center py-20 text-gray-600">Cargando pools...</div>
          )}

          {!loading && pools.length === 0 && (
            <div className="text-center py-20">
              <Ship className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500">No hay pools en esta categoría</p>
            </div>
          )}

          {/* Active */}
          {!loading && active.length > 0 && (filter === 'all' || filter === 'active') && (
            <div className="mb-6">
              {filter === 'all' && <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Abiertos ({active.length})</p>}
              <div className="space-y-3">
                {active.map(p => <PoolRow key={p.id} pool={p} locale={locale} />)}
              </div>
            </div>
          )}

          {/* Closed */}
          {!loading && closed.length > 0 && (filter === 'all' || filter === 'closed') && (
            <div className="mb-6">
              {filter === 'all' && <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Cerrados — esperando embarque ({closed.length})</p>}
              <div className="space-y-3">
                {closed.map(p => <PoolRow key={p.id} pool={p} locale={locale} />)}
              </div>
            </div>
          )}

          {/* Shipped */}
          {!loading && shipped.length > 0 && (filter === 'all' || filter === 'shipped') && (
            <div className="mb-6">
              {filter === 'all' && <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Embarcados ({shipped.length})</p>}
              <div className="space-y-3">
                {shipped.map(p => <PoolRow key={p.id} pool={p} locale={locale} />)}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
