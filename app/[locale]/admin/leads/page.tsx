'use client'

import { useEffect, useState } from 'react'
import { Users, PhoneCall, CheckCircle, XCircle, Clock, MessageCircle } from 'lucide-react'

interface Lead {
  id: string
  name: string
  whatsapp: string | null
  email: string | null
  origin_city: string | null
  monthly_volume_m3: number | null
  product_type: string | null
  status: string
  created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  new:       { label: 'Nuevo',      color: 'bg-blue-100 text-blue-700',    icon: Clock },
  contacted: { label: 'Contactado', color: 'bg-amber-100 text-amber-700',  icon: PhoneCall },
  converted: { label: 'Cliente',    color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  lost:      { label: 'Perdido',    color: 'bg-red-100 text-red-600',      icon: XCircle },
}

const CITY_LABELS: Record<string, string> = {
  guangzhou: 'Guangzhou',
  shenzhen: 'Shenzhen',
  shanghai: 'Shanghai',
}

function buildWaMessage(lead: Lead): string {
  return encodeURIComponent(
    `Hola ${lead.name}, soy del equipo FINDIT Logistic 🚢\n\n` +
    `Vi que te interesaste en nuestro servicio de consolidación LCL China → Panamá.\n\n` +
    `Tenemos el piloto abierto con cupos limitados. Con el volumen que mencionas (~${lead.monthly_volume_m3 ?? '?'} m³/mes desde ${CITY_LABELS[lead.origin_city ?? ''] ?? lead.origin_city ?? 'China'}), podrías ahorrar entre 10–25% en flete.\n\n` +
    `¿Tienes 10 minutos esta semana para conversar? 🙏`
  )
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  async function load() {
    const res = await fetch('/api/leads')
    const data = await res.json()
    setLeads(data.leads ?? [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: string) {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter)

  const counts = {
    all: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    contacted: leads.filter(l => l.status === 'contacted').length,
    converted: leads.filter(l => l.status === 'converted').length,
  }

  const totalVolume = leads
    .filter(l => l.status !== 'lost')
    .reduce((sum, l) => sum + (l.monthly_volume_m3 ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-500/10 p-2 rounded-xl">
            <Users className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Leads / Interesados</h1>
            <p className="text-gray-400 text-sm">Clientes potenciales del landing</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total leads', value: counts.all, color: 'text-white' },
            { label: 'Sin contactar', value: counts.new, color: 'text-blue-400' },
            { label: 'Contactados', value: counts.contacted, color: 'text-amber-400' },
            { label: 'Volumen potencial', value: `${totalVolume.toFixed(1)} m³/mes`, color: 'text-emerald-400' },
          ].map(k => (
            <div key={k.label} className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs text-gray-400">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['all', 'new', 'contacted', 'converted', 'lost'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {s === 'all' ? `Todos (${counts.all})` : STATUS_LABELS[s]?.label ?? s}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-12">Cargando...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No hay leads aún. Comparte el link del landing y vuelve aquí.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(lead => {
              const s = STATUS_LABELS[lead.status] ?? STATUS_LABELS.new
              const Icon = s.icon
              return (
                <div key={lead.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-white">{lead.name}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-gray-400">
                        {lead.whatsapp && <span>{lead.whatsapp}</span>}
                        {lead.origin_city && <span>{CITY_LABELS[lead.origin_city] ?? lead.origin_city}</span>}
                        {lead.monthly_volume_m3 && <span>{lead.monthly_volume_m3} m³/mes</span>}
                        {lead.product_type && <span className="text-gray-500">{lead.product_type}</span>}
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        {new Date(lead.created_at).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {lead.whatsapp && (
                        <a
                          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}?text=${buildWaMessage(lead)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Contactar
                        </a>
                      )}
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="new">Nuevo</option>
                        <option value="contacted">Contactado</option>
                        <option value="converted">Convertido</option>
                        <option value="lost">Perdido</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
