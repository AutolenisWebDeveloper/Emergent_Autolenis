# Affiliate Dashboard Verification

## Commands

### Lint

```bash
pnpm lint
```

**Expected**: 0 errors, 2 pre-existing warnings (unrelated to affiliate code).

### Build

```bash
pnpm build
```

**Expected**: Successful build with all affiliate routes compiled:
- 29 affiliate page routes (static + dynamic)
- 14 affiliate API routes
- All portal pages render without errors

### Unit Tests

```bash
pnpm test:unit
```

**Expected**: All 1601 tests pass across 75 test files, including:

| Test File | Tests | Description |
|-----------|-------|-------------|
| `affiliate-dashboard-audit.test.ts` | 39 | Commission rate consistency, calculation math, API auth, error handling, response shape, input validation |
| `affiliate-referrals-visibility.test.ts` | 30 | Referral visibility, API contracts, navigation integrity, attribution idempotency |
| `affiliate-payments.test.ts` | 14 | Payment flow RBAC, workspace isolation, mock data, payment status values |
| `affiliate-detail.test.ts` | 26 | Admin affiliate detail page contracts, RBAC, mock data |
| `affiliate-share-link.test.ts` | 11 | Share link logic, HTML escaping, email templates |
| `admin-dealers-affiliates.test.ts` | — | Admin affiliate management |
| `service-role-scanner.test.ts` | 2 | Service-role usage prevention in portal APIs |

### E2E Tests

```bash
pnpm test:e2e
```

**Expected**: Playwright smoke tests pass for all portal pages:
- All 10 portal pages load without HTTP 500
- Share link API requires authentication (401/403)
- Settings API requires authentication (401/403)
- Income calculator renders controls
- Documents, payouts, settings pages load

## Test Output

### Unit Test Results

```
Test Files  75 passed (75)
     Tests  1601 passed (1601)
  Start at  ...
  Duration  ~47s
```

### Lint Results

```
2 problems (0 errors, 2 warnings)
```

Both warnings are pre-existing and unrelated to affiliate code:
1. `app/admin/documents/page.tsx` — React Hook useCallback dependency warning
2. `lib/resend.ts` — Unused eslint-disable directive

## Security Verification

| Check | Result |
|-------|--------|
| No `error.message` leaks in catch blocks | ✅ All 14 affiliate API routes verified |
| No `createAdminClient()` in portal APIs | ✅ Enforced by `service-role-scanner.test.ts` |
| No `SUPABASE_SERVICE_ROLE_KEY` in portal APIs | ✅ Enforced by `service-role-scanner.test.ts` |
| RBAC checks on authenticated endpoints | ✅ All routes check `isAffiliateRole()` or equivalent |
| Catch blocks return 500 (not 400) | ✅ All 14 affiliate API routes verified |
| Input validation with Zod | ✅ Click, process-referral, share-link routes |
| Pagination clamping | ✅ Commissions, referrals (page ≥ 1, limit ≤ 100), analytics (days ≤ 365) |
| Self-referral prevention | ✅ `SELF_REFERRAL_BLOCKED` in affiliate service |
| Commission idempotency | ✅ `existingCommissions` check prevents duplicates |
| Referral chain idempotency | ✅ `existingReferrals` check prevents duplicates |

## Changes Made

| File | Change |
|------|--------|
| `app/api/affiliate/settings/route.ts` | Removed `error.message` leak from GET and PATCH catch blocks; changed PATCH catch status 400→500 |
| `app/api/affiliate/documents/route.ts` | Removed `error.message` leak from GET and POST catch blocks |
| `app/api/affiliate/click/route.ts` | Removed `error.message` leak from POST and GET catch blocks; changed status 400→500 |
| `app/api/affiliate/enroll/route.ts` | Removed `error.message` leak from catch block; changed status 400→500 |
| `app/api/affiliate/process-referral/route.ts` | Removed `error.message` leak from catch block; changed status 400→500 |
| `app/api/affiliate/share-link/route.ts` | Removed `error.message` leak from catch block; changed status 400→500 |
| `app/api/affiliate/referral/route.ts` | Removed `error.message` leak from catch block; changed status 400→500 |
| `app/api/affiliate/referrals/affiliates/route.ts` | Removed `error.message` leak from catch block |
| `app/api/affiliate/referrals/buyers/route.ts` | Removed `error.message` leak from catch block |
| `__tests__/affiliate-dashboard-audit.test.ts` | Extended `ROUTES_WITH_CATCH` from 5 to 14 routes for comprehensive error handling coverage |
