# AutoLenis - Production Readiness Document

## Project Overview
AutoLenis is a multi-role car-buying concierge platform with buyer, dealer, affiliate, and admin portals.

## Architecture
- **Framework**: Next.js 16 (App Router) + TypeScript + React
- **ORM/Schema**: Prisma 6.16.0 (schema/types/migrations)
- **Runtime DB**: Supabase as runtime persistence layer
- **Database**: PostgreSQL via Supabase (PgBouncer pooled)
- **Deployment**: Vercel Pro, Node 24.x, pnpm 10.28.0
- **Middleware**: `proxy.ts` (NOT `middleware.ts` — Next.js 16 native)

## Production URLs
- https://www.autolenis.com
- https://autolenis-deploy.vercel.app

## Complete Fix Inventory (All Sessions)

### Session 0: PR Fixes (merged to main before Emergent)
| PR | Fix | Branch Status |
|----|-----|---------------|
| #23 | Env variable audit, Stripe live-key enforcement | main + copilot |
| #29 | AI copilot enhancements | main + copilot |
| #30 | iPredict CLV:INQ risk score extraction fix | main + copilot |
| #31 | Prequal email messaging via Resend | main + copilot |
| #32 | Inventory pipeline, field mappings, VIN handling | main + copilot |
| #33 | P0 prequal blockers: cron, workspace isolation, admin routes | main + copilot |
| #34 | Inventory search route Supabase error handling | main + copilot |
| #1  | Node.js heap size OOM fix (4GB) | main + copilot |

### Session 1: Deployment Fixes (Emergent)
| Fix | Where Applied | Status |
|-----|---------------|--------|
| .vercelignore created | main | Pushed |
| middleware.ts deleted (conflicts with proxy.ts) | main | Pushed |
| tsconfig.json: autolenis excluded | main + copilot | Preserved |
| All env vars on Vercel project | Vercel project settings | Live |
| Production deployment from copilot branch | Vercel production | Live (pending switch to main) |

### Session 2: Database Alignment Fixes (Emergent)
| Fix | Where Applied | Status |
|-----|---------------|--------|
| VehicleRequestCase VIEW -> TABLE (18 cols) | Supabase DB directly | Live |
| Transaction.type column added | Supabase DB directly | Live |
| Dealer: 12 cols snake_case -> camelCase | Supabase DB directly | Live |
| dealer_agreements: 28 cols renamed | Supabase DB directly | Live |
| docusign_connect_events: 7 cols renamed | Supabase DB directly | Live |
| ConsentCaptureMethod enum aligned | DB + Prisma schema | Live + Pushed |

### Session 3: Preservation Audit + Main Branch Normalization (Emergent)
| Fix | Where Applied | Status |
|-----|---------------|--------|
| .gitignore: /autolenis/ recovered from copilot | main | Pushed |
| eslint.config.mjs: autolenis/** recovered | main | Pushed |
| .gitignore: 16 duplicate env blocks cleaned | main | Pushed |
| vercel.json: `rm -rf autolenis` added to build | main | Pushed |
| middleware.ts: Deleted (proxy.ts conflict) | main | Pushed |
| All 20 prior fixes verified intact | Verification only | Confirmed |
| Local Next.js build: PASSES | Local | Verified |

## Current State (Feb 2026)
- **Production**: Live from Vercel, all routes responding correctly
- **Main branch**: All unified fixes pushed to GitHub, local build passes
- **Route verification**: All 7 core routes verified (/, /auth/signin, /buyer, /dealer, /admin/sign-in, /api/inventory/search, /prequal)
- **Action required**: User must confirm on Vercel dashboard that `main` is the production branch (may need to switch from `copilot/fix-vercel-deployment-issues`)

## Critical Rules
- DO NOT create `middleware.ts` — project uses `proxy.ts` natively (Next.js 16)
- Prisma schema and DB are matched using camelCase — no `@map` annotations
- `autolenis/` directory is stale — deleted during build via vercel.json

## Next Actions
1. Confirm Vercel production is deploying from `main` (switch if needed)
2. Permanently remove `autolenis/` from git history (P1)
3. Set up Prisma schema drift detection CI (P2)
4. Switch MicroBilt & DocuSign from sandbox to production (P2)
5. Configure Sentry for error monitoring (P2)
