# Dealer Dashboard — Audit Findings

## Summary

| Severity | Count |
|----------|-------|
| 🚨 Critical | 2 |
| ⚠️ High | 3 |
| 🔵 Medium | 3 |
| Total Fixed | 8 |

---

## Findings

### 1. 🚨 Critical — `"use client"` + `export const dynamic` conflict

- **Location**: `app/dealer/auctions/offers/page.tsx`, `app/dealer/auctions/invited/page.tsx`
- **Root cause**: Both files had `"use client"` directive combined with `export const dynamic = "force-dynamic"`. This is invalid — dynamic exports only belong on Server Components. Turbopack may fail to build with this pattern.
- **Fix applied**: Removed `export const dynamic = "force-dynamic"` from both files.
- **Verification**: `pnpm build` succeeds; audit test `dealer-dashboard-audit.test.ts` validates no client pages combine these exports.

### 2. 🚨 Critical — Missing `/api/dealer/profile` API route

- **Location**: `app/dealer/profile/page.tsx` calls `useSWR("/api/dealer/profile", ...)` but no API route existed.
- **Root cause**: The profile page was implemented but its API backend was never created.
- **Fix applied**: Created `app/api/dealer/profile/route.ts` with:
  - GET handler returning dealer profile data (name, phone, email, website, address, city, state, zipCode, status)
  - Auth check for DEALER/DEALER_USER roles
  - Uses `dealerService.getDealerByUserId()` — no service role
  - Returns 401/404/500 with proper status codes
- **Verification**: API route exists; audit test validates its presence.

### 3. ⚠️ High — Missing CSRF headers on all dealer mutation fetch calls

- **Location**: 14 dealer page files used `headers: { "Content-Type": "application/json" }` on POST/PATCH/PUT/DELETE calls instead of `csrfHeaders()`.
- **Files fixed**:
  - `app/dealer/auctions/[id]/page.tsx`
  - `app/dealer/onboarding/page.tsx`
  - `app/dealer/contracts/page.tsx`
  - `app/dealer/contracts/[id]/page.tsx`
  - `app/dealer/documents/page.tsx`
  - `app/dealer/deals/[dealId]/insurance/page.tsx`
  - `app/dealer/inventory/add/page.tsx`
  - `app/dealer/inventory/bulk-upload/page.tsx`
  - `app/dealer/messages/new/page.tsx`
  - `app/dealer/messages/[threadId]/page.tsx`
  - `app/dealer/offers/new/page.tsx`
  - `app/dealer/payments/page.tsx`
  - `app/dealer/pickups/page.tsx`
- **Root cause**: CSRF protection was not applied to dealer dashboard mutation endpoints.
- **Fix applied**: Added `import { csrfHeaders } from "@/lib/csrf-client"` and replaced all bare `Content-Type` headers with `csrfHeaders()`.
- **Verification**: Audit test confirms no dealer page uses raw `Content-Type` header for JSON mutations.

### 4. ⚠️ High — Missing CSRF token on FormData uploads

- **Location**: `app/dealer/documents/page.tsx` (file upload), `app/dealer/inventory/bulk-upload/page.tsx` (CSV upload)
- **Root cause**: FormData uploads bypassed CSRF protection entirely.
- **Fix applied**: Used `getCsrfToken()` and set `x-csrf-token` header on FormData fetch calls (cannot use `csrfHeaders()` which sets Content-Type).
- **Verification**: Code review confirms CSRF token inclusion.

### 5. ⚠️ High — Dealer deals API swallows errors silently

- **Location**: `app/api/dealer/deals/route.ts` catch block
- **Root cause**: Catch block returned `{ deals: [] }` with HTTP 200, hiding server errors from the client.
- **Fix applied**: Changed to return `{ error: "Internal server error" }` with status 500.
- **Verification**: Audit test validates 500 status code in catch blocks.

### 6. 🔵 Medium — Dealer payments API swallows errors silently

- **Location**: `app/api/dealer/payments/route.ts` catch block
- **Root cause**: Catch block returned `{ success: true, data: [] }` with HTTP 200, hiding server errors.
- **Fix applied**: Changed to return `{ error: "Internal server error" }` with status 500.
- **Verification**: Audit test validates 500 status code in catch blocks.

### 7. 🔵 Medium — Profile page edit uses NotImplementedModal

- **Location**: `app/dealer/profile/page.tsx`
- **Root cause**: The "Save Changes" button opened a `NotImplementedModal` instead of performing an actual update. The profile API only supported GET with no PATCH.
- **Fix applied**:
  - Added PATCH handler to `app/api/dealer/profile/route.ts` that accepts profile fields and calls `dealerService.updateDealerSettings()`
  - Replaced `NotImplementedModal` with real save functionality using controlled state (`useState` + `useEffect`) and `csrfHeaders()`
  - Added `htmlFor`/`id` attributes on all form labels/inputs for accessibility
  - Added loading state during save (`saving` / `"Saving…"` button text)
  - Toast notifications on success and failure
- **Verification**: Audit test validates PATCH export exists, controlled inputs used, and CSRF headers included.

### 8. 🔵 Medium — Missing loading.tsx files for 10 dealer page directories

- **Location**: `app/dealer/leads`, `app/dealer/profile`, `app/dealer/settings`, `app/dealer/requests`, `app/dealer/opportunities`, `app/dealer/payments`, `app/dealer/deals`, `app/dealer/contracts`, `app/dealer/pickups`, `app/dealer/messages`
- **Root cause**: These page directories had no Next.js Suspense boundary, causing poor UX during data loading.
- **Fix applied**: Created `loading.tsx` in each directory using Skeleton components consistent with existing patterns.
- **Verification**: Audit test validates all 15 key dealer directories have `loading.tsx`.
