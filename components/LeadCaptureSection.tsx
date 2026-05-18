'use client'

import { useState } from 'react'
import { CheckCircle, ArrowRight, AlertCircle } from 'lucide-react'

const CITIES = [
  { value: 'guangzhou', label: 'Guangzhou' },
  { value: 'shenzhen',  label: 'Shenzhen'  },
  { value: 'shanghai',  label: 'Shanghai'  },
]

const VOLUMES = [
  { value: '0.5',  label: 'Menos de 1 m³ (paquetes pequeños)' },
  { value: '2',    label: '1 – 5 m³ (carga mediana)' },
  { value: '8',    label: '5 – 15 m³ (carga grande)' },
  { value: '20',   label: 'Más de 15 m³ (contenedor parcial)' },
]

export default function LeadCaptureSection() {
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    origin_city: 'guangzhou',
    monthly_volume_m3: '2',
    product_type: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.whatsapp) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          whatsapp: form.whatsapp,
          origin_city: form.origin_city as 'shanghai' | 'guangzhou' | 'shenzhen',
          monthly_volume_m3: parseFloat(form.monthly_volume_m3),
          product_type: form.product_type || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStep('done')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="pre-registro" className="bg-gradient-to-b from-slate-50 to-white py-20">
      <div className="container max-w-2xl">
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700 mb-4">
            Acceso anticipado — cupos limitados
          </span>
          <h2 className="text-3xl font-bold text-slate-900">
            Reserva tu lugar en el primer embarque
          </h2>
          <p className="mt-3 text-slate-500 max-w-lg mx-auto">
            Estamos abriendo el piloto con un grupo selecto de importadores. Regístrate y te contactamos en menos de 24 horas.
          </p>
        </div>

        {step === 'done' ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-10 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-14 h-14 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-emerald-800">¡Listo! Te contactamos pronto</h3>
            <p className="mt-3 text-emerald-700">
              Recibirás un mensaje de WhatsApp en las próximas horas con los detalles del piloto y tu código de cliente.
            </p>
            <p className="mt-4 text-sm text-emerald-600 font-medium">
              Mientras tanto, explora cómo funciona el sistema de precios dinámicos.
            </p>
            <a
              href="/pools"
              className="inline-block mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-500 transition-colors"
            >
              Ver pools activos
            </a>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tu nombre *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Carlos Rodríguez"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                  placeholder="+507 6000-0000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ¿Desde qué ciudad en China compras normalmente?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CITIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, origin_city: c.value })}
                    className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                      form.origin_city === c.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ¿Cuánto volumen mueves al mes, aproximadamente?
              </label>
              <div className="grid gap-2">
                {VOLUMES.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => setForm({ ...form, monthly_volume_m3: v.value })}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm text-left transition-colors ${
                      form.monthly_volume_m3 === v.value
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full border-2 flex-shrink-0 ${
                      form.monthly_volume_m3 === v.value ? 'border-brand-500 bg-brand-500' : 'border-slate-300'
                    }`} />
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ¿Qué tipo de productos importas? <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={form.product_type}
                onChange={(e) => setForm({ ...form, product_type: e.target.value })}
                placeholder="Ej: electrónicos, textiles, repuestos, juguetes..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-3.5 text-base font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Registrando...' : 'Quiero acceso anticipado'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>

            <p className="text-center text-xs text-slate-400">
              Sin spam. Solo te contactamos para coordinar tu primer embarque.
            </p>
          </form>
        )}
      </div>
    </section>
  )
}
