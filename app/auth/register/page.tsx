"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package2, Clock, Mail } from "lucide-react";
import { PreRegisterForm } from "@/components/landing/pre-register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 font-bold text-blue-700 text-xl mb-8">
        <Package2 className="h-6 w-6" />
        FINDIT
      </Link>

      <Card className="w-full max-w-md mb-6">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-3">
            <div className="p-3 bg-blue-50 rounded-full">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle>Registro de clientes — próximamente</CardTitle>
          <CardDescription className="mt-2">
            Estamos en Fase 1 de validación. El registro completo de clientes abre cuando
            confirmemos demanda suficiente para el primer pool.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl text-left">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">
                Déjanos tu email y te avisamos primero
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                Los pre-registrados tienen prioridad y precio garantizado desde el día 1.
              </p>
            </div>
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/login">Soy operador — iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="w-full max-w-xl">
        <PreRegisterForm />
      </div>
    </div>
  );
}
