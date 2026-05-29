# FINDIT Logistic — Architecture Reference

**Stack:** Next.js 14 App Router · Supabase (PostgreSQL + Storage) · next-intl · Tailwind CSS · Vercel  
**Repo:** finditcorp/logistic · **Live:** https://logistic-six-alpha.vercel.app

---

## Directory Layout

```
app/
  api/                  — API routes (Next.js Route Handlers)
  [locale]/             — i18n pages (ES default, /en for English)
    admin/              — Admin backoffice (auth-gated)
components/             — Shared React components
lib/
  pricing.ts            — Dynamic pool pricing engine
  clients.ts            — Client registration + code generation
  poolAssignment.ts     — Auto-assignment algorithm
  adminAuth.ts          — Admin session verification
  rateLimit.ts          — In-memory rate limiter
  notifications.ts      — WhatsApp link builder + QR generation
  supabase/
    client.ts           — Supabase client (anon) + server client (service role)
    database.types.ts   — TypeScript enums and interfaces
supabase/migrations/    — SQL migrations (001–011)
messages/               — i18n translations (es.json, en.json)
.github/workflows/      — CI/CD: deploy, migrate, run-query, setup
```

---

## API Routes

### Public (no auth)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/clients` | Register new client (rate-limited: 3/min/IP) |
| GET | `/api/leads` | → *requires admin* |
| POST | `/api/leads` | Capture landing lead (rate-limited: 5/min/IP) |
| POST | `/api/orders` | Client pre-declares order |
| GET | `/api/orders?code=XXX` | Client views own orders |
| POST | `/api/shipments` | Register arrival at China warehouse |
| GET | `/api/pools?status=` | List pools |
| GET | `/api/pools/[pool_number]` | Pool detail + members |
| POST | `/api/orders/[id]/join-pool` | Client manually joins pool |
| GET | `/api/seguimiento?code=XXX` | Public tracking page |
| POST | `/api/invoices` | Upload invoice (token-gated) |
| GET | `/api/invoices/token/[token]` | Validate upload token |
| POST | `/api/invoices/upload` | File upload to Supabase Storage |
| GET | `/api/providers` | List providers (for dropdowns) |
| GET | `/api/stats/public` | Live KPIs for landing page (cached 60s) |
| GET | `/api/health` | DB connectivity check |

### Admin (requires `admin_token` cookie or `Authorization: Bearer <token>`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/admin/auth` | Login → sets cookie |
| DELETE | `/api/admin/auth` | Logout |
| POST | `/api/admin/setup` | Bootstrap admin account (ADMIN_SETUP_KEY) |
| GET | `/api/admin/stats` | Dashboard KPIs |
| POST | `/api/pools` | Create pool |
| PATCH | `/api/pools` | Update pool status (legacy) |
| POST | `/api/pools/[pool_number]/status` | Advance pool lifecycle |
| GET | `/api/shipments?pool_id=` | List shipments |
| PATCH | `/api/shipments/[id]` | Update payment flags, status |
| POST | `/api/shipments/[id]/assign` | Assign shipment to pool |
| POST | `/api/providers` | Create provider |
| POST | `/api/providers/[id]/rates` | Add rate tier |
| DELETE | `/api/providers/[id]/rates?rate_id=` | Remove rate tier |
| GET/PATCH | `/api/invoices?pool_id=` | Invoice list + tax updates |
| PATCH | `/api/invoices/[id]` | Fill customs calculations |
| POST/GET | `/api/payments` | Record / view payment history |
| GET | `/api/cron/advance-pools` | Daily pool lifecycle (CRON_SECRET) |

---

## Pool Lifecycle State Machine

```
active → closed → in_transit → at_colon → at_tocumen → completed
```

Timestamps set on pool: `dispatched_at`, `arrived_colon_at`, `arrived_tocumen_at`, `completed_at`

Shipment status synced automatically:
- pool `in_transit` → shipment `in_transit`
- pool `at_tocumen` → shipment `at_tocumen`
- pool `completed` → shipment `delivered`

---

## Pricing Engine (`lib/pricing.ts`)

```
clientPrice = maxClientPrice - clientDiscount

where:
  carrierRate         = LCL tier lookup or FCL amortized ($/m³)
  overheadPerM3       = $620 / max(poolVolume, 5)
  totalCostPerM3      = carrierRate + overheadPerM3
  finditFloor         = carrierRate × 30%
  minClientPrice      = totalCostPerM3 + finditFloor
  maxClientPrice      = max($252, minClientPrice)
  distributableSaving = maxClientPrice - minClientPrice
  clientSavingsPct    = 90% (day 1) → 10% (day 10)
  clientDiscount      = distributableSaving × clientSavingsPct

Two-stage payment:
  advance  = carrierRate × volume      (before China departure)
  final    = (clientPrice - carrierRate) × volume  (at Tocumen pickup)
```

LCL tiers (BL Shipping confirmed): `0–5m³ → $121` · `5–15m³ → $106` · `15–20m³ → $101`  
FCL breakeven: `≥20m³ → FCL 20ft ($2,000/25CBM)` · `≥41m³ → FCL 40ft ($3,200/55CBM)`

---

## Database Schema (Supabase)

| Table | Key columns |
|-------|-------------|
| `clients` | client_code (FDT-XXXX), assignment_mode, notify_by |
| `pools` | pool_number, origin_city, status, day_number [1-10], current_volume_m3, carrier_rate |
| `shipments` | client_code, pool_id, volume_m3, price_per_m3, advance_paid, final_paid, invoice_received |
| `pool_members` | pool_id, shipment_id, price_per_m3, day_joined, locked_at |
| `orders` | status (8-step lifecycle), shipment_id, pool_id |
| `leads` | status (new/contacted/converted), source, pool_id |
| `providers` + `provider_rates` | volume-tiered carrier pricing |
| `invoices` | upload_token (7d), declared_value, cif, arancel, itbms |
| `payments` | stage (advance/final), amount, method |
| `admin_users` + `admin_sessions` | bcrypt hash, 24h token TTL |
| `audit_log` | ts, admin_email, action, table_name, record_id, old/new data |

Migrations: `001_initial_schema` → `011_security` (RLS + audit_log)

---

## Security Model

- **RLS:** Enabled on all 13 tables (migration 011). `service_role` (server) bypasses RLS. `anon` key restricted to public read + client-facing inserts.
- **Admin auth:** bcrypt password → session token in DB → httpOnly cookie or Bearer header. 24h TTL.
- **Invoice upload:** Cryptographic 7-day token per shipment.
- **Rate limiting:** `/api/leads` 5 req/min/IP · `/api/clients` 3 req/min/IP (in-memory, per instance).
- **Secrets:** Service role key server-only. GitHub PAT never in git. Tokens in `/root/.claude/.tokens` (local only).
- **Audit log:** `audit_log` table for admin mutations (write from server, no anon access).

---

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client+server | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Supabase service role (bypasses RLS) |
| `NEXT_PUBLIC_SITE_URL` | client | Canonical site URL |
| `ADMIN_SETUP_KEY` | server | One-time admin bootstrap key |
| `CRON_SECRET` | server | Bearer token for cron endpoint |
| `ADMIN_EMAIL` | server | Default admin email |
| `GITHUB_TOKEN_NOTIFY` | server | GitHub API token for lead fallback |

---

## CI/CD

| Workflow | Trigger | Action |
|----------|---------|--------|
| `deploy.yml` | push to `main` | Vercel production deploy |
| `migrate.yml` | push to `supabase/migrations/` | Run migrations via Supabase Management API |
| `setup.yml` | manual or migration push | Set Vercel env vars |
| `run-query.yml` | manual dispatch | Ad-hoc SQL via Management API |

---

## i18n Routing

- Default locale: `es` (Spanish)
- `/` and `/es/*` → Spanish pages
- `/en/*` → English pages
- `middleware.ts` handles: locale routing + admin auth redirect
