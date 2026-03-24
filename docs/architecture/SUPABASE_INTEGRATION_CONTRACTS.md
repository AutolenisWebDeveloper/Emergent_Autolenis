# Supabase Integration Contracts — AutoLenis Platform

## Overview

This document defines the **external integration data contracts** for all third-party providers that interact with the AutoLenis Supabase/Postgres data layer. Each integration must comply with the idempotency, audit, and workspace-isolation requirements defined in `SUPABASE_MASTER_SPEC.md`.

All integrations use **Stripe** for payments, **Resend** for email, and provider-specific APIs for credit, insurance, DMS, and e-sign. No alternative providers may be introduced without explicit approval.

---

## 1. Integration Principles

1. **Idempotency is mandatory** — every webhook handler and external write must be replay-safe
2. **Workspace-scoped** — all integration records must carry `workspaceId`
3. **Audit-linked** — every external event must be traceable to an audit log entry
4. **Provider payloads stored** — raw payloads stored for debugging and compliance (redacted where needed)
5. **Failure-resilient** — integration failures must be logged, retried, and surfaced to admin
6. **No secrets in payloads** — credentials must never appear in stored payloads or logs

---

## 2. Stripe — Payments & Payouts

### 2.1 Integration Scope

| Capability | Stripe Object | Platform Model |
|---|---|---|
| Deposit payment | Checkout Session, Payment Intent | `DepositPayment`, `DepositRequest` |
| Service fee payment | Checkout Session, Payment Intent | `ServiceFeePayment`, `ConciergeFeeRequest` |
| Refund | Refund | `Refund` |
| Dispute | Dispute | `Chargeback` |
| Affiliate payout | Transfer, Payout | `Payout` |
| Webhook events | Event | `PaymentProviderEvent` |

### 2.2 Required Data Fields

| Field | Type | Source | Description |
|---|---|---|---|
| `stripeSessionId` | `String` | Stripe | Checkout session ID |
| `stripePaymentIntentId` | `String` | Stripe | Payment intent ID |
| `stripeChargeId` | `String` | Stripe | Charge ID |
| `stripeRefundId` | `String` | Stripe | Refund ID |
| `stripeDisputeId` | `String` | Stripe | Dispute ID |
| `stripeTransferId` | `String` | Stripe | Transfer ID (payouts) |
| `stripePayoutId` | `String` | Stripe | Payout ID |
| `stripeEventId` | `String` | Stripe | Event ID (webhook) |
| `idempotencyKey` | `String` | Platform | Unique per operation |

### 2.3 Webhook Contract

| Webhook Event | Handler Action | Idempotency Check |
|---|---|---|
| `checkout.session.completed` | Create/update deposit or service fee payment | Check `stripeSessionId` not already processed |
| `payment_intent.succeeded` | Confirm payment | Check `stripePaymentIntentId` not already processed |
| `payment_intent.payment_failed` | Mark payment failed | Check `stripePaymentIntentId` status |
| `charge.refunded` | Create refund record | Check `stripeRefundId` not already processed |
| `charge.dispute.created` | Create chargeback record | Check `stripeDisputeId` not already processed |
| `charge.dispute.closed` | Update chargeback resolution | Check dispute status |
| `payout.paid` | Confirm affiliate payout | Check `stripePayoutId` not already processed |
| `payout.failed` | Mark payout failed | Check `stripePayoutId` status |

### 2.4 Webhook Security

- Signature verification via `STRIPE_WEBHOOK_SECRET`
- Replay protection via `stripeEventId` uniqueness check in `PaymentProviderEvent`
- All webhook payloads stored in `PaymentProviderEvent.rawPayload`
- Failed webhook processing logged to `PlatformEvent`

### 2.5 Commission Reversal on Refund

When a refund or dispute occurs:

1. Identify related `Commission` records via `DepositPayment` or `ServiceFeePayment`
2. Create `Commission` reversal entries with `CANCELLED` status
3. Update `Payout` if accrued but not yet released
4. Log reversal in `FinancialAuditLog`
5. All steps must be atomic (within a single transaction)

---

## 3. Resend — Email Delivery

### 3.1 Integration Scope

| Capability | Resend Object | Platform Model |
|---|---|---|
| Transactional email | Email send | `EmailSendLog` |
| Email templates | Template | Template in code (`lib/email/`) |

### 3.2 Required Data Fields

| Field | Type | Description |
|---|---|---|
| `resendId` | `String` | Resend message ID |
| `to` | `String` | Recipient email |
| `subject` | `String` | Email subject |
| `templateName` | `String` | Template identifier |
| `status` | `String` | `SENT`, `DELIVERED`, `BOUNCED`, `FAILED` |
| `sentAt` | `DateTime` | Send timestamp |
| `workspaceId` | `uuid` | Workspace scope |
| `entityType` | `String` | Related entity type |
| `entityId` | `uuid` | Related entity ID |

### 3.3 Rules

- All emails must use Resend — no alternative email vendors
- Email content must not contain raw secrets or full PII
- Bounce/failure events must be logged
- `TEST` workspace emails must use sandbox or suppressed delivery
- Email logs retained per `COMMUNICATION_3Y` retention class

---

## 4. MicroBilt — Credit Prequalification

### 4.1 Integration Scope

| Capability | Provider Product | Platform Model |
|---|---|---|
| Soft prequalification | MicroBilt prequalification products | `PreQualification` |
| Consent evidence | — | `PrequalConsentVersion`, `PrequalConsentArtifact` |
| Provider events | — | `PreQualProviderEvent` |
| Permissible purpose | — | `PermissiblePurposeLog` |

### 4.2 Required Data Fields

| Field | Type | Description |
|---|---|---|
| `providerName` | `String` | `MICROBILT` |
| `providerProduct` | `String` | Product code (e.g., prequalification product ID) |
| `bureau` | `String` | Credit bureau used |
| `costBasis` | `Decimal` | Per-inquiry cost |
| `credentialingStatus` | `String` | Active/pending |
| `permissiblePurpose` | `String` | Legal basis for inquiry |
| `consentId` | `uuid` | FK → `PrequalConsentVersion` |
| `requestPayloadRedacted` | `Json` | Redacted request (no raw SSN/DOB) |
| `responsePayloadRedacted` | `Json` | Redacted response |
| `rawPayload` | `Json` | Full response (backend-only, never browser-accessible) |

### 4.3 Compliance Requirements

- Consumer written instructions (consent) must be captured **before** any inquiry
- Consent must be reproducible (HTML snapshot, render hash, PDF artifact)
- No resale of the credit report
- No credit decision from prequalification alone
- No disclosure of raw score/creditworthiness to consumer beyond permitted output
- Inquiry used only for the authorized session/use case
- All requests and responses must be audit-logged

### 4.4 Data Isolation

- `PreQualProviderEvent.rawPayload` is **service-role only** — never exposed to browser
- Consumer-facing output limited to `PreQualification` result fields (`maxOtd`, `estimatedMonthlyLow`, `estimatedMonthlyHigh`, `creditTier`)
- Raw credit data retained per `FINANCIAL_7Y` retention class

---

## 5. Insurance — Quoting & Binding

### 5.1 Integration Scope

| Capability | Platform Model |
|---|---|
| Quote request | `InsuranceQuote` |
| Policy selection | `InsurancePolicy` |
| Proof upload | Storage: `insurance-proof` bucket |
| Events | `InsuranceEvent` |
| Document requests | `InsuranceDocRequest` |

### 5.2 Required Data Fields

| Field | Type | Description |
|---|---|---|
| `providerName` | `String` | Insurance provider |
| `providerReferenceId` | `String` | Provider quote/policy ID |
| `requestInputSnapshot` | `Json` | Input data at time of request |
| `providerResponseSet` | `Json` | Full provider response |
| `quoteExpiry` | `DateTime` | Quote validity window |
| `buyerSelection` | `Json` | Buyer's selected coverage |
| `proofUploadPath` | `String` | Storage path for proof document |
| `disclosureAcceptedAt` | `DateTime` | Buyer disclosure acceptance |
| `bindStatus` | `String` | `QUOTE_REQUESTED`, `QUOTE_RECEIVED`, `POLICY_SELECTED`, `POLICY_BOUND`, `EXTERNAL_UPLOADED` |
| `idempotencyKey` | `String` | Unique per operation |

### 5.3 Rules

- Insurance flows must include required disclosures (not legal/financial advice)
- Proof-of-insurance uploads validated and stored with metadata
- Quote expiry enforced — expired quotes must not be selectable
- All insurance events audit-logged

---

## 6. DMS / Inventory Feeds — Dealer Inventory

### 6.1 Integration Scope

| Capability | Platform Model |
|---|---|
| Feed configuration | `Dealer` (feed references) |
| Import jobs | `InventoryImportJob` |
| Raw snapshots | `InventoryRawSnapshot` |
| Source errors | `InventorySourceError` |
| Verified vehicles | `InventoryVerifiedVehicle` |

### 6.2 Required Data Fields

| Field | Type | Description |
|---|---|---|
| `providerName` | `String` | DMS/feed provider |
| `dealerId` | `uuid` | FK → `Dealer.id` |
| `syncCursor` | `String` | Pagination/sync cursor |
| `jobStatus` | `JobStatus` | `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, `DEAD_LETTER` |
| `lastSuccessAt` | `DateTime` | Last successful sync |
| `recordCount` | `Int` | Records processed |
| `errorCount` | `Int` | Records with errors |
| `errorDetails` | `Json` | Record-level sync errors |
| `idempotencyKey` | `String` | Unique per job run |

### 6.3 Rules

- Inventory sync is workspace-scoped and dealer-scoped
- Failed imports must be logged and surfaceable to admin
- Duplicate detection via `InventoryDuplicateGroup`
- Stale inventory detection and suppression via `MarketVehicleStatus`

---

## 7. E-Sign — Document Signing

### 7.1 Integration Scope

| Capability | Provider | Platform Model |
|---|---|---|
| Envelope creation | DocuSign | `ESignEnvelope` |
| Webhook events | DocuSign Connect | `DocuSignConnectEvent` |
| Document storage | — | Storage: `esign-archives` bucket |

### 7.2 Required Data Fields

| Field | Type | Description |
|---|---|---|
| `providerEnvelopeId` | `String` | DocuSign envelope ID |
| `documentPacketMapping` | `Json` | Documents in envelope |
| `signers` | `Json` | Signer list with roles |
| `routingOrder` | `Int` | Signing order |
| `status` | `ESignStatus` | `CREATED`, `SENT`, `VIEWED`, `SIGNED`, `COMPLETED`, `DECLINED` |
| `completedAt` | `DateTime` | Completion timestamp |
| `archivePath` | `String` | Storage path for executed documents |
| `documentHash` | `String` | SHA-256 of executed document |

### 7.3 Webhook Contract

| Event | Handler Action |
|---|---|
| `envelope-sent` | Update status to `SENT` |
| `envelope-delivered` | Update status to `VIEWED` |
| `envelope-signed` | Update status to `SIGNED` |
| `envelope-completed` | Update status to `COMPLETED`, archive documents |
| `envelope-declined` | Update status to `DECLINED` |

### 7.4 Rules

- Envelope IDs must be unique per workspace
- Executed documents must be archived with SHA-256 hash
- Signer IP, session, and timestamp must be recorded (ESIGN/UETA compliance)
- Document version chain must be maintained
- E-sign archives retained per `CONTRACT_10Y` retention class

---

## 8. Common Integration Patterns

### 8.1 Idempotency Pattern

Every webhook handler must follow this pattern:

```typescript
async function handleWebhook(event: ProviderEvent) {
  // 1. Verify signature
  verifySignature(event, secret);

  // 2. Check idempotency
  const existing = await db.providerEvent.findUnique({
    where: { providerEventId: event.id }
  });
  if (existing?.processedAt) {
    return { status: 'already_processed' };
  }

  // 3. Store raw event
  await db.providerEvent.upsert({
    where: { providerEventId: event.id },
    create: { ...eventData, rawPayload: event },
    update: { rawPayload: event }
  });

  // 4. Process event
  await processEvent(event);

  // 5. Mark processed
  await db.providerEvent.update({
    where: { providerEventId: event.id },
    data: { processedAt: new Date() }
  });
}
```

### 8.2 Failure Handling Pattern

```typescript
try {
  await processIntegration(data);
} catch (error) {
  // Log failure
  await db.platformEvent.create({
    data: {
      type: 'INTEGRATION_FAILURE',
      provider: providerName,
      errorMessage: error.message,
      payload: redactSecrets(data),
      workspaceId: context.workspaceId,
    }
  });

  // Surface to admin
  await adminNotification.create({
    category: 'SYSTEM',
    priority: 'P1',
    message: `Integration failure: ${providerName}`,
  });

  // Rethrow for retry infrastructure
  throw error;
}
```

---

## 9. Integration Health Monitoring

| Metric | Threshold | Action |
|---|---|---|
| Webhook processing latency | > 5 seconds | Alert |
| Webhook failure rate | > 5% in 15 minutes | Alert + admin notification |
| Integration timeout rate | > 10% in 1 hour | Alert + circuit breaker |
| Unprocessed events | > 100 pending | Alert |
| Stale inventory sync | > 24 hours since last success | Alert |

---

## 10. Verification Checklist

- [ ] Stripe webhook signature verification is active
- [ ] Stripe event IDs are checked for idempotency
- [ ] Commission reversals are atomic with refunds
- [ ] Resend is the only email provider
- [ ] Email logs are created for all sent emails
- [ ] MicroBilt consent is captured before every inquiry
- [ ] Credit raw payloads are service-role only
- [ ] Insurance quote expiry is enforced
- [ ] DMS sync failures are logged and surfaced
- [ ] E-sign document hashes are computed and stored
- [ ] E-sign archives are immutable legal records
- [ ] All integration records carry `workspaceId`
- [ ] All webhook handlers are replay-safe
- [ ] Integration failures are logged to `PlatformEvent`
- [ ] No provider secrets appear in stored payloads or logs
