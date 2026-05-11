import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Package, Waves, TrendingDown, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  return (
    <>
      <Header />
      <main className="py-10 bg-slate-50 min-h-[80vh]">
        <div className="container max-w-5xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">
              Bienvenido, {user.user_metadata?.full_name ?? user.email}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gestiona tus envíos y monitorea el precio de tu pool en tiempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              {
                title: "Envíos activos",
                value: "0",
                icon: Package,
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                title: "Pools en que participas",
                value: "0",
                icon: Waves,
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                title: "Ahorro total acumulado",
                value: "$0",
                icon: TrendingDown,
                color: "text-green-600",
                bg: "bg-green-50",
              },
            ].map((stat) => (
              <Card key={stat.title}>
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{stat.title}</p>
                      <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones rápidas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Button asChild>
                <Link href="/pools">
                  <Waves className="h-4 w-4" />
                  Ver pools activos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/calculator">
                  <TrendingDown className="h-4 w-4" />
                  Calcular envío
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="mt-8 p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No tienes envíos aún</p>
            <p className="text-sm">Únete a un pool activo para comenzar a importar</p>
            <Button className="mt-4" asChild>
              <Link href="/pools">Ver pools disponibles</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
