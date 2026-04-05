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
| .vercelignore created | Local main (pending push) | Ready |
| middleware.ts created | Local main (pending push) | Ready |
| tsconfig.json: autolenis excluded | Local main + copilot | Preserved |
| All env vars on Vercel project | Vercel project settings | Live |
| Production deployment from copilot branch | Vercel production | Live |

### Session 2: Database Alignment Fixes (Emergent)
| Fix | Where Applied | Status |
|-----|---------------|--------|
| VehicleRequestCase VIEW → TABLE (18 cols) | Supabase DB directly | Live |
| Transaction.type column added | Supabase DB directly | Live |
| Dealer: 12 cols snake_case → camelCase | Supabase DB directly | Live |
| dealer_agreements: 28 cols renamed | Supabase DB directly | Live |
| docusign_connect_events: 7 cols renamed | Supabase DB directly | Live |
| ConsentCaptureMethod enum aligned | DB + Prisma schema | Live + pending push |

### Session 3: Preservation Audit + Deployment Fix (Emergent)
| Fix | Where Applied | Status |
|-----|---------------|--------|
| .gitignore: /autolenis/ recovered from copilot | Local main (committed) | Pending push |
| eslint.config.mjs: autolenis/** recovered | Local main (committed) | Pending push |
| .gitignore: 16 duplicate env blocks cleaned | Local main (committed) | Pending push |
| vercel.json: `rm -rf autolenis` added to build | Local main (unstaged) | Pending commit+push |
| Vercel project build command updated | Vercel project settings | Live |
| All 20 prior fixes verified intact | Verification only | Confirmed |

## Current State
- **Production**: Deployed from copilot/fix-vercel-deployment-issues, stable
- **Main branch (local)**: Contains ALL unified fixes, 3 commits + 1 unstaged change ahead of GitHub
- **After Emergent push**: `main` can be deployed to production (vercel.json now has `rm -rf autolenis`)

## Pending Push to GitHub (8 files)
| File | Change |
|------|--------|
| .gitignore | Cleaned duplicates + added /autolenis/ |
| .vercelignore | New file (exclude stale dirs) |
| eslint.config.mjs | Added autolenis/** ignore |
| memory/PRD.md | Updated documentation |
| middleware.ts | New file (Next.js entry point) |
| prisma/schema.prisma | ConsentCaptureMethod: IN_PERSON + ELECTRONIC |
| tsconfig.json | autolenis + autolenis_repo excluded |
| vercel.json | Build command: rm -rf autolenis && ... |

## Next Actions After Push
1. Trigger deployment from `main` branch (will succeed with updated vercel.json)
2. Switch MicroBilt & DocuSign from sandbox to production
3. Configure Sentry for error monitoring
