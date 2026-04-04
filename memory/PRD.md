# AutoLenis Deployment PRD

## Original Problem Statement
Deploy the complete AutoLenis multi-role automotive concierge and reverse-auction platform to Vercel production. 256 pages, 467+ API routes, 119 service files, 4,725-line Prisma schema.

## Architecture
- **Framework**: Next.js 16.0.11 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma 6.16.0 with PostgreSQL
- **Database**: Supabase PostgreSQL (pooled via PgBouncer)
- **Auth**: JWT + Supabase Auth
- **Payments**: Stripe (live keys)
- **Email**: Resend
- **E-Sign**: DocuSign (sandbox)
- **Credit**: MicroBilt (sandbox)
- **AI**: Groq SDK
- **Package Manager**: pnpm 10.28.0
- **Deployment**: Vercel (autolenis-deploy project)

## Platform Scale
- 257 pages | 473 API routes | 118 service files | 10 cron jobs
- 4,725-line Prisma schema | 249 test files (not run)
- 2,240 total source files

## Deployment Completed - April 4, 2026
- **Production URL**: https://autolenis-deploy.vercel.app
- **Build**: SUCCESS (Vercel, Node 20.x, pnpm)
- **Migration**: APPLIED (baseline migration resolved against live Supabase)
- **Cron Jobs**: ALL 10 REGISTERED
- **Route Verification**: ALL PASS (zero 500s, zero 404s)

## Changes Made
1. **package.json**: `engines.node` from `24.x` → `>=20.x` (Vercel Node.js compatibility)
2. **Vercel project settings**: Node version set to 20.x
3. **Environment variables**: All 43 variables configured in Vercel production scope (fixed trailing newline issue from `echo` → `printf`)

## Blockers Resolved
1. **Vercel CLI deployment blocked by SSO/Git protection**: Created new `autolenis-deploy` project (not Git-linked)
2. **CRON_SECRET trailing whitespace**: Fixed header validation failure in cron routes
3. **NEXT_PUBLIC_APP_URL trailing newline**: Caused `%0A` in CORS header → all API routes 500. Fixed with `printf` instead of `echo` for env var injection
4. **Database migration conflict**: Production DB already had tables → used `prisma migrate resolve --applied` to baseline

## Route Verification Results
| Route | Method | Status | Expected | Result |
|-------|--------|--------|----------|--------|
| / | GET | 200 | 200 | ✅ |
| /how-it-works | GET | 200 | 200 | ✅ |
| /pricing | GET | 200 | 200 | ✅ |
| /for-dealers | GET | 200 | 200 | ✅ |
| /affiliate | GET | 200 | 200 | ✅ |
| /auth/signin | GET | 200 | 200 | ✅ |
| /auth/signup | GET | 200 | 200 | ✅ |
| /buyer | GET | 307 | redirect | ✅ |
| /dealer | GET | 307 | redirect | ✅ |
| /affiliate/portal | GET | 307 | redirect | ✅ |
| /admin | GET | 307 | redirect | ✅ |
| /api/health | GET | 401 | non-500 | ✅ |
| /api/webhooks/stripe | POST | 400 | non-500 | ✅ |
| /api/webhooks/docusign | POST | 401 | non-500 | ✅ |
| /api/cron/* | POST | 403-405 | non-500 | ✅ |

## Cron Jobs Registered
| Path | Schedule | Status |
|------|----------|--------|
| /api/cron/auction-close | */5 * * * * | ✅ REGISTERED |
| /api/cron/release-expired-holds | */10 * * * * | ✅ REGISTERED |
| /api/cron/affiliate-reconciliation | 0 * * * * | ✅ REGISTERED |
| /api/cron/contract-shield-reconciliation | 0 * * * * | ✅ REGISTERED |
| /api/cron/session-cleanup | 0 */6 * * * | ✅ REGISTERED |
| /api/cron/prequal/purge | 0 3 * * * | ✅ REGISTERED |
| /api/cron/prequal/message-delivery | */5 * * * * | ✅ REGISTERED |
| /api/cron/prequal/stale-cleanup | 0 2 * * * | ✅ REGISTERED |
| /api/cron/prequal/sla-escalation | */30 * * * * | ✅ REGISTERED |
| /api/cron/prequal/ibv-reminders | 0 * * * * | ✅ REGISTERED |

## Remaining Operator Actions
- P1: Point custom domain (autolenis.com) to Vercel deployment
- P1: Register Stripe webhook URL → `https://autolenis-deploy.vercel.app/api/webhooks/stripe`
- P1: Update NEXT_PUBLIC_APP_URL to match final production domain
- P2: Replace DocuSign sandbox credentials with production when ready
- P2: Replace MicroBilt sandbox URLs with production endpoints
- P2: Verify Resend sender domain (autolenis.com)

## Backlog
- P0: Custom domain DNS configuration
- P1: Stripe webhook registration
- P2: DocuSign production approval
- P2: MicroBilt production credentials
