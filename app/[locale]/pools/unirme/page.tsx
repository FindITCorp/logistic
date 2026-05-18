'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { calculateClientPrice } from '@/lib/pricing'
import type { Pool } from '@/lib/supabase/database.types'

interface PoolWithPrice extends Pool {
  estimatedPrice: number
  discount: number
}

export default function UnirmePage() {
  const searchParams = useSearchParams()
  const shipmentId = searchParams.get('shipment')

  const [pools, setPools] = useState<PoolWithPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [assigning, setAssigning] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<{ pool: Pool; price: number } | null>(null)
  const shipmentVolume = 0.5

  useEffect(() => {
    async function loadPools() {
      try {
        const res = await fetch('/api/pools')
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        const withPrices: PoolWithPrice[] = (data.pools as Pool[]).map((pool) => {
          const { clientPrice, clientDiscount } = calculateClientPrice(pool.day_number, pool.current_volume_m3 + shipmentVolume)
          return { ...pool, estimatedPrice: clientPrice, discount: clientDiscount }
        })
        withPrices.sort((a, b) => a.estimatedPrice - b.estimatedPrice)
        setPools(withPrices)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error cargando pools')
      } finally {
        setLoading(false)
      }
    }
    loadPools()
  }, [shipmentVolume])

  async function joinPool(poolId: string) {
    if (!shipmentId) return
    setAssigning(true)
    setError('')
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_id: poolId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const pool = pools.find((p) => p.id === poolId)!
      setSuccess({ pool, price: data.price_per_m3 })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al unirse')
    } finally {
      setAssigning(false)
    }
  }

  const cityLabel: Record<string, string> = {
    shanghai: 'Shanghai',
    guangzhou: 'Guangzhou',
    shenzhen: 'Shenzhen',
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-gray-900 rounded-2xl border border-green-500/30 p-8 text-center">
          <CheckCircle className="text-green-400 w-12 h-12 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">¡Te uniste al pool!</h1>
          <p className="text-gray-400 mb-4">
            {cityLabel[success.pool.origin_city]} → Colón, Panamá
          </p>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-gray-400 text-sm">Tu precio confirmado</p>
            <p className="text-3xl font-bold text-emerald-400">${success.price}/m³</p>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            Te notificaremos cuando el pool cierre y el embarque salga.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-2">Elige tu pool</h1>
        <p className="text-gray-400 text-sm mb-6">
          Selecciona el pool donde quieres consolidar tu carga. Los precios se muestran del mejor al peor descuento.
        </p>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-emerald-400 w-8 h-8 animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-3">
          {pools.map((pool, idx) => (
            <div
              key={pool.id}
              className={`bg-gray-900 rounded-2xl border p-5 ${idx === 0 ? 'border-emerald-500/50' : 'border-gray-800'}`}
            >
              {idx === 0 && (
                <span className="inline-block bg-emerald-500/20 text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-full mb-3">
                  Mejor descuento
                </span>
              )}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-white">{cityLabel[pool.origin_city]} → Colón</p>
                  <p className="text-gray-400 text-sm mt-0.5">
                    Día {pool.day_number}/10 · {pool.current_volume_m3.toFixed(1)} m³ acumulado · {pool.participants} participantes
                  </p>
                  {pool.discount > 0 && (
                    <p className="text-emerald-400 text-sm mt-1">Ahorras ${pool.discount.toFixed(2)}/m³</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-white">${pool.estimatedPrice.toFixed(2)}</p>
                  <p className="text-gray-500 text-xs">/m³</p>
                </div>
              </div>
              <button
                onClick={() => joinPool(pool.id)}
                disabled={assigning || !shipmentId}
                className="mt-4 w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-2.5 rounded-xl text-sm transition-colors"
              >
                {assigning ? 'Procesando...' : 'Unirme a este pool'}
              </button>
              {!shipmentId && (
                <p className="text-yellow-400/70 text-xs mt-2 text-center">Link de envío requerido</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
