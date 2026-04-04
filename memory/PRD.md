# AutoLenis Deployment PRD

## Original Problem Statement
Deploy the complete AutoLenis repository to production on Vercel. Multi-role automotive concierge and reverse-auction platform with Buyer, Dealer, Affiliate, and Admin portals.

## Architecture
- **Framework**: Next.js 16.0.11 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma 6.16.0 with PostgreSQL
- **Database**: Supabase PostgreSQL
- **Auth**: JWT + Supabase Auth
- **Payments**: Stripe
- **Email**: Resend
- **E-Sign**: DocuSign
- **Credit**: MicroBilt
- **AI**: Groq SDK
- **Package Manager**: pnpm 10.28.0
- **Deployment Target**: Vercel

## Platform Scale
- 257 pages (page.tsx files)
- 473 API routes
- 118 service files
- 4,725-line Prisma schema
- 10 cron jobs
- 249 test files (not run during deployment)
- 2,240 total source files

## What's Been Implemented (Build Readiness)
- [x] Repository ingested and validated (2,240 files)
- [x] Critical paths confirmed: app/, lib/, lib/services/, components/, prisma/schema.prisma, proxy.ts, vercel.json, package.json
- [x] Package manager detected: pnpm (from pnpm-lock.yaml)
- [x] Dependencies installed successfully
- [x] Prisma schema validated
- [x] Prisma client generated
- [x] TypeScript strict check passes (tsc --noEmit = 0 errors)
- [x] Next.js production build succeeds (Turbopack)
- [x] proxy.ts recognized as middleware
- [x] All 10 cron routes verified against vercel.json
- [x] All webhook endpoints exist (Stripe, DocuSign)
- [x] Node.js engine requirement updated to >=20.x (from 24.x) for Vercel compatibility
- [x] Vercel CLI installed (v50.39.0)

## Changes Made
1. **package.json**: Changed `engines.node` from `24.x` to `>=20.x` for Vercel Node.js compatibility
2. **.env**: Created with placeholder values to enable build validation

## Blockers for Production Deployment
All require operator-provided real credentials:
- POSTGRES_PRISMA_URL (Supabase pooled connection)
- POSTGRES_URL_NON_POOLING (Supabase direct connection)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- JWT_SECRET (32+ chars)
- STRIPE_SECRET_KEY (sk_live_...)
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...)
- STRIPE_WEBHOOK_SECRET
- RESEND_API_KEY
- CRON_SECRET
- Vercel account access/token

## Optional Credentials (features degraded without)
- GROQ_API_KEY (AI chat gracefully degrades)
- DocuSign credentials (dealer agreement signing disabled)
- MicroBilt credentials (IBV/iPredict disabled, sandbox fallback)

## Backlog / Next Steps
- P0: Obtain and configure all required credentials in Vercel env vars
- P0: Run `prisma migrate deploy` against production Supabase
- P0: Deploy with `vercel --prod`
- P1: Verify all 10 cron jobs registered post-deployment
- P1: Verify all routes return expected HTTP codes
- P1: Configure Stripe webhook endpoint URL
- P1: Configure DNS/domain if custom domain
- P2: Replace MicroBilt sandbox URLs with production endpoints
- P2: Configure DocuSign production credentials
