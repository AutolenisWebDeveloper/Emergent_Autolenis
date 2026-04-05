# AutoLenis - Production Readiness Document

## Project Overview
AutoLenis is a multi-role car-buying concierge platform with buyer, dealer, affiliate, and admin portals. Features include prequalification, inventory management, silent reverse auction, best-price engine, financing, insurance, Contract Shield, e-sign, pickup scheduling, affiliate commissions, payments, audit logging, and admin oversight.

## Architecture
- **Framework**: Next.js 16.0.11 (App Router, Turbopack)
- **Language**: TypeScript + React
- **ORM**: Prisma 6.16.0
- **Database**: PostgreSQL via Supabase (pooled via PgBouncer)
- **Auth**: Custom JWT + Supabase auth, MFA support
- **Payments**: Stripe (live keys)
- **Email**: Resend
- **E-Sign**: DocuSign (sandbox)
- **Prequalification**: MicroBilt iPredict + IBV
- **AI**: Groq
- **Deployment**: Vercel (Pro plan)
- **Node**: 24.x, pnpm 10.28.0

## Deployment Details
- **Date**: April 5, 2026
- **Vercel Project**: autolenis-deploy (prj_0nqteNxc8Fmp5PVKOsWC3V8NdhLx)
- **Production URL**: https://www.autolenis.com
- **Vercel URL**: https://autolenis-deploy.vercel.app
- **Branch Deployed**: copilot/fix-vercel-deployment-issues
- **Build Status**: SUCCESS
- **Migration Status**: 0001_initial_baseline applied (213 tables)
- **All 334 routes compiled successfully**

## What's Been Implemented (Deployment Session)
- Verified and triggered production deployment from `copilot/fix-vercel-deployment-issues` branch
- Branch excludes stale `autolenis/` directory that caused TS errors and OOM during build
- All environment variables verified on Vercel project
- Added missing Microbilt env vars (MICROBILT_OAUTH_TOKEN_URL, IPREDICT_* URLs)
- Database connectivity verified (Prisma -> Supabase PostgreSQL)
- All public routes (16+), protected routes (4 portals), API endpoints verified
- RBAC working: protected routes redirect to auth (307)
- API endpoints return proper error codes (400/401) not 500s
- Rate limiting working on contact form
- Static assets (robots.txt, sitemap.xml) serving correctly

## Key Fixes Applied (by copilot branch)
1. **tsconfig.json**: Added `autolenis` to exclude array (stale 56MB duplicate caused TS errors)
2. **eslint.config.mjs**: Added `autolenis/**` to ignores
3. **.gitignore**: Added `/autolenis/` to prevent re-additions
4. **git rm --cached**: Removed stale autolenis/ from git tracking

## Remaining Risks / Action Items

### P0 - Critical
- **Main branch not deployable**: The `main` branch still has the stale `autolenis/` directory. Merge `copilot/fix-vercel-deployment-issues` into `main` to fix.

### P1 - Important
- **MicroBilt sandbox in production**: Build logs warn about sandbox URLs for MicroBilt iPredict and IBV. Set production endpoints when ready.
- **DocuSign in sandbox**: `DOCUSIGN_ENV=sandbox` - switch to production when ready
- **Sentry not configured**: `sentryDsn: 'not set'` - consider adding for error monitoring

### P2 - Nice to Have
- **Prisma update**: v6.16.0 -> v7.6.0 available (major version, test before upgrading)
- **baseline-browser-mapping**: Package data is outdated (non-blocking warning)
- **Empty inventory**: No inventory items in database yet
