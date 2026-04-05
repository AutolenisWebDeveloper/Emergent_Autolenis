# AutoLenis Platform — Product Requirements Document

## Problem Statement
Upload, validate, configure, migrate, and deploy the complete AutoLenis Next.js 16 repository to Vercel. Ensure 100% working routes (no 500s/404s), validate all cron jobs, and preserve the existing architecture. Post-deployment, audit all 4 dashboards (Buyer, Dealer, Affiliate, Admin) to ensure Admin has full oversight and fix any broken links/APIs. Finally, review the entire pre-qualification system end-to-end, making all necessary corrections to UI, business logic, validation, state management, MicroBilt/iPredict API integrations, and system wiring to ensure the flow is fully operational.

## Architecture
- **Frontend**: Next.js 16 App Router, React, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Vercel
- **Architecture**: Strict RBAC, double-submit CSRF cookie pattern, `proxy.ts` middleware
- **Key Integrations**: Supabase, Stripe, Resend, DocuSign, MicroBilt/iPredict, Groq AI SDK

## What's Been Implemented

### Phase 1: Deployment & Configuration (DONE)
- Vercel deployment and DB baseline
- Fixed trailing newline bug in NEXT_PUBLIC_APP_URL causing 500 errors
- All environment variables configured
- DB migrations synced
- 10/10 cron jobs verified and running

### Phase 2: Dashboard Audit (DONE)
- All 4 dashboards (Admin, Buyer, Dealer, Affiliate) audited
- Zero broken navigation links
- 100% working auth-guarded API routes
- Created missing `/api/admin/offers` route
- Fixed `mockSelectors.adminOffers` TypeScript error

### Phase 3: Pre-Qualification System Audit (DONE - Feb 2026)
- **8 critical + 2 moderate issues found and fixed**
- Rewired frontend to use session-based API (was calling dead 503 endpoint)
- Implemented 3-step flow: Session → Consent → Run
- Fixed SSN server-side encryption pipeline
- Fixed FK violation on consent version (auto-create)
- Fixed unique constraint on PreQualification (create → upsert)
- Fixed invalid Prisma enum values in internal scorer
- Added declined/failure UI with retry
- Added proper field mapping and data transformation
- **36/36 tests passing** (API routes, scoring, normalization, encryption)
- Full audit report: `/app/autolenis/PREQUAL_AUDIT_REPORT.md`

## Prioritized Backlog

### P0 (None remaining)
All critical items completed.

### P1
- Full authenticated end-to-end testing with real buyer session
- Verify consent version auto-creation in production DB

### P2
- Replace MicroBilt/DocuSign sandbox credentials with production credentials
- Switch from INTERNAL to IPREDICT source type for LIVE mode
- Add IBV (Instant Bank Verification) flow integration
- Performance testing under concurrent prequal submissions
