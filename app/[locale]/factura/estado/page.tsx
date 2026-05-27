'use client'

import { useState } from 'react'
import { FileText, CheckCircle2, Clock, XCircle, Search, Package } from 'lucide-react'

interface InvoiceStatus {
  client_code: string
  status: 'pending' | 'uploaded' | 'reviewed' | 'approved'
  declared_value_usd: number | null
  description: string | null
  uploaded_at: string | null
  reviewed_at: string | null
  total_taxes_usd: number | null
  cif_value_usd: number | null
  arancel_pct: number | null
}

const STATUS_CFG = {
  pending:  { label: 'Pendiente de carga',    icon: Clock,        color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/30' },
  uploaded: { label: 'Factura recibida',       icon: FileText,     color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/30' },
  reviewed: { label: 'En revisión aduanal',    icon: Search,       color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/30' },
  approved: { label: '✅ Aprobada para despacho', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
}

function fmt(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('es-PA', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function FacturaEstadoPage() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<InvoiceStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    setSearched(true)
    try {
      const res = await fetch(`/api/invoices?client_code=${encodeURIComponent(code.toUpperCase())}`)
      const data = await res.json()
      const inv = data.invoices?.[0] ?? null
      if (inv) {
        setResult(inv)
      } else {
        setError('No encontramos facturas para ese código. Verifica que sea correcto (FDT-XXXX).')
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-12">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-2xl">
            <FileText className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Estado de tu factura</h1>
            <p className="text-gray-400 text-sm">Consulta el estado de tu declaración aduanal</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Tu código FDT-0000"
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white font-mono uppercase placeholder-gray-600 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold px-5 rounded-xl transition-colors text-sm whitespace-nowrap"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : 'Consultar'}
          </button>
        </form>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 text-red-400 text-sm mb-4">
            <XCircle className="w-5 h-5 flex-shrink-0" /> {error}
          </div>
        )}

        {result && (() => {
          const cfg = STATUS_CFG[result.status]
          const Icon = cfg.icon
          return (
            <div className="space-y-4">
              {/* Status card */}
              <div className={`rounded-2xl border p-5 ${cfg.bg}`}>
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={`w-6 h-6 ${cfg.color}`} />
                  <div>
                    <p className={`font-bold text-lg ${cfg.color}`}>{cfg.label}</p>
                    <p className="text-gray-400 text-sm font-mono">{result.client_code}</p>
                  </div>
                </div>
                {result.description && (
                  <p className="text-gray-300 text-sm">{result.description}</p>
                )}
              </div>

              {/* Timeline */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Historial</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Factura solicitada', done: true, date: null },
                    { label: 'Factura cargada', done: ['uploaded','reviewed','approved'].includes(result.status), date: result.uploaded_at },
                    { label: 'En revisión aduanal', done: ['reviewed','approved'].includes(result.status), date: result.reviewed_at },
                    { label: 'Aprobada para despacho', done: result.status === 'approved', date: null },
                  ].map(({ label, done, date }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center ${done ? 'bg-emerald-500' : 'bg-gray-800'}`}>
                        {done && <span className="text-black text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${done ? 'text-white' : 'text-gray-600'}`}>{label}</p>
                        {date && <p className="text-gray-600 text-xs">{fmt(date)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax info */}
              {result.total_taxes_usd && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-gray-400" /> Impuestos estimados
                  </h3>
                  <div className="space-y-2 text-sm">
                    {result.declared_value_usd && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Valor declarado</span>
                        <span className="text-white font-mono">${result.declared_value_usd}</span>
                      </div>
                    )}
                    {result.cif_value_usd && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Valor CIF</span>
                        <span className="text-white font-mono">${result.cif_value_usd}</span>
                      </div>
                    )}
                    {result.arancel_pct != null && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Arancel</span>
                        <span className="text-white font-mono">{result.arancel_pct}%</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-gray-800 pt-2 font-semibold">
                      <span className="text-gray-300">Total impuestos a pagar</span>
                      <span className="text-yellow-400 font-mono text-base">${result.total_taxes_usd}</span>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">
                      Se paga al retirar la mercancía en bodega Panamá
                    </p>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {searched && !result && !loading && !error && (
          <div className="text-center py-12 text-gray-600">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No hay facturas registradas para este código.</p>
          </div>
        )}

        <p className="text-center text-gray-700 text-xs mt-8">
          ¿Dudas? Escríbenos por WhatsApp · FINDIT Logistics
        </p>
      </div>
    </div>
  )
}
