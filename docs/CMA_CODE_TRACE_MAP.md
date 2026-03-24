# Controlled Manual Approval (CMA) — Code Trace Map

> **Generated:** 2026-03-12
> **Updated:** 2026-03-13 — CMA fully implemented
> **Scope:** AutoLenis monorepo — Contract Shield override/approval workflow
> **Status:** CMA system implemented with dedicated model, state machine, RBAC, dual approval, and auto-revocation

---

## CMA Implementation Summary (2026-03-13 Update)

The CMA system has been upgraded from the legacy admin override workflow to a true Controlled Manual Approval system. Key additions:

| Component | Files Added/Modified |
|---|---|
| **Data model** | `prisma/schema.prisma` — `ContractManualReview` model with 5 enums |
| **DealStatus** | Added: `CONTRACT_MANUAL_REVIEW_REQUIRED`, `CONTRACT_INTERNAL_FIX_IN_PROGRESS`, `CONTRACT_ADMIN_OVERRIDE_APPROVED` |
| **Roles** | Added: `COMPLIANCE_ADMIN` role, `CMA_APPROVER_ROLES`, `isCmaApprover()` |
| **Service** | `lib/services/contract-shield/manual-review.ts` — 12 functions for full CMA lifecycle |
| **API routes** | 9 routes under `/api/admin/manual-reviews/` and `/api/admin/deals/` |
| **Admin UI** | `app/admin/manual-reviews/page.tsx`, `app/admin/manual-reviews/[id]/page.tsx` |
| **Buyer messaging** | Updated `components/buyer/contract-shield-status.tsx` for CMA states |
| **Notifications** | Added `sendCmaStatusNotification()` with CMA-specific buyer/dealer messaging |
| **AI resolvers** | Updated `next-step-resolver.ts` and `cta-resolver.ts` for CMA statuses |
| **Audit** | Fixed `logEvent()` to write `action` field; added `logCmaEvent()` with full context |
| **Rate limiting** | Added `cmaApproval` rate limit preset (20/day per admin) |
| **Tests** | `__tests__/cma-manual-review.test.ts` — 48 unit tests |
| **Migration** | `scripts/101-cma-manual-review.sql` |
| **Documentation** | `docs/CMA_ENGINEERING_GUIDE.md` |

---

## Terminology

In the AutoLenis codebase, **Controlled Manual Approval (CMA)** is now explicitly modeled via the `ContractManualReview` table with dedicated enums (`ManualReviewStatus`, `ManualApprovalMode`, `CmaRootCauseCategory`, `CmaInternalFixQueue`). The legacy override workflow (`ContractShieldOverride` with `FORCE_PASS`/`FORCE_FAIL`) is preserved for backward compatibility.

| CMA Concept | Code Equivalent |
|---|---|
| Manual approval | `ContractManualReview` with `approvalMode` = `MANUAL_VALIDATED` or `EXCEPTION_OVERRIDE` |
| Manual review state | DealStatus `CONTRACT_MANUAL_REVIEW_REQUIRED` |
| Dual approval | `ManualReviewStatus.PENDING_SECOND_APPROVAL` with `secondApproverAdminId` |
| Internal fix routing | DealStatus `CONTRACT_INTERNAL_FIX_IN_PROGRESS` with `assignedQueue` |
| Document integrity | `documentHashAtApproval` + `revokeIfDocsChanged()` auto-revocation |
| Audit trail | `ComplianceEvent` via `logCmaEvent()` with full actor context |
| Legacy override | `ContractShieldOverride` (preserved for backward compatibility) |

---

## SECTION 1 — CMA INVENTORY

### UI

| File | Type | Purpose |
|---|---|---|
| `app/admin/contracts/page.tsx` | Admin page | List all contract scans; filter by status (PASS/FAIL/PENDING); pagination |
| `app/admin/contracts/[id]/page.tsx` | Admin page | Contract detail; override controls (FORCE_PASS/FORCE_FAIL + reason textarea) |
| `app/admin/contract-shield/overrides/page.tsx` | Admin page | Override audit ledger — shows all overrides, buyer ack status, status transitions |
| `app/admin/contract-shield/rules/page.tsx` | Admin page | Rule configuration (enable/disable, thresholds, severity) |
| `app/buyer/contract-shield/page.tsx` | Buyer page | Buyer view of contract shield flags |
| `components/buyer/contract-shield-status.tsx` | Buyer widget | Dashboard widget; 5 status states (Waiting / Analyzing / Passed / Review Needed / Attention Required) |
| `components/buyer/override-acknowledgment-modal.tsx` | Buyer modal | Override acknowledgment dialog; shows admin action + reason; optional buyer comment; POSTs to acknowledge-override |
| `components/email/contract-shield-email.tsx` | Email template | Status-specific emails (PASS / FAIL / ISSUES_FOUND); separate buyer vs dealer messaging |

### API Routes

| Route | Method | Auth | Handler |
|---|---|---|---|
| `POST /api/admin/contracts/[id]/override` | POST | `isAdminRole()` | Calls `adminOverrideWithConsent()` |
| `GET/POST /api/admin/contracts/[id]` | GET/POST | `isAdminRole()` | GET: scan details; POST: override action |
| `GET /api/admin/contract-shield/overrides` | GET | `isAdminRole()` | Calls `getOverridesLedger(filters)` |
| `GET/PATCH /api/admin/contract-shield/rules` | GET/PATCH | `isAdminRole()` | Rule CRUD |
| `GET/PATCH /api/admin/contract-shield/rules/[id]` | various | `isAdminRole()` | Individual rule management |
| `GET /api/admin/contract-shield/reconciliation` | GET | `isAdminRole()` | Reconciliation audit trail |
| `POST /api/buyer/contracts/acknowledge-override` | POST | `role === "BUYER"` | Calls `buyerAcknowledgeOverride()` |
| `GET /api/buyer/contracts` | GET | session | Buyer's deal + scan + documents |
| `GET /api/buyer/contract-shield` | GET | session | Buyer contract shield flags |
| `POST /api/contract/scan` | POST | `DEALER_ROLES \| ADMIN_ROLES` | Calls `scanContract()` |
| `POST /api/contract/fix` | POST | session | Calls `resolveFixItem()` |
| `POST /api/contract/upload` | POST | session | Document upload |
| `GET /api/cron/contract-shield-reconciliation` | GET | cron auth | Runs 3 reconciliation jobs |

### Services

| File | Public Functions |
|---|---|
| `lib/services/contract-shield/index.ts` | Barrel: re-exports all sub-modules; composes `ContractShieldService` class |
| `lib/services/contract-shield/scanner.ts` | `scanContract()`, `resolveFixItem()`, `checkMathConsistency()`, `reviewFees()`, `checkDocumentCompleteness()` |
| `lib/services/contract-shield/overrides.ts` | `adminOverride()`, `adminOverrideWithConsent()`, `buyerAcknowledgeOverride()` |
| `lib/services/contract-shield/notifications.ts` | `sendOverrideNotification()`, `sendStatusChangeNotification()` |
| `lib/services/contract-shield/queries.ts` | `uploadDocument()`, `getOverridesLedger()`, `getScanWithDetails()`, `getScanByDealId()`, `getDocumentsByDealId()`, `uploadContract()` |
| `lib/services/contract-shield/rules.ts` | `getActiveRules()`, `updateRule()`, `initializeDefaultRules()` |
| `lib/services/contract-shield/reconciliation.ts` | `runReconciliationJob()` — SYNC_STATUSES, CHECK_STALE_SCANS, NOTIFY_PENDING |
| `lib/services/contract-shield/helpers.ts` | `logEvent()` — writes `ComplianceEvent` |
| `lib/services/contract-shield/types.ts` | Type definitions: `ScanStatus`, `IssueSeverity`, `ScanIssueItem`, `DocumentType`, constants |

### Data Model (Prisma)

| Model | Schema Line | Purpose |
|---|---|---|
| `ContractShieldScan` | `prisma/schema.prisma:1098` | Main scan record; status, scores, match flags |
| `FixListItem` | `prisma/schema.prisma:1136` | Individual scan issues; severity, category, resolved flag |
| `ContractShieldOverride` | `prisma/schema.prisma:1153` | Admin override record; action, reason, buyer consent tracking |
| `ContractShieldRule` | `prisma/schema.prisma:1177` | Configurable scan rules; thresholds, severity |
| `ContractShieldNotification` | `prisma/schema.prisma:1198` | Notification delivery tracking; type, status, content |
| `ContractShieldReconciliation` | `prisma/schema.prisma:1222` | Cron job audit trail |
| `ComplianceEvent` | `prisma/schema.prisma:1786` | General audit event log; eventType, details JSON |
| `ContractDocument` | (related) | Uploaded contract documents; versioned |
| `SelectedDeal` | (related) | Deal record; `status` field drives CMA gating |

### Audit / Events

| Event Type | Written By | Trigger |
|---|---|---|
| `ADMIN_OVERRIDE` | `overrides.ts:33` | Direct admin override (no consent) |
| `ADMIN_OVERRIDE_CREATED` | `overrides.ts:101` | Consent-required override created |
| `BUYER_ACKNOWLEDGED_OVERRIDE` | `overrides.ts:171` | Buyer acknowledges override |
| `SCAN_COMPLETED` | `scanner.ts:135` | Scan finishes |
| `DOC_UPLOADED` | `queries.ts:54` | Document uploaded |

### Notifications

| Notification | Channel | Recipient | Trigger |
|---|---|---|---|
| Override acknowledgment request | EMAIL | Buyer | `sendOverrideNotification()` after admin creates consent override |
| Status change (buyer) | EMAIL | Buyer | `sendStatusChangeNotification()` on scan status change |
| Status change (dealer) | EMAIL | Dealer | `sendStatusChangeNotification()` on scan status change |
| Pending override reminder | EMAIL | Buyer | `NOTIFY_PENDING` reconciliation job (>24h unacknowledged) |

### Tests

| File | Coverage |
|---|---|
| `__tests__/contract-shield-math.test.ts` | 30+ tests: OTD, APR, payment, fee, doc fee, add-on, status determination, score calculation |
| `__tests__/faq-cta-resolver.test.ts` | CTA for `MANUAL_REVIEW` status → "Check Manual Review Status" label + `checkManualReview` action |

---

## SECTION 2 — MASTER TRACE TABLES

### A) UI → Action → Backend Trace

| # | User/Actor | UI Screen | Visible Action | Route Invoked | Service Function | DB Write(s) | Audit Event(s) | Notification(s) | Status Transition | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Dealer | Dealer contracts page | Upload contract | `POST /api/contract/upload` | `uploadDocument()` | `ContractDocument` created; `ContractShieldScan` created/updated to `PENDING` | `DOC_UPLOADED` | None | SelectedDeal unchanged | Version tracked on ContractDocument |
| 2 | Dealer/Admin | (programmatic) | Trigger scan | `POST /api/contract/scan` | `scanContract()` | `ContractShieldScan` → `RUNNING` → final status; `FixListItem` records created | `SCAN_COMPLETED` | None directly (status change notif is separate) | `PASS` → `CONTRACT_APPROVED`; else → `CONTRACT_REVIEW` | Clears previous FixListItems before re-scan |
| 3 | Admin | Admin contract detail (`/admin/contracts/[id]`) | Click "Force PASS" + enter reason + "Confirm Override" | `POST /api/admin/contracts/[id]` | `adminOverrideWithConsent()` | `ContractShieldOverride` created (buyerAcknowledged=false); scan status → `PASS`; deal stays `CONTRACT_REVIEW` | `ADMIN_OVERRIDE_CREATED` | Email to buyer: "Override Acknowledgment Required" | Scan → PASS; Deal remains CONTRACT_REVIEW until buyer acks | Reason required; buyer consent gate prevents immediate deal progression |
| 4 | Admin | Admin contract detail | Click "Force FAIL" + enter reason + "Confirm Override" | `POST /api/admin/contracts/[id]` | `adminOverrideWithConsent()` | `ContractShieldOverride` created; scan → `FAIL`; deal → `CONTRACT_REVIEW` | `ADMIN_OVERRIDE_CREATED` | Email to buyer | Scan → FAIL; Deal → CONTRACT_REVIEW | Same flow as FORCE_PASS but newStatus="FAIL" |
| 5 | Buyer | Override acknowledgment modal | "Acknowledge & Continue" | `POST /api/buyer/contracts/acknowledge-override` | `buyerAcknowledgeOverride()` | `ContractShieldOverride.buyerAcknowledged` → true; `buyerAckAt` set; `buyerAckComment` stored; if FORCE_PASS → deal → `CONTRACT_APPROVED` | `BUYER_ACKNOWLEDGED_OVERRIDE` | None | If newStatus=PASS: Deal → `CONTRACT_APPROVED`; if FAIL: Deal stays `CONTRACT_REVIEW` | Object-level auth: buyerId must match deal's buyer |
| 6 | Admin | Override audit ledger (`/admin/contract-shield/overrides`) | View override history | `GET /api/admin/contract-shield/overrides` | `getOverridesLedger()` | None (read-only) | None | None | N/A | Supports filtering by scanId, adminId, buyerAcknowledged, date range |
| 7 | Dealer | (programmatic) | Resolve fix item | `POST /api/contract/fix` | `resolveFixItem()` | `FixListItem.resolved` → true; if all resolved → triggers re-scan | If re-scan triggered: `SCAN_COMPLETED` | None | If re-scan produces PASS → `CONTRACT_APPROVED` | Auto-re-scan when all items resolved |
| 8 | Admin | Admin rules page (`/admin/contract-shield/rules`) | Update rule config | `PATCH /api/admin/contract-shield/rules/[id]` | `updateRule()` | `ContractShieldRule` updated | None (logger.info only) | None | N/A | Affects future scans only |
| 9 | Cron | (automated) | Reconciliation | `GET /api/cron/contract-shield-reconciliation` | `runReconciliationJob()` | Multiple: sync statuses, unstick stale scans, re-notify pending | None | Reminder email for pending overrides >24h | May correct drift between scan status and deal status | Three parallel jobs: SYNC_STATUSES, CHECK_STALE_SCANS, NOTIFY_PENDING |

### B) Status Transition Trace Table

| From Status | Trigger | Decision Owner | Code Path | To Status | Side Effects | Audit Event | Dealer Message | Buyer Message |
|---|---|---|---|---|---|---|---|---|
| `CONTRACT_PENDING` | Document uploaded + scan initiated | System | `scanner.ts:scanContract()` | `CONTRACT_REVIEW` (issues) or `CONTRACT_APPROVED` (clean) | FixListItems created; scan score computed | `SCAN_COMPLETED` | `sendStatusChangeNotification()` — email | `sendStatusChangeNotification()` — email |
| `CONTRACT_REVIEW` | Admin FORCE_PASS (consent path) | Admin | `overrides.ts:adminOverrideWithConsent()` | `CONTRACT_REVIEW` (stays; awaits buyer ack) | Override record created; scan updated to PASS | `ADMIN_OVERRIDE_CREATED` | None | Email: "Override Acknowledgment Required" |
| `CONTRACT_REVIEW` | Buyer acknowledges FORCE_PASS override | Buyer | `overrides.ts:buyerAcknowledgeOverride()` | `CONTRACT_APPROVED` | Override marked acknowledged; buyerAckAt set | `BUYER_ACKNOWLEDGED_OVERRIDE` | None | None (toast in UI only) |
| `CONTRACT_REVIEW` | Admin FORCE_FAIL (consent path) | Admin | `overrides.ts:adminOverrideWithConsent()` | `CONTRACT_REVIEW` (remains) | Override record created; scan updated to FAIL | `ADMIN_OVERRIDE_CREATED` | None | Email: "Override Acknowledgment Required" |
| `CONTRACT_REVIEW` | Buyer acknowledges FORCE_FAIL override | Buyer | `overrides.ts:buyerAcknowledgeOverride()` | `CONTRACT_REVIEW` (stays; newStatus≠PASS) | Override marked acknowledged | `BUYER_ACKNOWLEDGED_OVERRIDE` | None | None |
| `CONTRACT_REVIEW` | All fix items resolved → re-scan passes | System | `scanner.ts:resolveFixItem()` → `scanContract()` | `CONTRACT_APPROVED` | Re-scan runs; new score | `SCAN_COMPLETED` | Via sendStatusChangeNotification | Via sendStatusChangeNotification |
| `CONTRACT_REVIEW` | Direct admin override (non-consent) | Admin | `overrides.ts:adminOverride()` | `CONTRACT_APPROVED` or `CONTRACT_REVIEW` | Scan status updated; deal status updated | `ADMIN_OVERRIDE` | None | None |
| `CONTRACT_APPROVED` | (terminal for CMA — progresses to E-Sign) | — | — | `SIGNING_PENDING` / `SIGNED` | E-Sign flow begins | — | — | — |
| `RUNNING` (scan stuck >1h) | Reconciliation cron | System | `reconciliation.ts:CHECK_STALE_SCANS` | `REVIEW_READY` | Scan summary updated with timeout notice | None | None | None |

### C) Data Persistence Trace Table

| Record/Model | Purpose | Created When | Updated When | Key Fields | Immutable? | Read By | Compliance Significance |
|---|---|---|---|---|---|---|---|
| `ContractShieldScan` | Central scan record | First document upload or first scan | Each re-scan; admin override | `status`, `overallScore`, `aprMatch`, `paymentMatch`, `otdMatch`, `junkFeesDetected`, `summary`, `scannedAt` | Mutable (updated on re-scan/override) | Admin detail page, buyer status widget, reconciliation, AI CTA resolver | Primary compliance artifact — proves contract was reviewed |
| `FixListItem` | Individual scan issue | During `scanContract()` | `resolveFixItem()` | `severity`, `category`, `description`, `expectedFix`, `resolved` | Mutable (resolved flag); deleted on re-scan | Admin detail page, fix API | Shows what issues were identified and whether resolved |
| `ContractShieldOverride` | Admin override audit record | `adminOverrideWithConsent()` or `adminOverride()` | `buyerAcknowledgeOverride()` | `action`, `reason`, `buyerAcknowledged`, `buyerAckAt`, `buyerAckComment`, `previousStatus`, `newStatus` | Partially immutable: action/reason/admin/previousStatus/newStatus are write-once; buyerAck fields are updated once | Override audit ledger, admin pages | **Critical compliance artifact** — proves who overrode, why, and buyer consent |
| `ContractShieldRule` | Scan configuration | `initializeDefaultRules()` or manual creation | `updateRule()` | `ruleKey`, `ruleType`, `severity`, `thresholdValue`, `enabled`, `configJson` | Mutable (admin-editable) | Scanner (indirectly — hardcoded thresholds in current impl) | Proves scanning rules were defined |
| `ContractShieldNotification` | Notification delivery tracking | When notification is queued | Status updates (SENT/FAILED) | `notificationType`, `status`, `subject`, `message`, `sentAt`, `failedReason` | Mutable (status lifecycle) | Not exposed in UI currently | Proves buyer was notified of override |
| `ContractShieldReconciliation` | Cron job audit | Each reconciliation run | Job completion | `jobType`, `status`, `itemsProcessed`, `itemsUpdated`, `itemsFailed`, `resultSummary` | Write-once (created then updated on completion) | Admin reconciliation page | Proves system self-heals status drift |
| `ComplianceEvent` | General audit log | Each CMA action | Never (append-only) | `eventType`, `dealId`, `details` (JSON) | **Immutable** (write-once) | Not exposed in UI currently | **Primary audit trail** — queryable by eventType, indexed |
| `ContractDocument` | Uploaded contract files | Document upload | Version increments | `documentType`, `fileUrl`, `version` | Immutable per version (new versions create new records) | Admin detail page, scan logic | Proves what documents existed at scan time |

### D) Audit/Event Trace Table

| Event Type | Written By | Payload Contents | Trigger Condition | Queryability | Compliance Relevance |
|---|---|---|---|---|---|
| `ADMIN_OVERRIDE` | `overrides.ts:33-40` | `{ scanId, action, adminId, reason, previousStatus, newStatus }` | Admin calls `adminOverride()` (non-consent path) | Indexed by `eventType`, `createdAt` | Proves admin changed scan status; captures who and why |
| `ADMIN_OVERRIDE_CREATED` | `overrides.ts:101-109` | `{ scanId, overrideId, action, adminId, reason, previousStatus, newStatus }` | Admin calls `adminOverrideWithConsent()` | Indexed by `eventType`, `createdAt` | Proves override was created requiring buyer consent; links to override record |
| `BUYER_ACKNOWLEDGED_OVERRIDE` | `overrides.ts:171-175` | `{ overrideId, buyerId, comment }` | Buyer calls `buyerAcknowledgeOverride()` | Indexed by `eventType`, `createdAt` | Proves buyer consented to override; captures optional comment |
| `SCAN_COMPLETED` | `scanner.ts:135-141` | `{ scanId, status, itemsCount, criticalCount, importantCount }` | `scanContract()` completes | Indexed by `eventType`, `createdAt` | Proves scan ran; captures severity breakdown |
| `DOC_UPLOADED` | `queries.ts:54-59` | `{ documentType, documentId, version, dealerId }` | Document uploaded via `uploadDocument()` | Indexed by `eventType`, `createdAt` | Proves what document was uploaded and by whom |

**Note:** The `logEvent()` helper (`helpers.ts:3-15`) writes to `ComplianceEvent` with `dealId`, `eventType`, and `details`. It does **not** populate the `action`, `userId`, `buyerId`, `ipAddress`, or `userAgent` fields defined in the schema. These fields remain `null` for all Contract Shield events. This is a compliance gap.

### E) Notification Trace Table

| # | Audience | Channel | Trigger | Code Path | Message/Meaning | Dealer Action Suppressed? | Buyer Signability Blocked/Unblocked? |
|---|---|---|---|---|---|---|---|
| 1 | Buyer | EMAIL | Admin creates consent override | `notifications.ts:sendOverrideNotification()` | Subject: "Override Acknowledgment Required"; body includes action type and admin reason; CTA: "Review Override" → `/buyer/contracts` | N/A | **Blocked** — deal stays CONTRACT_REVIEW until buyer acknowledges |
| 2 | Buyer | EMAIL | Scan status changes | `notifications.ts:sendStatusChangeNotification()` | Subject: "Contract Review Update: {newStatus}"; body: status changed from X to Y | N/A | Depends on new status (PASS → unblocked) |
| 3 | Dealer | EMAIL | Scan status changes | `notifications.ts:sendStatusChangeNotification()` | Subject: "Contract Review Update: {newStatus}"; body: status changed | Dealer is informed but has no override action | N/A |
| 4 | Buyer | EMAIL | Pending override >24h (reconciliation) | `reconciliation.ts:NOTIFY_PENDING` → `sendOverrideNotification()` | Reminder: same override notification re-sent | N/A | Still blocked until acknowledged |
| 5 | Buyer | IN_APP (toast) | After successful acknowledgment | `override-acknowledgment-modal.tsx:53-56` | Toast: "Your acknowledgment has been recorded." | N/A | **Unblocked** if FORCE_PASS |
| 6 | Admin | IN_APP (toast) | After override submitted | `app/admin/contracts/[id]/page.tsx:60` | Toast: "Contract {approved\|failed} successfully" | N/A | N/A |

**Not implemented:** SMS notifications, in-app notification center, push notifications. The `notificationType` field supports "SMS" and "IN_APP" but only "EMAIL" is used.

---

## SECTION 3 — ROLE & GOVERNANCE TRACE

### RBAC Map

| Capability | ADMIN / SUPER_ADMIN | DEALER | BUYER | Enforcement Point(s) |
|---|---|---|---|---|
| View all contract scans | ✅ | ❌ | ❌ | Route: `isAdminRole()` in `app/api/admin/contracts/` |
| View individual scan detail | ✅ | ❌ | ❌ | Route: `isAdminRole()` in `app/api/admin/contracts/[id]/route.ts` |
| Trigger scan | ✅ | ✅ | ❌ | Route: `withAuth(request, { roles: [...DEALER_ROLES, ...ADMIN_ROLES] })` |
| Create override (FORCE_PASS/FORCE_FAIL) | ✅ | ❌ | ❌ | Route: `isAdminRole()` in override route |
| View override ledger | ✅ | ❌ | ❌ | Route: `isAdminRole()` in overrides route |
| Acknowledge override | ❌ | ❌ | ✅ | Route: `session.role !== "BUYER"` check; Service: `buyerId !== dealBuyerId` check in `buyerAcknowledgeOverride()` |
| Configure rules | ✅ | ❌ | ❌ | Route: `isAdminRole()` in rules route |
| Resolve fix items | ❌ | ✅ | ❌ | Service-level check (varies) |
| Upload documents | ❌ | ✅ | ❌ | Route-level auth |

**Where each permission is enforced:**

| Layer | Enforcement Mechanism | Files |
|---|---|---|
| UI guard | Page-level: admin pages under `/admin/` layout (requires admin session); buyer pages use `<ProtectedRoute allowedRoles={["BUYER"]}>` | `app/admin/layout.tsx`, `app/buyer/contract-shield/page.tsx:17` |
| Route guard | `getSession()` + `isAdminRole()` or `session.role !== "BUYER"` check | Every API route file |
| Service guard | Object-level: `buyerAcknowledgeOverride()` checks `override.scan.selectedDeal?.buyerId !== buyerId` | `overrides.ts:144` |
| DB/RLS | **Not enforced** — Contract Shield tables do not have RLS policies | N/A |

### Dual Approval Trace

**Status: NOT IMPLEMENTED**

There is no dual-admin approval, second approver, or peer review requirement in the current implementation.

| Aspect | Current State |
|---|---|
| Trigger condition | N/A — no trigger exists |
| First approver path | Single admin calls `adminOverrideWithConsent()` |
| Second approver path | **Does not exist** |
| Intermediate state | N/A |
| Audit implications | Single admin's ID is recorded; no second signature |
| Blocking behavior | N/A |

The system does require **buyer acknowledgment** as a consent gate (not a second admin approval). This is a consent model, not a dual-control model.

### Rate Limiting / Abuse Prevention

**Status: NOT APPLIED to CMA routes**

The rate limiting infrastructure exists in `lib/middleware/rate-limit.ts` with presets for auth, signin, etc. However:

- `POST /api/admin/contracts/[id]/override` — **no rate limit**
- `POST /api/buyer/contracts/acknowledge-override` — **no rate limit**
- `POST /api/contract/scan` — **no rate limit**
- No escalation events or threshold alerts for override frequency

### High-Risk Dealer Handling

**Status: NOT IMPLEMENTED**

No dealer risk scoring, override frequency monitoring, or escalation logic exists in the CMA flow.

---

## SECTION 4 — INTEGRITY / REVOCATION TRACE

### Post-Approval Document Lock

**Status: NOT IMPLEMENTED**

There is no mechanism to:
- Lock documents after CONTRACT_APPROVED status
- Compute or store document hashes/checksums
- Detect document changes after approval
- Revoke approval based on document tampering

### Document Change Detection

**Status: NOT IMPLEMENTED**

There is no hash comparison, integrity check, or change-detection logic. Documents can be re-uploaded at any time and will create new version records. Re-uploading triggers a status reset to `PENDING` via `uploadDocument()` (`queries.ts:48-51`), but this is not a revocation — it simply restarts the scan flow.

### Current Re-upload Behavior (Not Revocation)

```
Trigger: Dealer uploads new document version
→ queries.ts:uploadDocument() — new ContractDocument with incremented version
→ ContractShieldScan.status reset to "PENDING"
→ logEvent("DOC_UPLOADED", {...})
→ No automatic re-scan triggered
→ No notification sent
→ Previous scan results remain until manually re-triggered
```

**Gap:** If a document is re-uploaded after an override + buyer acknowledgment, the approval is not automatically revoked. The scan status resets to PENDING but the deal status (`CONTRACT_APPROVED`) is not rolled back.

### Idempotency

The buyer acknowledgment path has a basic idempotency check:

```typescript
// overrides.ts:148-150
if (override.buyerAcknowledged) {
  throw new Error("Override already acknowledged")
}
```

This prevents double-acknowledgment. However, admin overrides have no idempotency guard — an admin can create multiple override records for the same scan.

---

## SECTION 5 — FALSE-POSITIVE METRICS TRACE

**Status: NOT IMPLEMENTED**

There is no false-positive tracking, metrics collection, or feedback loop in the current codebase.

| Aspect | Current State |
|---|---|
| Counter/metric for false positives | Does not exist |
| Field to mark an override as "false positive" | Does not exist |
| Aggregate metrics dashboard | Does not exist |
| Rule calibration feedback | Does not exist |
| Dimensions/keying | N/A |
| Downstream consumption | N/A |

The closest existing data point is `ContractShieldOverride.action = "FORCE_PASS"` which could be interpreted as "the scan flagged something that admin deemed acceptable," but there is no explicit false-positive classification or counter.

---

## SECTION 6 — PARTY EXPERIENCE TRACE

### A) Buyer Experience

| CMA State | Scan Status | Deal Status | Visible Label (buyer widget) | Blocking Effect | Email/Notification | What Buyer Sees |
|---|---|---|---|---|---|---|
| No scan yet, no docs | — | `CONTRACT_PENDING` | "Waiting" | Cannot proceed to E-Sign | None | "Waiting for dealer to upload contracts" |
| Docs uploaded, scan pending | `PENDING` / `RUNNING` | `CONTRACT_PENDING` | "Processing" / "Analyzing" | Cannot proceed to E-Sign | None | "Analyzing contract documents..." |
| Scan passed (clean) | `PASS` | `CONTRACT_APPROVED` | "Passed" | **Unblocked** — E-Sign available | Status change email | "No issues found - ready to proceed"; CTA: "Continue to E-Sign" |
| Scan found issues | `REVIEW_READY` / `FAIL` | `CONTRACT_REVIEW` | "Review Needed" / "Attention Required" | **Blocked** — cannot E-Sign | Status change email | Issue count shown; CTA: "View Contract Review" |
| Admin override pending ack | `PASS` (scan) | `CONTRACT_REVIEW` (deal) | — | **Blocked** until buyer acknowledges | Email: "Override Acknowledgment Required" | Override acknowledgment modal appears |
| Buyer acknowledged FORCE_PASS | `PASS` | `CONTRACT_APPROVED` | "Passed" | **Unblocked** | Toast: "Your acknowledgment has been recorded" | E-Sign becomes available |
| Buyer acknowledged FORCE_FAIL | `FAIL` | `CONTRACT_REVIEW` | "Attention Required" | **Blocked** | Toast: "Your acknowledgment has been recorded" | Remains in review state |
| AI Concierge (MANUAL_REVIEW) | — | — | CTA: "Check Manual Review Status" | — | — | AI shows actionType `checkManualReview` |

### B) Dealer Experience

| CMA State | Visible to Dealer | Dealer Action | Dealer Sees "No Action Required"? | Can Dealer Re-upload? |
|---|---|---|---|---|
| Scan found issues (REVIEW_READY/FAIL) | Yes — status change email | Resolve fix items; re-upload documents | No explicit message | Yes — `POST /api/contract/upload` |
| Admin override created | Not directly notified of override | No action available | Not explicitly stated | Yes (can still upload) |
| Override acknowledged | Status change email if applicable | No action | Not stated | Yes |
| Scan passed | Status change email | No action needed | Implied by PASS status | Yes (new upload resets to PENDING) |

**Gap:** Dealer is not explicitly informed "no action required — admin handling" during override flow. Dealer receives generic status change emails but no override-specific messaging.

### C) Admin Experience

| CMA State | Admin Panel | Available Controls | Disabled/Gated Controls | Required Data | Pending Behavior |
|---|---|---|---|---|---|
| Scan in REVIEW_READY or FAIL | `/admin/contracts/[id]` — full scan detail with issues list, scores, documents | "Force PASS" button, "Force FAIL" button | Override button disabled until reason entered (`!overrideReason \|\| submitting`) | Reason text (required) | N/A |
| Override created, awaiting buyer ack | Override ledger shows "Pending" badge | View-only; no cancel/revoke option | No ability to cancel pending override | N/A | Badge: `<Clock /> Pending` |
| Override acknowledged | Override ledger shows "Acknowledged" badge | View-only; buyer comment visible | N/A | N/A | Badge: `<CheckCircle2 /> Acknowledged` |
| Scan passed (no override) | Status shown as PASS; green UI | Override still available (can force FAIL a passed scan) | Same gating as above | Reason text | N/A |

**Gap:** Admin cannot cancel or revoke a pending override. No "revoke" or "undo" control exists.

---

## SECTION 7 — TEST TRACE

| Test File | Scenario Covered | What It Proves | Coverage Quality | Missing Coverage |
|---|---|---|---|---|
| `__tests__/contract-shield-math.test.ts` | OTD consistency (4 tests) | Tolerance of $1 (100 cents); symmetric difference detection | **Strong** | — |
| `__tests__/contract-shield-math.test.ts` | APR consistency (4 tests) | Tolerance of 0.01%; zero APR handling | **Strong** | — |
| `__tests__/contract-shield-math.test.ts` | Monthly payment verification (3 tests) | Tolerance of $5; overcharge detection | **Strong** | — |
| `__tests__/contract-shield-math.test.ts` | Fee calculation (2 tests) | OTD = base + fees + tax within $50 tolerance | **Partial** | Edge cases with negative fees |
| `__tests__/contract-shield-math.test.ts` | Doc fee review (4 tests) | 150% threshold; state-specific references; unknown state handling | **Strong** | — |
| `__tests__/contract-shield-math.test.ts` | Add-on detection (4 tests) | Flagged items detected; zero-amount excluded; case normalization | **Strong** | — |
| `__tests__/contract-shield-math.test.ts` | Scan status determination (3 tests) | PASS/FAIL/REVIEW_READY logic | **Strong** | — |
| `__tests__/contract-shield-math.test.ts` | Score calculation (6 tests) | Deduction formulas; floor values (0 for FAIL, 50 for REVIEW_READY) | **Strong** | — |
| `__tests__/faq-cta-resolver.test.ts` | MANUAL_REVIEW CTA (1 test) | Correct label and actionType for manual review state | **Partial** | Only covers CTA label, not full flow |

### Missing Test Coverage

| Missing Area | Severity | Notes |
|---|---|---|
| Override creation (adminOverrideWithConsent) | **Critical** | No unit test for the primary CMA workflow |
| Buyer acknowledgment (buyerAcknowledgeOverride) | **Critical** | No test for consent flow, object-level auth, or idempotency guard |
| Direct admin override (adminOverride) | **Critical** | No unit test |
| Status transition validation | **Important** | No test that deal status actually changes correctly |
| Notification delivery (sendOverrideNotification) | **Important** | No test for email content, delivery status tracking |
| Reconciliation jobs | **Important** | No test for SYNC_STATUSES, CHECK_STALE_SCANS, NOTIFY_PENDING |
| RBAC enforcement on routes | **Important** | No test verifying non-admin cannot call override route |
| Audit event payload correctness | **Important** | No test verifying ComplianceEvent contains expected data |
| Document re-upload after override | **Important** | No test for re-upload-after-approval edge case |
| Override idempotency (multiple overrides on same scan) | **Partial** | No test |
| E2E: full override → acknowledge → approve flow | **Critical** | No E2E test exists |

---

## SECTION 8 — CURRENT IMPLEMENTATION GAPS

### Critical Gaps

**1. No dual-admin approval / second approver**
- Where: `overrides.ts:adminOverrideWithConsent()` — single admin can override
- Impact: Compliance risk — no four-eyes principle for high-impact manual approvals
- Affects: Compliance, operational safety

**2. No post-approval document lock or integrity check**
- Where: `queries.ts:uploadDocument()` resets scan to PENDING but does not revoke deal's `CONTRACT_APPROVED` status
- Impact: Documents can be changed after approval without triggering revocation
- Affects: Compliance, auditability, contract integrity

**3. No rate limiting on CMA-sensitive routes**
- Where: `app/api/admin/contracts/[id]/override/route.ts`, `app/api/buyer/contracts/acknowledge-override/route.ts`, `app/api/contract/scan/route.ts`
- Impact: Abuse-prone endpoints unprotected
- Affects: Operational safety, security

**4. No unit/integration tests for override or acknowledgment flows**
- Where: `__tests__/` — only math validation tests exist
- Impact: Regression risk on core compliance workflow
- Affects: Quality assurance, compliance confidence

**5. `logEvent()` does not populate required `action` field on ComplianceEvent**
- Where: `helpers.ts:5-10` — creates ComplianceEvent with only `dealId`, `eventType`, `details`
- Schema: `ComplianceEvent.action String` is declared as non-nullable in the Prisma schema (`prisma/schema.prisma:1794`), which generates a `NOT NULL` constraint at the database level
- Impact: The `prisma.complianceEvent.create()` call will be rejected by Prisma's type system at compile time (if strict types are enforced) or fail at the database level at runtime. The `logEvent()` function wraps the call in a try/catch that logs the error to console (`console.error`) and swallows it — meaning **all CMA audit events may silently fail to persist**
- Affects: Audit integrity, compliance — this is the most critical gap if audit events are not actually being written

### Important Gaps

**6. No false-positive metrics or feedback loop**
- Where: Entire contract-shield module
- Impact: Cannot measure scan accuracy; cannot calibrate rules based on override patterns
- Affects: Operational quality, rule tuning

**7. No dealer-specific messaging during override flow**
- Where: `notifications.ts` — dealer not notified specifically about admin override
- Impact: Dealer may not know their contract is under manual review or that admin is handling it
- Affects: UX, dealer trust

**8. Scan rules are hardcoded despite `ContractShieldRule` model existing**
- Where: `scanner.ts:checkMathConsistency()`, `scanner.ts:reviewFees()` — thresholds are inline constants, not read from `ContractShieldRule` records
- Impact: Admin rule configuration UI has no effect on scan behavior
- Affects: Operational flexibility, admin expectations

**9. No admin override revocation/cancellation**
- Where: `overrides.ts` — no function to cancel a pending override
- Impact: Once created, an override can only be acknowledged, not withdrawn
- Affects: Operational safety, error recovery

**10. `ComplianceEvent` fields `userId`, `buyerId`, `ipAddress`, `userAgent` never populated by CMA events**
- Where: `helpers.ts:logEvent()` only sets `dealId`, `eventType`, `details`
- Impact: Audit events lack actor identification and source context
- Affects: Compliance, forensic analysis

**11. No RLS policies on Contract Shield tables**
- Where: Prisma schema — no `@@row_level_security` or Supabase RLS on any Contract Shield model
- Impact: DB-level isolation not enforced; relies entirely on application-layer auth
- Affects: Security depth

**12. No SMS or in-app notification implementation**
- Where: `ContractShieldNotification.notificationType` supports "SMS" and "IN_APP" but `sendOverrideNotification()` only sends EMAIL
- Impact: Buyers without email access may miss override notifications
- Affects: UX, compliance (notification delivery)

**13. Stale scan recovery sets status to REVIEW_READY, not FAIL**
- Where: `reconciliation.ts:58-64` — stale scans (stuck in RUNNING >1h) moved to REVIEW_READY
- Impact: Timed-out scans are treated as "needs review" rather than "failed" — may create false confidence
- Affects: Operational accuracy

### Cosmetic / Documentation Gaps

**14. ContractShieldStatus type in AI context doesn't match ScanStatus type**
- Where: `lib/ai/context/types.ts:19` defines `"NOT_UPLOADED" | "PASS" | "REJECT" | "MANUAL_REVIEW"` vs `types.ts:19` defines `"PENDING" | "RUNNING" | "REVIEW_READY" | "PASS" | "FAIL"`
- Impact: Mapping between these two type systems is implicit and undocumented
- Affects: Developer clarity, maintainability

**15. Two override paths exist with unclear routing**
- Where: `adminOverride()` (direct, no consent) vs `adminOverrideWithConsent()` (with consent gate)
- Usage: The admin UI route calls `adminOverrideWithConsent()` but `adminOverride()` is also exported and usable
- Impact: Unclear which path should be used; risk of bypassing consent gate
- Affects: Compliance, API surface clarity

---

## SECTION 9 — FINAL ARCHITECTURE NARRATIVE

The following describes the actual end-to-end CMA lifecycle as implemented in the current codebase:

### 1. Contract Shield Scan

A dealer uploads contract documents via `POST /api/contract/upload` → `uploadDocument()` creates `ContractDocument` records (versioned) and ensures a `ContractShieldScan` exists in `PENDING` state. The `DOC_UPLOADED` compliance event is logged.

### 2. Automated Analysis

When a scan is triggered via `POST /api/contract/scan` → `scanContract()`:
- Previous `FixListItem` records are cleared
- Three checks run: `checkMathConsistency()` (OTD, APR, payment), `reviewFees()` (flagged add-ons, doc fee review), `checkDocumentCompleteness()` (BUYERS_ORDER presence)
- Status determined: CRITICAL issues → `FAIL`; IMPORTANT/REVIEW issues → `REVIEW_READY`; no issues → `PASS`
- Score calculated: PASS = 100; FAIL = max(0, 100 − 25×critical − 10×important); REVIEW_READY = max(50, 100 − 10×important − 2×review)
- Deal status set: PASS → `CONTRACT_APPROVED`; else → `CONTRACT_REVIEW`
- `SCAN_COMPLETED` event logged

### 3. CMA Opens (Manual Review)

If the scan produces `REVIEW_READY` or `FAIL`, the deal enters `CONTRACT_REVIEW` status. The buyer sees "Review Needed" or "Attention Required" in their dashboard widget. E-Sign is blocked. The AI concierge may show "Check Manual Review Status" CTA if the context maps to `MANUAL_REVIEW`.

### 4. Admin Gated Workflow

An admin navigates to `/admin/contracts/[id]`, reviews the scan detail (status, score, match flags, issues list, documents). The admin can select "Force PASS" or "Force FAIL", must enter a reason, and clicks "Confirm Override."

This calls `POST /api/admin/contracts/[id]` → `adminOverrideWithConsent()`:
- Creates `ContractShieldOverride` with `buyerAcknowledged: false`
- Updates scan status to the override's target
- **Keeps deal in `CONTRACT_REVIEW`** (consent gate)
- Logs `ADMIN_OVERRIDE_CREATED` event
- Sends email to buyer: "Override Acknowledgment Required"

### 5. RBAC Enforcement

The override route checks `isAdminRole(session.role)` — only `ADMIN` and `SUPER_ADMIN` roles can create overrides. The buyer acknowledgment route checks `session.role === "BUYER"` and the service layer verifies `override.scan.selectedDeal?.buyerId !== buyerId` for object-level authorization. There is no dual-admin control.

### 6. Audit Written

Every CMA action writes to `ComplianceEvent` via `logEvent()`:
- `ADMIN_OVERRIDE_CREATED` with scanId, overrideId, action, adminId, reason, previousStatus, newStatus
- `BUYER_ACKNOWLEDGED_OVERRIDE` with overrideId, buyerId, comment

The `ContractShieldOverride` record itself serves as a structured audit artifact with action, reason, buyer acknowledgment status, and timestamps.

### 7. Status Changes

- Admin override: scan status changes immediately; deal remains in `CONTRACT_REVIEW`
- Buyer acknowledges FORCE_PASS: deal transitions to `CONTRACT_APPROVED`
- Buyer acknowledges FORCE_FAIL: deal stays in `CONTRACT_REVIEW`

### 8. Buyer/Dealer Messaging Updates

- Buyer receives email when override is created (via `sendOverrideNotification()`)
- Buyer sees override acknowledgment modal in UI
- After acknowledgment, buyer sees updated status in dashboard widget
- Dealer receives generic status change emails but is not specifically notified of override activity
- AI concierge adjusts CTAs based on contract shield status

### 9. Packet Lock / Internal Fix Queue

**Not implemented.** There is no document lock after `CONTRACT_APPROVED`. There is no internal fix queue. Dealers resolve issues by uploading new document versions and resolving fix items. When all fix items are resolved, an automatic re-scan is triggered.

### 10. Document Change After Approval

**Partially implemented.** Re-uploading a document via `uploadDocument()` resets the scan status to `PENDING`, but does **not** roll back the deal's `CONTRACT_APPROVED` status. There is no automated revocation. The reconciliation cron job (`SYNC_STATUSES`) may detect and correct status drift between scan and deal status, but this is a best-effort background process, not an immediate revocation mechanism.

---

*This document reflects the actual implementation as of the trace date. All code references are to specific files and line numbers in the AutoLenis monorepo. Gaps are documented explicitly and labeled by severity.*
