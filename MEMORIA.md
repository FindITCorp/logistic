# FINDIT — MEMORIA DEL PROYECTO
**Última actualización:** 3 de junio de 2026
**Dueño:** FindITCorp
**Estado:** 🟢 MVP TÉCNICO COMPLETO EN PRODUCCIÓN | 🔴 SUPUESTOS SIN VALIDAR | ⏳ EN VALIDACIÓN OPERACIONAL

---

## ⭐ PROYECTO NUEVO — RIFA MUNDIAL 2026

**Repo:** https://github.com/FindITCorp/rifa-mundial
**Stack:** Next.js 14 + Supabase + Stripe + Vercel Cron
**Estado:** 🟢 CÓDIGO COMPLETO — PENDIENTE DEPLOY EN VERCEL + CREDENCIALES

### Para activar el deploy:
1. Ir a vercel.com → New Project → Import `FindITCorp/rifa-mundial`
2. Configurar env vars del `.env.example` (Supabase, Stripe, etc.)
3. Ejecutar migraciones Supabase: `supabase/migrations/001_schema.sql` y `002_seed_influencers.sql`
4. Crear admin: INSERT en `admin_users` con `hashPassword()` de `lib/auth.ts`
5. Activar cron en Vercel (ya configurado en `vercel.json`)

### Sistema autónomo incluye:
- 10M boletos con numeración única e irrepetible
- Sorteo criptográfico (SHA-512 + Bitcoin block hash) — 3 ganadores
- Stripe Checkout + webhook automático para asignación post-pago
- Cron diario 12:00 — publica posts en Twitter/FB/IG + outreach a 5 influencers
- 25 influencers pre-cargados (mega→nano) con mensajes de outreach personalizados
- Sistema de referidos: 10 referidos = 1 boleto gratis automático
- Premios: Tim Payne (NZ), Cristiano o Messi, la restante
- Admin: /admin/dashboard · /admin/sorteo · /admin/social · /admin/influencers

### Credenciales necesarias (pedir al usuario):
- SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_KEY
- STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET
- TWITTER_BEARER_TOKEN, FACEBOOK_PAGE_TOKEN, INSTAGRAM_ACCESS_TOKEN (opcional)
- RESEND_API_KEY (para emails de confirmación)
- CRON_SECRET + ADMIN_SALT (strings secretos que tú defines)

---

---

## 1. DEFINICIÓN DEL PROYECTO

### Nombre oficial
**Dynamic Price Pooling — Consolidador Logístico LCL China → Panamá**

### Problema
Micro-importadores en Panamá pagan $400-800/m³ (DDP) cuando tarifa base LCL es $80-150/m³. No acceden a economías de escala. **Gap: $250-700/m³ sin explotar.**

### Solución
Plataforma que agrupa cargas en pools de 10 días, negocia automáticamente con forwarders según volumen real, distribuye ahorro de forma dinámica y transparente.

---

## 2. INFRAESTRUCTURA Y DESPLIEGUE

### Repositorio y Deploy
- **GitHub:** finditcorp/logistic
- **Rama principal:** `main` (deploy automático en Vercel al hacer push)
- **URL live:** https://logistic-six-alpha.vercel.app
- **Vercel:** proyecto `logistic` | projectId: `prj_S68LtSo2WYgAxmp7NFOF5Hxw1qz5` | orgId: `team_BrCUd1PJnqaQTOuhJFrDYsw3`
- **Stack:** Next.js 14 + next-intl + Tailwind CSS + Supabase

### GitHub Secrets configurados en Vercel
- VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
- ADMIN_SETUP_KEY, CRON_SECRET, SUPABASE_ACCESS_TOKEN
- SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SITE_URL = https://logistic-six-alpha.vercel.app

### Para activar canales de comunicación (pendiente)
- WhatsApp: WHATSAPP_TOKEN + WHATSAPP_PHONE_ID + WHATSAPP_VERIFY_TOKEN
- Email: RESEND_API_KEY + NOTIFY_EMAIL_FROM
- GitHub fallback: GITHUB_TOKEN_NOTIFY

---

## 3. ESTADO TÉCNICO COMPLETO (2 junio 2026)

### Páginas del sistema (19 rutas)

**Públicas:**
| Ruta | Descripción |
|------|-------------|
| `/` o `/es` | Landing en español (stats en vivo) |
| `/en` | Landing en inglés |
| `/pools` | Pools activos con precios dinámicos |
| `/pools/[pool_number]` | Detalle de pool individual |
| `/pools/unirme` | Formulario de unión a pool |
| `/registro` | Registro de nuevo cliente |
| `/mis-pedidos` | Estado de pedidos por código FDT |
| `/seguimiento` | Timeline visual animado (6 pasos) |
| `/factura/[token]` | Ver factura por token |
| `/factura/estado` | Buscar factura por código FDT |

**Admin:**
| Ruta | Descripción |
|------|-------------|
| `/admin` | Redirect a dashboard |
| `/admin/login` | Auth admin (httpOnly cookie 24h, bcrypt) |
| `/admin/dashboard` | KPIs: revenue, pools activos, facturas pendientes |
| `/admin/leads` | Gestión de leads con filtros |
| `/admin/pools` | Lista de todos los pools |
| `/admin/pools/[id]` | Detalle de pool con acciones |
| `/admin/pools/[id]/aduana` | Gestión aduanal del pool |
| `/admin/proveedores` | Gestión de proveedores y tarifas |
| `/admin/envios` | Envíos con filtros y acción WhatsApp |
| `/admin/autonomia` | Toggles de feature flags + Pool Intelligence UI |

### APIs (33 endpoints)

**Admin:**
- `GET/PATCH /api/admin/settings` — feature flags (4 flags con caché 30s)
- `GET /api/admin/stats` — KPIs del dashboard
- `GET /api/admin/pool-intelligence` — análisis FCL de todos los pools activos
- `POST /api/admin/optimize-assignment` — GA optimizer (dry-run por defecto, `?apply=true` ejecuta)
- `GET /api/admin/reconciliation` — deuda outstanding por cobrar
- `GET /api/admin/settlement` — conciliación por pool
- `POST /api/admin/auth` — login/logout admin
- `POST /api/admin/setup` — setup inicial admin (ADMIN_SETUP_KEY)

**Cron:**
- `GET /api/cron/advance-pools` — autopilot de 8 pasos (ver sección cron)

**WhatsApp:**
- `GET/POST /api/whatsapp/webhook` — bot conversacional (precio/tracking/pools/unirse)

**Públicos:**
- `/api/pools`, `/api/pools/[n]`, `/api/pools/[n]/status`
- `/api/leads`, `/api/leads/optout`
- `/api/orders`, `/api/orders/[id]/join-pool`
- `/api/shipments`, `/api/shipments/[id]`, `/api/shipments/[id]/assign`, `/api/shipments/[id]/invoice`
- `/api/clients`, `/api/invoices`, `/api/payments`, `/api/providers`, `/api/referrals`
- `/api/seguimiento`, `/api/stats/public`, `/api/health`

### Librerías clave (lib/)

| Archivo | Función |
|---------|---------|
| `pricing.ts` | Motor de precios dinámico (referencia $285/m³, tramos LCL, distribución día 1-10) |
| `poolIntelligence.ts` | **[DIFERENCIADOR]** Velocidad m³/día, predicción FCL, alertas proactivas |
| `poolOptimizer.ts` | **[DIFERENCIADOR]** Algoritmo genético DEAP-style: asignación óptima de envíos |
| `poolAssignment.ts` | joinPoolAtomic() con FOR UPDATE — race condition eliminada |
| `notifications.ts` | Envío multi-canal: WhatsApp → email → GitHub fallback |
| `notify.ts` | Wrapper unificado con gating por feature flags |
| `lifecycleNotify.ts` | Notificaciones automáticas por cambio de estado del pool |
| `settings.ts` | Feature flags con caché 30s y fallback a env vars |
| `adminAuth.ts` | Auth con httpOnly cookies, bcrypt, audit log |
| `rateLimit.ts` | Rate limiting durable en DB (tabla rate_limits) |

### Base de datos — Tablas Supabase
```
clients, pools, shipments, pool_members, orders, providers, provider_rates,
leads, invoices, payments, admin_users, admin_sessions, audit_log,
rate_limits, lead_followups, app_settings
```

### Migraciones (001–018)
| # | Archivo | Contenido |
|---|---------|-----------|
| 001 | initial_schema | Tablas base: clients, pools, shipments, pool_members |
| 002 | orders | Tabla orders |
| 003 | pool_number | Campo pool_number auto-incremental |
| 004 | providers | Tabla providers + provider_rates |
| 005 | leads | Tabla leads con opt-out |
| 006 | lifecycle | Estado lifecycle de pools |
| 007 | backend | Funciones RPC join_pool(), advance_pool_day() |
| 008 | invoices | Tabla invoices + payments |
| 009 | storage | Buckets Supabase Storage |
| 010 | leads_v2 | Índices y campos adicionales en leads |
| 011 | security | admin_users, admin_sessions, audit_log |
| 012 | integrity_autonomy | rate_limits, lead_followups, app_settings (nurture+notify) |
| 013 | rls_lockdown | RLS: anon = cero acceso PII |
| 014 | seed | Datos de demostración |
| 015 | fix_pricing_overhead_floor | Corrección cálculo margen FINDIT |
| 016 | settings_reconciliation | Vista outstanding_debt, idempotency_key en payments |
| 017 | optimizer_flag | app_settings: optimizer_auto_apply = 'false' |
| 018 | pool_alerts | app_settings: pool_alerts_enabled = 'false' |

---

## 4. DIFERENCIADORES CLAVE

### 1. Pool Intelligence Engine (`lib/poolIntelligence.ts`)
**El diferenciador más importante.** Ningún consolidador detecta proactivamente que un pool va a cruzar FCL en 2 días y alerta automáticamente a los leads.

- Calcula velocidad de llenado (m³/día, ventana 3 días)
- Predice días hasta cruzar umbral FCL (20 m³)
- Calcula probabilidad FCL crossing (0–1)
- Selecciona leads óptimos para alertar: pool ≥60%, días restantes ≥2, ahorro potencial >$5
- Acción recomendada: `join_now | wait_for_fcl | already_fcl | low_data`

### 2. Algoritmo Genético (`lib/poolOptimizer.ts`)
Optimización DEAP-style en TypeScript: asignación conjunta de envíos pendientes a pools maximizando margen FINDIT + ahorro cliente + bonus FCL. Seed diario determinista (`floor(Date.now() / 86_400_000)`).

### 3. WhatsApp Bot (`/api/whatsapp/webhook`)
Canal primario para micro-importadores: cotizar, tracking y unirse sin salir de WhatsApp.
Comandos: `precio [m³] [ciudad]` · `tracking FDT-XXXX` · `pools` · `unirse`

### 4. Precio dinámico día a día
Distribución del ahorro: día 1=90% al cliente → día 10=10% (piso), menos 10% por día. Incentiva entrar temprano al pool.

---

## 5. FEATURE FLAGS (todos arrancan APAGADOS)

| Flag | Descripción | Activar cuando |
|------|-------------|----------------|
| `notifications_enabled` | Notificaciones de ciclo de vida del pool | WHATSAPP_TOKEN o RESEND_API_KEY en Vercel |
| `nurture_enabled` | Secuencia de follow-up automático a leads | Validada demanda, lead pipeline activo |
| `optimizer_auto_apply` | GA aplica cambios sin confirmar | Confianza en el modelo, volumen estable |
| `pool_alerts_enabled` | Alertas proactivas FCL a leads | Notificaciones activadas primero |

**Toggle en:** `/admin/autonomia` (sin redeploy)
**API:** `PATCH /api/admin/settings` `{ "key": "flag_name", "value": true }`

---

## 6. AUTOPILOT CRON — 8 pasos diarios

`GET /api/cron/advance-pools` (protegido por CRON_SECRET header)

1. **Avanzar día** — `advance_pool_day()` en todos los pools activos
2. **Cerrar pools vencidos** — día ≥10 → status='closed', notifica miembros
3. **Auto-sanar volumen** — recalcula `current_volume_m3` desde `pool_members`
4. **Crear pools faltantes** — garantiza 1 pool activo por ruta (3 rutas)
5. **Notificaciones de ciclo** — notifica cambios de estado a miembros (gated por `notifications_enabled`)
6. **GA Optimizer** — optimiza asignación pendiente (gated por `optimizer_auto_apply`)
7. **Pool Intelligence alerts** — alerta leads de pools ≥60% (gated por `pool_alerts_enabled`)
8. **Lead nurture** — secuencia follow-up a leads (gated por `nurture_enabled`)

---

## 7. TRACKING VISUAL (`/seguimiento`)

Timeline animado de 6 pasos:
```
📦 En bodega China → ✅ Consolidado → 🚢 En tránsito → 🇵🇦 Llegó a Colón → 🏛️ Aduana Tocumen → 🎉 Listo para retirar
```
ETAs automáticos por estado: received=50d, assigned=45d, in_transit=35d, at_colon=8d, at_tocumen=3d, delivered=0d
Panel de ahorro: muestra `(420 - precio_bloqueado) * volumen` vs casillero cuando precio está fijado.

---

## 8. MOTOR DE PRECIOS (`lib/pricing.ts`)

**Precio de referencia:** $285/m³ (igual a LMA = competitivos en el peor caso)
**Umbral FCL:** 20 m³ (LCL → FCL 20ft, ahorro ≈$20+/m³)

#### Tramos LCL (costo naviero)
| Volumen pool | Costo naviero |
|---|---|
| 0–5 m³ | $100 |
| 5–15 m³ | $92 |
| 15–20 m³ | $87 |
| ≥20 m³ | $82 (o FCL 20ft) |
| ≥41 m³ | FCL 40ft (~$58–78/m³) |

#### Distribución del ahorro por día de entrada
| Día | % cliente | % FINDIT |
|-----|-----------|---------|
| 1 | 90% | 10% |
| 5 | 50% | 50% |
| 10 | 10% (piso) | 90% |

---

## 9. TESTING

- `npm test` → vitest, **49 unit tests** (pricing + poolAssignment + poolOptimizer)
- `npm run test:e2e` → playwright (requiere browser + acceso a Vercel)
- Config: `vitest.config.ts`
- Test files: `tests/unit/poolOptimizer.test.ts`, `tests/unit/pricing.test.ts`, `tests/unit/poolAssignment.test.ts`

---

## 10. SUPUESTOS CRÍTICOS

| # | Supuesto | Status |
|---|----------|--------|
| 1 | Existe demanda (100+ micro-importadores) | 🔴 NO VALIDADO |
| 2 | Forwarders aceptan tier pricing dinámico | 🔴 NO VALIDADO |
| 3 | Margen ≥12% es viable | 🟡 FRÁGIL (depende de ≥6m³) |
| 4 | Regulación aduanal permite estructura | 🔴 NO VALIDADO |
| 5 | Clientes aceptan esperar 10 días | 🔴 NO VALIDADO |

---

## 11. MODELO FINANCIERO

| Métrica | Mes 1 | Mes 2 | Mes 3 |
|---------|-------|-------|-------|
| Volumen | 1m³ | 2m³ | 4m³ |
| Ingresos | $155 | $310 | $620 |
| Costos | $3,900 | $4,100 | $4,300 |
| Margen neto | -$3,745 | -$3,790 | -$3,680 |

**Burn rate:** $2,600/mes · **Capital requerido:** $25K (3 meses) · **Break-even:** Mes 5-6 (≥8m³/mes)

---

## 12. CREDENCIALES Y ACCESO

- **Admin:** enrique.eaguilarh@gmail.com / Findit2026!
- **Tokens locales:** `/root/.claude/.tokens` (NUNCA subir a GitHub)
- **Setup git:** `source /root/.claude/.tokens && git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git`

---

## 13. PENDIENTES TÉCNICOS

- [ ] Configurar WHATSAPP_VERIFY_TOKEN en Vercel para activar bot de WhatsApp
- [ ] Configurar WHATSAPP_TOKEN + WHATSAPP_PHONE_ID en Vercel para envío
- [ ] O configurar RESEND_API_KEY + NOTIFY_EMAIL_FROM para email
- [ ] Activar `notifications_enabled` en /admin/autonomia cuando credenciales estén en Vercel
- [ ] Probar flujo E2E completo: registro → envío → factura → aduana
- [ ] Agregar GITHUB_TOKEN_NOTIFY en Vercel para fallback de leads a GitHub Issues

---

## 14. REGLAS DE TRABAJO

- Push siempre a `main` → dispara deploy en Vercel
- NUNCA subir tokens a GitHub
- Actualizar CLAUDE.md + MEMORIA.md al final de cada sesión
- Commit + push de ambos archivos junto con cualquier cambio de código
- Credenciales de admin en DB, no en código ni env vars

---

**Este archivo es la fuente de verdad técnica del proyecto.**
