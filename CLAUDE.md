# INSTRUCCIONES CRÍTICAS — FINDIT Logistic

## ⚠️ LEE ESTO PRIMERO ANTES DE RESPONDER CUALQUIER MENSAJE

Estás trabajando en el proyecto **FINDIT Logistic** — consolidador de carga LCL China → Panamá.

### AL INICIAR SESIÓN — ejecuta esto en bash inmediatamente:
```bash
source /root/.claude/.tokens 2>/dev/null; git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git 2>/dev/null || true
```

### CUANDO EL USUARIO ESCRIBA "continuamos":
Responde EXACTAMENTE así (no uses ningún tool de memoria, no digas que no tienes contexto):

> "Contexto cargado. Estamos en el proyecto FINDIT Logistic — MVP técnico deployado en Vercel. Última sesión: [resumir últimos cambios de abajo]. ¿En qué seguimos?"

**NO uses el tool de memoria del sistema. NO digas "no tengo memorias guardadas". El contexto completo está aquí abajo.**

---

## ESTADO DEL PROYECTO (fuente de verdad)

**Stack:** Next.js 14 + next-intl + Tailwind CSS  
**Repo:** FindITCorp/logistic — rama `main`  
**Deploy:** Vercel — auto-deploy en cada push a `main` vía GitHub Actions

### Estructura
```
app/[locale]/page.tsx          — Landing page (4 secciones)
app/[locale]/pools/page.tsx    — Pools activos
components/PoolCard.tsx        — Tarjeta pool (client component, abre modal)
components/JoinPoolModal.tsx   — Modal registro al pool ✅ IMPLEMENTADO
components/PricingTierTable.tsx — Tabla interactiva con slider
lib/pricing.ts                 — Motor de precios dinámico
messages/es.json + en.json     — Traducciones bilingüe
middleware.ts                  — Routing i18n (ES default, /en para inglés)
```

### Motor de precios
- Precio de referencia: $100/m³ (techo máximo)
- Tramos: 0-5m³=$100 · 5-15m³=$90 · 15-20m³=$85 · +20m³=$80
- Distribución ahorro: día 1=90% cliente → día 10=10% cliente (-10%/día)

### Últimos cambios deployados
- ✅ Modal "Unirme al pool" implementado (JoinPoolModal.tsx)
  - Formulario: nombre, WhatsApp/email, volumen (m³)
  - Validación client-side + pantalla de confirmación
  - Bilingüe ES/EN
- ✅ Stop hook configurado (.claude/hooks/session-stop.sh)
- ✅ SessionStart hook (.claude/hooks/session-start.sh)
- ✅ GitHub Actions deploy automático a Vercel

### Pendiente técnico
- Conectar formulario "Unirme" a backend real (actualmente muestra confirmación mock)
- URL pública de Vercel — verificar en vercel.com/dashboard

---

## REGLAS DE TRABAJO

- Push siempre a `main` → dispara deploy en Vercel
- NUNCA subir tokens a GitHub
- Actualizar este archivo (CLAUDE.md) + MEMORIA.md al final de cada sesión
- Commit + push de ambos archivos junto con cualquier cambio de código

---

## MODELO DE NEGOCIO

Micro-importadores Panamá pagan $400-800/m³. Tarifa base LCL es $80-150/m³. FINDIT agrupa cargas en pools de 10 días, negocia volumen con forwarders y distribuye el ahorro.

**Pools mock activos:**
| Pool | Ruta | Volumen | Día |
|------|------|---------|-----|
| 1 | Shanghai → Colón | 8.5m³ | Día 3 |
| 2 | Guangzhou → Colón | 2.1m³ | Día 1 |
| 3 | Shenzhen → Colón | 16.4m³ | Día 7 |

**Supuestos sin validar:** demanda real, forwarders aceptan tier pricing, regulación aduanal.
