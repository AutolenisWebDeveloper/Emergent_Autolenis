# Conversion Failures Runbook

**Severity**: HIGH
**Domain**: Sourcing → Deal Pipeline
**Affected System**: Case conversion service

## Symptoms

- Sourcing cases stuck in OPTIONS_READY or SELECTED status
- `system_job_runs` with key `CASE_CONVERSION` showing FAILED
- Buyer reports deal not created after selecting an offer
- Event ledger missing `DEAL_STATUS_CHANGED` events for expected conversions

## Diagnosis Steps

1. Check recent conversion job runs:
   ```
   GET /api/admin/system/jobs?jobKey=CASE_CONVERSION&limit=10
   ```

2. Query the event ledger for the sourcing case entity to trace state transitions.

3. Check for database constraint violations (unique deal per case, foreign key failures).

4. Verify the offer and sourcing case are in valid states for conversion.

## Resolution Steps

1. **Transaction failure**: Retry the conversion — the operation is idempotent by design.
2. **Invalid state**: Manually verify case/offer state and correct if needed via admin.
3. **Missing data**: Ensure all required offer fields are populated before conversion.
4. **Database constraint**: Check for duplicate deal records or orphaned references.

## Post-Resolution

1. Verify deal was created and buyer can access it.
2. Verify sourcing case status moved to CLOSED.
3. Confirm event ledger has the complete conversion timeline.
4. Update incident record with resolution details.
