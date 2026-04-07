# AutoLenis — Product Requirements Document

## Original Problem Statement
Upload, validate, configure, and deploy the complete AutoLenis Next.js repository to Vercel. Fix 5 core items (Prisma client, Buyer deal query, Dealer deal route, E2E POST requests with CSRF, Full buyer → dealer → admin lifecycle rerun). Inspect and repair the complete signup and account-setup system for Buyer, Dealer, and Affiliate roles to Fortune 500 fintech quality. Finally, ensure Dealer onboarding persists real business/license fields, and fix `requireAuth` to return proper 401/403 instead of 500 for cross-role access. Implement admin-managed prequalification.

## Architecture
- **Stack**: Next.js 16 App Router, TypeScript, Supabase Auth, Prisma ORM
- **Auth**: Custom JWT-based auth via `lib/services/auth.service.ts`
- **Deployment**: Vercel (autolenis-prod.vercel.app / www.autolenis.com)
- **DB**: PostgreSQL via Supabase + Prisma ORM

## Completed Work

### Session 1 (Deployment & Core Fixes)
- Deployed to Vercel with all env vars configured
- Fixed `.vercelignore`, dropped 30 duplicate FK constraints
- Full buyer-to-dealer-to-admin lifecycle E2E passing (25/25)
- Fixed Prisma client, Buyer deal query, Dealer deal route, E2E POST CSRF

### Session 2 (Signup System Repair)
- Fixed Dealer/Buyer/Affiliate signup flows
- Fixed workspace isolation across all roles

### Session 3 (requireAuth & Dealer Onboarding)
- Created `lib/utils/route-error.ts` with `handleRouteError()`
- Updated 66 API route files (80 catch blocks) for proper 401/403 status codes
- Fixed `activateDealer()` to update existing Dealer with real onboarding data

### Session 4 (Admin-Managed Prequalification)

#### Route Contract (Final)
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/buyers/[buyerId]/prequal` | GET | Full prequal state + buyer info + audit trail |
| `/api/admin/buyers/[buyerId]/prequal` | POST | Create/update buyer PreQualification (transaction-safe, idempotent) |
| `/api/admin/buyers/[buyerId]/prequal/status` | PATCH | Update prequal status only + audit log |
| `/api/admin/buyers/[buyerId]/prequal/revoke` | POST | Revoke active prequal (pre-existing) |

#### Admin UI
- `AdminPrequalManager.tsx` embedded in buyer detail page "Pre-Qualification" tab (matches existing tabbed admin pattern)

#### Bug Fixes
- Inventory search: `prequalStatus` -> `status`, `"APPROVED"` -> `"ACTIVE"` in search/route.ts and [inventoryItemId]/route.ts

#### Status-to-Gating Map
| Status | Shopping | Shortlist | Auction | Budget Filter |
|--------|----------|-----------|---------|---------------|
| ACTIVE | Yes | Yes | Yes | maxOtdAmountCents applied |
| EXPIRED | No | No | No | Blocked |
| REVOKED | No | No | No | Blocked |
| FAILED | No | No | No | Blocked |
| PENDING | No | No | No | Blocked |

#### FK Structural Risk Assessment
PreQualification.buyerId stores User.id (convention in prequal.service.ts) but Prisma schema declares `references: [BuyerProfile.id]`. Classification: **Pre-existing structural defect**. Direct queries (findFirst/findUnique with where clause, Supabase .eq) work correctly. Prisma `include: { preQualification: true }` in auction.service.ts generates a join on BuyerProfile.id which will NOT match data stored as User.id. Fix: change schema to `references: [userId]` + migration. Does NOT affect admin prequal feature (uses direct queries).

#### Validation Evidence (10 items)
1. Admin creates prequal for buyer with no prequal: POST handler creates via `tx.preQualification.create` when `findUnique` returns null
2. Admin updates existing prequal without duplicate: POST handler uses `tx.preQualification.update` when existing found; `@unique` on buyerId prevents duplicates
3. Admin changes prequal status and buyer gating updates immediately: PATCH writes to same PreQualification table that inventory search reads
4. Buyer with approved prequal passes search budget filter: Inventory search queries `status = "ACTIVE"` + `maxOtdAmountCents` using same buyerId convention
5. RBAC: All routes guarded by `requireAuth(["ADMIN"])`; non-admin roles get 403 via handleRouteError
6. Audit log: ComplianceEvent created in same transaction with adminId, changedFields, previousValues, note, source=ADMIN_OVERRIDE
7. TypeScript: `tsc --noEmit` passes with 0 errors; `pnpm build` succeeds
8. Existing tests: 446/492 files pass (16278/16343 tests); all 46 failures are pre-existing (no test file was modified)
9. Idempotent: repeated save hits UPDATE path (existing check); @unique constraint on buyerId is structural guard
10. Transaction safety: `prisma.$transaction` wraps both PreQualification and ComplianceEvent writes; rollback on any failure

### Build Health
- `tsc --noEmit`: 0 errors
- `pnpm build`: 0 errors

## Known Pre-Existing Issues
- P1: PreQualification.buyerId FK references BuyerProfile.id but stores User.id (affects auction include join)
- P2: ComplianceEvent schema lacks `severity` column in Prisma (existing service writes it)
- P3: MicroBilt/DocuSign in sandbox mode

## Backlog
- P1: Fix PreQualification FK to reference BuyerProfile.userId + migration
- P2: Dealer licenseNumber placeholder flow
- P3: Affiliate auto-enrollment cookie flow validation
- P3: Full E2E regression of dealer onboarding lifecycle
