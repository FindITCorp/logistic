'use client'

import { useState, useEffect } from 'react'
import { FileUp, CheckCircle, AlertCircle, Upload, Package } from 'lucide-react'

interface ShipmentInfo {
  client_code: string
  origin_city: string
  weight_kg: number
  volume_m3: number
  client_name: string
}

export default function FacturaUploadPage({ params }: { params: { token: string } }) {
  const [shipment, setShipment] = useState<ShipmentInfo | null>(null)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [form, setForm] = useState({
    declared_value_usd: '',
    description: '',
    product_type: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Validate token and get shipment info
    fetch(`/api/invoices/token/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.shipment) {
          setShipment(d.shipment)
          setTokenValid(true)
        } else {
          setTokenValid(false)
        }
      })
      .catch(() => setTokenValid(false))
  }, [params.token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setUploading(true)

    try {
      let fileUrl: string | undefined
      let fileName: string | undefined

      // Upload file to Supabase Storage if provided
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('token', params.token)
        const uploadRes = await fetch('/api/invoices/upload', {
          method: 'POST',
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.error)
        fileUrl = uploadData.url
        fileName = uploadData.name
      }

      // Submit invoice metadata
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: params.token,
          declared_value_usd: parseFloat(form.declared_value_usd),
          description: form.description,
          product_type: form.product_type || undefined,
          file_url: fileUrl,
          file_name: fileName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setUploading(false)
    }
  }

  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-2xl border border-red-500/30 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Enlace inválido o expirado</h1>
          <p className="text-gray-400 text-sm">
            Este enlace ya no es válido. Escríbenos por WhatsApp y te enviamos uno nuevo.
          </p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-2xl border border-emerald-500/30 p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">¡Factura enviada!</h1>
          <p className="text-gray-400 text-sm mb-4">
            Recibimos tu documentación para la carga <strong className="text-emerald-400">{shipment?.client_code}</strong>.
            Te avisaremos cuando tu mercancía esté lista para retirar en Tocumen.
          </p>
          <div className="bg-gray-800 rounded-xl p-4 text-left text-sm text-gray-300 space-y-1">
            <p>📦 Origen: <span className="text-white capitalize">{shipment?.origin_city}</span></p>
            <p>⚖️ Peso: <span className="text-white">{shipment?.weight_kg} kg</span></p>
            <p>📐 Volumen: <span className="text-white">{shipment?.volume_m3} m³</span></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-500/10 p-2 rounded-xl">
            <FileUp className="text-emerald-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Sube tu factura</h1>
            <p className="text-gray-400 text-sm">Necesaria para la declaración aduanal en Panamá</p>
          </div>
        </div>

        {/* Shipment summary */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 mb-6 flex items-center gap-3">
          <Package className="text-emerald-400 w-5 h-5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-mono font-bold">{shipment?.client_code}</p>
            <p className="text-gray-400 text-sm capitalize">
              {shipment?.origin_city} · {shipment?.weight_kg} kg · {shipment?.volume_m3} m³
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-5">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              ¿Qué es tu mercancía? *
            </label>
            <input
              type="text"
              required
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Ej: Ropa de mujer, accesorios electrónicos, herramientas"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
            />
          </div>

          {/* Declared value */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Valor declarado (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={form.declared_value_usd}
                onChange={e => setForm({ ...form, declared_value_usd: e.target.value })}
                placeholder="0.00"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 text-sm"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">
              Valor del producto según tu factura del proveedor (lo que pagaste)
            </p>
          </div>

          {/* Product type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tipo de producto</label>
            <select
              value={form.product_type}
              onChange={e => setForm({ ...form, product_type: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500 text-sm"
            >
              <option value="">Seleccionar...</option>
              <option value="ropa">Ropa y textiles</option>
              <option value="electronica">Electrónica</option>
              <option value="herramientas">Herramientas</option>
              <option value="juguetes">Juguetes</option>
              <option value="cosmeticos">Cosméticos / cuidado personal</option>
              <option value="hogar">Artículos del hogar</option>
              <option value="otros">Otros</option>
            </select>
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Factura del proveedor <span className="text-gray-500">(PDF, JPG o PNG)</span>
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 bg-gray-800 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors">
              <Upload className="w-6 h-6 text-gray-500 mb-2" />
              <span className="text-sm text-gray-400">
                {file ? file.name : 'Haz clic para adjuntar o arrastra aquí'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <p className="text-gray-500 text-xs mt-1">
              Si no tienes la factura ahora, puedes enviar solo el valor declarado y subirla después.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl transition-colors"
          >
            {uploading ? 'Enviando...' : 'Enviar información'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-4">
          FINDIT Logistics · Información protegida y usada únicamente para declaración aduanal
        </p>
      </div>
    </div>
  )
}
