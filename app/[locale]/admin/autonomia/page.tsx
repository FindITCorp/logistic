'use client'

import { useEffect, useState } from 'react'
import { Bot, Send, DollarSign, Sparkles, AlertTriangle, Loader2 } from 'lucide-react'

interface Settings {
  nurture_enabled: boolean
  notifications_enabled: boolean
}

interface DebtRow {
  shipment_id: string
  client_code: string
  pool_number: number
  debt_stage: string
  advance_estimate_usd: number
  final_estimate_usd: number
  total_estimate_usd: number
}

interface Recon {
  totals: {
    advance_pending_count: number
    advance_pending_usd: number
    final_pending_count: number
    final_pending_usd: number
    outstanding_total_usd: number
  }
  debt: DebtRow[]
}

interface OptResult {
  applied: boolean
  fitness?: number
  breakdown?: { totalMargin: number; totalSavings: number; fillBonus: number }
  perPool?: Array<{ pool_number: number; volume_before: number; volume_after: number; client_price_m3: number; findit_margin_m3: number; assigned_volume: number; crossed_fcl: boolean }>
  assignments?: Array<{ shipment_id: string; pool_number: number }>
  committed_count?: number
  failed_count?: number
  message?: string
}

export default function AutonomiaPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [recon, setRecon] = useState<Recon | null>(null)
  const [opt, setOpt] = useState<OptResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [optBusy, setOptBusy] = useState(false)

  async function loadSettings() {
    const r = await fetch('/api/admin/settings')
    const d = await r.json()
    setSettings(d.settings)
  }
  async function loadRecon() {
    const r = await fetch('/api/admin/reconciliation')
    const d = await r.json()
    if (d.totals) setRecon(d)
  }

  useEffect(() => { loadSettings(); loadRecon() }, [])

  async function toggle(key: keyof Settings, value: boolean) {
    setBusy(true)
    const r = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    const d = await r.json()
    if (d.settings) setSettings(d.settings)
    setBusy(false)
  }

  async function runOptimizer(apply: boolean) {
    setOptBusy(true)
    const r = await fetch('/api/admin/optimize-assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apply }),
    })
    setOpt(await r.json())
    setOptBusy(false)
    if (apply) loadRecon()
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Bot className="w-7 h-7 text-brand-700" />
        <h1 className="text-2xl font-bold text-slate-900">Autonomía & Evolución</h1>
      </div>

      {/* ── Feature flags ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Controles de outreach</h2>
        <p className="text-sm text-slate-500 mb-5">
          Activan el envío real de mensajes. Requieren credenciales configuradas (WhatsApp/Resend);
          de lo contrario los mensajes caen al fallback de GitHub o no se envían.
        </p>

        <div className="space-y-3">
          <ToggleRow
            icon={<Send className="w-5 h-5" />}
            title="Notificaciones de ciclo de vida"
            desc="Avisa automáticamente a los clientes cuando su pool cierra, zarpa, llega a Colón, aduana y está listo."
            on={settings?.notifications_enabled ?? false}
            disabled={busy || !settings}
            onChange={(v) => toggle('notifications_enabled', v)}
          />
          <ToggleRow
            icon={<Sparkles className="w-5 h-5" />}
            title="Nurture autónomo de leads"
            desc="Secuencia de 3 mensajes a leads que no convirtieron, con opt-out. Corre en el cron diario."
            on={settings?.nurture_enabled ?? false}
            disabled={busy || !settings}
            onChange={(v) => toggle('nurture_enabled', v)}
          />
        </div>
      </section>

      {/* ── Optimizador evolutivo ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Optimizador de asignación (evolutivo)</h2>
          <div className="flex gap-2">
            <button
              onClick={() => runOptimizer(false)}
              disabled={optBusy}
              className="rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {optBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Simular
            </button>
            <button
              onClick={() => runOptimizer(true)}
              disabled={optBusy || !opt || !opt.assignments?.length}
              className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-40"
            >
              Aplicar
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Busca la asignación conjunta de envíos pendientes a pools que maximiza margen + ahorro al
          cliente + llenado de contenedor (algoritmo genético). &ldquo;Simular&rdquo; no modifica nada.
        </p>

        {opt && (
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm">
            {opt.message ? (
              <p className="text-slate-600">{opt.message}</p>
            ) : opt.applied ? (
              <p className="text-emerald-700 font-medium">
                ✅ Aplicado: {opt.committed_count} envíos asignados{opt.failed_count ? `, ${opt.failed_count} fallaron` : ''}.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-4 mb-3">
                  <Metric label="Fitness" value={opt.fitness?.toFixed(0) ?? '—'} />
                  <Metric label="Margen FINDIT" value={`$${opt.breakdown?.totalMargin.toFixed(0) ?? 0}`} />
                  <Metric label="Ahorro cliente" value={`$${opt.breakdown?.totalSavings.toFixed(0) ?? 0}`} />
                  <Metric label="Saltos FCL" value={String(opt.breakdown?.fillBonus ?? 0)} />
                </div>
                <table className="w-full text-xs">
                  <thead className="text-slate-400 text-left">
                    <tr><th>Pool</th><th>Vol antes→después</th><th>Asignado</th><th>$/m³</th><th>Margen/m³</th><th>FCL</th></tr>
                  </thead>
                  <tbody>
                    {(opt.perPool ?? []).map(p => (
                      <tr key={p.pool_number} className="border-t border-slate-100">
                        <td className="py-1 font-medium">#{p.pool_number}</td>
                        <td>{p.volume_before} → {p.volume_after} m³</td>
                        <td>{p.assigned_volume} m³</td>
                        <td>${p.client_price_m3}</td>
                        <td className="text-emerald-600">${p.findit_margin_m3}</td>
                        <td>{p.crossed_fcl ? '🚢' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}
      </section>

      {/* ── Reconciliación / deuda ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-800">Deuda por cobrar</h2>
        </div>
        {recon ? (
          <>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <Metric label="Anticipos pendientes" value={`$${recon.totals.advance_pending_usd.toFixed(0)}`} sub={`${recon.totals.advance_pending_count} envíos`} />
              <Metric label="Saldos pendientes" value={`$${recon.totals.final_pending_usd.toFixed(0)}`} sub={`${recon.totals.final_pending_count} envíos`} />
              <Metric label="Total por cobrar" value={`$${recon.totals.outstanding_total_usd.toFixed(0)}`} highlight />
            </div>
            {recon.debt.length === 0 ? (
              <p className="text-sm text-emerald-600 flex items-center gap-2"><span>✅</span> Todo conciliado, sin deuda pendiente.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-slate-400 text-left">
                  <tr><th>Cliente</th><th>Pool</th><th>Etapa</th><th className="text-right">Estimado</th></tr>
                </thead>
                <tbody>
                  {recon.debt.slice(0, 15).map(d => (
                    <tr key={d.shipment_id} className="border-t border-slate-100">
                      <td className="py-1.5 font-medium">{d.client_code}</td>
                      <td>#{d.pool_number}</td>
                      <td>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${d.debt_stage === 'advance_pending' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                          {d.debt_stage === 'advance_pending' ? 'Anticipo' : 'Saldo'}
                        </span>
                      </td>
                      <td className="text-right">${(d.debt_stage === 'advance_pending' ? d.advance_estimate_usd : d.final_estimate_usd).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Sin datos de reconciliación todavía.</p>
        )}
      </section>
    </div>
  )
}

function ToggleRow({ icon, title, desc, on, disabled, onChange }: {
  icon: React.ReactNode; title: string; desc: string; on: boolean; disabled: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-4">
      <div className="flex gap-3">
        <div className="text-brand-600 mt-0.5">{icon}</div>
        <div>
          <p className="font-medium text-slate-800">{title}</p>
          <p className="text-sm text-slate-500">{desc}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!on)}
        disabled={disabled}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
        aria-pressed={on}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

function Metric({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'}`}>
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-xl font-bold ${highlight ? 'text-amber-700' : 'text-slate-800'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}
