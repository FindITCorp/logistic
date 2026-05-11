import Link from "next/link";
import { Package2 } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-slate-50">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-blue-700 text-lg mb-3">
            <Package2 className="h-5 w-5" />
            FINDIT
          </Link>
          <p className="text-sm text-slate-500 max-w-xs">
            Consolida tu carga LCL desde China a Panamá. Tu precio baja en tiempo real conforme
            entra más volumen al pool.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Plataforma</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="/calculator" className="hover:text-blue-700">Calculadora</Link></li>
            <li><Link href="/pools" className="hover:text-blue-700">Pools activos</Link></li>
            <li><Link href="/auth/register" className="hover:text-blue-700">Crear cuenta</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-900 mb-3">Empresa</h4>
          <ul className="space-y-2 text-sm text-slate-500">
            <li><Link href="#como-funciona" className="hover:text-blue-700">Cómo funciona</Link></li>
            <li><Link href="#precios" className="hover:text-blue-700">Precios</Link></li>
            <li>
              <a href="mailto:hola@findit.com.pa" className="hover:text-blue-700">
                hola@findit.com.pa
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t">
        <div className="container py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} FindITCorp. Todos los derechos reservados.</p>
          <p>Panamá · China · Logística LCL</p>
        </div>
      </div>
    </footer>
  );
}
