# Buyer Dashboard Audit Findings

## Summary

| Severity | Count |
|----------|-------|
| Critical | 1 |
| High | 3 |
| Medium | 4 |
| Low | 0 |
| **Total** | **8** |

---

## Findings

### 1. Missing Authentication on `/api/auction/[id]/best-price`

| Field | Value |
|-------|-------|
| **Severity** | Critical |
| **Location** | `app/api/auction/[id]/best-price/route.ts` |
| **Root Cause** | Both POST and GET handlers lacked `requireAuth()` calls, allowing unauthenticated access to best-price computation and retrieval |
| **Fix Applied** | Added `requireAuth(["BUYER", "DEALER", "DEALER_USER", "ADMIN", "SUPER_ADMIN"])` to both handlers with proper 401/403 error responses |
| **Verification** | Build passes; route now returns 401 for unauthenticated requests |

### 2. Missing CSRF Headers on Buyer Mutation Requests

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Location** | 18 buyer page files (auction, shortlist, referrals, deal/*, insurance/*, requests/*, trade-in, profile, onboarding, search, sign, pickup, prequal) |
| **Root Cause** | POST/PUT/PATCH/DELETE fetch calls missing `x-csrf-token` header, making them vulnerable to cross-site request forgery |
| **Fix Applied** | Added `import { csrfHeaders } from "@/lib/csrf-client"` and replaced all mutation `headers` with `csrfHeaders()`. For FormData uploads, used `getCsrfToken()` to set only `x-csrf-token`. |
| **Verification** | Build and lint pass; all mutation calls now include CSRF protection |

### 3. Incompatible `"use client"` + `export const dynamic` Directives

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Location** | `app/buyer/offers/page.tsx`, `app/buyer/billing/page.tsx`, `app/buyer/deal/fee/page.tsx` |
| **Root Cause** | Client Components (`"use client"`) cannot export `dynamic = "force-dynamic"` — this is a Server Component-only export and causes Turbopack module graph issues |
| **Fix Applied** | Removed `export const dynamic = "force-dynamic"` from all three files |
| **Verification** | Build passes without errors; pages render correctly as client components |

### 4. Missing `ClipboardList` Icon in Sidebar Navigation

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Location** | `app/buyer/layout.tsx:25` (nav config) and `app/buyer/layout-client.tsx:31-43` (iconMap) |
| **Root Cause** | Nav config referenced `ClipboardList` icon for "Vehicle Requests" but `layout-client.tsx` did not import it or include it in the `iconMap`, causing fallback to `LayoutDashboard` |
| **Fix Applied** | Added `ClipboardList` to the lucide-react import and `iconMap` in `layout-client.tsx` |
| **Verification** | Build passes; Vehicle Requests nav item now shows correct clipboard icon |

### 5. Dashboard API Missing Role Check

| Field | Value |
|-------|-------|
| **Severity** | High |
| **Location** | `app/api/buyer/dashboard/route.ts` |
| **Root Cause** | `GET` handler only checked if user exists (`!user`) but did not verify the user has `BUYER` role, allowing any authenticated user to access buyer dashboard data |
| **Fix Applied** | Added `user.role !== "BUYER"` check alongside the `!user` check, returning 401 with `{ success: false, error }` response |
| **Verification** | Build passes; route now rejects non-BUYER authenticated users |

### 6. Inconsistent API Response Shapes

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Location** | `app/api/buyer/deals/[dealId]/esign/route.ts`, `app/api/buyer/deals/[dealId]/pickup/route.ts`, `app/api/buyer/deals/[dealId]/pickup/schedule/route.ts` |
| **Root Cause** | These routes used `{ success: true, ...result }` or `{ success: true, appointment: result }` instead of the standard `{ success: true, data: result }` format. Error responses also returned bare `{ error }` without the `success: false` wrapper. |
| **Fix Applied** | Standardized all three routes to use `{ success: true, data: result }` for success and `{ success: false, error: message }` for errors |
| **Verification** | Build passes; response shapes now consistent across all buyer deal API routes |

### 7. Missing `loading.tsx` Files for Buyer Pages

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Location** | 19 buyer page directories (profile, settings, billing, delivery, deposit, funding, insurance, onboarding, search, contract-shield, requests, offers, deal, documents, referrals, affiliate, demo, prequal, payments) |
| **Root Cause** | Only 6 of 25 buyer page directories had `loading.tsx` files, meaning Next.js Suspense boundaries were not set up for most pages |
| **Fix Applied** | Created appropriate `loading.tsx` skeleton files for all 19 missing directories, using context-appropriate skeleton patterns (card-list for list pages, form for form pages, grid for grid pages) |
| **Verification** | Build passes; all buyer pages now have loading boundaries |

### 8. Missing Error States on Data-Fetching Pages

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **Location** | `app/buyer/delivery/page.tsx`, `app/buyer/deposit/page.tsx`, `app/buyer/funding/page.tsx`, `app/buyer/billing/page.tsx` |
| **Root Cause** | These pages used `useSWR` but did not destructure or handle the `error` state, causing silent failures when API calls failed |
| **Fix Applied** | Added `error` destructuring from `useSWR`, added error state UI with descriptive message and retry button for all four pages |
| **Verification** | Build passes; pages now show actionable error messages with retry on failure |
