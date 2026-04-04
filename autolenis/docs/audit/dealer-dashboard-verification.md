# Dealer Dashboard — Verification

## Commands

### Lint
```bash
pnpm lint
```
**Expected**: 0 errors. Only pre-existing warnings (unrelated to dealer dashboard).

### Build
```bash
pnpm build
```
**Expected**: Compiled successfully. All dealer routes rendered as dynamic (`ƒ`).

### Unit Tests (Dealer Dashboard Audit)
```bash
npx vitest run __tests__/dealer-dashboard-audit.test.ts
```
**Expected**: 132 tests passed.

### Full Unit Test Suite
```bash
pnpm test:unit
```
**Expected**: All tests pass (including the new dealer-dashboard-audit.test.ts).

## Test Coverage

The `dealer-dashboard-audit.test.ts` test suite covers:

| Category | Tests | Description |
|----------|-------|-------------|
| Dynamic Export Guard | 29 | No "use client" page combines `export const dynamic` |
| CSRF Protection | 30 | All mutation pages import and use `csrfHeaders`/`getCsrfToken` |
| API Route Existence | 17 | All API routes referenced by UI exist on disk |
| Auth Checks | 14 | All dealer API routes verify DEALER role |
| Error Handling | 11 | All dealer API catch blocks return HTTP 500 |
| Service Role Guard | 14 | No dealer API route uses `createAdminClient` |
| Loading Boundaries | 15 | All dealer page directories have `loading.tsx` |
| Profile PATCH | 2 | Profile API exports PATCH, page uses controlled inputs |

## Files Changed

| File | Change |
|------|--------|
| `app/dealer/auctions/offers/page.tsx` | Removed `export const dynamic` |
| `app/dealer/auctions/invited/page.tsx` | Removed `export const dynamic` |
| `app/api/dealer/profile/route.ts` | **Created** — GET + PATCH handler for dealer profile |
| `app/api/dealer/deals/route.ts` | Fixed catch block to return 500 |
| `app/api/dealer/payments/route.ts` | Fixed catch block to return 500 |
| `app/dealer/profile/page.tsx` | Replaced NotImplementedModal with real save, controlled inputs, CSRF |
| `app/dealer/onboarding/page.tsx` | Added CSRF headers |
| `app/dealer/auctions/[id]/page.tsx` | Added CSRF headers |
| `app/dealer/contracts/page.tsx` | Added CSRF headers |
| `app/dealer/contracts/[id]/page.tsx` | Added CSRF headers |
| `app/dealer/documents/page.tsx` | Added CSRF headers + getCsrfToken for uploads |
| `app/dealer/deals/[dealId]/insurance/page.tsx` | Added CSRF headers |
| `app/dealer/inventory/add/page.tsx` | Added CSRF headers |
| `app/dealer/inventory/bulk-upload/page.tsx` | Added CSRF headers + getCsrfToken for uploads |
| `app/dealer/messages/new/page.tsx` | Added CSRF headers |
| `app/dealer/messages/[threadId]/page.tsx` | Added CSRF headers |
| `app/dealer/offers/new/page.tsx` | Added CSRF headers |
| `app/dealer/payments/page.tsx` | Added CSRF headers |
| `app/dealer/pickups/page.tsx` | Added CSRF headers |
| `app/dealer/leads/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/profile/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/settings/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/requests/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/opportunities/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/payments/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/deals/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/contracts/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/pickups/loading.tsx` | **Created** — Suspense loading boundary |
| `app/dealer/messages/loading.tsx` | **Created** — Suspense loading boundary |
| `__tests__/dealer-dashboard-audit.test.ts` | **Created** — 132 tests |
| `docs/audit/dealer-dashboard-inventory.md` | **Created** — surface area inventory |
| `docs/audit/dealer-dashboard-findings.md` | **Created** — audit findings |
| `docs/audit/dealer-dashboard-verification.md` | **Created** — this file |
