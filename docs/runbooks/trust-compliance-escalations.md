# Trust & Compliance Escalations Runbook

**Severity**: CRITICAL
**Domain**: Trust Infrastructure / Compliance
**Affected System**: Decision engine, identity firewall, circumvention monitor

## Symptoms

- Trust rule triggers requiring manual review (identity mismatch, document fraud)
- Circumvention monitor detecting suspicious patterns
- Compliance hold placed on a deal or buyer account
- Contract Shield override without proper acknowledgment

## Diagnosis Steps

1. Check the event ledger for the affected entity:
   ```
   GET /api/admin/events?entityType=BUYER&entityId=<buyer_id>
   ```

2. Review trust decision engine audit trail for the buyer/deal.

3. Check identity firewall logs for flagged patterns.

4. Verify Contract Shield scan results and any override history.

5. Review admin audit logs for manual actions taken on the entity.

## Resolution Steps

### Identity Issues

1. **Request additional verification** from the buyer (ID upload, selfie match).
2. **Flag for manual review** by compliance team.
3. **Block account** if fraud is confirmed.

### Contract Shield Overrides

1. **Verify acknowledgment** was properly captured with timestamp and actor.
2. **Review override justification** in the event ledger.
3. **Escalate to compliance** if override lacks proper documentation.

### Circumvention Detection

1. **Review flagged patterns** in the circumvention monitor dashboard.
2. **Investigate buyer activity** for deal manipulation or fee avoidance.
3. **Apply appropriate hold** or restriction on the account.

## Post-Resolution

1. Document the escalation decision and outcome.
2. Update the buyer/deal trust score if applicable.
3. Ensure all actions are recorded in the admin audit log.
4. Review trust rules for any needed threshold adjustments.
5. Update incident record with full investigation details.

## Compliance Notes

- All trust/compliance decisions must be auditable.
- Never resolve a compliance hold without documented justification.
- Buyer communication about account restrictions must use approved templates.
- Preserve all evidence for potential legal proceedings.
