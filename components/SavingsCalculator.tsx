'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import {
  calculateClientPrice,
  selectShippingMode,
  FCL_BREAKEVEN_M3,
  MIN_ENTRY_M3,
  MARKET_RATE_CASILLERO,
  MARKET_RATE_LMA,
  type ShippingMode,
} from '@/lib/pricing'

const MODE_LABEL: Record<ShippingMode, string> = {
  LCL:    'LCL consolidado',
  FCL_20: 'Contenedor 20ft',
  FCL_40: 'Contenedor 40ft',
}

const MODE_ICON: Record<ShippingMode, string> = {
  LCL:    '📦',
  FCL_20: '🚢',
  FCL_40: '🚢',
}

export default function SavingsCalculator() {
  const [volume, setVolume]       = useState(2)
  const [day, setDay]             = useState(3)
  const [poolVolume, setPoolVol]  = useState(12) // current pool fill
  const [compare, setCompare]     = useState<'casillero' | 'lma'>('casillero')

  const competitorRate  = compare === 'casillero' ? MARKET_RATE_CASILLERO : MARKET_RATE_LMA
  const competitorLabel = compare === 'casillero'
    ? `Casillero Panamá ($${MARKET_RATE_CASILLERO}/m³)`
    : `LMA Global ($${MARKET_RATE_LMA}/m³)`

  const result   = calculateClientPrice(day, poolVolume)
  const mode     = selectShippingMode(poolVolume)
  const poolPrice = Math.round(result.clientPrice)

  const myCost        = Math.round(volume * poolPrice)
  const competitorCost = Math.round(volume * competitorRate)
  const savings       = competitorCost - myCost
  const savingsPct    = Math.round((savings / competitorCost) * 100)

  const switchToFCL = poolVolume < FCL_BREAKEVEN_M3
    ? FCL_BREAKEVEN_M3 - poolVolume
    : null

  return (
    <section className="bg-gradient-to-br from-brand-900 to-brand-700 py-20 text-white">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-medium text-blue-200 mb-4">
            Calculadora de ahorro
          </span>
          <h2 className="text-3xl font-bold">¿Cuánto ahorrarías tú?</h2>
          <p className="mt-3 text-blue-200 max-w-lg mx-auto">
            Compara lo que pagas hoy vs. tu precio en un pool FINDIT.
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm p-6 sm:p-8 space-y-6">

          {/* Comparar contra */}
          <div>
            <p className="text-xs text-blue-300 mb-2 text-center">Comparar contra:</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCompare('casillero')}
                className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-colors ${
                  compare === 'casillero'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-blue-300 hover:bg-white/10'
                }`}
              >
                Casillero Panamá<br/>
                <span className="text-xs font-bold text-red-300">${MARKET_RATE_CASILLERO}/m³</span>
              </button>
              <button
                onClick={() => setCompare('lma')}
                className={`flex-1 rounded-lg py-2 px-3 text-sm font-medium transition-colors ${
                  compare === 'lma'
                    ? 'bg-white/20 text-white'
                    : 'bg-white/5 text-blue-300 hover:bg-white/10'
                }`}
              >
                LMA Global<br/>
                <span className="text-xs font-bold text-amber-300">${MARKET_RATE_LMA}/m³</span>
              </button>
            </div>
          </div>

          {/* Tu volumen */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-blue-100">Tu carga</label>
              <span className="text-lg font-bold text-white">{volume} m³</span>
            </div>
            <input
              type="range" min={MIN_ENTRY_M3} max="20" step="0.5"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="flex justify-between text-xs text-blue-300 mt-1">
              <span>0.5 m³ mín.</span><span>5 m³</span><span>10 m³</span><span>20 m³</span>
            </div>
          </div>

          {/* Día de entrada */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-blue-100">¿Qué día te unirías?</label>
              <span className="text-lg font-bold text-white">Día {day}</span>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="flex justify-between text-xs text-blue-300 mt-1">
              <span>Día 1 · más ahorro</span>
              <span>Día 10 · menos</span>
            </div>
          </div>

          {/* Volumen del pool actual */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-blue-100">Volumen del pool hoy</label>
              <div className="flex items-center gap-2">
                <span className="text-sm">{MODE_ICON[mode]}</span>
                <span className="text-sm font-semibold text-emerald-300">{MODE_LABEL[mode]}</span>
                <span className="text-lg font-bold text-white">{poolVolume} m³</span>
              </div>
            </div>
            <input
              type="range" min="0" max="55" step="1"
              value={poolVolume}
              onChange={(e) => setPoolVol(parseInt(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="flex justify-between text-xs text-blue-300 mt-1">
              <span>0 m³</span>
              <span className="text-amber-300">↑ FCL a {FCL_BREAKEVEN_M3} m³</span>
              <span>55 m³</span>
            </div>
            {switchToFCL !== null && (
              <p className="text-xs text-amber-300 mt-1 text-center">
                Con {switchToFCL} m³ más el pool cambia a contenedor FCL y el precio baja más
              </p>
            )}
          </div>

          {/* Resultados */}
          <div className="grid gap-4 sm:grid-cols-3 mt-2">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <p className="text-xs text-blue-300 mb-1">{competitorLabel}</p>
              <p className="text-2xl font-extrabold text-red-300">${competitorCost.toLocaleString()}</p>
              <p className="text-xs text-blue-400">${competitorRate}/m³</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <p className="text-xs text-blue-300 mb-1">Con FINDIT · {MODE_LABEL[mode]}</p>
              <p className="text-2xl font-extrabold text-emerald-300">${myCost.toLocaleString()}</p>
              <p className="text-xs text-blue-400">${poolPrice}/m³ flete</p>
            </div>
            <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-4 text-center">
              <p className="text-xs text-emerald-300 mb-1">Tu ahorro</p>
              <p className="text-2xl font-extrabold text-emerald-300">${savings.toLocaleString()}</p>
              <p className="text-xs text-emerald-400 font-semibold">{savingsPct}% menos</p>
            </div>
          </div>

          <p className="text-xs text-blue-400 text-center">
            * Flete base LCL. Aduanas, impuestos y entrega final van por separado.
            LMA Global publica $285/m³ bodega-a-bodega (sin aduanas). El ahorro real depende del pool.
          </p>

          <a
            href="#pre-registro"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-3.5 text-base font-semibold text-white transition-colors"
          >
            Quiero este precio
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  )
}
