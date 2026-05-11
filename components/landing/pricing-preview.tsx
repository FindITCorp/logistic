import { PRICING_TIERS, formatCurrency, MARKET_RATE_DDP } from "@/lib/pricing/engine";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export function PricingPreview() {
  return (
    <section id="precios" className="py-24 bg-slate-50">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Precio dinámico por volumen del pool
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Conforme entra más carga al pool, el precio baja para <strong>todos</strong> los
            participantes. Tarifa de mercado actual:{" "}
            <strong className="text-red-600">{formatCurrency(MARKET_RATE_DDP)}/m³</strong>
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-4">
          {PRICING_TIERS.map((tier, i) => {
            const saving = Math.round(((MARKET_RATE_DDP - tier.ratePerM3) / MARKET_RATE_DDP) * 100);
            const maxVol = tier.maxVolume === Infinity ? 20 : tier.maxVolume;
            const progress = (maxVol / 20) * 100;
            const isFirst = i === 0;

            return (
              <div
                key={tier.label}
                className={`rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white shadow-sm ${
                  i === 2 ? "ring-2 ring-blue-600" : ""
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800">{tier.label}</span>
                    {i === 2 && (
                      <Badge variant="default" className="text-xs">Más popular</Badge>
                    )}
                    {isFirst && (
                      <Badge variant="outline" className="text-xs">Desde 0 m³</Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    {tier.minVolume} – {tier.maxVolume === Infinity ? "∞" : tier.maxVolume} m³ en el pool
                  </p>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="text-right min-w-[120px]">
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(tier.ratePerM3)}
                    <span className="text-sm font-normal text-slate-400">/m³</span>
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">
                      -{saving}% vs mercado
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          * Precios base DDP (entregado destino). Incluye flete marítimo, handling y agente aduanal.
          No incluye impuestos de importación.
        </p>
      </div>
    </section>
  );
}
