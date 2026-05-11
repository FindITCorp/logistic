"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package2, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Link href="/" className="flex items-center gap-2 font-bold text-blue-700 text-xl mb-8">
        <Package2 className="h-6 w-6" />
        FINDIT
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Accede al panel de operador</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <Label htmlFor="email" className="mb-1.5 block">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="operador@findit.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="password" className="mb-1.5 block">Contraseña</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar sesión"}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            ¿No tienes cuenta?{" "}
            <Link href="/auth/register" className="text-blue-600 hover:underline font-medium">
              Regístrate gratis
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
