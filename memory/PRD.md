# AutoLenis — Signup System PRD

## Original Problem Statement
Inspect, test, repair, and validate the entire sign-in, signup, and account-setup system for Buyer, Dealer, and Affiliate roles. Make all 3 signup flows production-ready with fintech-grade quality.

## Architecture
- **Stack**: Next.js 16 App Router, TypeScript, Supabase Auth, Prisma ORM
- **Auth**: Custom JWT-based auth via `lib/services/auth.service.ts`
- **Deployment**: Vercel (autolenis-prod.vercel.app / www.autolenis.com)

## What Was Implemented (Jan 2026)

### Session 1 (Deployment)
- Deployed to Vercel with all env vars configured
- Fixed `.vercelignore`, dropped 30 duplicate FK constraints
- Full buyer→dealer→admin lifecycle E2E passing (25/25)

### Session 2 (Signup System Repair)

#### P0 Bugs Found and Fixed

**1. Dealer Signup — COMPLETELY BROKEN** (3 root causes)
- `auth.service.ts` Dealer INSERT used non-existent `name` column → crash
- Missing 6 NOT NULL columns (licenseNumber, phone, address, city, state, zip) → crash
- No DealerUser record created → dashboard inaccessible
- No workspaceId → workspace isolation broken
- **Fix**: Rewrote Dealer bootstrap to insert all required columns with safe defaults, create DealerUser junction record (OWNER, isPrimary), and set workspaceId

**2. Buyer Signup — BuyerProfile INSERT FAILED** (1 root cause)
- Missing 4 NOT NULL package columns (package_tier, package_selected_at, package_selection_source, package_version) → INSERT crashes before RPC can set them
- **Fix**: Added all 4 package columns to the BuyerProfile INSERT with values from the signup request

**3. Affiliate Signup — Prisma create() CRASHED** (1 root cause)
- `affiliate.service.ts` createAffiliate() used 7 fields not in Prisma schema or DB (refCode, ref_code, landing_slug, landingSlug, available_balance_cents, lifetime_earnings_cents, lifetime_paid_cents)
- **Fix**: Removed invalid fields, kept only schema-valid ones

**4. Workspace Isolation Missing** (all roles)
- User, BuyerProfile, Dealer, Affiliate INSERTs all lacked `workspaceId`
- **Fix**: Added `workspaceId: "ws_live_default"` to all bootstrap writes

**5. Dealer Onboarding Route — RLS Client Failure**
- Used `createClient()` (RLS) for DealerUser lookup → blocked by RLS
- **Fix**: Switched to `createAdminClient()` (service-role)

**6. Affiliate Onboarding — Invalid field reference**
- Referenced `affiliate.refCode` which doesn't exist
- **Fix**: Changed to `affiliate.referralCode`

### Validation Results (All 3 Roles)

#### Buyer Signup ✅
- API: POST /api/auth/signup → 200 success
- User record: id=cd68..., email=test_buyer@..., role=BUYER, workspace=ws_live_default
- BuyerProfile: tier=STANDARD, version=2025-01-v1, workspace=ws_live_default
- Signin after verify: → redirect /buyer/dashboard

#### Dealer Signup ✅
- API: POST /api/auth/signup → 200 success
- User record: role=DEALER, workspace=ws_live_default
- Dealer record: businessName="Test Auto Group", licenseNumber=PENDING-873D4EE8, workspace=ws_live_default
- DealerUser: roleLabel=OWNER, isPrimary=true, linked to Dealer
- Signin after verify: → redirect /dealer/dashboard

#### Affiliate Signup ✅
- API: POST /api/auth/signup → 200 success
- User record: role=AFFILIATE, workspace=ws_live_default
- Affiliate: referralCode=ALA34BB1A4, workspace=ws_live_default, status=ACTIVE
- Signin after verify: → redirect /affiliate/portal/dashboard

### Files Changed
| File | Change | Severity |
|------|--------|----------|
| `lib/services/auth.service.ts` | Fixed Dealer bootstrap (6 missing columns, DealerUser creation, workspace), fixed Buyer package columns, fixed Affiliate workspace | P0 |
| `lib/services/affiliate.service.ts` | Removed 7 invalid Prisma fields from createAffiliate() | P0 |
| `app/api/dealer/onboarding/route.ts` | RLS → service-role client | P1 |
| `app/api/affiliate/onboarding/route.ts` | Fixed refCode → referralCode reference | P1 |

### UX Quality Verification
- Signup page: Professional with trust signals, role selector, package tier ✅
- Dealer signup: Business name field, consent, Terms/Privacy ✅
- Verify email page: Clear messaging, resend button, help tips ✅
- Signin page: Clean with proper error messages ✅

## Remaining Risks
- P2: Verify-email resend requires email to be passed via query param or session
- P2: Dealer licenseNumber is a placeholder — needs onboarding step to collect real value
- P3: MicroBilt/DocuSign in test mode

## Backlog
- P1: Fix requireAuth to return 401/403 instead of 500 for cross-role access
- P2: Dealer onboarding step to collect real license number
- P3: Affiliate auto-enrollment cookie flow validation (proxy.ts ref= tracking)
