---
applyTo: "lib/services/contract-shield.service.ts|lib/services/contract-shield/**|app/api/contract/**|app/api/admin/contract-shield/**|app/admin/contract-shield/**"
---
# Contract Shield (Non-Negotiable)

## Gating Invariants
- Preserve gating invariants: SIGNING requires a PASS verdict or an explicit override with a full audit trail.
- A PASS verdict requires all configured variance checks (APR, OTD, payment, fix-list) to be within their thresholds.
- Overrides requiring buyer acknowledgment must never be bypassed — the acknowledgment must be captured with timestamp, actor, and correlation context.
- Gating decisions must be deterministic given the same inputs — no randomness or time-dependent logic in variance calculations.

## Audit Trail
- All scan/override/ack changes must emit auditable events to the event ledger with: actor ID, actor role, action type, entity ID, correlation ID, and before/after state.
- Override justifications must be stored immutably — they cannot be edited or deleted after creation.
- Manual review decisions must record the reviewer's identity and reasoning.

## Threshold Configuration
- Thresholds/tolerances must remain rules-driven and configurable — never hard-code variance limits.
- Threshold changes must be auditable (who changed what, when, and the old/new values).
- Default thresholds must be documented in code comments or configuration files.

## Compliance Disclaimers
- All Contract Shield outputs must include the standard disclaimer: informational tool only; not legal or financial advice; results not guaranteed.
- Never present scan results as authoritative legal determinations.

## Testing Requirements
- Add/maintain unit tests for:
  - APR variance calculation (within tolerance, at boundary, exceeding tolerance).
  - OTD variance calculation with multiple fee components.
  - Payment variance (monthly payment discrepancy detection).
  - Fix-list generation (correct items flagged, correct remediation suggestions).
  - PASS/FAIL gating logic (all-pass, single-fail, override with ack, override without ack).
  - Audit event emission (correct shape, all required fields present).
