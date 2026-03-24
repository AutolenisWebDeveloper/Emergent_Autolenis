# Affiliate Dashboard Findings

## Issues Found and Resolved

### 1. Error Message Information Disclosure in Settings API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/settings/route.ts` |
| Root Cause | GET and PATCH catch blocks exposed `error.message` directly in the JSON response, leaking internal error details to clients |
| Fix Applied | Replaced `error.message \|\| "..."` with static error messages; changed PATCH catch status from 400 to 500 |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "does not leak error.message to clients in catch" |

### 2. Error Message Information Disclosure in Documents API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/documents/route.ts` |
| Root Cause | GET and POST catch blocks exposed `error.message` directly in the JSON response |
| Fix Applied | Replaced `error.message \|\| "Server error"` with static `"Server error"` message |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "does not leak error.message to clients in catch" |

### 3. Error Message Information Disclosure in Click API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/click/route.ts` |
| Root Cause | POST and GET catch blocks exposed `error.message` directly, and used incorrect 400 status for server errors |
| Fix Applied | Replaced with static error messages; changed status from 400 to 500 |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "catch block returns 500, not 400" and "does not leak error.message" |

### 4. Error Message Information Disclosure in Enroll API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/enroll/route.ts` |
| Root Cause | Catch block exposed `error.message` directly with incorrect 400 status |
| Fix Applied | Replaced with static `"Failed to enroll as affiliate"` message; changed status to 500 |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "does not leak error.message to clients in catch" |

### 5. Error Message Information Disclosure in Process Referral API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/process-referral/route.ts` |
| Root Cause | Catch block exposed `error.message` directly with incorrect 400 status |
| Fix Applied | Replaced with static `"Failed to process referral"` message; changed status to 500 |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "does not leak error.message to clients in catch" |

### 6. Error Message Information Disclosure in Share Link API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/share-link/route.ts` |
| Root Cause | Catch block exposed `error.message` directly with incorrect 400 status |
| Fix Applied | Replaced with static `"Failed to share link"` message; changed status to 500 |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "does not leak error.message to clients in catch" |

### 7. Incomplete Test Coverage for Error Handling

| Field | Value |
|-------|-------|
| Severity | Low |
| File | `__tests__/affiliate-dashboard-audit.test.ts` |
| Root Cause | `ROUTES_WITH_CATCH` array only covered 5 of 11 affiliate API routes, missing settings, documents, click, enroll, process-referral, and share-link |
| Fix Applied | Extended `ROUTES_WITH_CATCH` to include all 11 affiliate API route files |
| Verification | Test suite now runs 1595 tests (12 new), all passing |

### 8. Error Message Information Disclosure in Referral API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/referral/route.ts` |
| Root Cause | Catch block exposed `error.message` directly with incorrect 400 status |
| Fix Applied | Replaced with static `"Failed to track referral"` message; changed status to 500; removed `error: any` typing |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "does not leak error.message to clients in catch" |

### 9. Error Message Information Disclosure in Referrals/Affiliates API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/referrals/affiliates/route.ts` |
| Root Cause | Catch block exposed `error.message` directly in the JSON response |
| Fix Applied | Replaced with static `"Failed to get referred affiliates"` message; removed `error: any` typing |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "does not leak error.message to clients in catch" |

### 10. Error Message Information Disclosure in Referrals/Buyers API

| Field | Value |
|-------|-------|
| Severity | Medium |
| File | `app/api/affiliate/referrals/buyers/route.ts` |
| Root Cause | Catch block exposed `error.message` directly in the JSON response |
| Fix Applied | Replaced with static `"Failed to get referred buyers"` message; removed `error: any` typing |
| Verification | `__tests__/affiliate-dashboard-audit.test.ts` — "does not leak error.message to clients in catch" |

### 11. Test Coverage Gap for Three Additional Routes

| Field | Value |
|-------|-------|
| Severity | Low |
| File | `__tests__/affiliate-dashboard-audit.test.ts` |
| Root Cause | `ROUTES_WITH_CATCH` array covered 11 routes but missed referral, referrals/affiliates, and referrals/buyers |
| Fix Applied | Extended `ROUTES_WITH_CATCH` from 11 to 14 routes covering all affiliate API endpoints |
| Verification | Test suite now runs 1601 tests (6 new), all passing |

## Items Verified as Correct

| Area | Details |
|------|---------|
| Commission Rates | L1=15%, L2=3%, L3=2% — consistent across service, API, UI, and tests |
| Commission Math | Uses `Math.floor()` to prevent overpay on fractional cents |
| Self-Referral Prevention | `SELF_REFERRAL_BLOCKED` check in `affiliate.service.ts` |
| Referral Chain Depth | Max depth enforced in chain building logic |
| Idempotency | `existingReferrals` and `existingCommissions` checks prevent double-processing |
| RBAC | All authenticated API routes check `isAffiliateRole()` or equivalent inline check |
| Service-Role Prevention | `service-role-scanner.test.ts` enforces no `createAdminClient()` in portal APIs |
| Data Isolation | All queries scoped by `userId` or derived `affiliateId` |
| Cookie Attribution | 30-day `httpOnly` secure cookies for referral tracking |
| XSS Prevention | `escapeHtml()` used in share-link email content |
| Input Validation | Zod schemas on click, process-referral, share-link; pagination clamped (page ≥ 1, limit ≤ 100, days ≤ 365) |
| Navigation | All portal nav tabs have corresponding page files |
| Empty States | All portal pages handle empty data gracefully |
| Loading States | Portal pages show loading indicators during data fetch |
