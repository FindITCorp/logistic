import { Card, CardContent } from "@/components/ui/card";
import { Package, Users, TrendingDown, Truck } from "lucide-react";

const steps = [
  {
    icon: Package,
    title: "Registra tu carga",
    description:
      "Ingresa las dimensiones y peso de tu mercancía. El sistema calcula el volumen facturable (W/M) automáticamente.",
    color: "text-blue-600 bg-blue-50",
  },
  {
    icon: Users,
    title: "Entras al pool",
    description:
      "Tu carga se une a un pool de 10 días con otros importadores. Cuanto más volumen entre, más baja el precio para todos.",
    color: "text-purple-600 bg-purple-50",
  },
  {
    icon: TrendingDown,
    title: "El precio baja en vivo",
    description:
      "Conforme se llena el pool, el precio por m³ baja automáticamente. Ves en tiempo real cuánto ahorras.",
    color: "text-green-600 bg-green-50",
  },
  {
    icon: Truck,
    title: "Carga y entrega",
    description:
      "Al cerrar el pool, consolidamos con el forwarder de mejor tarifa. Tu carga llega a Panamá al precio negociado.",
    color: "text-orange-600 bg-orange-50",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-24 bg-white">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Cómo funciona FINDIT
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            Un protocolo de enrutamiento logístico (analogía OSPF): tú solo ves que tu carga llega
            al menor costo posible.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <Card key={step.title} className="relative border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-8 pb-6 px-6">
                <div className="absolute -top-4 left-6">
                  <span className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                    {i + 1}
                  </span>
                </div>
                <div className={`inline-flex p-3 rounded-xl mb-4 ${step.color}`}>
                  <step.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
