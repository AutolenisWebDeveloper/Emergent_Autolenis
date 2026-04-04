# Supabase Master Specification — AutoLenis Platform

## Overview

This document defines the authoritative **Supabase** requirements for the full AutoLenis website and platform. It covers authentication and identity, workspace and tenant isolation, role-based access control, all domain data scopes (buyer, dealer, affiliate, admin, system-agent), storage architecture, row-level security, audit logging, payments and ledger alignment, compliance enforcement, external integrations, realtime and background workflows, operational controls, and migration/release requirements.

This spec is the binding contract between:

- Frontend applications
- Backend service layer (`lib/services/*`)
- Prisma schema (`prisma/schema.prisma`)
- Supabase Auth / Storage / RLS
- External providers (Stripe, Resend, MicroBilt, insurance, DMS, e-sign)

> **See also:** `SUPABASE_RLS_MATRIX.md`, `SUPABASE_STORAGE_POLICY.md`, `SUPABASE_ENVIRONMENT_MATRIX.md`, `SUPABASE_MIGRATION_RUNBOOK.md`, `SUPABASE_INTEGRATION_CONTRACTS.md`

---

## 1. Platform Context

AutoLenis is a full end-to-end automotive concierge platform with:

- FCRA-compliant soft pre-qualification
- Buyer vehicle discovery and shortlist
- Silent reverse auction
- Best-price ranking
- Financing selection
- Deposit and concierge-fee payments
- Insurance quoting and proof upload
- Contract Shield™ document review
- E-signature workflows
- QR-based pickup
- Affiliate attribution, commissions, and payouts
- Dealer integrity and compliance operations
- Admin governance and audit controls

---

## 2. Architectural Boundaries

| Layer | Responsibility |
|---|---|
| **Supabase Auth** | Canonical identity provider for app users, JWT claims, session management |
| **Supabase RLS** | Enforced access boundary at the database layer |
| **Supabase Storage** | Bucket hosting, signed-URL access, file metadata |
| **Supabase Realtime** | Selective subscriptions for operational status flows |
| **Supabase Edge Functions** | Bounded provider-adjacent utility tasks only |
| **Postgres** | Canonical system of record |
| **Prisma** | Application ORM contract |
| **Service Layer** | Core workflow and business logic (`lib/services/*`) |
| **External Providers** | Stripe, Resend, MicroBilt, insurance, DMS, e-sign, AI |

Supabase must **not** become an uncontrolled second business-logic layer. Core workflow logic remains in the service layer.

---

## 3. Foundational Principles

1. **Postgres is canonical** — all business data lives in Postgres
2. **Supabase Auth is the canonical identity provider** for app users
3. **Every access path must be workspace-scoped**
4. **RLS must enforce least privilege**
5. **Sensitive events must be audit-logged**
6. **External webhooks and payout/payment flows must be idempotent**
7. **No platform workflow may bypass compliance logging**
8. **All storage containing consumer or contract data must be encrypted and access-controlled**
9. **PII collection must be minimized** to only what is operationally required
10. **Admin elevation must always be explicit, logged, and reviewable**

---

## 4. Identity & Authentication

### 4.1 Supported Principal Types

| Principal | Prisma Role Enum | Description |
|---|---|---|
| Buyer | `BUYER` | Consumer end-user |
| Dealer User | `DEALER`, `DEALER_USER` | Dealership staff |
| Affiliate | `AFFILIATE`, `AFFILIATE_ONLY` | Referral partner |
| Admin | `ADMIN` | Platform administrator |
| Super Admin | `SUPER_ADMIN` | Elevated administrator |
| Compliance Admin | `COMPLIANCE_ADMIN` | Compliance officer |
| System Agent | `SYSTEM_AGENT` | Internal automation actor |

### 4.2 Supabase Auth Requirements

Supabase Auth must support:

- Email/password authentication
- Magic-link or passwordless only if explicitly enabled by environment
- MFA for admins (enforced)
- MFA-ready capability for dealers and affiliates
- Passkey/WebAuthn compatibility for high-trust admin access
- Email verification
- Password reset
- Session invalidation
- Device/session tracking metadata

### 4.3 Required Auth Metadata / Claims

Each authenticated session must carry claims for route and RLS enforcement:

| Claim | Type | Required | Notes |
|---|---|---|---|
| `sub` | `uuid` | Yes | Supabase auth user ID |
| `user_id` | `uuid` | Yes | Application `User.id` |
| `workspace_id` | `uuid` | Yes | Active workspace |
| `workspace_mode` | `enum` | Yes | `LIVE` or `TEST` |
| `role` | `enum` | Yes | `UserRole` value |
| `role_scope` | `string` | Conditional | Scoping qualifier |
| `dealer_id` | `uuid` | Conditional | When dealer-scoped |
| `affiliate_id` | `uuid` | Conditional | When affiliate-scoped |
| `buyer_id` | `uuid` | Conditional | When buyer-scoped |
| `admin_level` | `string` | Conditional | Admin tier |
| `mfa_verified` | `boolean` | Yes | MFA completion state |
| `email_verified` | `boolean` | Yes | Email verification state |
| `account_status` | `enum` | Yes | Account lifecycle state |

### 4.4 Account Status Values

| Status | Description |
|---|---|
| `PENDING_VERIFICATION` | Awaiting email verification |
| `ACTIVE` | Fully operational |
| `SUSPENDED` | Temporarily disabled by admin action |
| `LOCKED` | Locked due to security event |
| `DISABLED` | Administratively disabled |
| `DELETED` | Soft-deleted |

### 4.5 Auth Hardening

Must include:

- Rate limiting on auth endpoints
- Brute-force protection
- IP/device anomaly logging
- Admin MFA enforcement
- Secure session rotation on privilege changes
- Forced re-authentication for sensitive actions:
  - Refund approvals
  - Payout approvals
  - Role elevation
  - Dealer suspension
  - Contract override actions

---

## 5. Workspace / Tenant Model

### 5.1 Tenancy Root

The `Workspace` model is the mandatory tenancy root. Every domain record must either contain `workspace_id` or be reachable only through a workspace-scoped parent.

Minimum fields (from Prisma schema):

| Field | Type | Constraint |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `String` | Required |
| `slug` | `String` | Unique |
| `mode` | `WorkspaceMode` | `LIVE` or `TEST` |
| `status` | `String` | Active/inactive |
| `owner_user_id` | `uuid` | FK → `User.id` |
| `settings_json` | `Json` | Default `{}` |
| `created_at` | `DateTime` | Auto-set |
| `updated_at` | `DateTime` | Auto-set |

### 5.2 Workspace Rules

- Every domain record must contain `workspaceId` or be reachable only through a workspace-scoped parent
- Cross-workspace reads/writes are forbidden
- `/test/*` and equivalent non-production flows must map to `workspace_mode = TEST`
- Affiliate, auction, payments, storage, logs, and analytics must all be workspace-bound
- `LIVE` and `TEST` workspaces must never leak data across each other

---

## 6. Core Domain Schema Requirements

The Supabase/Postgres model must support the following domains. Model names reference the Prisma schema.

### 6.1 Identity & Profiles

`User`, `BuyerProfile`, `Dealer`, `DealerUser`, `Affiliate`, `AdminUser`, `AdminSession`

### 6.2 Buyer Journey

`BuyerPreferences`, `PrequalConsentVersion`, `PrequalConsentArtifact`, `PreQualification`, `PreQualProviderEvent`, `ConsentVersion`, `ConsentArtifact`, `Shortlist`, `ShortlistItem`

### 6.3 Inventory & Vehicles

`Vehicle`, `InventoryItem`, `InventoryImportJob`, `InventoryRawSnapshot`, `InventoryVehicleSighting`, `InventoryMarketVehicle`, `InventoryVerifiedVehicle`, `InventoryPriceHistory`, `InventoryDuplicateGroup`, `InventorySourceError`, `InventoryIntelligenceJob`, `VehicleRequestCase`, `VehicleRequestItem`, `BuyerRequestInventoryMatch`, `TradeIn`

### 6.4 Auction System

`Auction`, `AuctionParticipant`, `AuctionOffer`, `AuctionOfferFinancingOption`, `AuctionOfferDecision`, `BestPriceOption`

### 6.5 Deal & Financing

`SelectedDeal`, `FinancingOffer`, `ExternalPreApproval`, `ExternalPreApprovalSubmission`, `FeeFinancingDisclosure`, `LenderFeeDisbursement`, `FundedLoan`, `DealDocument`, `DocumentRequest`

### 6.6 Insurance

`InsuranceQuote`, `InsurancePolicy`, `InsuranceDocRequest`, `InsuranceEvent`

### 6.7 Contract Shield™

`ContractDocument`, `ContractStatus`, `ContractShieldScan`, `ContractShieldOverride`, `ContractShieldRule`, `ContractShieldReconciliation`, `ContractManualReview`, `AiContractExtraction`

### 6.8 E-Sign

`ESignEnvelope`, `DocuSignConnectEvent`

### 6.9 Pickup

`PickupAppointment`

### 6.10 Affiliate System

`Affiliate`, `Referral`, `Click`, `Commission`, `Payout`, `AffiliateShareEvent`, `AffiliateDocument`

### 6.11 Payments / Finance

`DepositPayment`, `ServiceFeePayment`, `DepositRequest`, `ConciergeFeeRequest`, `PaymentMethod`, `Refund`, `Transaction`, `Chargeback`, `PaymentProviderEvent`, `FinancialAuditLog`

### 6.12 Compliance / Audit / Ops

`ComplianceEvent`, `AdminAuditLog`, `FinancialAuditLog`, `AdminLoginAttempt`, `DecisionAuditLog`, `PermissiblePurposeLog`, `EmailSendLog`, `CaseEventLog`, `PlatformEvent`, `DocuSignConnectEvent`

### 6.13 AI / Internal Orchestration

`AiConversation`, `AiMessage`, `AiToolCall`, `AiAdminAction`, `AiLead`, `AiSeoDraft`, `AiContractExtraction`

### 6.14 Security & Trust

`CircumventionAlert`, `DealProtectionEvent`, `IdentityReleaseEvent`, `MaskedPartyProfile`, `DocumentTrustRecord`, `IdentityTrustRecord`, `ConsumerAuthorizationArtifact`

---

## 7. Minimum Column Contract

### 7.1 All Domain Tables

Every business table must include:

| Column | Type | Constraint |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `workspaceId` | `uuid` | NOT NULL, FK → `Workspace.id` |
| `createdAt` | `timestamptz` | NOT NULL, default `now()` |
| `updatedAt` | `timestamptz` | NOT NULL, default `now()` |
| `createdBy` | `uuid` | Nullable, FK → `User.id` |
| `updatedBy` | `uuid` | Nullable, FK → `User.id` |
| `deletedAt` | `timestamptz` | Nullable (soft delete where applicable) |
| `status` | `enum` | Where lifecycle-driven |
| `metadata` | `jsonb` | NOT NULL, default `'{}'::jsonb` |

### 7.2 Externally-Driven Tables

Tables receiving data from external providers must also include:

| Column | Type | Constraint |
|---|---|---|
| `providerName` | `String` | Provider identifier |
| `providerReferenceId` | `String` | External reference |
| `idempotencyKey` | `String` | Unique where applicable |
| `rawPayload` | `Json` | Raw provider response |
| `processedAt` | `DateTime` | Nullable |

---

## 8. Compliance-Critical Data Requirements

### 8.1 Prequalification / Credit Compliance

The platform requires explicit consent, no-credit-impact disclosure, secure storage, and audit logs for credit inquiries. MicroBilt constraints require:

- Consumer written instructions before prequalification
- No material deviation from approved consent language/process
- Retention of reproducible consent records
- No resale of the report
- Prequalification used only for the authorized session/use case
- No credit decision from the prequalification service alone
- No disclosure of underlying report/score/creditworthiness directly to consumer beyond permitted flow constraints

**Consent schema** (`PrequalConsentVersion`, `PrequalConsentArtifact`):

| Field | Purpose |
|---|---|
| `userId` | Consenting user |
| `workspaceId` | Tenant scope |
| `consentTextVersion` | Version identifier of consent language |
| `consentHtmlSnapshot` | Rendered consent HTML |
| `consentRenderHash` | Integrity hash of rendered content |
| `captureMethod` | `WEB`, `PHONE`, `WRITTEN` (enum `ConsentCaptureMethod`) |
| `ipAddress` | Capture IP |
| `userAgent` | Browser/device |
| `capturedAt` | Timestamp |
| `reproducedPdfPath` | Immutable artifact reference |
| `providerApprovalReference` | Provider-side reference |

**Request schema** (`PreQualification`):

| Field | Purpose |
|---|---|
| `sessionId` | Request session |
| `consumerIdentityInputHash` | Hashed identity input |
| `permissiblePurpose` | Legal basis |
| `consentId` | FK → consent record |
| `providerName` | e.g. `MICROBILT` |
| `providerProduct` | Product code |
| `source` | `PreQualSource` enum |
| `status` | Request lifecycle |

**Result schema** (`PreQualification` result fields):

| Field | Purpose |
|---|---|
| `maxOtd` | Maximum out-the-door amount |
| `estimatedMonthlyLow` | Low monthly estimate |
| `estimatedMonthlyHigh` | High monthly estimate |
| `creditTier` | `CreditTier` enum |
| `decisionBand` | Decision band label |
| `resultExpirationAt` | Result validity window |
| `restrictedOutputJson` | Controlled output for consumer display |

### 8.2 Contract & E-Sign Compliance

ESIGN/UETA auditability requires:

- Immutable document hash
- Signer IP and session
- Executed timestamp
- Provider envelope IDs (`ESignEnvelope`)
- Document version chain (`ContractDocument` → `ContractShieldScan`)
- Override justification history (`ContractShieldOverride`)
- Retention class

### 8.3 Payment Compliance

Stripe-based card handling requires:

- Processor-only card custody (no raw card storage)
- Payment intent IDs
- Charge IDs
- Transfer/payout IDs
- Refund linkage (`Refund` → `DepositPayment`/`ServiceFeePayment`)
- Dispute linkage (`Chargeback`)
- Idempotency keys
- Ledger postings (`Transaction`)

### 8.4 Affiliate Compliance

| Requirement | Implementation |
|---|---|
| First-click attribution | `Referral` with immutable original anchor |
| One-year attribution window | `Click` session tracking |
| Permanent user-to-referrer linkage | `Referral.affiliateId` → `User` |
| No self-referrals | Enforced in `affiliate.service.ts` |
| Fraud monitoring | `CircumventionAlert`, fraud flags |
| Disclosure enforcement | `ComplianceEvent` logging |
| Multi-level commission accounting | `Commission` with source-deal linkage |

---

## 9. Storage Architecture

> **Full details:** `SUPABASE_STORAGE_POLICY.md`

### 9.1 Required Buckets

| Bucket | Access | Description |
|---|---|---|
| `buyer-private-documents` | Private | Buyer uploaded documents |
| `dealer-private-documents` | Private | Dealer uploaded documents |
| `contract-shield-input` | Private | Contract documents for scanning |
| `contract-shield-output` | Private | Scan results and artifacts |
| `insurance-proof` | Private | Insurance proof uploads |
| `esign-archives` | Private | Executed e-sign archives |
| `kyc-documents` | Private | KYC/identity documents |
| `admin-secure-exports` | Private | Admin data exports |
| `public-affiliate-assets` | Public | Affiliate marketing assets |
| `system-generated-artifacts` | Private | System-generated files |

### 9.2 Storage Rules

- All sensitive buckets are private by default
- Signed URLs only, time-boxed
- Path convention: `workspace/{workspace_id}/{entity_type}/{entity_id}/...`
- Upload validation: content-type, extension allowlist, size caps
- Hash generation on upload
- Immutable version references for legal artifacts

---

## 10. RLS Master Rules

> **Full matrix:** `SUPABASE_RLS_MATRIX.md`

### 10.1 Baseline

RLS must be enabled on **all** user-facing domain tables.

### 10.2 Access Classes

| Principal | Access Scope |
|---|---|
| **Buyer** | Own profile, preferences, prequal records, shortlist, auctions (created/participant), surfaced offers, selected deals, insurance records, contract/e-sign records, pickup appointments, affiliate dashboard, payout records |
| **Dealer User** | Own dealership, dealer-scoped inventory, invited auctions, own offers, contract uploads/fix lists, pickups, scorecards |
| **Affiliate** | Own profile, referral links, click/conversion aggregates, commissions/payouts, assets |
| **Admin** | Per admin level and scope, always workspace-constrained unless super-admin cross-workspace review (explicitly logged) |

### 10.3 Policy Pattern

Every RLS policy must check:

1. Authenticated user exists
2. Workspace match
3. Role match
4. Ownership or membership match
5. Object lifecycle status (where applicable)

### 10.4 Backend-Only Tables

The following must never be directly readable from the browser (service-role only):

- Raw provider responses / `rawPayload` fields
- Webhook event payloads (`PaymentProviderEvent`, `DocuSignConnectEvent`)
- Full audit logs (`AdminAuditLog`, `FinancialAuditLog`)
- Financial ledger internals (`Transaction` detail)
- Internal scoring formulas
- Fraud flags (`CircumventionAlert`)
- Admin override internals (`ContractShieldOverride`)
- Service-role integration credentials
- Raw credit bureau payloads
- Full KYC results

---

## 11. Realtime Requirements

Use Supabase Realtime selectively for:

| Channel | Purpose |
|---|---|
| Auction countdown | Buyer auction timer and offer arrival summaries |
| Dealer auction invite | Dealer invite status updates |
| Contract Shield status | Scan progression notifications |
| E-sign completion | Signature completion status |
| Pickup check-in | State change notifications |
| Admin alerts | Failure and escalation notifications |

**Rule:** Never broadcast sensitive raw payloads over realtime channels.

---

## 12. Payments & Ledger Requirements

### 12.1 Deposit Payment Rules

- `$99` deposit record required before auction activation (`AuctionStatus.PENDING_DEPOSIT` → `ACTIVE`)
- Refund outcomes: no offers received, approved exception path, dispute/admin rule path
- Auction cannot move to `ACTIVE` without valid deposit state unless explicitly admin-overridden and logged

### 12.2 Service Fee Rules

- Tiered fee values must be configurable
- Deposit credit applied to fee balance
- Direct-card payment (`CARD`) and financed-fee path (`LOAN_INCLUSION`) both supported
- Financed-fee path requires stored disclosure acceptance (`FeeFinancingDisclosure`)

### 12.3 Financial Ledger

The `Transaction` model is the universal ledger for:

| Transaction Type | Source |
|---|---|
| `PAYMENT` | Deposit payments, service fee charges |
| `REFUND` | Refund reversals |
| `CHARGEBACK` | Dispute resolution |
| `PAYOUT` | Affiliate payout accruals/releases |

No financial status may exist only as a derived UI field.

---

## 13. Contract Shield™ Requirements

Contract Shield is a gated compliance engine. Required data support:

| Stage | Models | Purpose |
|---|---|---|
| Ingestion | `ContractDocument` | Document upload and metadata |
| Scanning | `ContractShieldScan` | OCR/parse with versioned rules |
| Rules | `ContractShieldRule` | State-specific fee/term rules |
| Issues | `ContractShieldScan` results | Category and severity classification |
| Remediation | `ContractManualReview` | Dealer remediation cycle |
| Override | `ContractShieldOverride` | Admin override with justification |
| Reconciliation | `ContractShieldReconciliation` | Reconciliation records |
| Gate | `ContractStatus` | Final pass/fail before signing |

---

## 14. Dealer Operations Requirements

| Domain | Models |
|---|---|
| Onboarding | `DealerApplication`, `Dealer` |
| Compliance | `ComplianceEvent`, `DealerLifecycleEvent` |
| Users & roles | `DealerUser` with permissions |
| Documents | `DocumentTrustRecord`, `DocumentRequest` |
| Inventory | `InventoryItem`, `InventoryImportJob`, DMS feed references |
| Scorecards | Dealer metrics (computed) |
| Auction history | `AuctionParticipant`, `AuctionOffer` |
| Violations | `CircumventionAlert`, `DealProtectionEvent` |

---

## 15. Affiliate System Requirements

| Requirement | Implementation |
|---|---|
| Automatic buyer enrollment | Buyer → Affiliate on qualifying event |
| Public signup | Affiliate registration flow |
| Unique links/pages | `Referral` with unique codes |
| First-click attribution | Immutable once qualified |
| Permanent referral connection | `Referral.affiliateId` immutable |
| 5-level commission tree | `Commission` with depth tracking, max depth 5 |
| Clearing periods | Payout hold before release |
| Fraud detection | `CircumventionAlert`, no self-referrals |
| Admin payout controls | `Payout` with admin approval workflow |
| No self-referral payment | Enforced in `affiliate.service.ts` |
| Payout hold/freeze | `PayoutStatus` lifecycle |
| Exportable records | `Payout` with complete audit trail |

---

## 16. Admin / Audit / Governance

### 16.1 Required Admin Entities

`AdminSetting`, `AdminAuditLog`, `AdminNotification`, `CaseNote`, `CircumventionAlert`

### 16.2 Required Audit Events

Every one of the following must produce audit records:

- Login / logout / MFA success/failure
- Role changes
- Workspace changes
- Prequal request and result creation
- Auction creation and close
- Offer submit/edit/withdraw
- Best-price selection
- Financing selection
- Deposit and fee payment events
- Refund approval/denial
- Contract scan pass/fail
- Contract override
- E-sign completion
- Pickup completion
- Commission creation/reversal
- Payout approval/release/failure
- Data export
- Admin bulk actions

---

## 17. Data Retention & Deletion

| Retention Class | Duration | Applies To |
|---|---|---|
| `SHORT_OPS` | 90 days | Transient operational logs, session data |
| `COMPLIANCE_2Y` | 2 years | Compliance events, access logs |
| `COMMUNICATION_3Y` | 3 years | Email logs, SMS logs, notifications |
| `FINANCIAL_7Y` | 7 years | Transactions, payments, refunds, payouts |
| `CONTRACT_10Y` | 10 years | Contracts, e-sign archives, legal documents |
| `PERMANENT_AUDIT` | Indefinite | Admin audit logs, consent artifacts, financial audit logs |

### Deletion Rules

- Hard delete only for non-regulated transient records
- Soft delete (`deletedAt`) for user-facing entities
- Legal records archived, not deleted
- GDPR/CCPA requests must route through policy engine that preserves records required by law

---

## 18. Performance / Indexing Requirements

### 18.1 Required Index Classes

| Index Pattern | Purpose |
|---|---|
| `(workspaceId, createdAt DESC)` | Workspace-scoped chronological queries |
| `(workspaceId, status)` | Workspace-scoped status filtering |
| `(dealerId, status)` | Dealer-scoped status queries |
| `(buyerId, status)` | Buyer-scoped status queries |
| `(auctionId, createdAt)` | Auction-scoped chronological queries |
| `(selectedDealId)` | Deal lookups |
| `(affiliateId, payoutStatus)` | Affiliate payout queries |
| `(providerName, providerReferenceId)` | Unique where applicable |
| `(idempotencyKey)` | Unique where applicable |

### 18.2 Partitioning / Archival Candidates

- Audit logs (`AdminAuditLog`, `FinancialAuditLog`)
- Webhook events (`PaymentProviderEvent`, `DocuSignConnectEvent`)
- Referral clicks (`Click`)
- Email/SMS logs (`EmailSendLog`)
- Transactions (`Transaction`)

---

## 19. Environment & Secrets

> **Full matrix:** `SUPABASE_ENVIRONMENT_MATRIX.md`

### 19.1 Key Separation Rules

| Secret / Key | Scope |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client-safe, per environment |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-safe, per environment |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only — never in browser bundles |
| Stripe keys | Backend only |
| Resend keys | Backend only |
| MicroBilt credentials | Backend only |
| E-sign provider secrets | Backend only |
| Cron / webhook secrets | Backend only |

---

## 20. Migration Rules

> **Full runbook:** `SUPABASE_MIGRATION_RUNBOOK.md`

Every schema change must:

1. Be implemented in Prisma migration
2. Include RLS policy migration where applicable
3. Include seed/update scripts for enums and settings
4. Include backward-compatibility handling
5. Include rollback plan
6. Include test coverage for permissions and workflow invariants

---

## 21. Release Gating Requirements

A release touching Supabase or schema is **not production-ready** unless all of the following pass:

- [ ] Prisma validate
- [ ] Migration apply in staging
- [ ] RLS tests
- [ ] Service-role boundary tests
- [ ] Auth/session tests
- [ ] Payment webhook idempotency tests
- [ ] Auction lifecycle tests
- [ ] Affiliate commission tests
- [ ] Contract Shield gate tests
- [ ] Signed URL storage tests
- [ ] Admin audit log assertion tests

---

## 22. Non-Negotiable Gaps To Close

| # | Gap | Status |
|---|---|---|
| 1 | Provider-hardening for insurance and e-sign | Open |
| 2 | Deeper payment and Contract Shield test coverage | Open |
| 3 | Global rate limiting beyond admin auth | Open |
| 4 | Indexing and archival strategy for high-volume tables | Open |
| 5 | Finalized state-fee compliance matrix | Open |
| 6 | Immutable consent evidence for prequal | Open |
| 7 | Strict storage-bucket governance with malware scanning | Open |
| 8 | Explicit service-role boundary documentation | Open |
| 9 | Production-ready affiliate fraud rules | Open |
| 10 | Finalized retention policy map | Open |

---

## 23. Acceptance Criteria

The Supabase layer is complete only when all of the following are true:

- [ ] Every protected table has RLS enabled and tested
- [ ] Every domain record is workspace-scoped
- [ ] Buyer, dealer, affiliate, and admin access paths are isolated correctly
- [ ] Auth claims include role and workspace context
- [ ] Storage buckets exist with signed-URL-only private access where required
- [ ] Prequalification consent is stored in a reproducible, audit-safe form
- [ ] Stripe webhook processing is idempotent
- [ ] Contract documents are versioned and hash-tracked
- [ ] Affiliate attribution is first-click and permanently linked after qualification
- [ ] All sensitive actions generate audit records
- [ ] Refunds, payouts, and overrides are admin-reviewed and logged
- [ ] `LIVE` and `TEST` workspaces cannot leak data across each other
- [ ] Staging migrations and RLS tests pass without manual bypasses
