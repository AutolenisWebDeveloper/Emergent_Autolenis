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
- Full buyer→dealer→admin lifecycle E2E passing (25/25)
- Fixed Prisma client, Buyer deal query, Dealer deal route, E2E POST CSRF

### Session 2 (Signup System Repair)
- Fixed Dealer/Buyer/Affiliate signup flows
- Fixed workspace isolation across all roles

### Session 3 (requireAuth & Dealer Onboarding — Apr 7 2026)
- Created `lib/utils/route-error.ts` with `handleRouteError()`
- Updated 66 API route files (80 catch blocks) → proper 401/403 status codes
- Fixed `activateDealer()` to update existing Dealer with real onboarding data

### Session 4 (Admin-Managed Prequalification — Apr 7 2026)

#### New API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/admin/buyers/[buyerId]/prequal` | GET | Full prequal state + audit trail for admin form |
| `/api/admin/buyers/[buyerId]/prequal/manual` | POST | Create/update buyer PreQualification (transaction-safe, idempotent) |
| `/api/admin/buyers/[buyerId]/prequal/status` | PATCH | Update prequal status only + audit log |

#### Admin UI Component
- `AdminPrequalManager.tsx` — embedded in buyer detail page "Pre-Qualification" tab
- Shows current prequal state (status, budget, credit tier, DTI, monthly payment range)
- Form to create/update full prequal record (credit tier, max OTD, monthly range, DTI, score)
- Independent status override control with reason field
- Audit trail viewer showing all admin prequal actions
- Loading / success / error states on every action

#### Bug Fixes
- Fixed critical inventory search bug: `prequalStatus` → `status`, `"APPROVED"` → `"ACTIVE"` in:
  - `app/api/buyer/inventory/search/route.ts`
  - `app/api/buyer/inventory/[inventoryItemId]/route.ts`

#### Status-to-Gating Map
| Status | Shopping | Shortlist | Auction | Budget Filter |
|--------|----------|-----------|---------|---------------|
| ACTIVE | Yes | Yes | Yes | maxOtdAmountCents applied |
| EXPIRED | No | No | No | Blocked |
| REVOKED | No | No | No | Blocked |
| FAILED | No | No | No | Blocked |
| PENDING | No | No | No | Blocked |

#### Buyer Propagation Flow
1. Admin writes PreQualification via POST `/api/admin/buyers/[buyerId]/prequal/manual`
2. `maxOtdAmountCents` + `status: "ACTIVE"` → immediately readable by:
   - Inventory search: `PreQualification.status = "ACTIVE"` + `maxOtdAmountCents` budget filter
   - Auction validation: `PreQualification` existence + `expiresAt > now()` + `maxOtd` OTD check
   - Buyer dashboard: reads from `PreQualification` via `prequal.service.ts`
3. Status changes via PATCH propagate immediately to all gates

#### Audit Logging
- All admin prequal actions logged to `ComplianceEvent` with:
  - `eventType`: ADMIN_MANUAL_PREQUAL | ADMIN_PREQUAL_STATUS_CHANGE
  - `action`: action descriptor
  - `details`: adminId, changedFields, previousValues, note, source=ADMIN_OVERRIDE
  - `userId` + `buyerId` for traceability

#### Files Changed
| File | Change |
|------|--------|
| `app/api/admin/buyers/[buyerId]/prequal/route.ts` | Rewritten: comprehensive GET with audit events |
| `app/api/admin/buyers/[buyerId]/prequal/manual/route.ts` | NEW: POST create/update prequal |
| `app/api/admin/buyers/[buyerId]/prequal/status/route.ts` | NEW: PATCH status override |
| `app/admin/buyers/[buyerId]/AdminPrequalManager.tsx` | NEW: Admin prequal management UI |
| `app/admin/buyers/[buyerId]/page.tsx` | Integrated AdminPrequalManager into Pre-Qualification tab |
| `app/api/buyer/inventory/search/route.ts` | BUG FIX: prequalStatus→status, APPROVED→ACTIVE |
| `app/api/buyer/inventory/[inventoryItemId]/route.ts` | BUG FIX: same column name fix |

### Build Health
- `tsc --noEmit`: 0 errors
- `pnpm build`: succeeds cleanly

## Remaining Risks
- P2: ComplianceEvent schema has no `severity` column in Prisma (existing service code writes it; either DB column exists outside Prisma or Prisma ignores extra fields)
- P2: PreQualification.buyerId FK references BuyerProfile.id but codebase convention stores User.id — pre-existing inconsistency, not introduced by this change
- P3: MicroBilt/DocuSign in sandbox mode

## Backlog
- P2: Dealer licenseNumber placeholder flow — onboarding step to replace PENDING-xxx
- P3: Affiliate auto-enrollment cookie flow validation
- P3: Full E2E regression of dealer onboarding lifecycle
- P3: Verify-email resend requires email via query param or session
