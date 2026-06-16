# FINDIT Logistic — Documento de Traspaso para Nuevo Agente
**Generado:** 16 de junio de 2026  
**Proyecto:** Dynamic Price Pooling — Consolidador Logístico LCL China → Panamá  
**Repo:** finditcorp/logistic  
**Dueño:** enrique.eaguilarh@gmail.com

---

## 1. CONTEXTO DE NEGOCIO

**Problema:** Micro-importadores en Panamá pagan $420–800/m³ (casilleros). La tarifa base LCL desde China es $80–150/m³. FINDIT captura ese gap.

**Solución:** Agrupamos cargas en pools de 10 días, negociamos por volumen con forwarders, y distribuimos el ahorro dinámicamente. Más rápido entras al pool = más ahorras (early bird).

**Ruta:** Guangzhou / Shanghai / Shenzhen → Colón, Panamá  
**Tránsito:** ~35–45 días (LCL) · Embarques cada 15 días

---

## 2. ACCESO AL SISTEMA

### URLs
| Servicio | URL |
|----------|-----|
| Sitio live | https://logistic-six-alpha.vercel.app |
| Admin login | https://logistic-six-alpha.vercel.app/admin/login |
| Feature flags | https://logistic-six-alpha.vercel.app/admin/autonomia |

### Credenciales Admin
- **Email:** enrique.eaguilarh@gmail.com
- **Password:** Findit2026!
- **Rol:** admin

### Git
```bash
# Rama de trabajo actual
git checkout claude/cool-heisenberg-v5e6im

# Configurar remote con token (sustituir TOKEN)
git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git

# IMPORTANTE: Deploy automático ocurre desde 'main'
# Para deployar: merge a main o push directo a main
```

---

## 3. SECRETS Y VARIABLES DE ENTORNO

### Configurados en Vercel (GitHub Secrets también)
| Variable | Propósito |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública Supabase (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (server only, bypasses RLS) |
| `NEXT_PUBLIC_SITE_URL` | `https://logistic-six-alpha.vercel.app` |
| `ADMIN_SETUP_KEY` | Token one-time para crear primer admin (ya usado) |
| `CRON_SECRET` | Bearer token para el cron diario |
| `SUPABASE_ACCESS_TOKEN` | Para CI/CD migrations vía GitHub Actions |

### Opcionales (activan canales de notificación)
| Variable | Canal | Estado |
|----------|-------|--------|
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp Bot webhook | ❌ No configurado |
| `WHATSAPP_TOKEN` | WhatsApp Cloud API | ❌ No configurado |
| `WHATSAPP_PHONE_ID` | ID del número WA | ❌ No configurado |
| `RESEND_API_KEY` | Email via Resend | ❌ No configurado |
| `NOTIFY_EMAIL_FROM` | Dirección remitente email | ❌ No configurado |
| `GITHUB_TOKEN_NOTIFY` | Fallback de notifs a GitHub Issues | ❌ No configurado |

**Sin estos tokens, las notificaciones están silenciosas (fallan graciosamente).**

### IDs de Vercel
- `VERCEL_PROJECT_ID`: `prj_S68LtSo2WYgAxmp7NFOF5Hxw1qz5`
- `VERCEL_ORG_ID`: `team_BrCUd1PJnqaQTOuhJFrDYsw3`

---

## 4. STACK TECNOLÓGICO

```
Next.js 14.2.29 (App Router)
├── next-intl 4.x         — i18n bilingüe (ES default, /en para inglés)
├── Tailwind CSS 3.x      — estilos
├── bcryptjs              — hash de passwords admin
├── zod                   — validación de inputs
└── qrcode                — QR codes para facturas

Supabase (PostgreSQL + Storage)
├── @supabase/ssr         — cookies server-side
└── @supabase/supabase-js — cliente JS

Testing
├── vitest                — 49 unit tests
└── playwright            — E2E (requiere browser)
```

---

## 5. ESTRUCTURA DEL PROYECTO

```
/
├── app/
│   ├── [locale]/           — Páginas i18n (ES default, /en)
│   │   ├── page.tsx        — Landing page (4 secciones)
│   │   ├── pools/          — Pools activos + detalle + unirme
│   │   ├── registro/       — Registro de cliente
│   │   ├── mis-pedidos/    — Dashboard del cliente
│   │   ├── seguimiento/    — Timeline visual de envío (stepper animado)
│   │   ├── factura/        — Estado de factura + subida por token
│   │   └── admin/          — Backoffice (auth-gated)
│   │       ├── login/
│   │       ├── dashboard/  — KPIs: revenue, pools, facturas pendientes
│   │       ├── leads/      — Tabla de leads capturados
│   │       ├── pools/      — Gestión de pools + aduana por pool
│   │       ├── envios/     — Envíos con filtros + WhatsApp
│   │       ├── proveedores/— Forwarders y tarifas
│   │       └── autonomia/  — Feature flags + Pool Intelligence
│   └── api/                — Route handlers (Next.js)
│       ├── admin/          — Auth, stats, settlement, optimize, settings
│       ├── clients/        — Registro de clientes
│       ├── cron/           — Autopilot diario (CRON_SECRET)
│       ├── invoices/       — Gestión de facturas + upload
│       ├── leads/          — Captura + optout
│       ├── orders/         — Pedidos + join pool
│       ├── payments/       — Registro de pagos
│       ├── pools/          — CRUD + lifecycle status
│       ├── providers/      — Forwarders + tarifas
│       ├── seguimiento/    — Tracking público
│       ├── shipments/      — Envíos + asignación + factura
│       ├── stats/          — KPIs públicos (landing)
│       └── whatsapp/       — WhatsApp Bot webhook
├── components/             — React components reutilizables
│   ├── Header.tsx
│   ├── JoinPoolModal.tsx   — Modal para unirse a pool (guarda en Supabase)
│   ├── PoolCard.tsx        — Tarjeta de pool con precios dinámicos
│   ├── PricingTierTable.tsx— Tabla interactiva con slider
│   ├── SavingsCalculator.tsx
│   └── LeadCaptureSection.tsx
├── lib/
│   ├── pricing.ts          — Motor de precios (FUENTE DE VERDAD)
│   ├── poolAssignment.ts   — Asignación atómica de envíos a pools
│   ├── poolOptimizer.ts    — Algoritmo genético (GA style DEAP)
│   ├── poolIntelligence.ts — Velocidad de llenado, predicción FCL
│   ├── adminAuth.ts        — Verificación de sesión admin
│   ├── clients.ts          — Registro + generación de código FDT-XXXX
│   ├── notifications.ts    — Mensajes WhatsApp + QR
│   ├── notify.ts           — Dispatcher: WA → email → GitHub fallback
│   ├── lifecycleNotify.ts  — Notifs de ciclo de vida del pool
│   ├── settings.ts         — Feature flags con caché 30s
│   ├── rateLimit.ts        — Rate limiting (en-memoria, fallback al durable)
│   └── supabase/
│       ├── client.ts       — createBrowserClient + createServerClient
│       └── database.types.ts — Tipos TypeScript de la DB
├── messages/
│   ├── es.json             — Traducciones español
│   └── en.json             — Traducciones inglés
├── supabase/migrations/    — 018 migraciones SQL (todas aplicadas en producción)
├── middleware.ts           — Routing i18n + locale detection
├── vercel.json             — Cron: /api/cron/advance-pools a las 00:00 UTC
├── CLAUDE.md               — Instrucciones para agentes AI (este archivo es clave)
├── MEMORIA.md              — Estado del proyecto (actualizar al finalizar sesión)
└── ARCHITECTURE.md         — Referencia técnica completa
```

---

## 6. BASE DE DATOS — ESQUEMA COMPLETO

### Supabase Project
- URL y claves en Vercel (variables de entorno)
- **18 migraciones aplicadas** en producción

### Tablas

#### `clients` — Clientes registrados
```sql
id               UUID PK
client_code      TEXT UNIQUE  -- FDT-XXXX (4 dígitos)
name             TEXT
whatsapp         TEXT
email            TEXT
assignment_mode  ENUM(auto, manual)
notify_by        ENUM(whatsapp, email, both)
referral_code    TEXT UNIQUE  -- para programa de referidos
referred_by_code TEXT         -- código del cliente que lo refirió
created_at       TIMESTAMPTZ
```

#### `pools` — Pools de consolidación activos
```sql
id                  UUID PK
pool_number         SERIAL       -- Pool #001, #002...
origin_city         ENUM(shanghai, guangzhou, shenzhen)
destination         TEXT         -- "Colón, Panamá"
current_volume_m3   NUMERIC(8,3)
participants        INT
day_number          INT [1-10]
status              ENUM(active, closed, in_transit, at_colon, at_tocumen, completed)
carrier_rate        NUMERIC(8,2) -- tarifa actual del naviero/m³
reference_price_m3  NUMERIC(8,2) -- precio de referencia ($285)
provider_id         UUID FK→providers
opened_at           TIMESTAMPTZ  -- usado para derivar day_number en el cron
dispatched_at       TIMESTAMPTZ
arrived_colon_at    TIMESTAMPTZ
arrived_tocumen_at  TIMESTAMPTZ
completed_at        TIMESTAMPTZ
created_at          TIMESTAMPTZ
```

**Estado de ciclo de vida:**
```
active → closed → in_transit → at_colon → at_tocumen → completed
```

#### `shipments` — Envíos físicos en bodega China
```sql
id                  UUID PK
client_id           UUID FK→clients
client_code         TEXT
weight_kg           NUMERIC(8,3)
volume_m3           NUMERIC(8,3)
origin_city         ENUM(...)
status              ENUM(received, assigned, in_transit, at_tocumen, delivered)
pool_id             UUID FK→pools
price_per_m3        NUMERIC(8,2) -- bloqueado al entrar al pool
declared_value      NUMERIC(10,2)
invoice_received    BOOLEAN
advance_paid        BOOLEAN
advance_amount      NUMERIC(10,2)
advance_paid_at     TIMESTAMPTZ
final_paid          BOOLEAN
final_amount        NUMERIC(10,2)
final_paid_at       TIMESTAMPTZ
product_description TEXT
length_cm           NUMERIC
width_cm            NUMERIC
height_cm           NUMERIC
invoice_token       TEXT UNIQUE  -- token 7 días para subir factura
invoice_token_exp   TIMESTAMPTZ
invoice_url         TEXT
notes               TEXT
arrived_at          TIMESTAMPTZ
assigned_at         TIMESTAMPTZ
created_at          TIMESTAMPTZ
```

#### `pool_members` — Ledger de quién está en qué pool
```sql
id           UUID PK
pool_id      UUID FK→pools
shipment_id  UUID FK→shipments
client_id    UUID FK→clients
volume_m3    NUMERIC(8,3)
price_per_m3 NUMERIC(8,2)  -- precio bloqueado en este momento
day_joined   INT            -- día 1-10 cuando entró
locked_at    TIMESTAMPTZ    -- cuando se cerró el pool y se bloqueó el precio
joined_at    TIMESTAMPTZ
```

#### `orders` — Pedidos pre-declarados (antes de llegar a bodega)
```sql
id                      UUID PK
client_id               UUID FK→clients
client_code             TEXT
supplier_tracking       TEXT
supplier_name           TEXT
product_description     TEXT
origin_city             ENUM(...)
declared_value_usd      NUMERIC(10,2)
estimated_weight_kg     NUMERIC
estimated_volume_m3     NUMERIC
status                  ENUM(ordered, in_transit_to_warehouse, at_warehouse,
                              in_pool, in_transit_to_panama, at_customs,
                              ready_for_pickup, delivered)
shipment_id             UUID FK→shipments
pool_id                 UUID FK→pools
price_per_m3            NUMERIC(8,2)
ordered_at              TIMESTAMPTZ
shipped_by_supplier_at  TIMESTAMPTZ
arrived_warehouse_at    TIMESTAMPTZ
assigned_pool_at        TIMESTAMPTZ
shipped_to_panama_at    TIMESTAMPTZ
arrived_customs_at      TIMESTAMPTZ
ready_pickup_at         TIMESTAMPTZ
delivered_at            TIMESTAMPTZ
created_at              TIMESTAMPTZ
```

#### `providers` — Navieros/forwarders
```sql
id               UUID PK
name             TEXT UNIQUE  -- "Dragon Freight Guangzhou"
contact_name     TEXT         -- "Zoe"
contact_email    TEXT
contact_whatsapp TEXT
notes            TEXT
is_active        BOOLEAN
created_at       TIMESTAMPTZ
```

#### `provider_rates` — Tarifas por volumen del forwarder
```sql
id             UUID PK
provider_id    UUID FK→providers
origin_city    ENUM(...)
min_volume_m3  NUMERIC
max_volume_m3  NUMERIC      -- null = sin límite
rate_per_m3    NUMERIC(8,2) -- lo que nos cobra el forwarder
notes          TEXT
effective_from DATE
created_at     TIMESTAMPTZ
```

#### `leads` — Interesados capturados en la landing
```sql
id                UUID PK
name              TEXT
whatsapp          TEXT
email             TEXT
origin_city       ENUM(...)
monthly_volume_m3 NUMERIC
product_type      TEXT
notes             TEXT
status            TEXT (new | contacted | converted)
pool_id           UUID FK→pools
source            TEXT (landing | join_modal | referral | manual)
opted_out         BOOLEAN        -- respeta unsubscribe
optout_token      TEXT UNIQUE    -- token para link de baja
last_contacted_at TIMESTAMPTZ
created_at        TIMESTAMPTZ
```

#### `lead_followups` — Cola de nurture automático
```sql
id         UUID PK
lead_id    UUID FK→leads
channel    TEXT (whatsapp | email)
step       INT  -- 1, 2, 3
due_at     TIMESTAMPTZ
status     TEXT (pending | sent | failed | skipped)
sent_at    TIMESTAMPTZ
created_at TIMESTAMPTZ
```

#### `invoices` — Facturas comerciales para aduana
```sql
id                UUID PK
shipment_id       UUID FK→shipments
client_id         UUID FK→clients
client_code       TEXT
pool_id           UUID FK→pools
file_url          TEXT         -- Supabase Storage URL
file_name         TEXT
upload_token      TEXT UNIQUE  -- token one-time para subida
token_expires_at  TIMESTAMPTZ
declared_value_usd NUMERIC
currency          TEXT
description       TEXT         -- descripción del cliente
hs_code           TEXT         -- código arancelario Panamá (admin llena)
product_type      TEXT
cif_value_usd     NUMERIC      -- admin llena después de revisar
arancel_pct       NUMERIC      -- 0–15%
arancel_usd       NUMERIC
itbms_usd         NUMERIC      -- 7% de (CIF + arancel)
total_taxes_usd   NUMERIC
status            TEXT (pending | uploaded | reviewed | approved)
uploaded_at       TIMESTAMPTZ
reviewed_at       TIMESTAMPTZ
reviewed_by       TEXT
notes             TEXT
created_at        TIMESTAMPTZ
```

#### `payments` — Registro de pagos (anticipo + saldo)
```sql
id              UUID PK
shipment_id     UUID FK→shipments
stage           TEXT (advance | final)
amount_usd      NUMERIC
method          TEXT (yappy | bank_transfer | cash | other)
reference       TEXT
notes           TEXT
recorded_by     TEXT
idempotency_key TEXT UNIQUE
created_at      TIMESTAMPTZ
```

#### `admin_users` — Usuarios del backoffice
```sql
id            UUID PK
email         TEXT UNIQUE
password_hash TEXT    -- bcrypt
role          TEXT (admin | operator)
created_at    TIMESTAMPTZ
```

#### `admin_sessions` — Tokens de sesión admin (24h TTL)
```sql
id         UUID PK
token      TEXT UNIQUE
admin_id   UUID FK→admin_users
email      TEXT
role       TEXT
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ
```

#### `audit_log` — Log de acciones admin
```sql
id          UUID PK
ts          TIMESTAMPTZ
admin_email TEXT
action      TEXT
table_name  TEXT
record_id   TEXT
old_data    JSONB
new_data    JSONB
ip          TEXT
user_agent  TEXT
```

#### `rate_limits` — Rate limiting durable (cross-instance)
```sql
key          TEXT PK
count        INT
window_start TIMESTAMPTZ
```

#### `app_settings` — Feature flags sin redeploy
```sql
key        TEXT PK
value      TEXT
updated_at TIMESTAMPTZ
updated_by TEXT
```

**Valores actuales (todos `false` por defecto):**
- `notifications_enabled` — notifs de ciclo de vida del pool
- `nurture_enabled` — follow-up automático de leads
- `optimizer_auto_apply` — GA aplica asignaciones sin confirmar
- `pool_alerts_enabled` — alertas FCL proactivas a leads

### Funciones SQL (PostgreSQL)
```sql
-- Tarifa del naviero por volumen (LCL tiers / FCL amortizado)
findit_carrier_rate(p_volume numeric) → numeric

-- Precio cliente según día de entrada y volumen del pool
findit_client_price(p_day int, p_volume numeric) → numeric

-- Unirse al pool ATÓMICAMENTE (elimina race conditions)
join_pool(p_pool_id uuid, p_shipment_id uuid) → jsonb

-- Recalcular volumen del pool desde el ledger de miembros
recompute_pool_volume(p_pool_id uuid) → void

-- Rate limiting atómico
rate_limit_hit(p_key text, p_max int, p_window_s int) → boolean

-- Limpiar sesiones expiradas
cleanup_expired_sessions() → void
```

### Vistas SQL
```sql
-- P&L real por pool: revenue vs costo carrier+overhead = margin
pool_settlement

-- Deuda pendiente de cobrar (envíos con precio sin pago)
outstanding_debt
```

### Storage (Supabase)
- Bucket: `invoices` (público para lectura, max 5MB, PDF/JPG/PNG/WebP)

---

## 7. MOTOR DE PRECIOS

**Archivo:** `lib/pricing.ts` (fuente de verdad en TS) + funciones SQL espejo

### Competidores de referencia
| Competidor | Precio/m³ |
|------------|-----------|
| Casillero (principal) | $420 |
| LMA Global | $285 |
| **FINDIT (pool lleno)** | **$180–252** |

### Estructura de costo

```
FINDIT cobra al cliente:
  carrierRate     = tarifa LCL tiers o FCL amortizado
  overheadPerM3   = $620 / max(poolVolume, 8)   ← costos fijos del pool
  totalCost       = carrierRate + overheadPerM3
  finditFloor     = carrierRate × 30%           ← margen mínimo FINDIT
  minClientPrice  = totalCost + finditFloor
  maxClientPrice  = max($252, minClientPrice)   ← nunca más caro que $252
  distributable   = maxClientPrice - minClientPrice
  clientDiscount  = distributable × clientSavingsPct / 100
  clientPrice     = maxClientPrice - clientDiscount
```

### Tiers LCL (lo que cobra el naviero a FINDIT)
| Volumen pool | $/m³ |
|---|---|
| 0–5 m³ | $121 |
| 5–15 m³ | $106 |
| 15–20 m³ | $101 |
| ≥20 m³ | FCL 20ft ($2,000 fijo / volumen) |
| ≥41 m³ | FCL 40ft ($3,200 fijo / volumen) |

### Distribución de ahorro por día (% va al cliente)
| Día | % cliente | % FINDIT |
|-----|-----------|----------|
| 1 | 90% | 10% |
| 2 | 80% | 20% |
| 3 | 70% | 30% |
| 4 | 60% | 40% |
| 5 | 50% | 50% |
| 6 | 40% | 60% |
| 7 | 30% | 70% |
| 8 | 20% | 80% |
| 9–10 | 10% | 90% |

### Pagos en dos etapas
- **Anticipo:** `carrierRate × volumen` (antes de salir de China)
- **Saldo:** `(clientPrice - carrierRate) × volumen` (al recoger en Tocumen)

---

## 8. AUTOPILOT — CRON DIARIO

**Endpoint:** `GET /api/cron/advance-pools`  
**Schedule:** `0 0 * * *` (medianoche UTC) vía Vercel Cron  
**Auth:** `Authorization: Bearer <CRON_SECRET>`

### 8 pasos en orden:
1. **Self-heal:** `recompute_pool_volume()` en todos los pools activos
2. **Advance day:** deriva día real de `opened_at` (robusto ante corridas perdidas)
3. **Close expired:** cierra pools > día 10, bloquea precios finales, notifica miembros
4. **Guarantee pool:** crea nuevo pool si no hay uno activo por origen
5. **Sync lifecycle:** envíos heredan estado del pool (in_transit → at_tocumen → delivered)
6. **GA optimizer:** asigna envíos pendientes óptimamente (aplica solo si `optimizer_auto_apply=true`)
7. **Pool alerts:** notifica leads cuando pool ≥60% FCL (solo si `pool_alerts_enabled=true`)
8. **Nurture:** procesa follow-ups de leads (solo si `nurture_enabled=true`)

---

## 9. SISTEMA DE NOTIFICACIONES

**Archivo:** `lib/notify.ts`

Fallback automático en cascada:
```
WhatsApp Cloud API → Resend Email → GitHub Issues (fallback)
```

Sin credenciales configuradas: silencioso (no falla el cron).

**Tipos de notificaciones:**
- Ciclo de vida del pool (cerrado, en tránsito, en Colón, en Tocumen, entregado)
- Alertas FCL proactivas a leads
- Nurture en 3 pasos (día 0, +2 días, +3 días)

---

## 10. WHATSAPP BOT

**Endpoint:** `POST /api/whatsapp/webhook`  
**Verificación:** `GET /api/whatsapp/webhook` con `WHATSAPP_VERIFY_TOKEN`

### Comandos que entiende:
- `precio` / cotizar — precio actual del pool activo
- `tracking FDT-XXXX` — estado del envío
- `pools` — ver pools activos
- `unirme` / `registrarme` — link para registrarse

**Estado:** Lógica construida, pendiente configurar en Meta Business Manager.

---

## 11. ALGORITMO GENÉTICO (Pool Optimizer)

**Archivo:** `lib/poolOptimizer.ts`

Optimiza la asignación conjunta de envíos pendientes a pools activos.

**Fitness multi-objetivo:**
- Margen FINDIT
- Ahorro cliente
- Bonus por cruzar umbral FCL

**Configuración:**
- Generaciones: 120 (default)
- Seed determinista: basado en fecha (reproducible por día)
- Torneo + cruce uniforme + mutación + elitismo

**Modo:** Dry-run por defecto. `optimizer_auto_apply=true` en `/admin/autonomia` para aplicar.

**Endpoint:** `GET /api/admin/optimize-assignment?apply=true`

---

## 12. POOL INTELLIGENCE ENGINE

**Archivo:** `lib/poolIntelligence.ts`

- Velocidad m³/día (ventana 3 días)
- Predicción días hasta FCL
- Probabilidad de cruce FCL (0–1)
- Alerta proactiva cuando pool ≥60% FCL

**Dashboard:** `/admin/autonomia`  
**API:** `GET /api/admin/pool-intelligence`

---

## 13. RUTAS DEL SITIO — 20 PÁGINAS

### Públicas
| Ruta | Descripción |
|------|-------------|
| `/` o `/es` | Landing en español |
| `/en` | Landing en inglés |
| `/pools` | Pools activos |
| `/pools/[n]` | Detalle de pool + precio dinámico |
| `/pools/unirme` | Unirse a un pool |
| `/registro` | Registro de nuevo cliente |
| `/mis-pedidos` | Dashboard del cliente (buscar por código FDT) |
| `/seguimiento` | Timeline visual de envío (stepper 6 pasos) |
| `/factura/[token]` | Subir factura comercial |
| `/factura/estado` | Buscar estado de factura por código FDT |

### Admin (requiere cookie `admin_token`)
| Ruta | Descripción |
|------|-------------|
| `/admin/login` | Login del backoffice |
| `/admin/dashboard` | KPIs: revenue, pools activos, facturas pendientes |
| `/admin/leads` | Lista de leads capturados |
| `/admin/pools` | Gestión de pools |
| `/admin/pools/[id]` | Detalle de pool + miembros |
| `/admin/pools/[id]/aduana` | Calcular impuestos de aduana |
| `/admin/proveedores` | Gestión de navieros y tarifas |
| `/admin/envios` | Envíos con filtros + link WhatsApp |
| `/admin/autonomia` | Feature flags + Pool Intelligence dashboard |

---

## 14. SEGURIDAD

### RLS (Row Level Security)
- **Migración 013:** Revocó TODOS los accesos anon. La clave pública (anon) en el browser no puede leer ni escribir nada.
- **service_role** (server-side) bypassa RLS — toda la API usa esta clave.
- Resultado: PII (nombres, WhatsApp, emails) inaccesible desde el browser.

### Admin Auth
- Hash bcrypt en `admin_users`
- Token en `admin_sessions` (24h TTL)
- Cookie httpOnly o `Authorization: Bearer <token>`
- Verificación en cada ruta admin vía `verifyAdminToken()`

### Rate Limiting
- `/api/leads`: 5 req/min/IP
- `/api/clients`: 3 req/min/IP
- Implementado con `rate_limit_hit()` (durable, cross-instance)

### Factura Upload
- Token criptográfico con 7 días de expiración
- Solo permite actualizar si `token_expires_at > now()`

---

## 15. TESTING

```bash
# Unit tests (49 tests)
npm test          # vitest una vez
npm run test:watch # en modo watch

# E2E (requiere browser)
npm run test:e2e  # playwright

# TypeScript
npm run typecheck
```

### Archivos de test
```
tests/
├── unit/
│   ├── pricing.test.ts       — Motor de precios
│   ├── poolAssignment.test.ts
│   └── poolOptimizer.test.ts  — 7 tests del GA
└── e2e/
    └── ...                   — Flujos Playwright
```

---

## 16. GITHUB ACTIONS — CI/CD

| Workflow | Trigger | Qué hace |
|----------|---------|----------|
| `deploy.yml` | Push a `main` | Build + deploy a Vercel |
| `migrate.yml` | Manual | Aplica migraciones SQL a Supabase |
| `run-query.yml` | Manual | Ejecuta SQL directo en producción |
| `setup.yml` | Manual | Bootstrap admin via ADMIN_SETUP_KEY |
| `test-connection.yml` | Manual | Verifica conectividad Supabase |

---

## 17. DATOS SEMILLA (en producción)

### Proveedores cargados
1. **Dragon Freight Guangzhou** — Tarifas Guangzhou + Shenzhen
2. **Shanghai Express Logistics** — Tarifas Shanghai
3. **TJ-China Freight (Zoe)** — Tarifas Guangzhou básicas

### Pools demo (originales, pueden tener más en prod)
- Pool Shanghai → Colón: 8.5 m³, 6 participantes, día 3
- Pool Guangzhou → Colón: 2.1 m³, 2 participantes, día 1
- Pool Shenzhen → Colón: 16.4 m³, 11 participantes, día 7

---

## 18. PENDIENTES TÉCNICOS (para nuevo agente)

### Inmediatos (antes de ir a producción real)
- [ ] Configurar `WHATSAPP_VERIFY_TOKEN` + `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` en Vercel → activa el bot de WA
- [ ] O configurar `RESEND_API_KEY` + `NOTIFY_EMAIL_FROM` → activa canal email
- [ ] Activar feature flags en `/admin/autonomia` cuando las credenciales estén listas:
  - `notifications_enabled` → primero en activar
  - `pool_alerts_enabled` → cuando haya leads reales
  - `nurture_enabled` → cuando haya leads reales
  - `optimizer_auto_apply` → con cuidado, aplica GA automáticamente

### Validación operacional (no técnica, pero crítica)
- [ ] Contactar 3+ forwarders reales y obtener tablas de precios verificadas
- [ ] Validar demanda: 10-15 micro-importadores, encuesta de disposición a pagar
- [ ] Consultar agente aduanal Panamá sobre estructura legal del consolidador
- [ ] Actualizar tarifas en la DB (`provider_rates`) cuando haya respuesta de forwarders

### Mejoras técnicas (backlog)
- [ ] Probar flujo completo E2E: registro → envío → asignación a pool → factura → aduana
- [ ] Tests E2E con Playwright (el runner está configurado, falta agregar casos)
- [ ] Configurar alerta cuando cron falla (actualmente silencioso)
- [ ] Migración 019: índices faltantes en `audit_log` y `lead_followups` para queries pesadas

---

## 19. CÓMO INICIAR UNA SESIÓN (protocolo del agente)

```bash
# 1. Cargar tokens del ambiente
source /root/.claude/.tokens 2>/dev/null

# 2. Configurar remote con autenticación
git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git

# 3. Verificar rama
git branch --show-current
# Debe mostrar: claude/cool-heisenberg-v5e6im (o main para deploy)
```

### Reglas de trabajo para el agente
1. **SIEMPRE** leer `CLAUDE.md` y `MEMORIA.md` al iniciar sesión
2. Invocar la skill relevante antes de cada tarea (nextjs-developer, debugger, etc.)
3. Commits descriptivos + push inmediato
4. Push a `main` para triggear deploy en Vercel
5. NUNCA subir tokens/secrets a git
6. Actualizar `MEMORIA.md` y `CLAUDE.md` al final de cada sesión con cambios relevantes

---

## 20. CONTACTOS Y RECURSOS

### Forwarders (pendientes de contactar formalmente)
| Empresa | Contacto | Estado |
|---------|----------|--------|
| BL Shipping | sales8@blshipping.com / +86-18898403007 | Primer contacto |
| Basenton | overseas.08@basenton.com | Pendiente |
| TJ-China Freight | Zoe — ver DB | En sistema, tarifa informal |

### Documentos en `/docs/`
- `china-forwarders-contacts.md` — lista de 6 forwarders con contactos
- `china-partners.md` — notas de negociación
- `investor-one-pager.md` — para presentar a inversores
- `panama-customs-agents.md` — agentes aduanales Panamá
- `promo-plan.md` — plan de marketing

---

**Este documento + `CLAUDE.md` + `MEMORIA.md` + `ARCHITECTURE.md` contienen TODO lo necesario para administrar y continuar el desarrollo del proyecto.**
