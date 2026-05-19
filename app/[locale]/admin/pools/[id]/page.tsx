'use client'

import { useState, useEffect, useCallback } from 'react'
import { use } from 'react'
import {
  ArrowRight, MessageCircle, CheckCircle2, AlertCircle,
  FileText, DollarSign, Ship, MapPin, Warehouse, ChevronLeft,
} from 'lucide-react'
import type { Pool, PoolStatus } from '@/lib/supabase/database.types'
import { calculateClientPrice } from '@/lib/pricing'

interface ShipmentRow {
  id: string
  volume_m3: number
  weight_kg: number
  status: string
  declared_value: number | null
  invoice_received: boolean
  advance_paid: boolean
  advance_amount: number | null
  final_paid: boolean
  final_amount: number | null
  pickup_at: string | null
  notes: string | null
}

interface Member {
  id: string
  client_id: string
  volume_m3: number
  price_per_m3: number
  joined_at: string
  client: { name: string; client_code: string; whatsapp: string | null; email: string | null }
  shipment: ShipmentRow
}

const STATUS_CONFIG: Record<PoolStatus, { label: string; color: string; nextLabel: string | null }> = {
  active:     { label: 'Activo',      color: 'text-blue-400',    nextLabel: 'Cerrar y preparar despacho' },
  closed:     { label: 'Cerrado',     color: 'text-amber-400',   nextLabel: 'Confirmar despacho desde China' },
  in_transit: { label: 'En tránsito', color: 'text-purple-400',  nextLabel: 'Confirmación llegada a Colón' },
  at_colon:   { label: 'En Colón',    color: 'text-orange-400',  nextLabel: 'Trasladado a Tocumen → notificar clientes' },
  at_tocumen: { label: 'En Tocumen',  color: 'text-emerald-400', nextLabel: 'Marcar pool como completado' },
  completed:  { label: 'Completado',  color: 'text-gray-400',    nextLabel: null },
}

const CITY: Record<string, string> = { guangzhou: 'Guangzhou', shanghai: 'Shanghai', shenzhen: 'Shenzhen' }

function waLink(whatsapp: string, msg: string) {
  const num = whatsapp.replace(/\D/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

function buildReadyMsg(name: string, poolNum: number, vol: number, finalAmt: number) {
  return (
    `Hola ${name} 👋\n\n` +
    `Tu carga del Pool #${String(poolNum).padStart(3, '0')} ya llegó a nuestro depósito en Tocumen 🎉\n\n` +
    `📦 Volumen: ${vol.toFixed(3)} m³\n` +
    `💰 Saldo a pagar al retirar: $${finalAmt.toFixed(2)}\n\n` +
    `Por favor coordina tu retiro. Trae identificación y comprobante de pago del anticipo.\n\n` +
    `— FINDIT Logistic`
  )
}

function buildAdvanceMsg(name: string, poolNum: number, vol: number, advAmt: number, clientPrice: number) {
  return (
    `Hola ${name} 👋\n\n` +
    `Tu carga en Pool #${String(poolNum).padStart(3, '0')} está lista para despachar desde China 🚢\n\n` +
    `📦 Volumen: ${vol.toFixed(3)} m³\n` +
    `💳 Anticipo requerido: $${advAmt.toFixed(2)} (flete océano)\n` +
    `💰 Precio total acordado: $${(clientPrice * vol).toFixed(2)}\n` +
    `💵 Saldo al retirar: $${(clientPrice * vol - advAmt).toFixed(2)}\n\n` +
    `Adjunta la factura de tu proveedor para adelantar la declaración aduanal.\n\n` +
    `— FINDIT Logistic`
  )
}

export default function PoolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [pool, setPool] = useState<Pool | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/pools/${id}`)
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setPool(data.pool)
    setMembers(data.members ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function advancePool() {
    if (!pool) return
    setAdvancing(true)
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
      setAdvancing(false)
    }
  }

  async function updateShipment(shipmentId: string, patch: Record<string, unknown>) {
    setUpdatingId(shipmentId)
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al actualizar')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">Cargando...</div>
  if (!pool) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-400">Pool no encontrado</div>

  const cfg = STATUS_CONFIG[pool.status]
  const pricing = calculateClientPrice(pool.day_number, pool.current_volume_m3)

  // Pool-level totals
  const totalRevenue = members.reduce((s, m) => s + m.price_per_m3 * m.volume_m3, 0)
  const totalAdvance = members.reduce((s, m) => s + (m.shipment.advance_amount ?? pricing.advancePerM3 * m.volume_m3), 0)
  const totalFinal   = members.reduce((s, m) => s + (m.shipment.final_amount   ?? pricing.finalPerM3   * m.volume_m3), 0)
  const advancePaid  = members.filter(m => m.shipment.advance_paid).reduce((s, m) => s + (m.shipment.advance_amount ?? pricing.advancePerM3 * m.volume_m3), 0)
  const finalPaid    = members.filter(m => m.shipment.final_paid).reduce((s, m) => s + (m.shipment.final_amount ?? pricing.finalPerM3 * m.volume_m3), 0)
  const invoicesOk   = members.filter(m => m.shipment.invoice_received).length
  const delivered    = members.filter(m => m.shipment.status === 'delivered').length

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <a href="/admin/pools" className="mt-1 text-gray-500 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </a>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-white">
                Pool #{String(pool.pool_number).padStart(3, '0')}
              </h1>
              <span className={`text-sm font-medium ${cfg.color}`}>● {cfg.label}</span>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              {CITY[pool.origin_city]} → Colón → Tocumen ·{' '}
              {pool.current_volume_m3.toFixed(2)} m³ · {pool.participants} clientes · Día {pool.day_number}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Ingreso total</p>
            <p className="text-lg font-bold text-white">${totalRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Anticipo cobrado</p>
            <p className="text-lg font-bold text-emerald-400">${advancePaid.toFixed(0)}<span className="text-gray-600 text-sm font-normal"> / ${totalAdvance.toFixed(0)}</span></p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Saldo cobrado</p>
            <p className="text-lg font-bold text-emerald-400">${finalPaid.toFixed(0)}<span className="text-gray-600 text-sm font-normal"> / ${totalFinal.toFixed(0)}</span></p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-1">Retiros / Facturas</p>
            <p className="text-lg font-bold text-white">{delivered}/{members.length} <span className="text-gray-500 text-sm font-normal">· {invoicesOk} facturas</span></p>
          </div>
        </div>

        {/* Pricing breakdown for this pool */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Estructura de precio — Pool a {pool.current_volume_m3.toFixed(1)} m³</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Flete naviero</p>
              <p className="text-white font-mono">${pricing.carrierRate.toFixed(2)}/m³</p>
              <p className="text-gray-600 text-xs">{pricing.mode}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Overhead fijo ÷ vol</p>
              <p className="text-white font-mono">${pricing.overheadPerM3.toFixed(2)}/m³</p>
              <p className="text-gray-600 text-xs">aduana + Colón→Tocumen</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Anticipo (antes salida)</p>
              <p className="text-emerald-400 font-mono font-bold">${pricing.advancePerM3.toFixed(2)}/m³</p>
              <p className="text-gray-600 text-xs">= flete océano</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Saldo (al retirar)</p>
              <p className="text-amber-400 font-mono font-bold">${pricing.finalPerM3.toFixed(2)}/m³</p>
              <p className="text-gray-600 text-xs">overhead + margen FINDIT</p>
            </div>
          </div>
        </div>

        {/* Advance pool status */}
        {cfg.nextLabel && (
          <button
            onClick={advancePool}
            disabled={advancing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 mb-6 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            {advancing ? 'Actualizando...' : cfg.nextLabel}
          </button>
        )}

        {/* Members table */}
        <h2 className="text-white font-semibold mb-3">Clientes en este pool</h2>
        <div className="space-y-3">
          {members.map(m => {
            const advAmt  = m.shipment.advance_amount  ?? pricing.advancePerM3 * m.volume_m3
            const finalAmt = m.shipment.final_amount   ?? pricing.finalPerM3   * m.volume_m3
            const totalAmt = m.price_per_m3 * m.volume_m3
            const isUpdating = updatingId === m.shipment.id
            const delivered = m.shipment.status === 'delivered'

            return (
              <div key={m.id} className={`bg-gray-900 border rounded-2xl p-4 transition-opacity ${delivered ? 'border-gray-800 opacity-60' : 'border-gray-700'} ${isUpdating ? 'opacity-40 pointer-events-none' : ''}`}>
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div>
                    <p className="text-white font-semibold">{m.client.name}</p>
                    <p className="text-gray-500 text-xs font-mono">{m.client.client_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold">${totalAmt.toFixed(2)}</p>
                    <p className="text-gray-500 text-xs">{m.volume_m3.toFixed(3)} m³ × ${m.price_per_m3}/m³</p>
                  </div>
                </div>

                {/* Payment stages */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className={`rounded-lg p-2.5 border ${m.shipment.advance_paid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Ship className="w-3 h-3" /> Anticipo</span>
                      <span className={`text-xs font-bold ${m.shipment.advance_paid ? 'text-emerald-400' : 'text-gray-500'}`}>
                        ${advAmt.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => updateShipment(m.shipment.id, { advance_paid: !m.shipment.advance_paid, advance_amount: advAmt })}
                      className={`w-full text-xs rounded py-1 font-medium transition-colors ${m.shipment.advance_paid ? 'bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/20' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      {m.shipment.advance_paid ? '✓ Pagado' : 'Marcar pagado'}
                    </button>
                  </div>

                  <div className={`rounded-lg p-2.5 border ${m.shipment.final_paid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800 border-gray-700'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Warehouse className="w-3 h-3" /> Saldo retiro</span>
                      <span className={`text-xs font-bold ${m.shipment.final_paid ? 'text-emerald-400' : 'text-gray-500'}`}>
                        ${finalAmt.toFixed(2)}
                      </span>
                    </div>
                    <button
                      onClick={() => updateShipment(m.shipment.id, { final_paid: !m.shipment.final_paid, final_amount: finalAmt })}
                      className={`w-full text-xs rounded py-1 font-medium transition-colors ${m.shipment.final_paid ? 'bg-emerald-600/30 text-emerald-400 hover:bg-emerald-600/20' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      {m.shipment.final_paid ? '✓ Pagado' : 'Marcar pagado'}
                    </button>
                  </div>
                </div>

                {/* Docs + delivery row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => updateShipment(m.shipment.id, { invoice_received: !m.shipment.invoice_received })}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${m.shipment.invoice_received ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'}`}
                  >
                    <FileText className="w-3 h-3" />
                    {m.shipment.invoice_received ? 'Factura ✓' : 'Factura pendiente'}
                  </button>

                  {!delivered && m.shipment.final_paid && (
                    <button
                      onClick={() => updateShipment(m.shipment.id, { status: 'delivered' })}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmar retiro
                    </button>
                  )}

                  {delivered && (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Retirado {m.shipment.pickup_at ? new Date(m.shipment.pickup_at).toLocaleDateString('es-PA') : ''}
                    </span>
                  )}

                  {!m.shipment.advance_paid && m.client.whatsapp && (
                    <a
                      href={waLink(m.client.whatsapp, buildAdvanceMsg(m.client.name, pool.pool_number, m.volume_m3, advAmt, m.price_per_m3))}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-green-700/20 text-green-400 border border-green-700/40 hover:bg-green-700/30 transition-colors ml-auto"
                    >
                      <MessageCircle className="w-3 h-3" /> Pedir anticipo
                    </a>
                  )}

                  {pool.status === 'at_tocumen' && !delivered && m.client.whatsapp && (
                    <a
                      href={waLink(m.client.whatsapp, buildReadyMsg(m.client.name, pool.pool_number, m.volume_m3, finalAmt))}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-green-700/20 text-green-400 border border-green-700/40 hover:bg-green-700/30 transition-colors ml-auto"
                    >
                      <MessageCircle className="w-3 h-3" /> Notificar listo
                    </a>
                  )}
                </div>

                {/* Declared value input */}
                <div className="mt-2 flex items-center gap-2">
                  <DollarSign className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  <input
                    type="number"
                    placeholder="Valor declarado CIF ($)"
                    defaultValue={m.shipment.declared_value ?? ''}
                    onBlur={(e) => {
                      const v = parseFloat(e.target.value)
                      if (!isNaN(v) && v > 0 && v !== m.shipment.declared_value) {
                        updateShipment(m.shipment.id, { declared_value: v })
                      }
                    }}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
                  />
                  <span className="text-xs text-gray-600">para declaración</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bulk notify if at_tocumen */}
        {pool.status === 'at_tocumen' && members.some(m => m.client.whatsapp && m.shipment.status !== 'delivered') && (
          <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4">
            <p className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Carga en Tocumen — notificar a todos
            </p>
            <div className="flex flex-wrap gap-2">
              {members
                .filter(m => m.client.whatsapp && m.shipment.status !== 'delivered')
                .map(m => {
                  const finalAmt = m.shipment.final_amount ?? pricing.finalPerM3 * m.volume_m3
                  return (
                    <a
                      key={m.id}
                      href={waLink(m.client.whatsapp!, buildReadyMsg(m.client.name, pool.pool_number, m.volume_m3, finalAmt))}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium bg-green-700/20 text-green-400 border border-green-700/40 hover:bg-green-700/30 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> {m.client.name.split(' ')[0]}
                    </a>
                  )
                })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
