# Controlled Manual Approval (CMA) — Engineering Guide

> **Status:** Implemented
> **Scope:** Contract Shield non-dealer-correctable reject workflow

---

## Overview

The CMA system handles contract rejects that are **not caused by dealer error** — such as false-positive scans, internal data mismatches, dependency failures, or policy rule discrepancies. These rejects must not send dealers into incorrect reupload loops.

CMA is built as a distinct workflow on top of the existing Contract Shield infrastructure, with its own:
- Data model (`ContractManualReview`)
- State machine (OPEN → APPROVED / RETURNED / REVOKED)
- RBAC (COMPLIANCE_ADMIN + SUPER_ADMIN only)
- Dual approval enforcement
- Immutable audit trail
- Document integrity / auto-revocation

---

## New DealStatus Values

| Status | Meaning |
|--------|---------|
| `CONTRACT_MANUAL_REVIEW_REQUIRED` | Deal entered CMA — internal review needed, not dealer-fixable |
| `CONTRACT_INTERNAL_FIX_IN_PROGRESS` | Returned to internal team (OPS/ENGINEERING/POLICY) |
| `CONTRACT_ADMIN_OVERRIDE_APPROVED` | Approved via exception override (stronger justification) |
| `CONTRACT_APPROVED` | Approved via manual validation (standard CMA approval) |

---

## How CMA is Triggered

1. Contract Shield scan finds issues (FAIL or REVIEW_READY)
2. Admin determines the issues are **not dealer-correctable**
3. Admin calls `POST /api/admin/deals/:dealId/contracts/manual-review` with `{ scanId }`
4. System creates `ContractManualReview` record in OPEN state
5. Deal status transitions to `CONTRACT_MANUAL_REVIEW_REQUIRED`
6. CMA audit event `CMA_OPENED` is written

---

## CMA Approval Workflow

### Step 1: Complete Checklist
Admin must complete all verification checks before any action is enabled:

| Check | Field |
|-------|-------|
| Root cause category | `rootCauseCategory` (enum: FALSE_POSITIVE_SCAN, INTERNAL_DATA_MISMATCH, DEPENDENCY_FAILURE, POLICY_RULES_DISCREPANCY, MISSING_INTERNAL_ATTESTATION, OTHER) |
| VIN match | `vinMatch` |
| Buyer identity match | `buyerIdentityMatch` |
| OTD math validated | `otdMathValidated` |
| Fees validated | `feesValidated` |
| Terms validated | `termsValidated` |
| Disclosures present | `disclosuresPresent` |
| Evidence uploaded | `evidenceAttachmentIds` (at least 1) |
| Attestation | `attestationAccepted` — "I certify this packet meets AutoLenis contract standards and accept manual-approval accountability." |

### Step 2: Choose Action

| Action | Route | Result |
|--------|-------|--------|
| **Manual Validation** | `POST .../approve/manual-validated` | Deal → `CONTRACT_APPROVED` |
| **Exception Override** | `POST .../approve/exception-override` | Deal → `CONTRACT_ADMIN_OVERRIDE_APPROVED` |
| **Return to Internal Fix** | `POST .../return-internal-fix` | Deal → `CONTRACT_INTERNAL_FIX_IN_PROGRESS` |

---

## Dual Approval

Second approval is required when **any** of these conditions are met:

1. Deal OTD exceeds $75,000
2. Any scan finding has CRITICAL severity
3. Any scan finding is a fee-related warning (ADD_ON_REVIEW or FEE_REVIEW)

When triggered:
- First approver submits → status becomes `PENDING_SECOND_APPROVAL`
- Second approver must be a **different** admin
- Second approver calls `POST .../second-approve`
- Only then does the deal status advance

---

## Audit Events

All CMA events are written to `ComplianceEvent` via `logCmaEvent()`:

| Event | Trigger |
|-------|---------|
| `CMA_OPENED` | Manual review opened |
| `MANUAL_APPROVE` | Manual validation or exception override approved |
| `CMA_PENDING_SECOND_APPROVAL` | First approval submitted, awaiting second |
| `MANUAL_APPROVAL_SECOND_APPROVED` | Second approval confirmed |
| `MANUAL_RETURN_INTERNAL_FIX` | Returned to internal fix queue |
| `MANUAL_APPROVAL_REVOKED` | Admin manually revokes |
| `MANUAL_APPROVAL_REVOKED_DUE_TO_DOC_CHANGE` | Auto-revoked on document change |
| `MANUAL_APPROVAL_RATE_LIMIT_EXCEEDED` | Admin hit daily approval limit |
| `FALSE_POSITIVE_RECORDED` | Scan confirmed as false positive |

### Audit Payload

Each event includes: `manualReviewId`, `approvalMode`, `rootCauseCategory`, `manualChecksCompleted`, `verifiedFieldsJson`, `evidenceAttachmentIds`, `approverAdminId`, `approverRole`, `ip`, `userAgent`, `overriddenScanId`, `documentHash`.

---

## False-Positive Metrics

False-positive counter is incremented **only** when:
1. Contract Shield scan found issues (FAIL or REVIEW_READY)
2. Admin chose MANUAL_VALIDATED
3. Root cause was `FALSE_POSITIVE_SCAN`

This ensures only true false positives are counted. Exception overrides (where the admin accepts known issues) do not increment.

Event: `FALSE_POSITIVE_RECORDED` with `rootCauseCategory` and `overriddenScanId`.

---

## Document-Change Revocation

After approval:
1. Document hash is computed at approval time (SHA-256 of URL + version)
2. Stored in `ContractManualReview.documentHashAtApproval`
3. On any document upload via `uploadDocument()`:
   - `revokeIfDocsChanged()` checks all approved reviews for the deal
   - If hash mismatches → auto-revoke
   - Event: `MANUAL_APPROVAL_REVOKED_DUE_TO_DOC_CHANGE`
   - Deal status → `CONTRACT_MANUAL_REVIEW_REQUIRED`
4. Idempotent: already-revoked reviews are skipped

---

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/admin/deals/:dealId/contracts/manual-review` | POST | CMA Approver | Open manual review |
| `/api/admin/manual-reviews` | GET | Admin | List all reviews |
| `/api/admin/manual-reviews/:id` | GET | CMA Approver | Get review details |
| `/api/admin/manual-reviews/:id/checklist` | POST | CMA Approver | Save checklist |
| `/api/admin/manual-reviews/:id/approve/manual-validated` | POST | CMA Approver | Approve via validation |
| `/api/admin/manual-reviews/:id/approve/exception-override` | POST | CMA Approver | Approve with exception |
| `/api/admin/manual-reviews/:id/second-approve` | POST | CMA Approver | Second approval |
| `/api/admin/manual-reviews/:id/return-internal-fix` | POST | CMA Approver | Return to fix queue |
| `/api/admin/manual-reviews/:id/revoke` | POST | CMA Approver | Revoke approval |

---

## CMA Admin Panel States

### Open
- Full checklist visible with all verification checks
- Three action buttons (Manual Validation, Exception Override, Return to Internal Fix)
- Actions disabled until checklist complete

### Pending Second Approval
- Shows first approver identity
- "Confirm as Second Approver" button
- Second approver must differ from first

### Approved
- Green status banner
- Approval audit trail (primary + second approver)
- Document hash at approval time
- Revoke button available

### Returned Internal Fix
- Blue status banner
- Shows assigned queue (OPS/ENGINEERING/POLICY)
- Shows root cause notes

### Revoked
- Red status banner
- Shows revocation reason, timestamp, revoking admin

---

## Buyer/Dealer Messaging

### During CMA (CONTRACT_MANUAL_REVIEW_REQUIRED / CONTRACT_INTERNAL_FIX_IN_PROGRESS)
- **Buyer:** "We're completing a manual verification to ensure your contract is accurate before you sign."
- **Dealer:** "AutoLenis is performing an internal verification. No action required."

### After Approval
- **Buyer:** "Verified and approved — ready to sign."
- **Dealer:** "The contract has been verified and approved."

### Critical Rule
No "action required" prompts are sent to dealers for CMA states.
