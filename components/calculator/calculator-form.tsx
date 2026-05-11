"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  calculateBillableVolume,
  calculateShipmentPrice,
  formatCurrency,
  formatVolume,
  PRICING_TIERS,
} from "@/lib/pricing/engine";
import { TrendingDown, Package, DollarSign, ArrowRight, Info } from "lucide-react";

interface Fields {
  weight: string;
  length: string;
  width: string;
  height: string;
  poolVolume: string;
}

const DEFAULT_POOL = "4.2";

export function CalculatorForm() {
  const [fields, setFields] = useState<Fields>({
    weight: "",
    length: "",
    width: "",
    height: "",
    poolVolume: DEFAULT_POOL,
  });
  const [result, setResult] = useState<ReturnType<typeof calculateShipmentPrice> | null>(null);
  const [volume, setVolume] = useState<ReturnType<typeof calculateBillableVolume> | null>(null);
  const [error, setError] = useState("");

  function set(k: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((p) => ({ ...p, [k]: e.target.value }));
  }

  function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const w = Number(fields.weight);
    const l = Number(fields.length);
    const wi = Number(fields.width);
    const h = Number(fields.height);
    const pv = Number(fields.poolVolume);

    if (!w || !l || !wi || !h) {
      setError("Completa peso y dimensiones.");
      return;
    }

    const vol = calculateBillableVolume(w, l, wi, h);
    const res = calculateShipmentPrice(vol.billableM3, pv || 0);
    setVolume(vol);
    setResult(res);
  }

  const poolPct = result
    ? Math.min(100, (Number(fields.poolVolume) / 15) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Package className="h-5 w-5 text-blue-600" />
            Datos de tu carga
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCalculate} className="space-y-5">
            <div>
              <Label htmlFor="weight" className="text-sm mb-1.5 block">
                Peso (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="ej: 150"
                value={fields.weight}
                onChange={set("weight")}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Dimensiones (cm)</p>
              <div className="grid grid-cols-3 gap-3">
                {(["length", "width", "height"] as const).map((k, i) => (
                  <div key={k}>
                    <Label htmlFor={k} className="text-xs text-slate-500 mb-1 block">
                      {["Largo", "Ancho", "Alto"][i]}
                    </Label>
                    <Input
                      id={k}
                      type="number"
                      min="1"
                      step="1"
                      placeholder="cm"
                      value={fields[k]}
                      onChange={set(k)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="poolVolume" className="text-sm mb-1.5 flex items-center gap-1">
                Volumen actual del pool (m³)
                <Info className="h-3 w-3 text-slate-400" />
              </Label>
              <Input
                id="poolVolume"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={fields.poolVolume}
                onChange={set("poolVolume")}
              />
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>0 m³</span>
                  <span>Pool lleno (15 m³)</span>
                </div>
                <Progress value={poolPct} className="h-2" />
                <div className="flex gap-2 flex-wrap">
                  {PRICING_TIERS.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setFields((p) => ({ ...p, poolVolume: String(t.minVolume + 0.5) }))}
                      className="text-xs border rounded px-2 py-0.5 hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" size="lg" className="w-full">
              Calcular ahorro
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Result */}
      {result && volume ? (
        <div className="space-y-4">
          {/* Volume breakdown */}
          <Card className="border-slate-200">
            <CardContent className="pt-5 pb-4">
              <p className="text-sm font-medium text-slate-500 mb-3">Volumen facturable (W/M)</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xs text-slate-400">Volumen real</p>
                  <p className="font-semibold text-slate-800">{formatVolume(volume.volumeM3)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Peso vol.</p>
                  <p className="font-semibold text-slate-800">{formatVolume(volume.weightM3)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-xs text-blue-500">Facturable</p>
                  <p className="font-bold text-blue-700">{formatVolume(volume.billableM3)}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    Por {volume.method === "volume" ? "volumen" : "peso"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price comparison */}
          <Card className="border-red-100">
            <CardContent className="pt-5 pb-4">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm text-slate-500">Precio de mercado</p>
                <p className="font-bold text-red-600 text-xl line-through">
                  {formatCurrency(result.marketTotal)}
                </p>
              </div>
              <p className="text-xs text-slate-400">A $600/m³ (DDP promedio Panamá)</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm text-green-700 font-medium">Tu precio con FINDIT</p>
                  <p className="text-xs text-green-600">
                    Tier: {result.currentTier.label} · {formatCurrency(result.currentRatePerM3)}/m³
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-700">
                    {formatCurrency(result.totalAmount)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-green-100 rounded-lg p-3">
                <TrendingDown className="h-5 w-5 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    Ahorras {formatCurrency(result.savings)}
                  </p>
                  <p className="text-xs text-green-600">
                    -{result.savingsPercent.toFixed(0)}% vs tarifa de mercado
                  </p>
                </div>
              </div>

              {result.nextTier && result.volumeToNextTier !== null && (
                <div className="mt-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                  <p className="text-xs text-blue-700">
                    <strong>Si entran {result.volumeToNextTier.toFixed(1)} m³ más al pool</strong>,
                    pasas a tier <strong>{result.nextTier.label}</strong> (
                    {formatCurrency(result.nextTier.ratePerM3)}/m³) y ahorras{" "}
                    <strong>
                      {result.savingsAtNextTier !== null
                        ? formatCurrency(result.savingsAtNextTier)
                        : "más"}
                    </strong>
                    .
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-xl border text-sm text-slate-600">
            <DollarSign className="h-4 w-4 text-slate-400 shrink-0" />
            <p>
              Precio garantizado al momento de cerrar el pool. El ahorro se distribuye
              proporcionalmente entre todos los participantes.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
          <TrendingDown className="h-12 w-12 mb-3 opacity-30" />
          <p className="font-medium">Ingresa los datos de tu carga</p>
          <p className="text-sm">para ver cuánto ahorras con FINDIT</p>
        </div>
      )}
    </div>
  );
}
