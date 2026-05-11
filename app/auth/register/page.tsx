"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Package2, Loader2, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fields, setFields] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    company: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function set(k: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((p) => ({ ...p, [k]: e.target.value }));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (fields.password !== fields.confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (fields.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email: fields.email,
      password: fields.password,
      options: {
        data: {
          full_name: fields.fullName,
          company: fields.company || null,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">¡Cuenta creada!</h2>
          <p className="text-slate-500 mb-6">
            Revisa tu email para confirmar tu cuenta. Luego podrás acceder al dashboard.
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir a iniciar sesión</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 font-bold text-blue-700 text-xl mb-8">
        <Package2 className="h-6 w-6" />
        FINDIT
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Crear cuenta gratis</CardTitle>
          <CardDescription>Accede al precio consolidado de flete LCL</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="fullName" className="mb-1.5 block">Nombre completo</Label>
              <Input
                id="fullName"
                type="text"
                required
                placeholder="Juan Pérez"
                value={fields.fullName}
                onChange={set("fullName")}
              />
            </div>

            <div>
              <Label htmlFor="company" className="mb-1.5 block">
                Empresa <span className="text-slate-400 font-normal">(opcional)</span>
              </Label>
              <Input
                id="company"
                type="text"
                placeholder="Mi Empresa S.A."
                value={fields.company}
                onChange={set("company")}
              />
            </div>

            <div>
              <Label htmlFor="email" className="mb-1.5 block">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@empresa.com"
                value={fields.email}
                onChange={set("email")}
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={fields.password}
                onChange={set("password")}
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="mb-1.5 block">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={fields.confirmPassword}
                onChange={set("confirmPassword")}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear cuenta gratis"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
