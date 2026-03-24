# CONTRACT_SHIELD_AUDIT.md — Contract Shield™ Compliance Engine Audit

## Overview

Contract Shield™ is AutoLenis's compliance engine that validates dealer-uploaded contracts for math consistency, fee compliance, and document completeness before allowing e-signature.

**Primary Implementation**: `lib/services/contract-shield.service.ts` (1,199 lines)

---

## APR Validation Logic

### Implementation (lines 312-323)
- **Threshold**: 0.01% difference triggers CRITICAL issue
- **Comparison**: Deal APR vs. financing option APR
- **Category**: `APR_DIFFERENCE`
- **Severity**: CRITICAL

### Verification
- ✅ APR comparison implemented with configurable threshold
- ✅ Issues logged with expected vs. actual values
- ✅ CRITICAL severity prevents PASS status

---

## Payment Math Verification

### Implementation (lines 326-341)
- **Threshold**: $5 difference triggers CRITICAL issue
- **Comparison**: Monthly payment vs. calculated financing terms
- **Category**: `PAYMENT_DIFFERENCE`
- **Severity**: CRITICAL

### Verification
- ✅ Monthly payment validation against loan terms
- ✅ $5 tolerance (configurable via ContractShieldRule)
- ✅ Logged as FixListItem

---

## OTD Price Validation

### Implementation (lines 268-310)
- **Threshold**: $1 tolerance on OTD comparison
- **Comparison**: Contract OTD vs. agreed auction offer OTD
- **Category**: `OTD_DIFFERENCE`
- **Severity**: CRITICAL if > $100, REVIEW if > $1

### Verification
- ✅ Multi-tier severity based on difference magnitude
- ✅ Fee breakdown validation (tax, doc fee, registration)

---

## Fee Cap Enforcement

### Implementation (lines 385-399)
- **State-based doc fee limits**:
  - California: $85 (statutory maximum)
  - Florida, Texas, New York, Georgia, etc.: 150% of typical fee
- **Flagged add-ons** (17 categories):
  - nitrogen_tire, vin_etching, market_adjustment, paint_protection
  - fabric_protection, windshield_protection, key_replacement
  - theft_deterrent, tire_wheel_protection, gap_insurance (when overpriced)
  - extended_warranty (when not requested), etc.

### Verification
- ✅ State-by-state doc fee lookup
- ✅ 17+ flagged add-on categories detected
- ✅ Severity: REVIEW for excessive fees
- ✅ All caps configurable via `ContractShieldRule` model

---

## FixList Generation

### Implementation (lines 188-198)
- Created during `scanContract()` execution
- Each issue becomes a `FixListItem` with:
  - severity (INFO, REVIEW, IMPORTANT, CRITICAL)
  - category (OTD_DIFFERENCE, APR_DIFFERENCE, etc.)
  - description (human-readable)
  - expectedFix (resolution guidance)
- Auto-deleted on re-scan (line 164-165)
- Resolved via `resolveFixItem()` (line 437-463)
- Triggers re-scan when all items resolved

### Verification
- ✅ FixListItems created per scan
- ✅ Previous items cleared on re-scan
- ✅ Resolution tracking with resolved flag
- ✅ Re-scan trigger after full resolution

---

## PASS/FAIL Gating Before E-Sign

### Implementation (lines 200-217)
```
Status Determination:
- criticalCount > 0          → FAIL
- importantCount > 0 or reviewCount > 0  → REVIEW_READY
- No issues                  → PASS

Score Calculation:
- FAIL: max(0, 100 - critical*25 - important*10)
- REVIEW_READY: max(50, 100 - important*10 - review*2)
- PASS: 100
```

### Deal Status Updates
- PASS → `CONTRACT_PASSED` (enables E-Sign)
- FAIL/REVIEW_READY → `CONTRACT_REVIEW` (blocks E-Sign)

### Verification
- ✅ Three-tier status system
- ✅ Numeric scoring for transparency
- ✅ Deal status gating enforced
- ✅ E-Sign blocked until PASS or admin override

---

## ComplianceEvent Logging

### Implementation (lines 1137-1148)

| Event Type | Trigger | Data Logged |
|------------|---------|-------------|
| DOC_UPLOADED | Document upload | version, type, dealId |
| SCAN_COMPLETED | Scan finish | status, critical/important/review counts |
| ADMIN_OVERRIDE | Direct override | action, reason, adminId |
| ADMIN_OVERRIDE_CREATED | Consent override | action, reason, requiresConsent |
| BUYER_ACKNOWLEDGED_OVERRIDE | Buyer consent | buyerComment, timestamp |

### Verification
- ✅ All 5 event types logged to `ComplianceEvent` table
- ✅ Full audit trail with timestamps
- ✅ Metadata includes all relevant context

---

## Admin Override Logic

### Two Override Workflows

#### A. Direct Override (lines 468-506)
1. Admin provides action (FORCE_PASS/FORCE_FAIL) + reason
2. Scan status updated immediately
3. Deal status updated accordingly
4. ComplianceEvent logged (ADMIN_OVERRIDE)
5. No buyer consent required

#### B. Consent-Required Override (lines 511-590)
1. Admin creates `ContractShieldOverride` record
2. `buyerAcknowledged` = false
3. Deal stays in CONTRACT_REVIEW
4. Email notification sent to buyer
5. ComplianceEvent logged (ADMIN_OVERRIDE_CREATED)
6. Awaits `buyerAcknowledgeOverride()` call

#### Buyer Acknowledgment (lines 592-650)
1. Buyer records `buyerAckAt` timestamp
2. Captures `buyerAckComment`
3. If override was FORCE_PASS → deal status = CONTRACT_PASSED
4. ComplianceEvent logged (BUYER_ACKNOWLEDGED_OVERRIDE)

### Verification
- ✅ Both override workflows implemented
- ✅ Buyer consent mechanism with timestamp
- ✅ Full audit trail for both paths
- ✅ Email notifications for consent-required overrides

---

## Dealer Re-Upload Workflow

### Implementation
1. Dealer uploads new contract version via `POST /api/contract/upload`
2. Previous FixListItems auto-deleted
3. New scan triggered via `POST /api/contract/scan`
4. New FixListItems generated
5. Dealer resolves items via `POST /api/contract/fix`
6. When all resolved → automatic re-scan

### Verification
- ✅ Version tracking on documents
- ✅ Clean slate per re-scan
- ✅ Resolution workflow with re-scan trigger

---

## Reconciliation Job

### Implementation (lines ~900+)
- **Method**: `runReconciliationJob()`
- **Trigger**: `POST /api/cron/contract-shield-reconciliation`
- **Tasks**:
  - SYNC_STATUSES — Synchronize scan statuses with deal statuses
  - CHECK_STALE_SCANS — Monitor scans pending > threshold
  - NOTIFY_PENDING — Alert on stale documents
- **Logging**: `ContractShieldReconciliation` tracks job execution

### Verification
- ✅ Three reconciliation task types
- ✅ Cron-secured (Bearer token)
- ✅ Job execution logged

---

## Configurable Rules

### Implementation (ContractShieldRule model)
- **Default Rules**: APR threshold (0.5%), OTD difference ($100), doc fee caps
- **CRUD**: Admin API at `/api/admin/contract-shield/rules`
- **Fields**: ruleKey, thresholdValue, enabled, description

### Verification
- ✅ Rules configurable without code changes
- ✅ Admin UI at `/admin/contract-shield/rules`
- ✅ Enable/disable toggle per rule

---

## API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/contract/upload` | POST | Upload document | DEALER |
| `/api/contract/scan` | POST | Trigger scan | DEALER/ADMIN |
| `/api/contract/scan/[id]` | GET | Scan details | Authenticated |
| `/api/contract/fix` | POST | Resolve fix items | DEALER |
| `/api/contract/list` | GET | List documents | Authenticated |
| `/api/buyer/contracts/acknowledge-override` | POST | Buyer acknowledgment | BUYER |
| `/api/admin/contracts/[id]/override` | POST | Admin override | ADMIN |
| `/api/admin/contract-shield/overrides` | GET | Override ledger | ADMIN |
| `/api/admin/contract-shield/rules` | GET/POST | Rule management | ADMIN |
| `/api/cron/contract-shield-reconciliation` | POST | Reconciliation job | CRON |

---

## Database Models

| Model | Fields | Purpose |
|-------|--------|---------|
| ContractDocument | id, dealId, dealerId, documentType, fileUrl, version | Uploaded contracts |
| ContractShieldScan | id, documentId, status, aprMatch, paymentMatch, otdMatch, junkFeeCount, overallScore | Scan results |
| FixListItem | id, scanId, severity, category, description, expectedFix, resolved | Issue tracking |
| ContractShieldOverride | id, scanId, adminId, action, reason, buyerAcknowledged, buyerAckAt | Override audit |
| ContractShieldRule | id, ruleKey, thresholdValue, enabled | Configurable thresholds |
| ContractShieldNotification | id, scanId, channel, sentAt | Notification queue |
| ContractShieldReconciliation | id, jobType, startedAt, completedAt, itemsProcessed | Job execution logs |
| ComplianceEvent | id, dealId, eventType, details | Event audit trail |

---

## Risk Assessment

| Area | Risk Level | Notes |
|------|-----------|-------|
| APR validation | ✅ Low | Configurable threshold, CRITICAL severity |
| Payment math | ✅ Low | Standard tolerance, blocks e-sign |
| Fee cap enforcement | ✅ Low | State-specific, 17+ add-on categories |
| Admin overrides | ✅ Low | Full audit trail, consent mechanism |
| Reconciliation | ✅ Low | Automated job with logging |
| FixList workflow | ✅ Low | Clear resolution path |
