import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { PreRegisterForm } from "@/components/landing/pre-register-form";

export const metadata: Metadata = {
  title: "Calculadora de ahorro",
  description:
    "Calcula cuánto ahorras importando desde China a Panamá con el Dynamic Price Pooling de FINDIT.",
};

export default function CalculatorPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-16 bg-slate-50">
          <div className="container max-w-5xl">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                Calculadora de ahorro
              </h1>
              <p className="text-slate-500 max-w-xl mx-auto">
                Ingresa el peso y dimensiones de tu carga para ver cuánto pagarías con FINDIT vs.
                el precio de mercado. Sin registro. Sin compromiso.
              </p>
            </div>
            <CalculatorForm />
          </div>
        </section>
        <PreRegisterForm />
      </main>
      <Footer />
    </>
  );
}
