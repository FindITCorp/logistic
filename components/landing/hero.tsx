import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingDown, Zap } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 to-blue-900 text-white">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
      <div className="container relative py-24 md:py-32 text-center">
        <Badge variant="outline" className="mb-6 border-blue-400 text-blue-200 text-xs px-3 py-1">
          <Zap className="h-3 w-3 mr-1" />
          Dynamic Price Pooling — tu precio baja en tiempo real
        </Badge>

        <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
          Importa desde China
          <br />
          <span className="text-blue-300">al precio real de flete</span>
        </h1>

        <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-4">
          Micro-importadores en Panamá pagan <strong className="text-white">$400–800/m³</strong> cuando
          la tarifa base LCL es <strong className="text-blue-300">$120–280/m³</strong>.
        </p>
        <p className="text-base text-blue-300 max-w-xl mx-auto mb-10">
          FINDIT consolida tu carga en pools de 10 días y distribuye el ahorro de forma automática
          y transparente.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="xl" asChild>
            <Link href="/calculator">
              Calcular mi ahorro
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
          <Button size="xl" variant="outline" className="border-blue-400 text-white hover:bg-blue-800" asChild>
            <Link href="/pools">Ver pools activos</Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
          {[
            { value: "53%", label: "Ahorro promedio" },
            { value: "10 días", label: "Tiempo de pool" },
            { value: "$0", label: "Costo de registro" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-bold text-blue-300">{s.value}</p>
              <p className="text-xs text-blue-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Floating price badge */}
      <div className="absolute right-8 top-1/3 hidden lg:flex flex-col items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4">
        <TrendingDown className="h-6 w-6 text-green-400" />
        <p className="text-xs text-blue-200 text-center">
          Precio actual
          <br />
          del pool
        </p>
        <p className="text-2xl font-bold text-white">$185<span className="text-sm font-normal text-blue-300">/m³</span></p>
        <p className="text-xs text-green-400">↓ Baja con más volumen</p>
      </div>
    </section>
  );
}
