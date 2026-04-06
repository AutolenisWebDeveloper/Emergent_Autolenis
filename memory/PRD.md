# AutoLenis — Production Deployment PRD

## Original Problem Statement
Deploy the complete AutoLenis repository (multi-role automotive concierge & reverse-auction platform) to Vercel production. The platform includes Buyer, Dealer, Affiliate, and Admin portals with a lifecycle spanning prequalification through deal completion.

## Architecture
- **Stack**: Next.js 16 App Router, TypeScript strict mode, Prisma ORM, PostgreSQL/Supabase, Stripe, Resend, DocuSign, MicroBilt, Groq AI SDK
- **Scale**: ~4,566 files, 10 cron jobs, 4,732-line Prisma schema
- **Middleware**: proxy.ts (active)
- **Package Manager**: pnpm 10.28.0
- **Node.js**: 24.x

## What's Been Implemented (Jan 2026)
1. **Repository ingested** from GitHub (AutolenisWebDeveloper/Emergent_Autolenis)
2. **`.vercelignore` fixed**: Changed `mocks/` → `/mocks/` and `memory/` → `/memory/` to prevent excluding `lib/mocks/` and `lib/ai/memory/` during Vercel upload
3. **All environment variables configured** on Vercel project (38+ vars including Supabase, Stripe, Resend, DocuSign, MicroBilt, Groq, CRON_SECRET, JWT, encryption keys)
4. **Prisma validated** and database schema confirmed up-to-date (1 migration applied)
5. **Build succeeded** on Vercel (Turbopack, zero type errors, zero missing modules)
6. **Deployed to production**: https://autolenis-prod.vercel.app
7. **10 cron jobs registered** on Vercel
8. **All routes verified**:
   - Public routes (/, /how-it-works, /pricing, /for-dealers, /affiliate) → 200
   - Auth routes (/auth/signin, /auth/signup) → 200
   - Protected portals (/buyer, /dealer, /affiliate/portal, /admin) → 307 (auth redirect)
   - Webhooks (/api/webhooks/stripe, /api/webhooks/docusign) → 400/401 (expected)

## Changes Made
| File | Change | Reason |
|------|--------|--------|
| `.vercelignore` | `mocks/` → `/mocks/` | Prevented excluding `lib/mocks/mockStore.ts` (build blocker) |
| `.vercelignore` | `memory/` → `/memory/` | Prevented excluding `lib/ai/memory/session-store.ts` (build blocker) |

## Deployment Details
- **Vercel Project**: autolenis-prod (prj_HNlYKYDQjqjVBU3jsrEckAV4q1b4)
- **Production URL**: https://autolenis-prod.vercel.app
- **Build Command**: `rm -rf autolenis && NODE_OPTIONS=--max-old-space-size=4096 pnpm build`
- **Install Command**: `pnpm install --frozen-lockfile`

## Cron Jobs (All Registered)
1. `/api/cron/auction-close` — every 5 min
2. `/api/cron/release-expired-holds` — every 10 min
3. `/api/cron/affiliate-reconciliation` — hourly
4. `/api/cron/contract-shield-reconciliation` — hourly
5. `/api/cron/session-cleanup` — every 6 hours
6. `/api/cron/prequal/purge` — daily at 3AM
7. `/api/cron/prequal/message-delivery` — every 5 min
8. `/api/cron/prequal/stale-cleanup` — daily at 2AM
9. `/api/cron/prequal/sla-escalation` — every 30 min
10. `/api/cron/prequal/ibv-reminders` — hourly

## Remaining Risks
- DocuSign is in **sandbox** mode (`DOCUSIGN_ENV=sandbox`). Production approval needed for live e-sign flows.
- MicroBilt URLs point to **apitest** endpoints. Production credentials needed for live prequalification.
- `NEXT_PUBLIC_APP_URL` is set to `https://www.autolenis.com` — if the custom domain isn't pointed at this Vercel project, update accordingly.

## Required Operator Actions
1. **Custom Domain**: Point `autolenis.com` / `www.autolenis.com` DNS to this Vercel project if desired
2. **Stripe Webhook**: Register `https://autolenis-prod.vercel.app/api/webhooks/stripe` in Stripe Dashboard
3. **DocuSign Production**: Apply for DocuSign production keys when ready for live e-signatures
4. **MicroBilt Production**: Obtain production MicroBilt credentials for live prequalification
5. **Resend Domain Verification**: Ensure `autolenis.com` is verified in Resend for email delivery

## Prioritized Backlog
- P0: None (deployment complete)
- P1: Custom domain configuration, Stripe webhook registration
- P2: DocuSign production migration, MicroBilt production credentials
- P3: Resend domain verification, monitoring/alerting setup
