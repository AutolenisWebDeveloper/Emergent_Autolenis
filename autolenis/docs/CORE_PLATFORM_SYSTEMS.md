# Core Platform Systems — Internal Engineering Document

## Overview

This document describes the three canonical platform systems implemented to elevate AutoLenis into a Fortune-500-grade fintech transaction platform:

1. **Unified Decision Engine** — Centralized decisioning layer
2. **Event-Driven Workflow and Operational Ledger** — Canonical event model with audit-grade history
3. **Document and Identity Trust Infrastructure** — Trust layer for documents and identity artifacts

These systems are designed as foundational infrastructure that downstream services, routes, and UI components consume through canonical interfaces.

---

## System 1: Unified Decision Engine

### Location
`lib/services/decision-engine/`

### Design

The decision engine centralizes all platform readiness, approval, restriction, hold, and routing logic into a single canonical service. Instead of fragmenting decision checks across routes, pages, and individual services, all downstream consumers call the same resolution functions.

### Architecture

```
DecisionInputs (buyer + dealer + deal + affiliate signals)
    │
    ▼
resolveDecision()
    │
    ├── resolveBuyerReadiness()
    ├── resolveBuyerMessagingEligibility()
    ├── resolveDealerOperationalState()
    ├── resolveDealProgressionState()
    ├── resolveContractResolutionState()
    ├── resolveESignReadiness()
    ├── resolvePickupReadiness()
    ├── resolvePayoutReleaseState()
    ├── resolveRefundHoldState()
    ├── aggregateComplianceHolds()
    └── buildDecisionSourceSummary()
    │
    ▼
DecisionOutput (canonical states + reason codes + audit trail)
```

### Canonical Outputs

| Output | States | Description |
|--------|--------|-------------|
| `buyerReadinessState` | NOT_STARTED, PROFILE_INCOMPLETE, PREQUAL_REQUIRED, PREQUAL_PENDING, PREQUAL_ACTIVE, EXTERNAL_PREAPPROVAL_PENDING, EXTERNAL_PREAPPROVAL_APPROVED, CASH_DECLARED, READY, HOLD, BLOCKED | Buyer's overall platform readiness |
| `buyerMessagingEligibilityState` | ELIGIBLE, INELIGIBLE_NO_APPROVAL, INELIGIBLE_EXPIRED, INELIGIBLE_REJECTED, INELIGIBLE_HOLD | Whether buyer can message dealers |
| `dealerOperationalState` | ACTIVE, PENDING_VERIFICATION, SUSPENDED, HIGH_RISK, INACTIVE | Dealer's operational eligibility |
| `dealProgressionState` | SELECTED through COMPLETED/CANCELLED/HOLD | Deal's current lifecycle stage |
| `contractResolutionState` | NOT_STARTED through APPROVED | Contract review/approval status |
| `esignReadinessState` | NOT_READY through COMPLETED/BLOCKED | E-sign envelope readiness |
| `pickupReadinessState` | NOT_READY through COMPLETED | Pickup scheduling readiness |
| `payoutReleaseState` | NOT_APPLICABLE, HELD, READY, RELEASED, BLOCKED | Affiliate payout eligibility |
| `refundHoldState` | NONE, REQUESTED, APPROVED, DENIED, COMPLETED, HOLD | Refund processing status |
| `complianceHoldReasonCodes` | Array of reason codes | All active compliance holds |
| `decisionSourceSummary` | Array of signal entries | Audit trail of decision inputs |

### What Was Reused vs Introduced

- **Reused**: DealStatus enum from `lib/services/deal/types.ts`, existing prequal/external preapproval status values, existing contract scan/CMA statuses, existing payment/refund/payout statuses
- **Introduced**: Canonical resolver functions, DecisionInputs/DecisionOutput DTOs, ComplianceHoldReasonCode type, DecisionSourceEntry for audit

### How to Consume

```typescript
import { resolveDecision } from '@/lib/services/decision-engine'

const decision = resolveDecision({
  buyer: { /* BuyerSignals */ },
  dealer: { /* DealerSignals */ },
  deal: { /* DealSignals */ },
  affiliate: { /* AffiliateSignals */ },
  timestamp: new Date().toISOString(),
  correlationId: 'corr-123',
})

// Use canonical outputs
if (decision.buyerReadinessState === 'HOLD') { /* block */ }
if (decision.manualReviewRequired) { /* flag for admin */ }
```

Individual resolvers can also be called independently:

```typescript
import { resolveBuyerMessagingEligibility } from '@/lib/services/decision-engine'
const eligibility = resolveBuyerMessagingEligibility(buyerSignals)
```

---

## System 2: Event-Driven Workflow and Operational Ledger

### Location
`lib/services/event-ledger/`

### Design

The event ledger provides a platform-wide canonical event model so every major system action produces structured, replayable, auditable events. Events are immutable once written, and idempotency protection prevents duplicate events from repeated triggers or webhook retries.

### Event Schema

Each event carries:
- `id` — Unique event identifier
- `eventType` — Canonical event type (e.g., `BUYER_ACCOUNT_CREATED`)
- `eventVersion` — Schema version for forward compatibility
- `entityType` / `entityId` — The entity this event relates to
- `parentEntityId` — Optional parent entity for hierarchy
- `workspaceId` — Tenant isolation
- `actorId` / `actorType` — Who triggered the event
- `sourceModule` — Which service module emitted the event
- `correlationId` — For tracing related actions across systems
- `idempotencyKey` — For duplicate prevention
- `payload` — Arbitrary JSON data
- `processingStatus` — RECORDED → PROCESSING → PROCESSED / FAILED
- `createdAt` — Immutable timestamp

### Covered Event Types (38 types)

**Buyer lifecycle**: account created, profile completed, prequalified
**External preapproval**: submitted, approved, rejected, expired, superseded
**Auction lifecycle**: request created, auction created, dealer invited, offer submitted, offer selected
**Deal lifecycle**: financing chosen, fee paid, insurance completed
**Contract lifecycle**: uploaded, scan completed, failed, review ready, passed
**CMA lifecycle**: opened, approved, returned to internal fix, revoked
**E-sign lifecycle**: sent, completed
**Financial lifecycle**: refund requested/approved/denied, payout held/released
**Affiliate lifecycle**: commission created/held/released
**Deal state**: status changed, cancelled, completed

### Idempotency Protection

When an `idempotencyKey` is provided, the event writer checks for an existing event with the same key. If found, the existing event is returned with `duplicate: true` — no new event is created. This prevents webhook retries and repeated triggers from creating duplicate events.

### Timeline Queries

```typescript
import { getEntityTimeline, getCorrelatedEvents } from '@/lib/services/event-ledger'

// Get all events for a specific deal
const dealTimeline = getEntityTimeline('DEAL', 'deal-123')

// Trace all events sharing a correlation ID
const trace = getCorrelatedEvents('corr-456')
```

### Prisma Model

The `PlatformEvent` model includes indexes on `eventType`, `entityType+entityId`, `correlationId`, `actorId`, `workspaceId`, `processingStatus`, and `createdAt` for efficient querying.

---

## System 3: Document and Identity Trust Infrastructure

### Location
`lib/services/trust-infrastructure/`

### Design

The trust infrastructure provides a canonical trust model for sensitive documents and identity artifacts. Instead of relying on loose URLs or ad hoc records, every trust-sensitive document and identity is governed through explicit version control, hash integrity, verification status, and revocation tracking.

### Document Trust Model

Each document trust record tracks:
- **Ownership**: `ownerEntityId`, `ownerEntityType` (BUYER, DEALER, DEAL, etc.)
- **Classification**: `documentType` (CONTRACT, EXTERNAL_PREAPPROVAL, CMA_EVIDENCE, etc.)
- **Storage**: `storageSource`, `storageReference` (wraps current external URL usage safely)
- **Integrity**: `fileHash` for tamper detection
- **Versioning**: `versionNumber` with automatic supersession chain
- **Status lifecycle**: UPLOADED → SCANNED → VERIFIED → APPROVED → LOCKED / SUPERSEDED / REVOKED / EXPIRED
- **Verification**: `verifierId`, `verifiedAt`, `verificationMetadata`
- **Decision governance**: `activeForDecision` boolean
- **Access control**: `accessScope` (PUBLIC, OWNER_ONLY, DEAL_PARTIES, ADMIN_ONLY, SYSTEM_ONLY)

### Document Version Control

When a new version of a document is uploaded for the same owner/type:
1. Previous active version is marked `SUPERSEDED` and `activeForDecision = false`
2. `supersededById` is set on the previous version
3. New version gets `versionNumber = previous + 1` and `activeForDecision = true`

### Document Hash Integrity

The `hasDocumentHashChanged()` function allows downstream systems to detect if a document has been modified after approval. This is critical for:
- Contract Shield reliance on approved contract versions
- CMA evidence integrity
- External preapproval document validity

### Identity Trust Model

Each identity trust record tracks:
- **Entity**: `entityId`, `entityType`
- **Status**: UNVERIFIED → PENDING_VERIFICATION → VERIFIED / FAILED / SUSPENDED / REVOKED
- **Verification**: `verificationSource` (MANUAL_ADMIN, KYC_PROVIDER, KYB_PROVIDER, etc.)
- **Risk assessment**: `trustFlags`, `riskFlags`, `manualReviewRequired`
- **KYC/KYB**: Optional KYC and KYB status fields

### How to Consume

```typescript
import {
  createDocumentTrustRecord,
  getActiveDocumentTrust,
  hasDocumentHashChanged,
  verifyDocument,
  revokeDocument,
} from '@/lib/services/trust-infrastructure'

// Create trust record on document upload
createDocumentTrustRecord({
  ownerEntityId: dealId,
  ownerEntityType: 'DEAL',
  documentType: 'CONTRACT',
  storageSource: 'supabase',
  storageReference: storagePath,
  uploaderId: dealerUserId,
  fileHash: computedHash,
})

// Check integrity before approval
if (hasDocumentHashChanged(dealId, 'DEAL', 'CONTRACT', currentHash)) {
  // Document was modified — reject or re-scan
}
```

---

## Prisma Schema Additions

### New Models
| Model | Purpose |
|-------|---------|
| `DecisionAuditLog` | Stores decision engine resolution snapshots for audit |
| `PlatformEvent` | Canonical event ledger with idempotency key uniqueness |
| `DocumentTrustRecord` | Document trust records with version/hash/status tracking |
| `IdentityTrustRecord` | Identity trust records with verification/risk tracking |

### New Enums
| Enum | Values |
|------|--------|
| `DocumentTrustStatusEnum` | UPLOADED, SCANNED, VERIFIED, APPROVED, LOCKED, SUPERSEDED, REVOKED, EXPIRED |
| `IdentityTrustStatusEnum` | UNVERIFIED, PENDING_VERIFICATION, VERIFIED, FAILED, SUSPENDED, REVOKED |

---

## What Was Refactored vs Reused

### Reused (no changes)
- DealStatus enum and VALID_TRANSITIONS map
- PreQualification status values and source types
- ExternalPreApprovalStatus values
- ContractStatus / ManualReviewStatus / ESignStatus / PickupStatus enums
- PaymentStatus / RefundStatus / PayoutStatus / CommissionStatus enums
- All existing services, routes, and UI components
- Existing audit tables (ComplianceEvent, AdminAuditLog, etc.)

### Introduced (new)
- Decision engine service module with canonical resolvers
- Event ledger service module with idempotency protection
- Document trust service module with version control
- Identity trust service module with verification workflows
- 4 Prisma models + 2 Prisma enums
- 144 unit tests across 3 test files

---

## Operational Implications

### For Admin Dashboard
The decision engine provides canonical outputs that admin views can display:
- `complianceHoldReasonCodes` for hold reason explanation
- `decisionSourceSummary` for decision audit trail
- `manualReviewRequired` for flagging deals needing attention

### For Support/Debugging
The event ledger enables:
- Timeline reconstruction per entity (buyer, deal, contract)
- Correlation ID tracing across related events
- Understanding what happened, when, and why

### For Compliance
- Decision audit logs capture input basis and output results
- Event ledger provides immutable audit trail
- Document trust records prove version history and integrity
- Identity trust records track verification status and risk flags

---

## Remaining Known Gaps

1. **Database integration**: Current implementation uses in-memory stores for event ledger and trust records. Production deployment requires wiring to Prisma models (already defined in schema).
2. **Existing service integration**: Decision engine resolvers should be called from existing readiness/gating paths in deal.service.ts, messaging.service.ts, etc. This is the Phase 5 integration work.
3. **Admin UI components**: Timeline and decision explanation views need to be added to admin dashboards.
4. **Event emission integration**: Existing service methods need to call `writeEvent()` at key lifecycle points.
5. **Storage migration**: Document trust wraps current external URL usage; actual Supabase Storage migration for trust-sensitive artifacts can be done incrementally.
