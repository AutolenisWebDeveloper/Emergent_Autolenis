# AutoLenis - Production Readiness Document

## Project Overview
AutoLenis is a multi-role car-buying concierge platform with buyer, dealer, affiliate, and admin portals.

## Architecture
- **Framework**: Next.js 16 (App Router) + TypeScript + React
- **ORM/Schema**: Prisma 6.16.0 (schema/types/migrations)
- **Runtime DB**: Supabase as runtime persistence layer
- **Database**: PostgreSQL via Supabase (PgBouncer pooled)
- **Deployment**: Vercel Pro, Node 24.x, pnpm 10.28.0

## Production URLs
- https://www.autolenis.com
- https://autolenis-deploy.vercel.app

## Fix Inventory (All Sessions)

### Session 0: PR Fixes (merged to main before Emergent sessions)
| PR | Fix | Status |
|----|-----|--------|
| #23 | Env variable audit, Stripe live-key enforcement | Preserved |
| #29 | AI copilot enhancements | Preserved |
| #30 | iPredict CLV:INQ risk score extraction fix | Preserved |
| #31 | Prequal email messaging via Resend | Preserved |
| #32 | Inventory pipeline, field mappings, VIN handling | Preserved |
| #33 | P0 prequal blockers: cron, workspace isolation, admin routes | Preserved |
| #34 | Inventory search route Supabase error handling | Preserved |
| #1  | Node.js heap size OOM fix (4GB) | Preserved |

### Session 1: Deployment Fixes (Emergent)
| Fix | Status |
|-----|--------|
| Vercel project linked and configured | Preserved |
| .vercelignore created (exclude stale dirs) | Preserved |
| middleware.ts created (Next.js entry point) | Preserved |
| tsconfig.json: autolenis excluded from compilation | Preserved |
| All env vars verified/added on Vercel project | Preserved |
| Deployment from copilot/fix-vercel-deployment-issues branch | Production-live |

### Session 2: Database Alignment Fixes (Emergent)
| Fix | Status |
|-----|--------|
| VehicleRequestCase: VIEW → TABLE (18 cols, FKs, indexes, RLS) | Applied to DB |
| Transaction: added `type` column (TransactionType enum) | Applied to DB |
| Dealer: 12 columns renamed snake_case → camelCase | Applied to DB |
| dealer_agreements: 28 columns renamed snake_case → camelCase | Applied to DB |
| docusign_connect_events: 7 columns renamed snake_case → camelCase | Applied to DB |
| ConsentCaptureMethod enum: WRITTEN added to DB, IN_PERSON+ELECTRONIC added to Prisma | Applied |

### Session 3: Preservation Audit (Emergent)
| Fix | Status |
|-----|--------|
| .gitignore: /autolenis/ added, duplicate env blocks cleaned | Applied to main |
| eslint.config.mjs: autolenis/** added to ignores | Applied to main |
| All copilot branch fixes recovered to main | Verified |
| All PR fixes re-verified intact | Confirmed |
| All DB fixes re-verified intact | Confirmed |

## Branch Status
- **main**: Has ALL fixes (PRs + deployment + DB alignment + copilot recovery)
- **copilot/fix-vercel-deployment-issues**: Has build exclusion fix, MISSING session 2-3 Prisma/schema fixes
- **Production deployment**: From copilot branch, DB fixes applied directly to Supabase

## Remaining Action Items
- **P0**: Deploy from main branch to production (main now has ALL fixes unified)
- **P1**: Switch MicroBilt & DocuSign from sandbox to production
- **P1**: Configure Sentry for error monitoring
