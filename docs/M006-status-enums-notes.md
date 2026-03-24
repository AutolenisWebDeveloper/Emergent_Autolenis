# Status Enums Migration — M006 Notes

## Overview

Migration M006 converts six legacy string-typed status fields to native PostgreSQL enums,
matching the Prisma schema definitions added in this PR.

### Models affected

| Model | Field | Old Type | New Enum | Values |
|-------|-------|----------|----------|--------|
| Commission | status | `String` | `CommissionStatus` | PENDING, EARNED, PAID, CANCELLED |
| Payout | status | `String` | `PayoutStatus` | PENDING, PROCESSING, COMPLETED, FAILED |
| Refund | status | `String` | `RefundStatus` | PENDING, COMPLETED, FAILED, CANCELLED |
| DepositRequest | status | `String` | `DepositRequestStatus` | REQUESTED, PAID, FAILED, REFUNDED, CANCELLED |
| ConciergeFeeRequest | status | `String` | `ConciergeFeeRequestStatus` | REQUESTED, PAID, FAILED, REFUNDED, CANCELLED |
| LenderFeeDisbursement | status | `String` | `LenderDisbursementStatus` | PENDING, DISBURSED |

### Constants updated

`lib/constants/statuses.ts` now exports typed constants for all six enums:

- `CommissionStatus` (updated doc comment to reference Prisma enum)
- `PayoutStatus` (updated doc comment to reference Prisma enum)
- `RefundStatus` (new)
- `DepositRequestStatus` (new)
- `ConciergeFeeRequestStatus` (new)
- `LenderDisbursementStatus` (new)

### Service updates

- `lib/services/payment.service.ts`: Imports `PaymentStatus` and `LenderDisbursementStatus`
  from canonical statuses module; replaces raw string literals.
- `lib/services/affiliate.service.ts`: Already imports `CommissionStatus`, `PayoutStatus`,
  `PaymentStatus` — no changes required.

---

## Deployment

### Pre-requisites

1. **Database backup** — take a full backup before running.
2. **Deploy code first** — the application code uses enum-compatible string values
   and typed constants. Deploy the code before running the migration.

### Execution

```bash
psql $DATABASE_URL < migrations/M006-status-enums.sql
```

The migration runs inside a transaction and automatically rolls back on error.

### Pre-flight validation

Phase 0 of the migration validates that **no invalid status values exist** in any
of the targeted tables. If any row contains a value outside the enum's defined set,
the migration aborts with an error like:

```
M006 blocked: 3 Commission rows have invalid status values
```

Fix invalid data before re-running.

### Verification queries

After running the migration, verify the column types:

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name IN (
  'Commission', 'Payout', 'Refund',
  'DepositRequest', 'ConciergeFeeRequest', 'LenderFeeDisbursement'
)
AND column_name = 'status'
ORDER BY table_name;
```

Expected: all rows show `data_type = 'USER-DEFINED'` with `udt_name` matching the enum.

---

## Rollback

To rollback, convert columns back to text and drop the enum types.
See the `ROLLBACK NOTES` section at the bottom of `migrations/M006-status-enums.sql`
for the exact SQL.

After rollback, revert the Prisma schema and service code to use `String` types.
