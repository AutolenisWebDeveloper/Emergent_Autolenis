# Data Model — AutoLenis Platform

> Generated: 2026-02-19 | Read-only audit pass — no code modified.
> Source: `prisma/schema.prisma` + SQL migrations in `scripts/migrations/` and `migrations/`.

---

## Enums

| Enum | Values |
|------|--------|
| `WorkspaceMode` | LIVE, TEST |
| `UserRole` | BUYER, DEALER, ADMIN, AFFILIATE, SYSTEM_AGENT |
| `CreditTier` | EXCELLENT, GOOD, FAIR, POOR, DECLINED |
| `AuctionStatus` | PENDING_DEPOSIT, ACTIVE, CLOSED, COMPLETED, CANCELLED |
| `BestPriceType` | BEST_CASH, BEST_MONTHLY, BALANCED |
| `DealStatus` | SELECTED, FINANCING_PENDING, FINANCING_APPROVED, FEE_PENDING, FEE_PAID, INSURANCE_PENDING, INSURANCE_COMPLETE, CONTRACT_PENDING, CONTRACT_REVIEW, CONTRACT_APPROVED, SIGNING_PENDING, SIGNED, PICKUP_SCHEDULED, COMPLETED, CANCELLED |
| `InsuranceStatus` | QUOTE_REQUESTED, QUOTE_RECEIVED, POLICY_SELECTED, POLICY_BOUND, EXTERNAL_UPLOADED |
| `ContractStatus` | UPLOADED, SCANNING, ISSUES_FOUND, PASSED, FAILED |
| `ESignStatus` | CREATED, SENT, VIEWED, SIGNED, COMPLETED, DECLINED, EXPIRED |
| `PickupStatus` | SCHEDULED, CONFIRMED, BUYER_ARRIVED, COMPLETED, CANCELLED |
| `PaymentStatus` | PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED |
| `FeePaymentMethod` | CARD, LOAN_INCLUSION |
| `TransactionType` | PAYMENT, REFUND, CHARGEBACK, PAYOUT |
| `TransactionStatus` | SUCCEEDED, PENDING, FAILED |
| `NotificationPriority` | P0, P1, P2 |
| `NotificationCategory` | PAYMENT, USER, DEAL, DOC, AFFILIATE, SYSTEM, SECURITY, WEBHOOK |
| `DocumentStatus` | UPLOADED, PENDING_REVIEW, APPROVED, REJECTED |
| `DocumentRequestStatus` | REQUESTED, UPLOADED, APPROVED, REJECTED |
| `RefinanceQualificationStatus` | PENDING, QUALIFIED, DISQUALIFIED |
| `VehicleCondition` | EXCELLENT, GOOD, FAIR, POOR |
| `MarketingRestriction` | NONE, NO_CREDIT_SOLICITATION |

---

## Core Models

### Workspace

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id @default(uuid()) |
| name | String | |
| mode | WorkspaceMode | @default(LIVE) |
| createdAt | DateTime | @default(now()) |
| createdBy | String? | |

Index: `@@index([mode])`
Relations: → User[], BuyerProfile[], Dealer[], Affiliate[], Auction[], SelectedDeal[], etc.

### User

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id @default(uuid()) |
| email | String | @unique |
| passwordHash | String | |
| role | UserRole | |
| emailVerified | Boolean | @default(false) |
| isActive | Boolean | @default(true) |
| mfaEnrolled | Boolean | @default(false) |
| mfaFactorId | String? | |
| mfaSecret | String? | |
| forcePasswordReset | Boolean | @default(false) |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

Index: `@@index([email])`, `@@index([workspaceId])`
Relations: → BuyerProfile?, Dealer?, AdminUser?, Affiliate?

### BuyerProfile

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id @default(uuid()) |
| userId | String | @unique, FK → User |
| firstName | String | |
| lastName | String | |
| phone | String? | |
| dateOfBirth | DateTime? | |
| addressLine1 | String? | |
| addressLine2 | String? | |
| city | String? | |
| state | String? | |
| postalCode | String? | |
| country | String? | |
| employmentStatus | String? | |
| monthlyIncome | Decimal? | |
| creditTier | CreditTier? | |
| isAffiliate | Boolean | @default(false) |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

Relations: → User, Workspace, Auction[], Referral[]

### Dealer

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id @default(uuid()) |
| userId | String | @unique, FK → User |
| businessName | String | |
| legalName | String? | |
| licenseNumber | String | @unique |
| email | String? | |
| phone | String? | |
| addressLine1 | String? | |
| addressLine2 | String? | |
| city | String? | |
| state | String? | |
| postalCode | String? | |
| country | String? | |
| verified | Boolean | @default(false) |
| active | Boolean | @default(true) |
| integrityScore | Int? | |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

Index: `@@index([licenseNumber])`
Relations: → User, Workspace, InventoryItem[], AuctionParticipant[], DealerUser[]

### DealerUser

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id @default(uuid()) |
| userId | String | FK → User |
| dealerId | String | FK → Dealer |
| role | String | |
| createdAt | DateTime | @default(now()) |

Unique: `@@unique([userId, dealerId])`

### AdminUser

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id @default(uuid()) |
| userId | String | @unique, FK → User |
| firstName | String | |
| lastName | String | |
| role | String | |
| createdAt | DateTime | @default(now()) |

### Affiliate

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id @default(uuid()) |
| userId | String | @unique, FK → User |
| referralCode | String | @unique |
| totalEarnings | Decimal | @default(0) |
| pendingEarnings | Decimal | @default(0) |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

Relations: → User, Referral[], Click[], Commission[], Payout[], AffiliatePayment[], AffiliateDocument[]

---

## Auction System

### Auction

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id @default(uuid()) |
| buyerProfileId | String | FK → BuyerProfile |
| status | AuctionStatus | @default(PENDING_DEPOSIT) |
| bestPriceType | BestPriceType? | |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |
| closedAt | DateTime? | |

Relations: → BuyerProfile, AuctionParticipant[], AuctionOffer[], SelectedDeal?, DepositPayment?

### AuctionParticipant

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| auctionId | String | FK → Auction |
| dealerId | String | FK → Dealer |
| invitedAt | DateTime | @default(now()) |

Unique: `@@unique([auctionId, dealerId])`

### AuctionOffer

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| auctionId | String | FK → Auction |
| dealerId | String | FK → Dealer |
| inventoryItemId | String | FK → InventoryItem |
| cashPrice | Decimal? | |
| monthlyPayment | Decimal? | |
| submittedAt | DateTime | @default(now()) |

Relations: → Auction, Dealer, InventoryItem, AuctionOfferFinancingOption[]

### AuctionOfferFinancingOption

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| offerId | String | FK → AuctionOffer |
| apr | Decimal | |
| termMonths | Int | |
| monthlyPayment | Decimal | |
| downPayment | Decimal? | |

---

## Deal / Financing

### SelectedDeal

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| buyerProfileId | String | FK → BuyerProfile |
| auctionId | String | FK → Auction |
| offerId | String | FK → AuctionOffer |
| status | DealStatus | @default(SELECTED) |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |
| updatedAt | DateTime | @updatedAt |

Relations: → BuyerProfile, Auction, AuctionOffer, FinancingOffer?, ServiceFeePayment?, InsuranceQuote[], InsurancePolicy?, ContractDocument[], ContractShieldScan[], ESignEnvelope?, PickupAppointment?

### FinancingOffer

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| dealId | String | @unique, FK → SelectedDeal |
| lenderName | String? | |
| apr | Decimal | |
| termMonths | Int | |
| monthlyPayment | Decimal | |
| downPayment | Decimal? | |
| approvedAt | DateTime? | |

### ServiceFeePayment

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| dealId | String | FK → SelectedDeal |
| amount | Decimal | |
| method | FeePaymentMethod | |
| stripePaymentIntentId | String? | |
| status | PaymentStatus | @default(PENDING) |
| paidAt | DateTime? | |

---

## Insurance

### InsuranceQuote

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| dealId | String | FK → SelectedDeal |
| provider | String | |
| premium | Decimal | |
| coverage | String? | |
| status | InsuranceStatus | |
| createdAt | DateTime | @default(now()) |

### InsurancePolicy

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| dealId | String | @unique, FK → SelectedDeal |
| provider | String | |
| policyNumber | String? | |
| premium | Decimal | |
| effectiveDate | DateTime? | |
| expirationDate | DateTime? | |
| boundAt | DateTime? | |

---

## Contract Shield (Anti-fraud)

### ContractDocument

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| dealId | String | FK → SelectedDeal |
| dealerId | String | FK → Dealer |
| fileUrl | String | |
| fileName | String | |
| uploadedAt | DateTime | @default(now()) |

### ContractShieldScan

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| dealId | String | FK → SelectedDeal |
| dealerId | String | FK → Dealer |
| status | ContractStatus | @default(UPLOADED) |
| scannedAt | DateTime? | |
| result | Json? | |

Relations: → FixListItem[], ContractShieldOverride?

### FixListItem

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| scanId | String | FK → ContractShieldScan |
| description | String | |
| severity | String | |
| resolved | Boolean | @default(false) |

### ContractShieldOverride

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| scanId | String | @unique, FK → ContractShieldScan |
| adminUserId | String | FK → User |
| reason | String | |
| overriddenAt | DateTime | @default(now()) |

---

## E-Signature

### ESignEnvelope

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| dealId | String | @unique, FK → SelectedDeal |
| externalId | String? | |
| status | ESignStatus | @default(CREATED) |
| sentAt | DateTime? | |
| signedAt | DateTime? | |
| completedAt | DateTime? | |

---

## Pickup

### PickupAppointment

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| dealId | String | @unique, FK → SelectedDeal |
| scheduledAt | DateTime | |
| status | PickupStatus | @default(SCHEDULED) |
| qrCode | String? | |
| completedAt | DateTime? | |

---

## Payment System

### DepositPayment

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| buyerId | String | |
| auctionId | String | |
| amount | Decimal | |
| stripePaymentIntentId | String? | |
| status | PaymentStatus | @default(PENDING) |
| paidAt | DateTime? | |

### PaymentMethod

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| userId | String | |
| stripePaymentMethodId | String | @unique |
| type | String | |
| last4 | String? | |
| brand | String? | |

### Transaction

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| type | TransactionType | |
| status | TransactionStatus | |
| grossAmount | Decimal | |
| netAmount | Decimal | |
| fee | Decimal? | |
| externalId | String? | |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |

### Chargeback

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| transactionId | String | FK → Transaction |
| reason | String | |
| amount | Decimal | |
| createdAt | DateTime | @default(now()) |

---

## Affiliate System

### Referral

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| affiliateId | String | FK → Affiliate |
| buyerProfileId | String? | FK → BuyerProfile |
| dealCompleted | Boolean | @default(false) |
| utmSource | String? | |
| utmMedium | String? | |
| utmCampaign | String? | |
| utmContent | String? | |
| utmTerm | String? | |
| createdAt | DateTime | @default(now()) |

### Click

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| affiliateId | String | FK → Affiliate |
| ipAddress | String? | |
| userAgent | String? | |
| createdAt | DateTime | @default(now()) |

### Commission

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| affiliateId | String | FK → Affiliate |
| referralId | String? | FK → Referral |
| amount | Decimal | |
| status | String | @default("PENDING") |
| createdAt | DateTime | @default(now()) |

### Payout

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| affiliateId | String | FK → Affiliate |
| amount | Decimal | |
| status | String | |
| paidAt | DateTime? | |
| createdAt | DateTime | @default(now()) |

### AffiliatePayment / AffiliateDocument

Linked to Affiliate via FK. Document types: W9, ID, BANK, VOIDED_CHECK, OTHER.

---

## Refinance (OpenRoad Partnership)

### RefinanceLead

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| email | String | |
| firstName | String | |
| lastName | String | |
| phone | String? | |
| currentLender | String? | |
| vehicleYear | Int? | |
| vehicleMake | String? | |
| vehicleModel | String? | |
| qualificationStatus | RefinanceQualificationStatus | @default(PENDING) |
| marketingRestriction | MarketingRestriction | @default(NONE) |
| createdAt | DateTime | @default(now()) |

### FundedLoan

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| refinanceLeadId | String | FK → RefinanceLead |
| amount | Decimal | |
| commissionAmount | Decimal | |
| fundedAt | DateTime | |

---

## AI System

### AiConversation

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| role | String | (public, buyer, dealer, affiliate, admin) |
| userId | String? | |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |

### AiMessage

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| conversationId | String | FK → AiConversation |
| sender | String | (user, assistant, system, tool) |
| content | String | |
| createdAt | DateTime | @default(now()) |

### AiAdminAction, AiToolCall, AiLead, AiSeoDraft, AiContractExtraction

Support tables for AI orchestration, tool execution logging, lead capture, SEO drafting, and contract parsing.

---

## Admin / Compliance

### AdminAuditLog

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| adminUserId | String | |
| action | String | |
| target | String? | |
| metadata | Json? | |
| createdAt | DateTime | @default(now()) |

### AdminLoginAttempt

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| email | String | |
| success | Boolean | |
| ipAddress | String? | |
| userAgent | String? | |
| createdAt | DateTime | @default(now()) |

### ComplianceEvent

| Field | Type | Constraint |
|-------|------|------------|
| id | String (uuid) | @id |
| type | String | |
| userId | String? | |
| description | String | |
| metadata | Json? | |
| workspaceId | String | FK → Workspace |
| createdAt | DateTime | @default(now()) |

### Notification

Standard notification model with priority (P0–P2) and category enums.

---

## Relationships Diagram (key FKs)

```
Workspace ─┬→ User ─┬→ BuyerProfile ─→ Auction ─→ AuctionOffer ─→ SelectedDeal
           │        ├→ Dealer ──────→ InventoryItem      │              │
           │        ├→ AdminUser                           │              ├→ FinancingOffer
           │        └→ Affiliate ──→ Referral             │              ├→ ServiceFeePayment
           │                        ├→ Click               │              ├→ InsuranceQuote/Policy
           │                        ├→ Commission          │              ├→ ContractDocument
           │                        └→ Payout              │              ├→ ContractShieldScan
           │                                               │              ├→ ESignEnvelope
           └→ Transaction, ComplianceEvent, AiConversation └──────────────└→ PickupAppointment
```

---

## Schema / Code Mismatch Notes (best effort)

| Issue | Details |
|-------|---------|
| Prisma vs Supabase runtime | Prisma schema defines the DDL, but runtime queries use Supabase client (not Prisma client). No `@prisma/client` calls at runtime. |
| `lib/db.ts` placeholder fallback | If Supabase env vars missing, returns client pointing to `placeholder.supabase.co` — schema mismatch risk at runtime |
| Legacy DealStatus values | Code includes normalizer for legacy values (PENDING_FINANCING, FINANCING_CHOSEN, INSURANCE_READY, CONTRACT_PASSED) that no longer exist in schema |
| `contact_messages` table | Created in migration 96 but not in Prisma schema — queried directly via Supabase |
| `_connection_canary` table | Created in migration 95 for health checks — not in Prisma schema |

---

## SQL Migrations Index

| File | Location | Purpose |
|------|----------|---------|
| `02-add-dealer-users-table.sql` | `migrations/` | DealerUser table |
| `03-add-missing-buyer-fields.sql` | `migrations/` | BuyerProfile additions |
| `04-add-missing-dealer-fields.sql` | `migrations/` | Dealer additions |
| `05-add-vehicle-fields.sql` | `migrations/` | Vehicle additions |
| `94-add-admin-mfa-fields.sql` | `migrations/` | MFA + audit tables |
| `95-add-connection-canary-table.sql` | `migrations/` | Health check table |
| `96-schema-alignment-fixes.sql` | `migrations/` | contact_messages + idempotent validation |
| `97-affiliate-referral-attribution.sql` | `migrations/` | UTM fields |
| `98-ai-orchestration-tables.sql` | `migrations/` | AI core tables |
| `99-ai-extended-tables.sql` | `migrations/` | AI extended tables |
| `99-ai-gemini-max-v2.sql` | `migrations/` | AI Gemini extensions |
| `02-add-rls-policies.sql` | `scripts/migrations/` | Core RLS |
| `03-add-insurance-rls-policies.sql` | `scripts/migrations/` | Insurance RLS |
| `04-add-workspace-isolation.sql` | `scripts/migrations/` | Workspace scoping |
| `05-add-workspace-to-domain-models.sql` | `scripts/migrations/` | Domain model workspace FK |
| `06-assign-system-agent-account.sql` | `scripts/migrations/` | System agent setup |
