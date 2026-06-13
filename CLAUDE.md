# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Bootstrap

Run this immediately at session start:
```bash
source /root/.claude/.tokens 2>/dev/null; git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git 2>/dev/null || true
```

When the user writes `continuamos`:
> "Contexto cargado. Estamos en el proyecto FINDIT Logistic — MVP técnico deployado en Vercel. ¿En qué seguimos?"

---

## Commands

```bash
npm run dev          # Next.js dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit (no emit, just type errors)
npm test             # Vitest unit tests (tests/unit/)
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright E2E (requires live Vercel URL)

# Run a single unit test file:
npx vitest run tests/unit/pricing.test.ts

# Database
npm run db:push      # Apply pending migrations to Supabase
npm run db:types     # Regenerate TypeScript types from Supabase schema
```

---

## Architecture

**Stack:** Next.js 14 App Router · Supabase (PostgreSQL) · next-intl · Tailwind · Vercel

**Live:** https://logistic-six-alpha.vercel.app | **Admin:** /admin/login

### Directory Layout

```
app/
  api/              — Route Handlers (all data access is server-side)
  [locale]/         — i18n pages (ES default, /en for English)
    admin/          — Auth-gated backoffice
lib/
  pricing.ts        — Pricing engine (source of truth; mirrored in SQL)
  poolAssignment.ts — Pool join logic (delegates to join_pool() SQL fn)
  poolOptimizer.ts  — Genetic algorithm for batch shipment assignment
  poolIntelligence.ts — FCL velocity predictions + proactive alerts
  notify.ts         — Unified outbound: WhatsApp → Email → GitHub fallback
  settings.ts       — Runtime feature flags (DB → env → false, 30s cache)
  adminAuth.ts      — Admin session verification
  supabase/client.ts — createServerClient() uses SUPABASE_SERVICE_ROLE_KEY
supabase/migrations/ — 001–018; never edit applied migrations
messages/           — i18n: es.json + en.json
```

### Critical Invariants

**Supabase client:** Always use `createServerClient()` (service role) in API routes. The exported `supabase` (anon) is for client-side only. RLS revokes all anon access (migration 013) — anon reads will return empty, not errors.

**Pool join is atomic:** All three join paths (`/shipments/[id]/assign`, `/orders/[id]/join-pool`, `assignShipmentToPool`) must go through `joinPoolAtomic()` in `lib/poolAssignment.ts`, which calls the `join_pool()` SQL function. Never write volume/price updates directly — the SQL function holds the SELECT FOR UPDATE lock.

**Pricing parity:** `lib/pricing.ts` and the SQL functions `findit_carrier_rate()` / `findit_client_price()` (migration 012) must stay in sync. `tests/unit/pricing.test.ts` + `tests/pricing-parity.spec.ts` guard this. If you change `pricing.ts`, update the SQL too.

**Feature flags:** `isEnabled(key)` in `lib/settings.ts` reads `app_settings` table (toggleable at /admin/autonomia without redeploy). All four flags default to `false` — nothing autonomous fires without explicit activation.

### Pool Lifecycle

```
active → closed → in_transit → at_colon → at_tocumen → completed
```

State transitions happen in `POST /api/pools/[pool_number]/status`. The cron (`/api/cron/advance-pools`, daily, guarded by `CRON_SECRET`) auto-closes pools at day 10 and guarantees one active pool per origin at all times.

### i18n Routing

`middleware.ts` handles both locale routing (via next-intl) and admin auth redirect. API routes (`/api/*`) are excluded from the matcher — they never go through intl middleware. Pages live under `app/[locale]/`.

### Notification Dispatcher (`lib/notify.ts`)

Auto-selects channel by env presence: `WHATSAPP_TOKEN+WHATSAPP_PHONE_ID` → `RESEND_API_KEY+NOTIFY_EMAIL_FROM` → `GITHUB_TOKEN_NOTIFY` (GitHub Issue as inbox). Returns `{ channel, ok }`. Never throws — fails open.

### Migrations

Migrations 001–018 are applied in production. New migrations go in `supabase/migrations/` with the next number prefix. `npm run db:push` applies them. Never edit an already-applied migration.

---

## Project Context

**Product:** LCL freight consolidator China → Panama. Groups micro-importers into 10-day pools; price drops as volume grows. Break-even at ~8 m³/month.

**Pricing model:** Reference price $285/m³ (at minimum volume). Client discount scales with pool fill level and day-of-entry. FINDIT margin = carrier cost delta × (1 - client_share%).

**Key tables:** `clients`, `pools`, `shipments`, `pool_members`, `orders`, `leads`, `invoices`, `payments`, `admin_users`, `admin_sessions`, `app_settings`, `audit_log`, `rate_limits`.

**Admin credentials (local only):** enrique.eaguilarh@gmail.com — never commit credentials.

---

## Rules

- Push to `main` → triggers Vercel deploy automatically
- Tokens live in `/root/.claude/.tokens` — never in git
- Update this file + MEMORIA.md at end of each session with relevant changes
- Always commit + push alongside code changes
- Skills: invoke `nextjs-developer` for pages/components/API routes, `qa-expert` for tests, `debugger` for bugs, `deap` for poolOptimizer changes
