# AutoLenis — Product Requirements Document

## Original Problem Statement
Upload, validate, configure, and deploy the complete AutoLenis Next.js repository to Vercel. Fix 5 core items (Prisma client, Buyer deal query, Dealer deal route, E2E POST requests with CSRF, Full buyer → dealer → admin lifecycle rerun). Inspect and repair the complete signup and account-setup system for Buyer, Dealer, and Affiliate roles to Fortune 500 fintech quality. Finally, ensure Dealer onboarding persists real business/license fields, and fix `requireAuth` to return proper 401/403 instead of 500 for cross-role access.

## Architecture
- **Stack**: Next.js 16 App Router, TypeScript, Supabase Auth, Prisma ORM
- **Auth**: Custom JWT-based auth via `lib/services/auth.service.ts`
- **Deployment**: Vercel (autolenis-prod.vercel.app / www.autolenis.com)

## Completed Work

### Session 1 (Deployment & Core Fixes)
- Deployed to Vercel with all env vars configured
- Fixed `.vercelignore`, dropped 30 duplicate FK constraints
- Full buyer→dealer→admin lifecycle E2E passing (25/25)
- Fixed Prisma client, Buyer deal query, Dealer deal route, E2E POST CSRF

### Session 2 (Signup System Repair)
- Fixed Dealer signup (missing columns, DealerUser creation, workspace)
- Fixed Buyer signup (missing package columns)
- Fixed Affiliate signup (invalid Prisma fields)
- Fixed workspace isolation across all roles
- All 3 signup flows validated (Buyer ✅, Dealer ✅, Affiliate ✅)

### Session 3 (requireAuth & Dealer Onboarding — Apr 7 2026)

#### P1: requireAuth returns proper 401/403 instead of 500 ✅
- Created `lib/utils/route-error.ts` with `handleRouteError()` utility
- Updated 66 API route files (80 catch blocks) to use `handleRouteError`
- 14 additional files already handled 401/403 via string matching (left as-is)
- 57 files already had `statusCode` handling (unchanged)
- All 137 routes using `requireAuth` now return proper HTTP status codes

#### P1: Dealer onboarding persists real business/license fields ✅
- `DealerApplication` model already captures all fields (taxIdLast4, dealerLicenseNumber, licenseState, entityType, etc.)
- Fixed `activateDealer()` in `dealer-onboarding.service.ts`:
  - Now checks for existing Dealer by `userId` before creating (prevents unique constraint violation)
  - Updates existing placeholder Dealer with real onboarding data (licenseNumber, businessName, etc.)
  - All business fields from application are copied to Dealer entity on activation

#### Build Health ✅
- `tsc --noEmit` passes with 0 errors
- `pnpm build` succeeds with 0 errors
- All 66 modified files have balanced braces verified

### Files Changed (Session 3)
| File | Change | Severity |
|------|--------|----------|
| `lib/utils/route-error.ts` | New utility: `handleRouteError()` for 401/403 propagation | P1 |
| `lib/services/dealer-onboarding/dealer-onboarding.service.ts` | Fixed `activateDealer()` to update existing Dealer + copy all business fields | P1 |
| 66 API route files under `app/api/` | Updated catch blocks to use `handleRouteError` | P1 |
| `app/api/admin/preapprovals/[submissionId]/review/route.ts` | Fixed pre-existing bug: `message` → `error` in console.error | P2 |

## Remaining Risks
- P2: Verify-email resend requires email to be passed via query param or session
- P3: MicroBilt/DocuSign in test mode (sandbox endpoints)

## Backlog
- P2: Dealer licenseNumber placeholder flow — onboarding step to replace PENDING-xxx
- P3: Affiliate auto-enrollment cookie flow validation (proxy.ts ref= tracking)
- P3: Full E2E regression test of dealer onboarding lifecycle (signup → application → admin review → activation)
