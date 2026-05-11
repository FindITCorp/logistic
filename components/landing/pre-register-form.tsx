"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Loader2 } from "lucide-react";

export function PreRegisterForm() {
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [volume, setVolume] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/pre-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          monthly_volume_m3: volume ? Number(volume) : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <section className="py-24 bg-blue-700 text-white">
        <div className="container text-center max-w-md mx-auto">
          <CheckCircle2 className="h-16 w-16 mx-auto text-green-300 mb-4" />
          <h2 className="text-3xl font-bold mb-3">¡Estás en la lista!</h2>
          <p className="text-blue-200">
            Te avisamos cuando abramos el primer pool. Serás de los primeros en acceder al precio
            consolidado.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-blue-700 text-white">
      <div className="container max-w-xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Sé el primero en consolidar
        </h2>
        <p className="text-blue-200 mb-10">
          Regístrate gratis. Te avisamos cuando abramos el primer pool y bloqueas el mejor precio.
        </p>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur rounded-2xl p-8 text-left space-y-5">
          <div>
            <Label htmlFor="email" className="text-blue-100 text-sm mb-1.5 block">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              required
              placeholder="tu@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder:text-blue-300 focus-visible:ring-white"
            />
          </div>

          <div>
            <Label htmlFor="name" className="text-blue-100 text-sm mb-1.5 block">
              Nombre (opcional)
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Juan Pérez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder:text-blue-300 focus-visible:ring-white"
            />
          </div>

          <div>
            <Label htmlFor="volume" className="text-blue-100 text-sm mb-1.5 block">
              ¿Cuántos m³ importas al mes? (opcional)
            </Label>
            <Input
              id="volume"
              type="number"
              min="0.1"
              step="0.1"
              placeholder="ej: 2.5"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="bg-white/20 border-white/30 text-white placeholder:text-blue-300 focus-visible:ring-white"
            />
          </div>

          {state === "error" && (
            <p className="text-red-300 text-sm">Algo salió mal. Intenta de nuevo.</p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={state === "loading"}
            className="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold"
          >
            {state === "loading" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              "Quiero el precio consolidado"
            )}
          </Button>
        </form>
      </div>
    </section>
  );
}
