# ISSUES_FOUND.md — Manual Bank Pre-Approval Verification

> Generated: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## Identified Defects & Fixes Applied

### Issue 1: Auction Service Gating Uses Non-Existent `status` Field (CRITICAL)

- **File:** `lib/services/auction.service.ts`, line 20
- **Code:** `buyer.preQualification.status !== "APPROVED"`
- **Problem:** The `PreQualification` Prisma model has **no `status` field**. The actual gating column is `prequal_status` (a raw DB column not in Prisma schema), which stores `"ACTIVE"`. Accessing `.status` through Prisma's `include` returns `undefined`, so the check `undefined !== "APPROVED"` is always `true` — ALL buyers are permanently blocked from auctions.
- **Why it breaks equivalence:** Both internal and external prequal flows correctly write `prequal_status = "ACTIVE"` to the DB, but the auction service gate never passes because it reads a non-existent Prisma field.
- **Fix:** Replace with canonical gating pattern: check `preQualification` exists AND `expiresAt > now()`. This matches the pattern used by all other gating points (e.g., `app/api/buyer/prequal/route.ts:39`, `app/api/buyer/shortlist/route.ts:111`, `lib/services/prequal.service.ts:475`).

### Issue 2: PreQualification Created Without Raw DB Gating Columns (FIXED in prior session)

- **File:** `lib/services/external-preapproval.service.ts`, `createPreQualFromExternal()`
- **Problem:** Previously created PreQualification records using only Prisma model fields, without setting the raw DB columns (`prequal_status`, `max_otd_amount_cents`, `min_monthly_payment_cents`, `max_monthly_payment_cents`, `provider_name`, `dti_ratio`) that Supabase queries rely on for gating.
- **Fix:** Added all raw DB columns with `as any` cast to match the internal prequal flow pattern (`lib/services/prequal.service.ts:350-367`, `app/api/buyer/prequal/route.ts:185-203`).

### Issue 3: `softPullCompleted` and `consentGiven` Set to `false` (FIXED in prior session)

- **File:** `lib/services/external-preapproval.service.ts`, `createPreQualFromExternal()`
- **Problem:** Previously set `softPullCompleted: false` and `consentGiven: false`, which could be interpreted as an incomplete prequal.
- **Fix:** Set both to `true` with timestamps, matching the internal prequal flow pattern.

### Issue 4: Status Enum Mismatch — `VERIFIED` vs `APPROVED` (FIXED in prior session)

- **File:** `prisma/schema.prisma` (enum `ExternalPreApprovalStatus`), plus service, validators, UI pages, tests, docs
- **Problem:** The enum used `VERIFIED` but the authoritative requirement specifies `APPROVED`.
- **Fix:** Renamed `VERIFIED` → `APPROVED` across: schema enum, service transitions, validator action enum, admin list/detail pages, buyer status page, tests, and documentation.

### Issue 5: Duplicate `listByStatus` Method (FIXED in prior session)

- **File:** `lib/services/external-preapproval.service.ts`
- **Problem:** Two `listByStatus` methods existed, causing compile error.
- **Fix:** Removed the duplicate.

### Issue 6: Document Endpoint Returned Raw Metadata Instead of Signed URLs (FIXED in prior session)

- **File:** `app/api/admin/external-preapprovals/[id]/document/route.ts`
- **Problem:** Returned raw storage path instead of a time-limited signed URL.
- **Fix:** Now generates Supabase signed URL with 1-hour TTL using `createAdminClient()`.

## Gating Architecture Summary

The system uses two database access patterns:
1. **Supabase queries** (raw SQL columns): `prequal_status = "ACTIVE"`, `max_otd_amount_cents`, etc.
2. **Prisma model queries** (schema-defined fields): `expiresAt`, `creditTier`, `maxOtd`, etc.

Both patterns must agree. The `PreQualification` table has extra DB columns not in the Prisma schema that are written via `as any` casts. All gating points must check compatible fields.

### Canonical Gating Points

| Location | Access Method | Fields Checked |
|----------|--------------|----------------|
| `app/api/buyer/prequal/route.ts:39` | Supabase | `prequal_status = "ACTIVE"`, `expiresAt > now()` |
| `app/api/buyer/shortlist/route.ts:111` | Supabase | `prequal_status = "ACTIVE"`, `expiresAt > now()` |
| `lib/services/prequal.service.ts:475` | Prisma (as any) | `prequal_status === "ACTIVE"`, `expiresAt > now()` |
| `lib/services/auction.service.ts:20` | Prisma | `preQualification exists`, `expiresAt > now()` |
