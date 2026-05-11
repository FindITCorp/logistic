import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { calculatePoolPricing, formatCurrency } from "@/lib/pricing/engine";
import type { Database } from "@/lib/supabase/database.types";
import { Calendar, Package, TrendingDown } from "lucide-react";

type Pool = Database["public"]["Tables"]["pools"]["Row"];

const STATUS_LABELS: Record<Pool["status"], string> = {
  open: "Abierto",
  closed: "Cerrado",
  in_transit: "En tránsito",
  delivered: "Entregado",
};

const STATUS_VARIANT: Record<Pool["status"], "success" | "warning" | "default" | "secondary"> = {
  open: "success",
  closed: "warning",
  in_transit: "default",
  delivered: "secondary",
};

export function PoolCard({ pool }: { pool: Pool }) {
  const pct = (pool.current_volume_m3 / pool.max_volume_m3) * 100;
  const pricing = calculatePoolPricing(pool.current_volume_m3);
  const closeDate = new Date(pool.close_date).toLocaleDateString("es-PA", {
    day: "numeric",
    month: "short",
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="pt-5 pb-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">{pool.name}</h3>
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
              <Calendar className="h-3 w-3" />
              Cierra {closeDate}
            </div>
          </div>
          <Badge variant={STATUS_VARIANT[pool.status]}>{STATUS_LABELS[pool.status]}</Badge>
        </div>

        {/* Volume progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {pool.current_volume_m3.toFixed(1)} m³ cargados
            </span>
            <span>{pool.max_volume_m3} m³ máx</span>
          </div>
          <Progress value={pct} className="h-3" />
          <p className="text-xs text-slate-400 mt-1">{pct.toFixed(0)}% del pool ocupado</p>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-4">
          <div>
            <p className="text-xs text-slate-400">Precio actual</p>
            <p className="text-2xl font-bold text-blue-700">
              {formatCurrency(pricing.currentRatePerM3)}
              <span className="text-sm font-normal text-slate-400">/m³</span>
            </p>
            <p className="text-xs text-green-600 font-medium">
              Tier: {pricing.currentTier.label}
            </p>
          </div>
          {pricing.nextTier && pricing.volumeToNextTier !== null && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                <TrendingDown className="h-3 w-3" />
                Próximo tier
              </div>
              <p className="text-sm font-bold text-green-700">
                {formatCurrency(pricing.nextTier.ratePerM3)}/m³
              </p>
              <p className="text-xs text-slate-400">
                Faltan {pricing.volumeToNextTier.toFixed(1)} m³
              </p>
            </div>
          )}
        </div>

        {pool.status === "open" ? (
          <Button className="w-full" asChild>
            <Link href={`/auth/register?pool=${pool.id}`}>Unirme a este pool</Link>
          </Button>
        ) : (
          <Button variant="secondary" className="w-full" disabled>
            Pool {STATUS_LABELS[pool.status].toLowerCase()}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
