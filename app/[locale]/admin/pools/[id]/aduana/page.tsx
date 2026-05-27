'use client'

import { useEffect, useState } from 'react'
import { FileText, Download, ExternalLink, RefreshCw } from 'lucide-react'

interface Invoice {
  id: string
  client_code: string
  description: string
  declared_value_usd: number
  product_type: string | null
  cif_value_usd: number | null
  arancel_pct: number | null
  arancel_usd: number | null
  itbms_usd: number | null
  total_taxes_usd: number | null
  status: 'pending' | 'uploaded' | 'reviewed' | 'approved'
  file_url: string | null
  uploaded_at: string | null
  shipment: { weight_kg: number; volume_m3: number; advance_paid: boolean; final_paid: boolean } | null
}

interface Totals {
  total_declared_usd: number
  total_cif_usd: number
  total_arancel_usd: number
  total_itbms_usd: number
  total_taxes_usd: number
  pending_count: number
  uploaded_count: number
}

const STATUS_CFG = {
  pending:  { label: 'Pendiente', color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
  uploaded: { label: 'Subida',    color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/30' },
  reviewed: { label: 'Revisada',  color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
  approved: { label: 'Aprobada',  color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/30' },
}

export default function AduanaPage({ params }: { params: { id: string } }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [totals, setTotals] = useState<Totals | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [taxForm, setTaxForm] = useState({ arancel_pct: '', cif_value_usd: '' })

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/invoices?pool_id=${params.id}`)
    const d = await res.json()
    setInvoices(d.invoices ?? [])
    setTotals(d.totals)
    setLoading(false)
  }

  useEffect(() => { load() }, [params.id])

  async function saveTaxes(invoiceId: string) {
    const arancel = parseFloat(taxForm.arancel_pct) || 0
    const cif = parseFloat(taxForm.cif_value_usd) || 0
    const arancelUsd = +(cif * arancel / 100).toFixed(2)
    const itbms = +((cif + arancelUsd) * 0.07).toFixed(2)
    const total = +(arancelUsd + itbms).toFixed(2)

    await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cif_value_usd: cif,
        arancel_pct: arancel,
        arancel_usd: arancelUsd,
        itbms_usd: itbms,
        total_taxes_usd: total,
        status: 'reviewed',
      }),
    })
    setEditing(null)
    load()
  }

  async function generateInvoiceToken(shipmentId: string) {
    const res = await fetch(`/api/shipments/${shipmentId}/invoice`, { method: 'POST' })
    const d = await res.json()
    if (d.waLink) window.open(d.waLink, '_blank')
    else if (d.uploadUrl) {
      await navigator.clipboard.writeText(d.uploadUrl)
      alert('Enlace copiado al portapapeles')
    }
  }

  function exportCSV() {
    const rows = [
      ['Código', 'Descripción', 'Tipo', 'Vol m³', 'Peso kg', 'Val Declarado', 'CIF', 'Arancel %', 'Arancel USD', 'ITBMS', 'Total Impuestos', 'Estado'],
      ...invoices.map(inv => [
        inv.client_code,
        inv.description,
        inv.product_type ?? '',
        inv.shipment?.volume_m3 ?? '',
        inv.shipment?.weight_kg ?? '',
        inv.declared_value_usd,
        inv.cif_value_usd ?? '',
        inv.arancel_pct ?? '',
        inv.arancel_usd ?? '',
        inv.itbms_usd ?? '',
        inv.total_taxes_usd ?? '',
        inv.status,
      ]),
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `aduana-pool-${params.id}.csv`; a.click()
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="text-emerald-400 w-6 h-6" />
            <div>
              <h1 className="text-xl font-bold">Declaración Aduanal</h1>
              <p className="text-gray-400 text-sm">Pool {params.id.slice(0,8)}… — para agente aduanal Panamá</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 text-gray-400 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-lg text-sm hover:bg-emerald-500/20 transition-colors"
            >
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
          </div>
        </div>

        {/* Totals summary */}
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Val. Declarado', value: `$${totals.total_declared_usd.toFixed(2)}`, sub: 'total pool' },
              { label: 'Arancel estimado', value: `$${totals.total_arancel_usd.toFixed(2)}`, sub: 'promedio rev.' },
              { label: 'ITBMS estimado', value: `$${totals.total_itbms_usd.toFixed(2)}`, sub: '7%' },
              { label: 'Facturas', value: `${totals.uploaded_count}/${totals.uploaded_count + totals.pending_count}`, sub: `${totals.pending_count} pendientes` },
            ].map(stat => (
              <div key={stat.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
                <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                <p className="text-white font-bold text-lg">{stat.value}</p>
                <p className="text-gray-600 text-xs">{stat.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Invoice list */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">Cargando facturas...</div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No hay facturas para este pool aún.</div>
        ) : (
          <div className="space-y-3">
            {invoices.map(inv => {
              const cfg = STATUS_CFG[inv.status]
              return (
                <div key={inv.id} className={`bg-gray-900 rounded-xl border ${inv.status === 'pending' ? 'border-yellow-500/20' : 'border-gray-800'} p-5`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-white">{inv.client_code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {inv.shipment?.advance_paid && <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Adelanto ✓</span>}
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{inv.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>📦 {inv.shipment?.volume_m3} m³ · {inv.shipment?.weight_kg} kg</span>
                        <span>💵 Declarado: <strong className="text-white">${inv.declared_value_usd}</strong></span>
                        {inv.cif_value_usd && <span>CIF: <strong className="text-white">${inv.cif_value_usd}</strong></span>}
                        {inv.total_taxes_usd && <span>Impuestos: <strong className="text-yellow-400">${inv.total_taxes_usd}</strong></span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {inv.status === 'pending' && (
                        <button
                          onClick={() => generateInvoiceToken(inv.id)}
                          className="text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-3 py-1.5 rounded-lg hover:bg-yellow-500/20 transition-colors"
                        >
                          Solicitar factura
                        </button>
                      )}
                      {inv.file_url && (
                        <a
                          href={inv.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs bg-blue-500/10 border border-blue-500/30 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-500/20 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Ver factura
                        </a>
                      )}
                      <button
                        onClick={() => { setEditing(inv.id); setTaxForm({ arancel_pct: String(inv.arancel_pct ?? ''), cif_value_usd: String(inv.cif_value_usd ?? inv.declared_value_usd) }) }}
                        className="text-xs bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3 py-1.5 rounded-lg hover:bg-purple-500/20 transition-colors"
                      >
                        Calcular impuestos
                      </button>
                    </div>
                  </div>

                  {/* Tax calculator inline */}
                  {editing === inv.id && (
                    <div className="mt-4 pt-4 border-t border-gray-800">
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Valor CIF (USD)</label>
                          <input
                            type="number"
                            value={taxForm.cif_value_usd}
                            onChange={e => setTaxForm({ ...taxForm, cif_value_usd: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">Arancel % (0–15)</label>
                          <input
                            type="number"
                            min="0" max="15" step="0.5"
                            value={taxForm.arancel_pct}
                            onChange={e => setTaxForm({ ...taxForm, arancel_pct: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      {taxForm.cif_value_usd && taxForm.arancel_pct && (
                        <div className="bg-gray-800 rounded-lg p-3 text-sm mb-3 grid grid-cols-3 gap-2">
                          {(() => {
                            const cif = parseFloat(taxForm.cif_value_usd)
                            const pct = parseFloat(taxForm.arancel_pct)
                            const ar = +(cif * pct / 100).toFixed(2)
                            const itbms = +((cif + ar) * 0.07).toFixed(2)
                            return <>
                              <div><p className="text-gray-500 text-xs">Arancel</p><p className="text-white font-semibold">${ar}</p></div>
                              <div><p className="text-gray-500 text-xs">ITBMS 7%</p><p className="text-white font-semibold">${itbms}</p></div>
                              <div><p className="text-gray-500 text-xs">Total impuestos</p><p className="text-yellow-400 font-bold">${+(ar + itbms).toFixed(2)}</p></div>
                            </>
                          })()}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => saveTaxes(inv.id)} className="bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-bold px-4 py-2 rounded-lg">Guardar</button>
                        <button onClick={() => setEditing(null)} className="bg-gray-800 text-gray-400 text-sm px-4 py-2 rounded-lg">Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
