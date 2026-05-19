'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

const CURRENT_MARKET_RATE = 500 // avg DDP rate importers pay today

function calcPoolPrice(volumeM3: number, dayJoined: number): number {
  // Naviero cost per tier
  let navieroCost: number
  if (volumeM3 < 5) navieroCost = 100
  else if (volumeM3 < 15) navieroCost = 90
  else if (volumeM3 < 20) navieroCost = 85
  else navieroCost = 80

  const savings = 100 - navieroCost
  const daysLeft = Math.max(1, 11 - dayJoined)
  const clientPct = Math.max(10, daysLeft * 10)
  return Math.round((100 - savings * (clientPct / 100)) * 10) / 10
}

export default function SavingsCalculator() {
  const [volume, setVolume] = useState(2)
  const [day, setDay] = useState(3)

  const currentCost = Math.round(volume * CURRENT_MARKET_RATE)
  const poolPrice = calcPoolPrice(18, day) // assume pool at 18m³ when they join
  const poolCost = Math.round(volume * poolPrice)
  const savings = currentCost - poolCost
  const savingsPct = Math.round((savings / currentCost) * 100)

  return (
    <section className="bg-gradient-to-br from-brand-900 to-brand-700 py-20 text-white">
      <div className="container max-w-3xl">
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-medium text-blue-200 mb-4">
            Calculadora de ahorro
          </span>
          <h2 className="text-3xl font-bold">
            ¿Cuánto ahorrarías tú?
          </h2>
          <p className="mt-3 text-blue-200 max-w-lg mx-auto">
            Compara lo que pagas hoy vs. lo que pagarías en un pool FINDIT.
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm p-6 sm:p-8 space-y-6">
          {/* Volume slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-blue-100">Volumen de tu carga</label>
              <span className="text-lg font-bold text-white">{volume} m³</span>
            </div>
            <input
              type="range" min="0.5" max="20" step="0.5"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="flex justify-between text-xs text-blue-300 mt-1">
              <span>0.5 m³</span><span>5 m³</span><span>10 m³</span><span>20 m³</span>
            </div>
          </div>

          {/* Day slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-blue-100">¿Qué día te unirías al pool?</label>
              <span className="text-lg font-bold text-white">Día {day}</span>
            </div>
            <input
              type="range" min="1" max="10" step="1"
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <div className="flex justify-between text-xs text-blue-300 mt-1">
              <span>Día 1<br/>más ahorro</span>
              <span className="text-center">Día 5</span>
              <span className="text-right">Día 10<br/>menos ahorro</span>
            </div>
          </div>

          {/* Results */}
          <div className="grid gap-4 sm:grid-cols-3 mt-2">
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <p className="text-xs text-blue-300 mb-1">Pagas hoy (DDP)</p>
              <p className="text-2xl font-extrabold text-red-300">${currentCost.toLocaleString()}</p>
              <p className="text-xs text-blue-400">≈${CURRENT_MARKET_RATE}/m³</p>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-center">
              <p className="text-xs text-blue-300 mb-1">Con FINDIT</p>
              <p className="text-2xl font-extrabold text-emerald-300">${poolCost.toLocaleString()}</p>
              <p className="text-xs text-blue-400">≈${poolPrice}/m³ flete</p>
            </div>
            <div className="rounded-xl bg-emerald-500/20 border border-emerald-400/40 p-4 text-center">
              <p className="text-xs text-emerald-300 mb-1">Tu ahorro</p>
              <p className="text-2xl font-extrabold text-emerald-300">${savings.toLocaleString()}</p>
              <p className="text-xs text-emerald-400 font-semibold">{savingsPct}% menos</p>
            </div>
          </div>

          <p className="text-xs text-blue-400 text-center">
            * Cálculo basado en flete LCL base. Tarifa actual de mercado DDP estimada en $500/m³.
            El precio final incluye todos los cargos de FINDIT.
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
