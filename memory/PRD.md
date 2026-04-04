# AutoLenis Deployment & Dashboard Audit PRD

## Original Problem Statement
1. Deploy AutoLenis multi-role automotive concierge platform to Vercel production
2. Audit and fix all 4 dashboards (Buyer, Dealer, Affiliate, Admin) ensuring proper connections
3. Ensure Admin dashboard has full visibility across all other dashboards

## Architecture
- **Framework**: Next.js 16.0.11 (App Router, Turbopack)
- **Language**: TypeScript (strict mode)
- **ORM**: Prisma 6.16.0 with PostgreSQL
- **Database**: Supabase PostgreSQL
- **Auth**: JWT + Supabase Auth, RBAC via proxy.ts middleware
- **Payments**: Stripe (live keys)
- **Email**: Resend
- **E-Sign**: DocuSign (sandbox)
- **Credit**: MicroBilt (sandbox)
- **AI**: Groq SDK
- **Deployment**: Vercel (autolenis-deploy project)

## Platform Scale
- 257 pages | 473 API routes | 118 service files | 10 cron jobs
- 4,725-line Prisma schema | 2,240 total source files
- 4 dashboard ecosystems: Buyer, Dealer, Affiliate, Admin

## What's Been Implemented

### Phase 1: Vercel Deployment (April 4, 2026)
- [x] Repository ingested (2,240 files)
- [x] Dependencies installed (pnpm)
- [x] Prisma schema validated, client generated
- [x] Database migration applied (baseline)
- [x] TypeScript strict check passes (0 errors)
- [x] Build succeeds (Next.js 16 Turbopack)
- [x] Deployed to Vercel production
- [x] All 10 cron jobs registered
- [x] All routes verified (zero 500s, zero 404s)
- Production URL: https://autolenis-deploy.vercel.app

### Phase 2: Dashboard Connection Audit (April 4, 2026)
- [x] All 4 dashboard route structures audited
- [x] All navigation links verified (zero broken links)
- [x] All API route connections verified
- [x] Auth guards and RBAC verified via proxy.ts
- [x] Cross-dashboard data wiring confirmed
- [x] Missing /api/admin/offers route created and deployed
- [x] Admin → Buyer oversight: 43 pages, 7 key routes
- [x] Admin → Dealer oversight: 35 pages, 7 key routes
- [x] Admin → Affiliate oversight: 23 pages, 4 key routes
- [x] Admin → Deal lifecycle: 7 key route groups
- [x] Admin → Payments/Compliance: 7 key route groups
- [x] Admin → System management: 8 key route groups

## Changes Made
1. **package.json**: `engines.node` 24.x → >=20.x (Vercel compatibility)
2. **Vercel env vars**: 43 variables set with printf (no trailing newlines)
3. **NEW: app/api/admin/offers/route.ts**: Created missing admin offers API route

## Dashboard Route Summary
- Buyer: 20 pages, 15+ API routes
- Dealer: 22 pages, 30+ API routes  
- Affiliate: 12 pages, 10+ API routes
- Admin: 50+ pages, 214 API routes (full cross-dashboard visibility)

## Remaining Operator Actions
- P1: Point custom domain (autolenis.com) to Vercel deployment
- P1: Register Stripe webhook URL
- P2: Replace DocuSign/MicroBilt sandbox credentials for production
- P2: Verify Resend sender domain

## Backlog
- P0: Custom domain DNS configuration
- P1: Stripe webhook registration
- P2: Production DocuSign/MicroBilt credentials
