# CLAUDE.md — FINDIT Autonomous Operations Guide

## Project Identity
- **Name:** FINDIT — Dynamic Price Pooling (China → Panama logistics)
- **GitHub repo:** `finditcorp/logistic`
- **Live URL:** https://logistic-six-alpha.vercel.app
- **Dev branch:** `claude/continue-configuration-An0aG`
- **Main branch:** `main`

## Autonomous Operation Rules
1. Never ask the user to run commands, copy tokens, or perform manual steps
2. Never ask which database or service to use — use the existing demo/in-memory stack
3. Make all technical decisions independently
4. Always commit + push changes after completing work
5. Run `npm run build` locally before pushing to verify zero TypeScript/lint errors

## Authentication & Tokens

### Git (GitHub)
Git is configured with a URL rewrite for token-based auth:
```
git config --global url."https://TOKEN@github.com/".insteadOf "https://github.com/"
```
Token is stored in `~/.bashrc` as `GITHUB_TOKEN`.
The remote is proxied via `127.0.0.1:37777` — push using:
```bash
git push -u origin claude/continue-configuration-An0aG
```

### Vercel
- Token: stored in `~/.bashrc` as `VERCEL_TOKEN`
- Also stored as GitHub Actions secret `VERCEL_TOKEN` in the repo
- Deploy happens automatically via GitHub Actions on push to dev or main branch

### Demo credentials (cookie-based auth, no database)
- Email: `operador@findit.com`
- Password: `findit2026`
- Session cookie: `findit_session=demo_authenticated`

## Tech Stack
- **Framework:** Next.js 14, App Router, TypeScript strict
- **Styling:** Tailwind CSS with CSS variable color tokens
- **Auth:** Cookie-based demo auth (no database needed)
- **Data:** In-memory arrays (Phase 1 validation — no persistence)
- **CI/CD:** GitHub Actions → Vercel (deploy.yml)
- **Package manager:** npm

## Key Files
| File | Purpose |
|------|---------|
| `lib/pricing/engine.ts` | Core W/M pricing tiers |
| `lib/auth/session.ts` | Demo auth constants |
| `app/api/pre-register/route.ts` | In-memory lead capture |
| `app/api/auth/login/route.ts` | Cookie login/logout |
| `app/dashboard/page.tsx` | Protected operator dashboard |
| `app/calculator/page.tsx` | Public price calculator |
| `app/pools/page.tsx` | Active pools display |
| `components/layout/header.tsx` | Site header |
| `components/layout/logout-button.tsx` | Client component for logout |
| `components/ui/button.tsx` | Button with asChild support |
| `.github/workflows/deploy.yml` | Auto-deploy to Vercel |
| `MEMORIA.md` | Business context and validation plan |

## Pricing Engine (lib/pricing/engine.ts)
```typescript
PRICING_TIERS = [
  { minVolume:0,  maxVolume:2,        ratePerM3:280, label:'Básico'       },
  { minVolume:2,  maxVolume:4,        ratePerM3:230, label:'Estándar'     },
  { minVolume:4,  maxVolume:7,        ratePerM3:185, label:'Consolidado'  },
  { minVolume:7,  maxVolume:12,       ratePerM3:150, label:'Volumen'      },
  { minVolume:12, maxVolume:Infinity, ratePerM3:120, label:'Premium'      },
]
MARKET_RATE_DDP = 600  // $/m³ competitor baseline
// W/M: billable = max(volumeM3, weightKg/1000)
```

## Build & Deploy Process
```bash
# Verify build passes before pushing
npm run build

# Commit and push (triggers GitHub Actions auto-deploy to Vercel)
git add -A
git commit -m "feat: description"
git push -u origin claude/continue-configuration-An0aG
```

## Architecture Notes
- **No database** — Phase 1 is pure demo/validation. Leads stored in-memory (lost on restart).
- **Supabase files exist** (`lib/supabase/`) but are never called at runtime. Do not remove.
- **`asChild` in Button** — implemented via `React.cloneElement`, not Radix Slot.
- **Tailwind colors** use CSS variables (`hsl(var(--border))` etc.) defined in `app/globals.css`.
- **Server components** access cookies via `cookies()` from `next/headers`.
- **Client components** (logout button, forms) are extracted to separate files with `"use client"`.

## Known Constraints
- External API calls (Vercel, Railway, Render) are blocked in this environment
- All deployments must go through GitHub Actions (runs on GitHub's infrastructure)
- The live Vercel URL works fine — `x-deny-reason: host_not_allowed` only appears from within this environment, not for real users
- Git remote uses a local proxy (`127.0.0.1:37777`) — this is normal and expected

## What "Done" Looks Like
1. `npm run build` exits with code 0 (zero TypeScript/ESLint errors)
2. All changed files committed with descriptive message
3. Pushed to `claude/continue-configuration-An0aG`
4. GitHub Actions deploy job completes on https://github.com/finditcorp/logistic/actions

## Business Context (Summary)
FINDIT aggregates small importers' cargo into shared pools to unlock LCL bulk pricing.
Market gap: importers pay $400-800/m³ DDP; LCL base is $80-150/m³.
Phase 1 goal: validate demand (100+ importers), validate forwarder pricing, validate customs structure.
No China partner yet — currently in commercial validation stage.
