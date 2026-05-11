import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Package, Waves, TrendingDown, ArrowRight, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { SESSION_COOKIE, SESSION_VALUE, DEMO_CREDENTIALS } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Dashboard — Operador" };

export default function DashboardPage() {
  const cookieStore = cookies();
  const session = cookieStore.get(SESSION_COOKIE);

  if (!session || session.value !== SESSION_VALUE) {
    redirect("/auth/login");
  }

  return (
    <>
      <Header />
      <main className="py-10 bg-slate-50 min-h-[80vh]">
        <div className="container max-w-5xl">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Panel de operador</h1>
              <p className="text-slate-500 text-sm mt-1">{DEMO_CREDENTIALS.email}</p>
            </div>
            <form action="/api/auth/login" method="DELETE">
              <Button
                variant="outline"
                size="sm"
                formAction="/api/auth/login"
                formMethod="post"
                onClick={async () => {
                  await fetch("/api/auth/login", { method: "DELETE" });
                  window.location.href = "/";
                }}
                type="button"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </Button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { title: "Pre-registros", value: "—", icon: Package, color: "text-blue-600", bg: "bg-blue-50", href: "/api/pre-register" },
              { title: "Pools activos", value: "2", icon: Waves, color: "text-purple-600", bg: "bg-purple-50", href: "/pools" },
              { title: "Volumen total", value: "5.7 m³", icon: TrendingDown, color: "text-green-600", bg: "bg-green-50", href: "/pools" },
            ].map((stat) => (
              <Link key={stat.title} href={stat.href}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
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
              </Link>
            ))}
          </div>

          <Card className="mb-6">
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
                <Link href="/api/pre-register" target="_blank">
                  <Package className="h-4 w-4" />
                  Ver pre-registros (JSON)
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/calculator">
                  <TrendingDown className="h-4 w-4" />
                  Calculadora
                </Link>
              </Button>
            </CardContent>
          </Card>

          <div className="p-5 border border-blue-100 bg-blue-50 rounded-xl">
            <p className="text-sm font-semibold text-blue-900 mb-1">Fase 1 — Validación activa</p>
            <p className="text-xs text-blue-700">
              Comparte <strong>findit.com/calculator</strong> con importadores potenciales y{" "}
              <strong>findit.com/pools</strong> para mostrar los pools. Los pre-registros se
              acumulan en memoria y son visibles en{" "}
              <Link href="/api/pre-register" className="underline" target="_blank">
                /api/pre-register
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
