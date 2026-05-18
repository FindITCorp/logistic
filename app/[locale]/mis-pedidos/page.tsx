'use client'

'use client'

import { useState } from 'react'
import {
  ShoppingCart, Truck, Warehouse, Anchor, Ship,
  ClipboardCheck, Gift, CheckCircle2, Plus, ChevronDown,
  ChevronUp, Package, DollarSign, Hash, Loader2
} from 'lucide-react'

type OrderStatus =
  | 'ordered'
  | 'in_transit_to_warehouse'
  | 'at_warehouse'
  | 'in_pool'
  | 'in_transit_to_panama'
  | 'at_customs'
  | 'ready_for_pickup'
  | 'delivered'

interface Order {
  id: string
  client_code: string
  product_description: string
  supplier_name: string | null
  supplier_tracking: string | null
  origin_city: string
  declared_value_usd: number | null
  estimated_weight_kg: number | null
  estimated_volume_m3: number | null
  status: OrderStatus
  price_per_m3: number | null
  ordered_at: string
  shipped_by_supplier_at: string | null
  arrived_warehouse_at: string | null
  assigned_pool_at: string | null
  shipped_to_panama_at: string | null
  arrived_customs_at: string | null
  ready_pickup_at: string | null
  delivered_at: string | null
  pool?: {
    pool_number: number
    origin_city: string
    destination: string
    day_number: number
    current_volume_m3: number
    carrier_rate: number
  } | null
}

interface AvailablePool {
  id: string
  pool_number: number
  origin_city: string
  destination: string
  current_volume_m3: number
  day_number: number
  carrier_rate: number
  estimatedPrice: number
}

const STATUSES: { key: OrderStatus; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'ordered',                  label: 'Pedido registrado',          icon: ShoppingCart,   desc: 'Esperando que el proveedor despache' },
  { key: 'in_transit_to_warehouse',  label: 'En tránsito a bodega',       icon: Truck,          desc: 'El proveedor despachó, en camino a nuestra bodega en China' },
  { key: 'at_warehouse',             label: 'En bodega China',            icon: Warehouse,      desc: 'Llegó a FINDIT Logistics China, procesando' },
  { key: 'in_pool',                  label: 'En pool de consolidación',   icon: Anchor,         desc: 'Consolidado con otras cargas, esperando embarque' },
  { key: 'in_transit_to_panama',     label: 'En tránsito a Panamá',       icon: Ship,           desc: 'Barco en alta mar — aprox. 25-30 días' },
  { key: 'at_customs',               label: 'En aduana Panamá',           icon: ClipboardCheck, desc: 'Proceso de importación en Colón' },
  { key: 'ready_for_pickup',         label: 'Listo para retiro',          icon: Gift,           desc: 'Tu mercancía está disponible en bodega Panamá' },
  { key: 'delivered',                label: 'Entregado',                  icon: CheckCircle2,   desc: 'Entregado al cliente' },
]

const STATUS_INDEX: Record<OrderStatus, number> = Object.fromEntries(
  STATUSES.map((s, i) => [s.key, i])
) as Record<OrderStatus, number>

const CITY_LABEL: Record<string, string> = {
  shanghai: 'Shanghai', guangzhou: 'Guangzhou', shenzhen: 'Shenzhen',
}

const STATUS_TIMESTAMP: Partial<Record<OrderStatus, keyof Order>> = {
  ordered:                 'ordered_at',
  in_transit_to_warehouse: 'shipped_by_supplier_at',
  at_warehouse:            'arrived_warehouse_at',
  in_pool:                 'assigned_pool_at',
  in_transit_to_panama:    'shipped_to_panama_at',
  at_customs:              'arrived_customs_at',
  ready_for_pickup:        'ready_pickup_at',
  delivered:               'delivered_at',
}

function fmt(date: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', year: 'numeric' })
}

function PoolSelector({ order, onJoined }: { order: Order; onJoined: () => void }) {
  const [pools, setPools] = useState<AvailablePool[]>([])
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function loadPools() {
    setOpen(true)
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pools')
      const data = await res.json()
      const vol = order.estimated_volume_m3 ?? 0.5
      const filtered = (data.pools as AvailablePool[])
        .filter((p) => p.origin_city === order.origin_city)
        .map((p) => {
          const after = p.current_volume_m3 + vol
          // simple price estimate: tiers
          const rate = after > 20 ? 80 : after > 15 ? 85 : after > 5 ? 90 : 100
          const savings = 100 - rate
          const dayPct = Math.max(10, 100 - p.day_number * 10)
          const price = 100 - savings * (dayPct / 100)
          return { ...p, estimatedPrice: price }
        })
        .sort((a, b) => a.estimatedPrice - b.estimatedPrice)
      setPools(filtered)
    } catch {
      setError('No se pudieron cargar los pools')
    } finally {
      setLoading(false)
    }
  }

  async function joinPool(poolId: string) {
    setJoining(poolId)
    setError('')
    try {
      const res = await fetch(`/api/orders/${order.id}/join-pool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_id: poolId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      onJoined()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setJoining(null)
    }
  }

  if (!open) {
    return (
      <button
        onClick={loadPools}
        className="mt-3 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl text-sm transition-colors"
      >
        <Anchor className="w-4 h-4" /> Unirme a un pool
      </button>
    )
  }

  return (
    <div className="mt-3 bg-gray-800 rounded-xl p-4">
      <p className="text-white font-semibold text-sm mb-3">Pools disponibles — {CITY_LABEL[order.origin_city]}</p>
      {loading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>}
      {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
      {pools.length === 0 && !loading && (
        <p className="text-gray-500 text-sm text-center py-2">No hay pools activos para {CITY_LABEL[order.origin_city]}</p>
      )}
      <div className="space-y-2">
        {pools.map((pool, idx) => (
          <div key={pool.id} className={`rounded-xl p-3 border ${idx === 0 ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-gray-700 bg-gray-900'}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                {idx === 0 && <span className="text-xs text-emerald-400 font-bold">Mejor descuento · </span>}
                <span className="text-white font-mono font-bold text-sm">Pool #{String(pool.pool_number).padStart(3, '0')}</span>
                <span className="text-gray-500 text-xs ml-2">Día {pool.day_number}/10 · {pool.current_volume_m3.toFixed(1)} m³</span>
              </div>
              <span className="text-emerald-400 font-bold font-mono">${pool.estimatedPrice.toFixed(2)}/m³</span>
            </div>
            <button
              onClick={() => joinPool(pool.id)}
              disabled={joining === pool.id}
              className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs transition-colors"
            >
              {joining === pool.id ? 'Uniéndome...' : `Unirme al Pool #${String(pool.pool_number).padStart(3, '0')}`}
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => setOpen(false)} className="mt-2 w-full text-gray-600 text-xs hover:text-gray-400">Cancelar</button>
    </div>
  )
}

function OrderCard({ order, onRefresh }: { order: Order; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const currentIdx = STATUS_INDEX[order.status]
  const currentStatus = STATUSES[currentIdx]
  const Icon = currentStatus.icon

  const totalEstimated = order.price_per_m3 && order.estimated_volume_m3
    ? (order.price_per_m3 * order.estimated_volume_m3).toFixed(2)
    : null

  return (
    <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold truncate">{order.product_description}</p>
            <p className="text-gray-500 text-xs mt-0.5">
              {order.supplier_name && `${order.supplier_name} · `}
              {CITY_LABEL[order.origin_city]}
              {order.supplier_tracking && ` · ${order.supplier_tracking}`}
            </p>
          </div>
          {order.price_per_m3 && (
            <div className="text-right flex-shrink-0">
              <p className="text-emerald-400 font-bold font-mono">${order.price_per_m3}/m³</p>
              {totalEstimated && <p className="text-gray-500 text-xs">≈ ${totalEstimated} total</p>}
            </div>
          )}
        </div>

        {/* Current status pill */}
        <div className="flex items-center gap-2 mt-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium
            ${order.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' :
              order.status === 'ready_for_pickup' ? 'bg-green-500/20 text-green-400' :
              order.status === 'in_pool' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-800 text-gray-300'}`}>
            <Icon className="w-3.5 h-3.5" />
            {currentStatus.label}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto text-gray-600 hover:text-gray-400"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Pool number badge — always visible when in pool */}
        {order.status === 'in_pool' && order.pool && (
          <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-bold text-sm">
                  Pool #{String(order.pool.pool_number).padStart(3, '0')}
                </span>
              </div>
              <span className="text-emerald-400 font-bold font-mono text-sm">${order.price_per_m3}/m³</span>
            </div>
            <div className="flex gap-3 mt-1 text-gray-500 text-xs">
              <span>Día {order.pool.day_number}/10</span>
              <span>{order.pool.current_volume_m3.toFixed(1)} m³ acumulado</span>
              <span>{CITY_LABEL[order.pool.origin_city]} → {order.pool.destination}</span>
            </div>
          </div>
        )}

        {/* Manual pool selection when at warehouse */}
        {order.status === 'at_warehouse' && (
          <PoolSelector order={order} onJoined={onRefresh} />
        )}
      </div>

      {/* Timeline expandible */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4">
          <div className="relative">
            {STATUSES.map((step, idx) => {
              const isPast = idx < currentIdx
              const isCurrent = idx === currentIdx
              const isFuture = idx > currentIdx
              const StepIcon = step.icon
              const tsKey = STATUS_TIMESTAMP[step.key]
              const ts = tsKey ? fmt(order[tsKey] as string | null) : null

              return (
                <div key={step.key} className="flex gap-3 pb-5 last:pb-0 relative">
                  {/* Vertical line */}
                  {idx < STATUSES.length - 1 && (
                    <div className={`absolute left-3.5 top-7 w-0.5 h-full -translate-x-1/2
                      ${isPast ? 'bg-emerald-500' : 'bg-gray-800'}`} />
                  )}

                  {/* Icon */}
                  <div className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                    ${isPast ? 'bg-emerald-500 text-black' :
                      isCurrent ? 'bg-blue-500 text-white ring-4 ring-blue-500/20' :
                      'bg-gray-800 text-gray-600'}`}>
                    <StepIcon className="w-3.5 h-3.5" />
                  </div>

                  {/* Text */}
                  <div className="flex-1 pt-0.5">
                    <p className={`text-sm font-medium ${isFuture ? 'text-gray-600' : 'text-white'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-gray-500 text-xs mt-0.5">{step.desc}</p>
                    )}
                    {ts && (
                      <p className="text-gray-600 text-xs mt-0.5">{ts}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Estimated data */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {order.estimated_volume_m3 && (
              <div className="bg-gray-800 rounded-lg p-2.5 text-xs">
                <p className="text-gray-500">Volumen estimado</p>
                <p className="text-white font-medium mt-0.5">{order.estimated_volume_m3} m³</p>
              </div>
            )}
            {order.estimated_weight_kg && (
              <div className="bg-gray-800 rounded-lg p-2.5 text-xs">
                <p className="text-gray-500">Peso estimado</p>
                <p className="text-white font-medium mt-0.5">{order.estimated_weight_kg} kg</p>
              </div>
            )}
            {order.declared_value_usd && (
              <div className="bg-gray-800 rounded-lg p-2.5 text-xs">
                <p className="text-gray-500">Valor declarado</p>
                <p className="text-white font-medium mt-0.5">${order.declared_value_usd}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NewOrderForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    client_code: '',
    product_description: '',
    supplier_name: '',
    supplier_tracking: '',
    origin_city: 'guangzhou' as 'shanghai' | 'guangzhou' | 'shenzhen',
    declared_value_usd: '',
    estimated_weight_kg: '',
    estimated_volume_m3: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_code: form.client_code.toUpperCase(),
          product_description: form.product_description,
          supplier_name: form.supplier_name || undefined,
          supplier_tracking: form.supplier_tracking || undefined,
          origin_city: form.origin_city,
          declared_value_usd: form.declared_value_usd ? parseFloat(form.declared_value_usd) : undefined,
          estimated_weight_kg: form.estimated_weight_kg ? parseFloat(form.estimated_weight_kg) : undefined,
          estimated_volume_m3: form.estimated_volume_m3 ? parseFloat(form.estimated_volume_m3) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      setForm({ client_code: '', product_description: '', supplier_name: '', supplier_tracking: '', origin_city: 'guangzhou', declared_value_usd: '', estimated_weight_kg: '', estimated_volume_m3: '' })
      onCreated()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-800 hover:border-emerald-500/50 rounded-2xl p-5 text-gray-500 hover:text-emerald-400 transition-colors"
      >
        <Plus className="w-5 h-5" /> Registrar nuevo pedido
      </button>
    )
  }

  return (
    <div className="bg-gray-900 rounded-2xl border border-emerald-500/30 p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Plus className="w-4 h-4 text-emerald-400" /> Nuevo pedido
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Tu código de cliente *</label>
          <input
            type="text" required value={form.client_code}
            onChange={(e) => setForm({ ...form, client_code: e.target.value })}
            placeholder="FDT-0000"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono uppercase text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Descripción del producto *</label>
          <input
            type="text" required value={form.product_description}
            onChange={(e) => setForm({ ...form, product_description: e.target.value })}
            placeholder="Ej. Audífonos Bluetooth x10 unidades"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Proveedor</label>
            <input
              type="text" value={form.supplier_name}
              onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
              placeholder="Ej. AliExpress"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tracking del proveedor</label>
            <input
              type="text" value={form.supplier_tracking}
              onChange={(e) => setForm({ ...form, supplier_tracking: e.target.value })}
              placeholder="Ej. LY123456789CN"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Ciudad de origen</label>
          <select
            value={form.origin_city}
            onChange={(e) => setForm({ ...form, origin_city: e.target.value as typeof form.origin_city })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="guangzhou">Guangzhou</option>
            <option value="shanghai">Shanghai</option>
            <option value="shenzhen">Shenzhen</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Valor USD</label>
            <input type="number" step="0.01" value={form.declared_value_usd}
              onChange={(e) => setForm({ ...form, declared_value_usd: e.target.value })}
              placeholder="150"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Peso kg</label>
            <input type="number" step="0.01" value={form.estimated_weight_kg}
              onChange={(e) => setForm({ ...form, estimated_weight_kg: e.target.value })}
              placeholder="2.5"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Volumen m³</label>
            <input type="number" step="0.001" value={form.estimated_volume_m3}
              onChange={(e) => setForm({ ...form, estimated_volume_m3: e.target.value })}
              placeholder="0.05"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => setOpen(false)}
            className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-600 transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm disabled:opacity-50 transition-colors">
            {loading ? 'Guardando...' : 'Registrar pedido'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function MisPedidosPage() {
  const [code, setCode] = useState('')
  const [activeCode, setActiveCode] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function loadOrders(c: string) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/orders?code=${encodeURIComponent(c.toUpperCase())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOrders(data.orders)
      setActiveCode(c.toUpperCase())
      setSearched(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (code.trim()) loadOrders(code)
  }

  const active = orders.filter(o => o.status !== 'delivered')
  const delivered = orders.filter(o => o.status === 'delivered')

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-500/10 p-2 rounded-xl">
            <Package className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Mis pedidos</h1>
            <p className="text-gray-400 text-sm">Registra y rastrea toda tu mercancía</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text" value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Tu código FDT-0000"
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white font-mono uppercase placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
          <button type="submit" disabled={loading || !code}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-5 rounded-xl transition-colors text-sm">
            Ver
          </button>
        </form>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {searched && (
          <div className="space-y-4">
            <NewOrderForm onCreated={() => loadOrders(activeCode)} />

            {active.length === 0 && delivered.length === 0 && (
              <div className="text-center py-10 text-gray-600">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No tienes pedidos registrados aún.</p>
                <p className="text-sm mt-1">Usa el botón de arriba para registrar tu primer pedido.</p>
              </div>
            )}

            {active.map(o => <OrderCard key={o.id} order={o} onRefresh={() => loadOrders(activeCode)} />)}

            {delivered.length > 0 && (
              <div>
                <p className="text-gray-600 text-xs uppercase tracking-widest mb-3">Entregados</p>
                {delivered.map(o => <OrderCard key={o.id} order={o} onRefresh={() => loadOrders(activeCode)} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
