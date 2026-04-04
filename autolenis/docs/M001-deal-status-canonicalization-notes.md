# Deal Status Canonicalization — Migration & Rollout Notes

## Overview

This change canonicalizes `SelectedDeal.status` as the **only** lifecycle field,
removing all reads/writes of the legacy `deal_status` column.

## Migration: M001-deal-status-canonicalization.sql

### Pre-requisites
- Deploy the updated application code **first** (it no longer reads/writes `deal_status`).
- Ensure a database backup exists before running the migration.

### What it does
1. **Backfill**: Copies `deal_status` values into `status`, normalizing legacy values:
   - `PENDING_FINANCING` → `FINANCING_PENDING`
   - `FINANCING_CHOSEN` → `FINANCING_APPROVED`
   - `INSURANCE_READY` → `INSURANCE_PENDING`
   - `CONTRACT_PASSED` → `CONTRACT_APPROVED`
   - `COMPLETE` → `COMPLETED`
2. **Drop**: Removes the `deal_status` column from the `SelectedDeal` table.

### Execution
```bash
psql $DATABASE_URL < migrations/M001-deal-status-canonicalization.sql
```

The migration runs in a transaction; it will roll back automatically on error.

## Rollout Plan

1. **Merge PR** — code no longer reads/writes `deal_status`.
2. **Deploy to staging** — verify all deal lifecycle flows work with `status` only.
3. **Run migration on staging** — confirm backfill produces correct values.
4. **Deploy to production** — code is safe to deploy before migration since it
   no longer reads `deal_status`; `status` was always written alongside.
5. **Run migration on production** — backfill + drop in a single transaction.
6. **Post-deploy verification**:
   - Verify no errors in deal creation, financing, insurance, contract, e-sign, pickup flows.
   - Verify admin deal status override works.
   - Verify dealer deals list works.
   - Verify buyer contracts page works.

## Rollback Plan

### If code rollback needed (before migration)
- Revert the PR. The previous code wrote to both `status` and `deal_status`,
  so reverting is safe as long as `deal_status` column still exists.

### If migration rollback needed
1. Restore the `deal_status` column:
   ```sql
   ALTER TABLE "SelectedDeal" ADD COLUMN "deal_status" TEXT;
   UPDATE "SelectedDeal" SET "deal_status" = "status";
   ```
2. Revert the application code PR.
3. Deploy the reverted code.

### If code rollback needed (after migration)
1. First run the migration rollback SQL above to restore the column.
2. Then revert and deploy the code.

## Files Changed

### Service layer
- `lib/services/deal/creation.ts` — query and create use `status` only
- `lib/services/deal/financing.ts` — all `deal_status` reads/writes → `status`
- `lib/services/deal/insurance.ts` — all `deal_status` reads → `status`
- `lib/services/deal/status.ts` — already used `status` (no changes)
- `lib/services/deal/retrieval.ts` — no `deal_status` references (no changes)
- `lib/services/deal.service.ts` — monolith version updated similarly
- `lib/services/payment.service.ts` — removed `deal_status` from Supabase updates
- `lib/services/pickup.service.ts` — removed `deal_status` dual-writes
- `lib/services/esign.service.ts` — reads/writes canonicalized to `status`
- `lib/services/contract-shield.service.ts` — writes use `status` with canonical values
- `lib/services/contract-shield/scanner.ts` — `CONTRACT_PASSED` → `CONTRACT_APPROVED`
- `lib/services/contract-shield/overrides.ts` — all writes use `status`
- `lib/services/contract-shield/reconciliation.ts` — reads/writes use `status`

### Route handlers
- `app/api/admin/deals/[dealId]/status/route.ts` — body param `deal_status` → `status`
- `app/api/buyer/auctions/[auctionId]/deals/select/route.ts` — response uses `status`
- `app/api/buyer/deal/complete/route.ts` — writes `status: "COMPLETED"`

### UI
- `app/buyer/contracts/page.tsx` — removed `deal_status` fallback

### Tests
- `__tests__/downstream-sourced-deals.test.ts` — removed `deal_status` from fixtures
- `__tests__/deal-status-canonicalization.test.ts` — new test validating canonicalization

### Migration
- `migrations/M001-deal-status-canonicalization.sql` — backfill + drop
