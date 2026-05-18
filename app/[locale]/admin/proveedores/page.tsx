'use client'

import { useState, useEffect } from 'react'
import { Plus, Truck, Trash2, ChevronDown, ChevronUp, DollarSign, Edit3 } from 'lucide-react'

interface ProviderRate {
  id: string
  origin_city: string
  min_volume_m3: number
  max_volume_m3: number | null
  rate_per_m3: number
  notes: string | null
}

interface Provider {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  contact_whatsapp: string | null
  notes: string | null
  is_active: boolean
  rates: ProviderRate[]
}

const CITY_LABEL: Record<string, string> = {
  shanghai: 'Shanghai', guangzhou: 'Guangzhou', shenzhen: 'Shenzhen',
}

function RateRow({ rate, providerId, onDelete }: {
  rate: ProviderRate
  providerId: string
  onDelete: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  async function del() {
    setDeleting(true)
    await fetch(`/api/providers/${providerId}/rates?rate_id=${rate.id}`, { method: 'DELETE' })
    onDelete()
  }
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0 text-sm">
      <span className="text-gray-400 w-24">{CITY_LABEL[rate.origin_city]}</span>
      <span className="text-gray-500 flex-1 font-mono text-xs">
        {rate.min_volume_m3}m³ — {rate.max_volume_m3 != null ? `${rate.max_volume_m3}m³` : '∞'}
      </span>
      <span className="text-emerald-400 font-bold font-mono">${rate.rate_per_m3}/m³</span>
      {rate.notes && <span className="text-gray-600 text-xs truncate max-w-32">{rate.notes}</span>}
      <button onClick={del} disabled={deleting} className="text-gray-700 hover:text-red-400 transition-colors ml-1">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function AddRateForm({ providerId, onAdded }: { providerId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    origin_city: 'guangzhou', min_volume_m3: '0', max_volume_m3: '', rate_per_m3: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/providers/${providerId}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_city: form.origin_city,
          min_volume_m3: parseFloat(form.min_volume_m3),
          max_volume_m3: form.max_volume_m3 ? parseFloat(form.max_volume_m3) : null,
          rate_per_m3: parseFloat(form.rate_per_m3),
          notes: form.notes || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      setForm({ origin_city: 'guangzhou', min_volume_m3: '0', max_volume_m3: '', rate_per_m3: '', notes: '' })
      onAdded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-600 hover:text-emerald-400 py-2 border border-dashed border-gray-800 hover:border-emerald-500/40 rounded-lg transition-colors mt-2">
      <Plus className="w-3 h-3" /> Agregar tramo de precio
    </button>
  )

  return (
    <form onSubmit={save} className="mt-2 bg-gray-800 rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Ciudad origen</label>
          <select value={form.origin_city} onChange={e => setForm({ ...form, origin_city: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500">
            <option value="guangzhou">Guangzhou</option>
            <option value="shenzhen">Shenzhen</option>
            <option value="shanghai">Shanghai</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Precio /m³ (USD)</label>
          <input type="number" step="0.01" required value={form.rate_per_m3}
            onChange={e => setForm({ ...form, rate_per_m3: e.target.value })}
            placeholder="30.00"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Vol. mínimo (m³)</label>
          <input type="number" step="0.1" value={form.min_volume_m3}
            onChange={e => setForm({ ...form, min_volume_m3: e.target.value })}
            placeholder="0"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Vol. máximo (m³, vacío=∞)</label>
          <input type="number" step="0.1" value={form.max_volume_m3}
            onChange={e => setForm({ ...form, max_volume_m3: e.target.value })}
            placeholder="∞"
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-emerald-500" />
        </div>
      </div>
      <input type="text" value={form.notes}
        onChange={e => setForm({ ...form, notes: e.target.value })}
        placeholder="Nota opcional (ej. incluye manejo en bodega)"
        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-emerald-500" />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)}
          className="flex-1 py-1.5 rounded-lg border border-gray-600 text-gray-400 text-xs hover:border-gray-500">Cancelar</button>
        <button type="submit" disabled={saving}
          className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs disabled:opacity-50">
          {saving ? 'Guardando...' : 'Agregar tramo'}
        </button>
      </div>
    </form>
  )
}

function ProviderCard({ provider, onRefresh }: { provider: Provider; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false)

  // Group rates by city
  const byCityRates = provider.rates.reduce<Record<string, ProviderRate[]>>((acc, r) => {
    if (!acc[r.origin_city]) acc[r.origin_city] = []
    acc[r.origin_city].push(r)
    return acc
  }, {})

  return (
    <div className={`bg-gray-900 rounded-2xl border ${provider.is_active ? 'border-gray-800' : 'border-gray-800 opacity-60'} overflow-hidden`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/10 p-2 rounded-xl">
              <Truck className="text-blue-400 w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-bold">{provider.name}</p>
                {!provider.is_active && <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">Inactivo</span>}
              </div>
              {provider.contact_name && (
                <p className="text-gray-400 text-sm">Contacto: {provider.contact_name}
                  {provider.contact_whatsapp && ` · ${provider.contact_whatsapp}`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-xs">{provider.rates.length} tramos</span>
            <button onClick={() => setExpanded(!expanded)} className="text-gray-600 hover:text-gray-400">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Quick rate summary */}
        {!expanded && provider.rates.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(byCityRates).map(([city, rates]) => {
              const minRate = Math.min(...rates.map(r => r.rate_per_m3))
              const maxRate = Math.max(...rates.map(r => r.rate_per_m3))
              return (
                <span key={city} className="bg-gray-800 px-2.5 py-1 rounded-full text-xs text-gray-300">
                  {CITY_LABEL[city]}: <span className="text-emerald-400 font-bold">
                    ${minRate === maxRate ? minRate : `${minRate}–${maxRate}`}/m³
                  </span>
                </span>
              )
            })}
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4">
          {provider.notes && (
            <p className="text-gray-500 text-sm mb-4 bg-gray-800 rounded-xl p-3">{provider.notes}</p>
          )}

          <p className="text-xs text-gray-600 uppercase tracking-widest mb-3 flex items-center gap-1">
            <DollarSign className="w-3 h-3" /> Tabla de precios por volumen
          </p>

          {provider.rates.length === 0 && (
            <p className="text-gray-600 text-sm mb-2">Sin tramos configurados — el sistema usará precios por defecto</p>
          )}

          {Object.entries(byCityRates).map(([city, rates]) => (
            <div key={city} className="mb-4">
              <p className="text-gray-500 text-xs font-semibold mb-2">{CITY_LABEL[city]}</p>
              <div className="bg-gray-800 rounded-xl px-3 py-1">
                {rates
                  .sort((a, b) => a.min_volume_m3 - b.min_volume_m3)
                  .map(r => (
                    <RateRow key={r.id} rate={r} providerId={provider.id} onDelete={onRefresh} />
                  ))}
              </div>
            </div>
          ))}

          <AddRateForm providerId={provider.id} onAdded={onRefresh} />

          {provider.rates.length > 0 && (
            <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-400">
              <p className="font-semibold mb-1">Impacto en el modelo de precios</p>
              <p className="text-gray-400">
                Con precio de referencia $100/m³ y tasa base ${Math.min(...provider.rates.map(r => r.rate_per_m3))}/m³ del proveedor,
                el margen bruto máximo es{' '}
                <span className="text-emerald-400 font-bold">
                  ${(100 - Math.min(...provider.rates.map(r => r.rate_per_m3))).toFixed(2)}/m³
                </span>
                {' '}para distribuir entre clientes y FINDIT.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AddProviderForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', contact_name: '', contact_email: '', contact_whatsapp: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setOpen(false)
      setForm({ name: '', contact_name: '', contact_email: '', contact_whatsapp: '', notes: '' })
      onAdded()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-800 hover:border-blue-500/40 rounded-2xl p-5 text-gray-500 hover:text-blue-400 transition-colors">
      <Plus className="w-5 h-5" /> Agregar proveedor logístico
    </button>
  )

  return (
    <div className="bg-gray-900 rounded-2xl border border-blue-500/30 p-5">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <Truck className="w-4 h-4 text-blue-400" /> Nuevo proveedor
      </h3>
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Nombre del proveedor *</label>
          <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. TJ-China Freight"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nombre del contacto</label>
            <input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })}
              placeholder="Ej. Zoe"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">WhatsApp</label>
            <input value={form.contact_whatsapp} onChange={e => setForm({ ...form, contact_whatsapp: e.target.value })}
              placeholder="+86 XXX XXXX"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Email</label>
          <input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })}
            placeholder="zoe@tjfreight.com"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Notas operacionales</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={2}
            placeholder="Ej. Cutoff lunes, ETD lunes siguiente. TT ~35 días. Manzanillo + Balboa."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setOpen(false)}
            className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm">Cancelar</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm disabled:opacity-50">
            {saving ? 'Guardando...' : 'Crear proveedor'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ProveedoresPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/providers')
    const data = await res.json()
    setProviders(data.providers ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-500/10 p-2 rounded-xl">
            <Truck className="text-blue-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Proveedores logísticos</h1>
            <p className="text-gray-400 text-sm">Configura tarifas por proveedor — el sistema elige el más barato por pool</p>
          </div>
        </div>

        {loading && <div className="text-center py-20 text-gray-600">Cargando...</div>}

        {!loading && (
          <div className="space-y-4">
            {providers.map(p => (
              <ProviderCard key={p.id} provider={p} onRefresh={load} />
            ))}
            <AddProviderForm onAdded={load} />
          </div>
        )}

        {!loading && providers.length > 0 && (
          <div className="mt-6 bg-gray-900 rounded-2xl border border-gray-800 p-4 text-sm">
            <p className="text-gray-400 font-semibold mb-2 flex items-center gap-1">
              <Edit3 className="w-4 h-4" /> Cómo funciona la selección automática
            </p>
            <p className="text-gray-500 text-sm">
              Al crear un pool, el sistema consulta las tarifas de todos los proveedores activos
              para la ciudad de origen y selecciona el de menor costo para el volumen proyectado.
              Puedes cambiar el proveedor manualmente en el detalle de cada pool.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
