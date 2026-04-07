# AutoLenis — Product Requirements Document

## Original Problem Statement
Upload, validate, configure, and deploy the complete AutoLenis Next.js repository to Vercel. Fix 5 core items (Prisma client, Buyer deal query, Dealer deal route, E2E POST requests with CSRF, Full buyer → dealer → admin lifecycle rerun). Inspect and repair the complete signup and account-setup system for Buyer, Dealer, and Affiliate roles to Fortune 500 fintech quality. Finally, ensure Dealer onboarding persists real business/license fields, and fix `requireAuth` to return proper 401/403 instead of 500 for cross-role access. Implement admin-managed prequalification.

## Architecture
- **Stack**: Next.js 16 App Router, TypeScript, Supabase Auth, Prisma ORM
- **Deployment**: Vercel
- **DB**: PostgreSQL via Supabase + Prisma ORM

## Completed Work

### Session 1–3 (Deployment, Signup, Auth Fixes)
- Deployed to Vercel, E2E passing, all 3 signup flows validated
- `handleRouteError()` in 66 routes for proper 401/403
- `activateDealer()` fixed for existing Dealer update

### Session 4 (Admin-Managed Prequalification)
- Route contract: GET+POST `/prequal`, PATCH `/prequal/status`
- Admin UI: `AdminPrequalManager.tsx` in buyer detail tab
- Bug fix: inventory search `prequalStatus` → `status`, `"APPROVED"` → `"ACTIVE"`

### Session 5 (P1 FK Fix)
- Prisma schema: `PreQualification.buyer` relation changed from `references: [id]` to `references: [userId]`
- Migration: `0002_fix_prequal_buyer_fk/migration.sql`
- Fixed auction validation Prisma `include` join

### Session 6 (P2: Dealer License Placeholder Flow)

#### Problem
Dealer signup inserted to `Dealer` table without providing required non-nullable columns (`licenseNumber`, `phone`, `address`, `city`, `state`, `zip`). The `licenseNumber` column is `@unique` and has no default.

#### Fix
1. **Signup** (`lib/services/auth.service.ts`): Dealer insert now includes all required fields:
   - `licenseNumber: "PENDING-{uuid8}"` — unique placeholder
   - `phone`, `address`, `city`, `state`, `zip` — empty strings (filled during onboarding)
   - `onboardingStatus: "DRAFT"`, `accessState: "NO_ACCESS"` — correct initial state
2. **Onboarding activation** (`activateDealer`): Already correctly overwrites placeholder with real `dealerLicenseNumber` from the onboarding application (line 525)
3. **Test fix**: Added `dealer.findUnique` to mock in `dealer-onboarding-service.test.ts` (our Session 3 change added a `findUnique` check that the test mock didn't cover)

#### Complete Lifecycle
```
Signup → Dealer(licenseNumber: "PENDING-abc12345", accessState: "NO_ACCESS")
  ↓
Onboarding Application → DealerApplication(dealerLicenseNumber: "DL-12345-TX")
  ↓
Admin Approval → activateDealer() → Dealer(licenseNumber: "DL-12345-TX", accessState: "FULLY_ACTIVE")
```

#### Files Changed
| File | Change |
|------|--------|
| `lib/services/auth.service.ts` | Dealer signup: added all required fields + PENDING license |
| `autolenis/__tests__/dealer-onboarding-service.test.ts` | Added `dealer.findUnique` mock |

### Build Health
- `tsc --noEmit`: 0 errors
- `pnpm build`: 0 errors
- `dealer-onboarding-service.test.ts`: 12/12 pass
- `auth-behavioral.test.ts`: 51/51 pass
- `auth-flow-remediation.test.ts`: 5/5 pass

## Deployment Note
Migration `0002_fix_prequal_buyer_fk` must be run on Supabase DB before or during next Vercel deploy. Use `prisma migrate deploy` or apply the SQL manually via Supabase dashboard.

## Backlog
- P3: Affiliate auto-enrollment cookie flow validation
- P3: Full E2E regression of dealer onboarding lifecycle
- P3: Verify-email resend flow
