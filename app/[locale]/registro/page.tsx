'use client'

import { useState } from 'react'
import { Package, CheckCircle, Copy, Check } from 'lucide-react'
import type { Client } from '@/lib/supabase/database.types'
import { WAREHOUSE_CHINA } from '@/lib/clients'

interface RegistrationSuccess {
  client: Client
  shippingAddress: string
}

export default function RegistroPage() {
  const [form, setForm] = useState({
    name: '',
    whatsapp: '',
    email: '',
    assignment_mode: 'auto' as 'auto' | 'manual',
    notify_by: 'whatsapp' as 'whatsapp' | 'email' | 'both',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<RegistrationSuccess | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const client: Client = data.client
      const shippingAddress = [
        `${client.name} | ${client.client_code}`,
        WAREHOUSE_CHINA.name,
        WAREHOUSE_CHINA.address,
        WAREHOUSE_CHINA.city,
        WAREHOUSE_CHINA.country,
        `Tel: ${WAREHOUSE_CHINA.phone}`,
      ].join('\n')

      setSuccess({ client, shippingAddress })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  async function copyAddress() {
    if (!success) return
    await navigator.clipboard.writeText(success.shippingAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
        <div className="max-w-lg w-full">
          <div className="bg-gray-900 rounded-2xl border border-green-500/30 p-8">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="text-green-400 w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold text-white">¡Registro exitoso!</h1>
                <p className="text-gray-400 text-sm">Bienvenido a FINDIT Logistics</p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 mb-6">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Tu código de cliente</p>
              <p className="text-3xl font-mono font-bold text-emerald-400">{success.client.client_code}</p>
              <p className="text-gray-500 text-sm mt-1">Guarda este código — lo necesitas para todos tus envíos</p>
            </div>

            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-semibold text-sm">Dirección de envío en China</p>
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 font-mono text-sm text-gray-200 whitespace-pre-line border border-gray-700">
                {success.shippingAddress}
              </div>
              <p className="text-yellow-400/80 text-xs mt-2">
                Coloca esta dirección exactamente como aparece en AliExpress o donde compres.
                Tu código <strong>{success.client.client_code}</strong> identifica tu carga al llegar.
              </p>
            </div>

            <div className="bg-gray-800 rounded-xl p-4 text-sm">
              <p className="text-gray-400 font-medium mb-2">Tu configuración</p>
              <div className="flex justify-between text-gray-300">
                <span>Asignación de pool</span>
                <span className="font-medium text-white">
                  {success.client.assignment_mode === 'auto' ? 'Automática (mejor descuento)' : 'Manual (tú eliges)'}
                </span>
              </div>
              <div className="flex justify-between text-gray-300 mt-1">
                <span>Notificaciones</span>
                <span className="font-medium text-white capitalize">{success.client.notify_by}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-500/10 p-2 rounded-xl">
            <Package className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Crear cuenta</h1>
            <p className="text-gray-400 text-sm">Recibe tu código de cliente y dirección de envío en China</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Nombre completo *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="Ej. Enrique García"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">WhatsApp</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="+507 6000-0000"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
              placeholder="tu@correo.com"
            />
          </div>

          {/* Assignment mode */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Asignación de pool</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, assignment_mode: 'auto' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.assignment_mode === 'auto'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <p className="font-semibold text-sm">Automático</p>
                <p className="text-xs mt-0.5 opacity-70">Sistema elige el mejor descuento</p>
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, assignment_mode: 'manual' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  form.assignment_mode === 'manual'
                    ? 'border-emerald-500 bg-emerald-500/10 text-white'
                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                }`}
              >
                <p className="font-semibold text-sm">Manual</p>
                <p className="text-xs mt-0.5 opacity-70">Tú eliges el pool cuando llega</p>
              </button>
            </div>
          </div>

          {/* Notify by */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Notificarme por</label>
            <div className="grid grid-cols-3 gap-2">
              {(['whatsapp', 'email', 'both'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setForm({ ...form, notify_by: opt })}
                  className={`py-2 rounded-lg border text-sm font-medium transition-all ${
                    form.notify_by === opt
                      ? 'border-emerald-500 bg-emerald-500/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  {opt === 'whatsapp' ? 'WhatsApp' : opt === 'email' ? 'Email' : 'Ambos'}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors"
          >
            {loading ? 'Registrando...' : 'Crear cuenta y obtener mi código'}
          </button>
        </form>
      </div>
    </div>
  )
}
