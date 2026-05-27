'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, Search, RefreshCw, CheckCircle2, Clock, MessageCircle, FileText, ChevronRight } from 'lucide-react'

interface Shipment {
  id: string
  client_code: string
  weight_kg: number
  volume_m3: number
  origin_city: string
  status: string
  price_per_m3: number | null
  advance_paid: boolean
  final_paid: boolean
  invoice_received: boolean
  invoice_token: string | null
  invoice_token_exp: string | null
  product_description: string | null
  created_at: string
  client: { name: string; whatsapp: string | null } | null
  pool_id: string | null
}

const CITY: Record<string, string> = { guangzhou: 'Guangzhou', shanghai: 'Shanghai', shenzhen: 'Shenzhen' }

function fmt(d: string) {
  return new Date(d).toLocaleDateString('es-PA', { day: '2-digit', month: 'short' })
}

export default function AdminEnviosPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'invoice_pending' | 'unpaid'>('all')
  const [generatingToken, setGeneratingToken] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shipments')
      if (res.status === 401) { window.location.href = '/admin/login'; return }
      const data = await res.json()
      setShipments(data.shipments ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function requestInvoice(shipmentId: string) {
    setGeneratingToken(shipmentId)
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/invoice`, { method: 'POST' })
      const data = await res.json()
      if (data.waLink) {
        window.open(data.waLink, '_blank')
      } else if (data.uploadUrl) {
        await navigator.clipboard.writeText(data.uploadUrl)
        alert('Enlace copiado: ' + data.uploadUrl)
      }
      await load()
    } finally {
      setGeneratingToken(null)
    }
  }

  const filtered = shipments
    .filter(s => {
      if (search) {
        const q = search.toUpperCase()
        return s.client_code.includes(q) || (s.client?.name ?? '').toUpperCase().includes(q)
      }
      return true
    })
    .filter(s => {
      if (filter === 'invoice_pending') return !s.invoice_received
      if (filter === 'unpaid') return !s.advance_paid || !s.final_paid
      return true
    })

  const invoicePendingCount = shipments.filter(s => !s.invoice_received).length
  const unpaidCount = shipments.filter(s => !s.advance_paid || !s.final_paid).length

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="text-blue-400 w-5 h-5" />
            <div>
              <h1 className="text-xl font-bold">Envíos recibidos</h1>
              <p className="text-gray-400 text-sm">{shipments.length} envíos en total</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/dashboard" className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg bg-gray-800 transition-colors">← Dashboard</a>
            <button onClick={load} className="p-2 text-gray-500 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por código o nombre..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>
          {[
            { key: 'all', label: `Todos (${shipments.length})` },
            { key: 'invoice_pending', label: `Sin factura (${invoicePendingCount})`, alert: invoicePendingCount > 0 },
            { key: 'unpaid', label: `Pagos pendientes (${unpaidCount})`, alert: unpaidCount > 0 },
          ].map(({ key, label, alert }) => (
            <button
              key={key}
              onClick={() => setFilter(key as typeof filter)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                filter === key
                  ? 'bg-blue-500 text-white'
                  : alert
                    ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-16 text-gray-500">Cargando envíos...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No hay envíos en este filtro</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => (
              <div key={s.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-4 hover:border-gray-700 transition-colors">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono font-bold text-white">{s.client_code}</span>
                      {s.client?.name && (
                        <span className="text-gray-400 text-sm">{s.client.name}</span>
                      )}
                      <span className="text-xs text-gray-600">{fmt(s.created_at)}</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      {CITY[s.origin_city]} · {s.volume_m3} m³ · {s.weight_kg} kg
                      {s.product_description && ` · ${s.product_description}`}
                    </p>
                  </div>

                  {/* Payment badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${s.advance_paid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                      {s.advance_paid ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Adelanto</> : <><Clock className="w-3 h-3 inline mr-1" />Adelanto</>}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${s.final_paid ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                      {s.final_paid ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Final</> : <><Clock className="w-3 h-3 inline mr-1" />Final</>}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${s.invoice_received ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                      <FileText className="w-3 h-3 inline mr-1" />
                      {s.invoice_received ? 'Factura ✓' : 'Sin factura'}
                    </span>
                    {s.price_per_m3 && (
                      <span className="text-xs text-emerald-400 font-mono font-bold">${s.price_per_m3}/m³</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {!s.invoice_received && (
                      <button
                        onClick={() => requestInvoice(s.id)}
                        disabled={generatingToken === s.id}
                        className="flex items-center gap-1 text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-2.5 py-1.5 rounded-lg hover:bg-yellow-500/20 transition-colors disabled:opacity-50"
                      >
                        {generatingToken === s.id ? (
                          <div className="w-3 h-3 border border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                        ) : (
                          <MessageCircle className="w-3 h-3" />
                        )}
                        {s.client?.whatsapp ? 'Solicitar WA' : 'Copiar enlace'}
                      </button>
                    )}
                    {s.pool_id && (
                      <a
                        href={`/admin/pools/${s.pool_id}`}
                        className="flex items-center gap-1 text-xs bg-gray-800 text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" /> Pool
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
