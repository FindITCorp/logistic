'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Truck, ArrowRight, ChevronRight, AlertCircle, CheckCircle2, Clock, Ship, MapPin, Warehouse } from 'lucide-react'
import type { Pool, PoolStatus } from '@/lib/supabase/database.types'

const STATUS_CONFIG: Record<PoolStatus, { label: string; color: string; icon: typeof Clock; next: string | null }> = {
  active:     { label: 'Activo',         color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',    icon: Clock,        next: 'Cerrar pool' },
  closed:     { label: 'Cerrado',        color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',  icon: Package,      next: 'Marcar despachado' },
  in_transit: { label: 'En tránsito',    color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: Ship,      next: 'Llegó a Colón' },
  at_colon:   { label: 'En Colón',       color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: MapPin,    next: 'Trasladar a Tocumen' },
  at_tocumen: { label: 'En Tocumen',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: Warehouse, next: 'Completar pool' },
  completed:  { label: 'Completado',     color: 'bg-gray-500/15 text-gray-400 border-gray-500/30',    icon: CheckCircle2, next: null },
}

const CITY: Record<string, string> = { guangzhou: 'GZH', shanghai: 'SHA', shenzhen: 'SZX' }
const STATUS_ORDER: PoolStatus[] = ['active', 'closed', 'in_transit', 'at_colon', 'at_tocumen', 'completed']

function PoolCard({ pool, onAdvance }: { pool: Pool; onAdvance: (pool: Pool) => void }) {
  const cfg = STATUS_CONFIG[pool.status]
  const Icon = cfg.icon
  const pct = Math.min(100, Math.round((pool.current_volume_m3 / 20) * 100))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="text-xs font-mono text-gray-500">Pool #{String(pool.pool_number).padStart(3, '0')}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-white font-semibold">{CITY[pool.origin_city] ?? pool.origin_city} → Colón</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          </div>
        </div>
        <a
          href={`/admin/pools/${pool.pool_number}`}
          className="text-gray-500 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </a>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
        <span><span className="text-white font-medium">{pool.current_volume_m3.toFixed(1)}</span> m³</span>
        <span><span className="text-white font-medium">{pool.participants}</span> clientes</span>
        <span>Día <span className="text-white font-medium">{pool.day_number}</span></span>
      </div>

      <div className="mb-3">
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1">{pool.current_volume_m3.toFixed(1)} / 20 m³ (estimado cierre)</p>
      </div>

      {cfg.next && (
        <button
          onClick={() => onAdvance(pool)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-2 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          {cfg.next}
        </button>
      )}
    </div>
  )
}

export default function AdminPoolsPage() {
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [activeFilter, setActiveFilter] = useState<PoolStatus | 'all'>('all')

  const load = useCallback(async () => {
    const res = await fetch('/api/pools?status=all')
    const data = await res.json()
    setPools(data.pools ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function advance(pool: Pool) {
    setAdvancing(pool.id)
    setError('')
    try {
      const res = await fetch(`/api/pools/${pool.pool_number}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'advance' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    } finally {
      setAdvancing(null)
    }
  }

  const filtered = activeFilter === 'all' ? pools : pools.filter(p => p.status === activeFilter)
  const counts = pools.reduce((acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Pools de consolidación</h1>
            <p className="text-gray-400 text-sm mt-0.5">{pools.length} pools en total</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin" className="text-gray-400 hover:text-white text-sm px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
              ← Panel
            </a>
          </div>
        </div>

        {/* Status filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeFilter === 'all' ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
          >
            Todos ({pools.length})
          </button>
          {STATUS_ORDER.map(s => {
            const cfg = STATUS_CONFIG[s]
            if (!counts[s]) return null
            return (
              <button
                key={s}
                onClick={() => setActiveFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${activeFilter === s ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                {cfg.label} ({counts[s]})
              </button>
            )
          })}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <div className="text-center text-gray-500 py-20">Cargando pools...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-600 py-20">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay pools en este estado</p>
          </div>
        ) : (
          <div className={`grid gap-4 ${filtered.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {filtered.map(pool => (
              <div key={pool.id} className={advancing === pool.id ? 'opacity-50 pointer-events-none' : ''}>
                <PoolCard pool={pool} onAdvance={advance} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
