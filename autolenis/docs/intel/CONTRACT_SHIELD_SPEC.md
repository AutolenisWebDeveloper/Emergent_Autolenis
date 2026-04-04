# CONTRACT_SHIELD_SPEC.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## Overview

Contract Shield is AutoLenis's automated contract review assistant. It scans dealer-uploaded contract documents against the deal terms, detects discrepancies and problematic clauses, and produces a pass/fail determination.

**Disclaimer (enforced in code):** "This is an informational tool only. It does not provide legal, tax, or financial advice." (`lib/services/contract-shield.service.ts:5-6`)

**Service:** `lib/services/contract-shield.service.ts` (1,199 LOC)

## Document Types (Inputs)

Defined at `lib/services/contract-shield.service.ts:8-16`:

| Type | Purpose |
|------|---------|
| `BUYERS_ORDER` | Primary purchase order |
| `FINANCE_CONTRACT` | Financing agreement |
| `ADDENDUM` | Contract addendum |
| `WARRANTY_FORM` | Extended warranty |
| `GAP_FORM` | GAP insurance form |
| `ITEMIZED_FEES` | Fee breakdown |
| `OTHER` | Miscellaneous |

## Scan Pipeline

### Step 1: Upload (`uploadDocument`)
- Creates `ContractDocument` record with versioning (auto-increments `version`)
- Creates or resets `ContractShieldScan` record to `PENDING` status
- Logs `DOC_UPLOADED` compliance event

### Step 2: Scan (`scanContract`)
- Loads the full deal context:
  - `SelectedDeal` with buyer, dealer, offer (financing options), inventory item (vehicle)
  - All `ContractDocument` records for the deal
- Creates/resets scan to `RUNNING` status
- Runs validation rules against deal data

### Validation Rules

#### APR Match Check
- Compares contract APR against financing offer APR
- Flags if discrepancy exceeds tolerance

#### Payment Match Check
- Compares contract monthly payment against calculated payment
- Flags if discrepancy detected

#### OTD Match Check
- Compares contract out-the-door price against auction offer cashOtd
- Flags if numbers don't match within tolerance

#### Junk Fee Detection
Flagged add-ons (from `FLAGGED_ADD_ONS` list at line ~30):
- nitrogen_tire
- vin_etching
- market_adjustment
- dealer_prep
- additional_dealer_markup
- addendum_sticker
- dealer_add_on
- protection_package
- paint_protection
- fabric_protection

#### Doc Fee Reference
State-specific doc fee reference ranges (`STATE_DOC_FEE_REFERENCE`, line ~42):
| State | Typical | Note |
|-------|---------|------|
| CA | $85 | Statutory cap |
| FL | $999 | No cap |
| TX | $150 | Typical |
| NY | $75 | Typical |
| GA | $699 | No cap |
| NC | $699 | No cap |
| VA | $499 | No cap |
| OH | $250 | Typical |
| PA | $300 | Must be disclosed |
| IL | $336 | Typical |

#### Missing Addendum Check
- Checks if expected addendums are present
- Missing addendums logged in `missingAddendums[]` array

## Fix List Generation

For each issue found, a `FixListItem` is created:
```
{
  category: string,      // e.g., "APR_MISMATCH", "JUNK_FEE", "MISSING_ADDENDUM"
  description: string,   // Human-readable description
  severity: string,      // INFO | REVIEW | IMPORTANT | CRITICAL
  expectedFix: string,   // What needs to be corrected
  resolved: boolean      // Initially false
}
```

Severity levels follow `ContractShieldRule.severity` values:
- **INFO** — Informational note
- **REVIEW** — Should be reviewed
- **IMPORTANT** — Significant issue
- **CRITICAL** — Must be resolved before proceeding

## PASS/FAIL Gating Logic

**Thresholds:** (`lib/constants.ts:54-58`)
```
CONTRACT_SHIELD_THRESHOLDS = {
  PASS: 85,     // Score ≥ 85 → PASS
  WARNING: 70,  // Score 70-84 → WARNING (flagged for review)
  FAIL: 69,     // Score < 70 → FAIL
}
```

**Scan Fields:**
- `overallScore: Float` — computed from rule matches
- `aprMatch: Boolean` — APR matches offer terms
- `paymentMatch: Boolean` — Payment matches calculation
- `otdMatch: Boolean` — OTD matches offer
- `junkFeesDetected: Boolean` — Junk fees found
- `missingAddendums: String[]` — Missing addendum list

**Status Determination:**
- Score ≥ 85 → `status = "PASSED"`
- Score 70-84 → `status = "ISSUES_FOUND"` (review required)
- Score < 70 → `status = "FAILED"`

## Override Workflows

### Model: `ContractShieldOverride`
```
{
  scanId: string,
  adminId: string,
  action: "FORCE_PASS" | "FORCE_FAIL",
  reason: string (text),
  buyerAcknowledged: boolean,
  buyerAckAt: DateTime?,
  buyerAckComment: string?,
  previousStatus: string,
  newStatus: string
}
```

### Admin Override Flow
1. Admin reviews scan results → `POST /api/admin/contracts/[id]/override`
2. Creates `ContractShieldOverride` with action (FORCE_PASS or FORCE_FAIL)
3. Updates `ContractShieldScan.status` to new status
4. Logs override event in compliance log
5. Creates notification for buyer

### Buyer Acknowledgment Flow
1. Buyer sees override notification
2. Buyer acknowledges → `POST /api/buyer/contracts/acknowledge-override`
3. Updates override: `buyerAcknowledged = true`, `buyerAckAt = now()`, `buyerAckComment = ...`
4. Logs acknowledgment in compliance event

### Admin UI
- **Rules management:** `/admin/contract-shield/rules` — CRUD for `ContractShieldRule` records
- **Override history:** `/admin/contract-shield/overrides` — view all overrides

## Configurable Rules

### Model: `ContractShieldRule`
```
{
  ruleKey: string (unique),    // e.g., "APR_THRESHOLD", "DOC_FEE_MAX"
  ruleName: string,
  ruleDescription: string,
  ruleType: string,            // THRESHOLD | VALIDATION | ALERT
  severity: string,            // INFO | REVIEW | IMPORTANT | CRITICAL
  enabled: boolean,
  thresholdValue: Float?,
  configJson: Json?
}
```

### API Endpoints
- `GET /api/admin/contract-shield/rules` — List all rules
- `POST /api/admin/contract-shield/rules` — Create rule
- `GET/PUT/DELETE /api/admin/contract-shield/rules/[id]` — CRUD single rule

## Reconciliation Job

### Cron Route: `/api/cron/contract-shield-reconciliation`
**Security:** Validated via `validateCronRequest()` (`lib/middleware/cron-security.ts`)

### Job Types (from `ContractShieldReconciliation.jobType`):
- `SYNC_STATUSES` — Sync scan statuses with deal statuses
- `CHECK_STALE_SCANS` — Identify scans stuck in PENDING/RUNNING
- `NOTIFY_PENDING` — Send reminders for pending reviews

### Admin Trigger
- `POST /api/admin/contract-shield/reconciliation` — Manual trigger

### Reconciliation Record
```
{
  jobType: string,
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED",
  itemsProcessed: int,
  itemsUpdated: int,
  itemsFailed: int,
  errorLog: string?,
  resultSummary: Json?
}
```

## Notifications

### Model: `ContractShieldNotification`
```
{
  scanId: string,
  recipientId: string,
  notificationType: "EMAIL" | "SMS" | "IN_APP",
  status: "PENDING" | "SENT" | "FAILED",
  subject: string,
  message: string,
  sentAt: DateTime?,
  failedReason: string?
}
```

### Notification Triggers
- Scan completed with issues → notify buyer + admin
- Override applied → notify buyer
- Override acknowledged → notify admin
- Stale scan detected → notify admin (via reconciliation)

### Delivery
- Email sent via `emailService` (Resend)
- In-app via `AdminNotification` system

## Compliance Logging

All significant events logged via `ComplianceEvent`:
- `DOC_UPLOADED` — document upload with metadata
- `SCAN_COMPLETED` — scan result summary
- `OVERRIDE_APPLIED` — admin override action
- `OVERRIDE_ACKNOWLEDGED` — buyer acknowledgment
- `RECONCILIATION_RUN` — cron job execution

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/contract/upload` | POST | Yes | Upload contract document |
| `/api/contract/scan` | POST | Yes | Trigger scan |
| `/api/contract/scan/[id]` | GET | Yes | Get scan result |
| `/api/contract/fix` | POST | Yes | Request fix |
| `/api/contract/list` | GET | Yes | List contracts |
| `/api/buyer/contract-shield` | GET | Yes (BUYER) | Buyer's shield results |
| `/api/buyer/contracts` | GET | Yes (BUYER) | Buyer's contracts |
| `/api/buyer/contracts/acknowledge-override` | POST | Yes (BUYER) | Acknowledge override |
| `/api/admin/contracts` | GET | Yes (ADMIN) | All contracts |
| `/api/admin/contracts/[id]` | GET/PUT | Yes (ADMIN) | Contract detail |
| `/api/admin/contracts/[id]/override` | POST | Yes (ADMIN) | Apply override |
| `/api/admin/contract-shield/rules` | GET/POST | Yes (ADMIN) | Rules CRUD |
| `/api/admin/contract-shield/rules/[id]` | GET/PUT/DELETE | Yes (ADMIN) | Single rule |
| `/api/admin/contract-shield/overrides` | GET | Yes (ADMIN) | Override history |
| `/api/admin/contract-shield/reconciliation` | POST | Yes (ADMIN) | Manual reconciliation |
| `/api/cron/contract-shield-reconciliation` | POST | Cron secret | Scheduled reconciliation |
