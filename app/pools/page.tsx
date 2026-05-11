import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { PoolCard } from "@/components/pools/pool-card";
import type { Database } from "@/lib/supabase/database.types";
import { Waves } from "lucide-react";

export const metadata: Metadata = {
  title: "Pools activos",
  description: "Consulta los pools de consolidación de carga LCL activos en FINDIT.",
};

type Pool = Database["public"]["Tables"]["pools"]["Row"];

const DEMO_POOLS: Pool[] = [
  {
    id: "demo-1",
    name: "Pool China → Panamá — Jun 2026",
    status: "open",
    open_date: "2026-06-01T00:00:00Z",
    close_date: "2026-06-10T00:00:00Z",
    current_volume_m3: 4.2,
    max_volume_m3: 15,
    current_rate_per_m3: 185,
    base_market_rate: 600,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "demo-2",
    name: "Pool China → Panamá — Jun/2 2026",
    status: "open",
    open_date: "2026-06-11T00:00:00Z",
    close_date: "2026-06-21T00:00:00Z",
    current_volume_m3: 1.5,
    max_volume_m3: 15,
    current_rate_per_m3: 280,
    base_market_rate: 600,
    created_at: "2026-06-11T00:00:00Z",
    updated_at: "2026-06-11T00:00:00Z",
  },
  {
    id: "demo-3",
    name: "Pool China → Panamá — May 2026",
    status: "in_transit",
    open_date: "2026-05-01T00:00:00Z",
    close_date: "2026-05-10T00:00:00Z",
    current_volume_m3: 12.3,
    max_volume_m3: 15,
    current_rate_per_m3: 150,
    base_market_rate: 600,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },
];

export default function PoolsPage() {
  const open = DEMO_POOLS.filter((p) => p.status === "open");
  const others = DEMO_POOLS.filter((p) => p.status !== "open");

  return (
    <>
      <Header />
      <main className="py-16 bg-slate-50 min-h-[80vh]">
        <div className="container max-w-5xl">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <Waves className="h-7 w-7 text-blue-600" />
              <h1 className="text-3xl font-bold text-slate-900">Pools activos</h1>
            </div>
            <p className="text-slate-500 max-w-xl">
              Cada pool consolida carga durante 10 días. El precio por m³ baja conforme entra más
              volumen. Únete antes del cierre para aprovechar el mejor precio.
            </p>
          </div>

          {open.length > 0 && (
            <section className="mb-12">
              <h2 className="text-lg font-semibold text-slate-700 mb-4">
                Pools abiertos ({open.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {open.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-400 mb-4">
                Pools anteriores
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {others.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
