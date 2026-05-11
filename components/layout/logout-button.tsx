"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/login", { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <Button variant="outline" size="sm" onClick={handleLogout} type="button">
      <LogOut className="h-4 w-4" />
      Salir
    </Button>
  );
}
