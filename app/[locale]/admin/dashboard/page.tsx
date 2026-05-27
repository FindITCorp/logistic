'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, Package, Users, AlertCircle, DollarSign,
  Ship, FileText, RefreshCw, LogOut, ChevronRight, BarChart3,
  CheckCircle2, Clock, Boxes
} from 'lucide-react'

interface Stats {
  clients: { total: number }
  leads: { total: number }
  pools: {
    active: number
    in_transit: number
    total_volume_active_m3: number
    list: Array<{ id: string; pool_number: number; origin_city: string; current_volume_m3: number; participants: number; day_number: number; status: string }>
  }
  revenue: { advance_usd: number; final_usd: number; total_usd: number; pipeline_usd: number }
  invoices: { pending: number; uploaded: number; action_required: number }
  shipments: {
    recent: Array<{
      id: string; client_code: string; weight_kg: number; volume_m3: number
      origin_city: string; created_at: string; advance_paid: boolean; final_paid: boolean; price_per_m3: number | null
    }>
  }
}

const CITY: Record<string, string> = { guangzhou: 'GZH', shanghai: 'SHA', shenzhen: 'SZX' }
const CITY_FULL: Record<string, string> = { guangzhou: 'Guangzhou', shanghai: 'Shanghai', shenzhen: 'Shenzhen' }

function StatCard({ label, value, sub, icon: Icon, color = 'text-white', alert = false }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType
  color?: string; alert?: boolean
}) {
  return (
    <div className={`bg-gray-900 rounded-2xl border p-5 ${alert ? 'border-yellow-500/40' : 'border-gray-800'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-medium mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-xl ${alert ? 'bg-yellow-500/10' : 'bg-gray-800'}`}>
          <Icon className={`w-5 h-5 ${alert ? 'text-yellow-400' : 'text-gray-400'}`} />
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 401) { window.location.href = '/admin/login'; return }
      const data = await res.json()
      setStats(data)
    } catch {
      setError('Error cargando estadísticas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function logout() {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top nav */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-blue-400 w-5 h-5" />
            <span className="font-bold text-white">FINDIT · Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-gray-500 hover:text-white transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={logout} className="flex items-center gap-1.5 text-gray-500 hover:text-red-400 transition-colors text-sm p-2">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Nav shortcuts */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {[
            { href: '/admin', label: 'Registrar llegada', icon: Package },
            { href: '/admin/pools', label: 'Gestión pools', icon: Boxes },
            { href: '/admin/leads', label: 'Leads CRM', icon: Users },
            { href: '/admin/proveedores', label: 'Proveedores', icon: Ship },
          ].map(({ href, label, icon: Icon }) => (
            <a key={href} href={href}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm transition-colors">
              <Icon className="w-3.5 h-3.5" /> {label}
            </a>
          ))}
        </div>

        {stats && (
          <>
            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Pools activos"
                value={stats.pools.active}
                sub={`${stats.pools.total_volume_active_m3.toFixed(1)} m³ acumulado`}
                icon={Boxes}
                color="text-blue-400"
              />
              <StatCard
                label="Ingresos totales"
                value={`$${stats.revenue.total_usd.toFixed(0)}`}
                sub={`Pipeline: $${stats.revenue.pipeline_usd.toFixed(0)}`}
                icon={DollarSign}
                color="text-emerald-400"
              />
              <StatCard
                label="Facturas pendientes"
                value={stats.invoices.action_required}
                sub={`${stats.invoices.pending} sin subir · ${stats.invoices.uploaded} por revisar`}
                icon={FileText}
                color={stats.invoices.action_required > 0 ? 'text-yellow-400' : 'text-white'}
                alert={stats.invoices.action_required > 0}
              />
              <StatCard
                label="Clientes"
                value={stats.clients.total}
                sub={`${stats.leads.total} leads capturados`}
                icon={Users}
              />
            </div>

            {/* Revenue breakdown */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> Flujo de caja
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Adelantos cobrados', value: stats.revenue.advance_usd, color: 'text-emerald-400' },
                    { label: 'Finales cobrados', value: stats.revenue.final_usd, color: 'text-emerald-400' },
                    { label: 'Por cobrar (pipeline)', value: stats.revenue.pipeline_usd, color: 'text-yellow-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">{label}</span>
                      <span className={`font-mono font-bold ${color}`}>${value.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t border-gray-800 pt-3 flex justify-between">
                    <span className="text-white font-medium text-sm">Total cobrado</span>
                    <span className="font-mono font-bold text-white">${stats.revenue.total_usd.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Active pools mini-table */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-blue-400" /> Pools activos
                  </h3>
                  <a href="/admin/pools" className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                {stats.pools.list.length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-4">No hay pools activos</p>
                ) : (
                  <div className="space-y-2">
                    {stats.pools.list.map(pool => (
                      <div key={pool.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">
                            #{String(pool.pool_number).padStart(3, '0')}
                          </span>
                          <span className="text-white text-sm font-medium">
                            {CITY[pool.origin_city]} → Colón
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{pool.current_volume_m3.toFixed(1)} m³</span>
                          <span>Día {pool.day_number}/10</span>
                          <span className="text-blue-400">{pool.participants} clts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent shipments */}
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-5 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" /> Últimas llegadas
                </h3>
                <a href="/admin" className="text-xs text-gray-500 hover:text-white flex items-center gap-1">
                  Registrar nueva <ChevronRight className="w-3 h-3" />
                </a>
              </div>
              {stats.shipments.recent.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">Sin llegadas registradas aún</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-600 text-xs uppercase tracking-wider">
                        <th className="text-left py-2 pr-4">Cliente</th>
                        <th className="text-left py-2 pr-4">Origen</th>
                        <th className="text-right py-2 pr-4">Vol</th>
                        <th className="text-right py-2 pr-4">$/m³</th>
                        <th className="text-center py-2 pr-4">Adelanto</th>
                        <th className="text-center py-2">Final</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {stats.shipments.recent.map(s => (
                        <tr key={s.id} className="hover:bg-gray-800/50 transition-colors">
                          <td className="py-2.5 pr-4 font-mono font-bold text-white">{s.client_code}</td>
                          <td className="py-2.5 pr-4 text-gray-400">{CITY_FULL[s.origin_city]}</td>
                          <td className="py-2.5 pr-4 text-right text-gray-300">{s.volume_m3} m³</td>
                          <td className="py-2.5 pr-4 text-right font-mono text-emerald-400">
                            {s.price_per_m3 ? `$${s.price_per_m3}` : '—'}
                          </td>
                          <td className="py-2.5 pr-4 text-center">
                            {s.advance_paid
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                              : <Clock className="w-4 h-4 text-gray-600 mx-auto" />}
                          </td>
                          <td className="py-2.5 text-center">
                            {s.final_paid
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                              : <Clock className="w-4 h-4 text-gray-600 mx-auto" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Alerts section */}
            {stats.invoices.action_required > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-yellow-400 font-semibold mb-1">
                      {stats.invoices.action_required} facturas requieren atención
                    </p>
                    <p className="text-gray-400 text-sm">
                      {stats.invoices.pending > 0 && `${stats.invoices.pending} clientes no han subido su factura. `}
                      {stats.invoices.uploaded > 0 && `${stats.invoices.uploaded} facturas subidas esperan revisión de impuestos.`}
                    </p>
                    <a href="/admin/pools" className="inline-flex items-center gap-1 mt-3 text-yellow-400 text-sm hover:text-yellow-300 font-medium">
                      Ir a gestión de pools <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
