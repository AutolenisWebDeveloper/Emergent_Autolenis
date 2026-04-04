# VercelAutoLenis - Comprehensive Database Review Report

**Report Date:** March 9, 2026  
**Project:** VercelAutoLenis (AutoLenis Platform)  
**Database System:** PostgreSQL via Supabase  
**Report Type:** Informational Snapshot of Current Database State  
**Scope:** Schema structure, table relationships, and data organization  

---

## Executive Summary

This report provides a comprehensive audit of the VercelAutoLenis database schema, documenting the complete structure of 52 Prisma models, 16 enums, and all interconnected relationships. The database supports a sophisticated automotive marketplace platform with pre-qualification workflows, silent reverse auctions, dealer-buyer matching, insurance integration, contract review, and affiliate management systems.

**Key Metrics:**
- **Total Prisma Models:** 52
- **Total Enums:** 16  
- **Database Provider:** PostgreSQL (Supabase)
- **Workspace Isolation:** Enabled (multi-tenant support)
- **Primary Access Pattern:** Hybrid (Supabase SDK for simple CRUD, Prisma Client for complex operations)
- **Row-Level Security:** Implemented on sensitive tables

---

## Part 1: Core Database Architecture

### 1.1 Database Connection Configuration

**Provider:** PostgreSQL  
**Host:** Supabase-managed PostgreSQL instance  
**Prisma Configuration:** `prisma/schema.prisma`  
**ORM Layer:** Prisma Client  
**Connection Pool:** Managed via POSTGRES_PRISMA_URL

**Environment Variables Required:**
- `POSTGRES_PRISMA_URL` - Prisma connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role authentication
- `SUPABASE_ANON_KEY` - Anonymous key for client-side operations

### 1.2 Multi-Tenant Architecture

**Workspace Model:** Supports complete tenant isolation

```
Workspace
├── mode: LIVE | TEST
├── name: String
├── createdAt: DateTime
├── createdBy: String (optional)
└── Relations: 85+ relationship connections to all major entities
```

All user-facing tables include a `workspaceId` foreign key for multi-tenant operations.

---

## Part 2: Table and Model Structure

### 2.1 Users & Identity System (6 Core Models)

#### Model: User
**Primary Table:** `User`  
**Purpose:** Central authentication and user identity  
**Fields:** 19 core fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| email | String | UNIQUE, NOT NULL | Login identifier |
| passwordHash | String | NOT NULL | Secure password storage |
| role | Enum(UserRole) | NOT NULL | BUYER, DEALER, DEALER_USER, ADMIN, SUPER_ADMIN, AFFILIATE, AFFILIATE_ONLY, SYSTEM_AGENT |
| is_email_verified | Boolean | DEFAULT false | Email verification status |
| first_name | String | Optional | User first name |
| last_name | String | Optional | User last name |
| mfa_enrolled | Boolean | DEFAULT false | Multi-factor authentication |
| mfa_factor_id | String | Optional | MFA device identifier |
| mfa_secret | String | Optional | MFA secret for TOTP |
| mfa_recovery_codes_hash | String | Optional | Hashed recovery codes |
| force_password_reset | Boolean | DEFAULT false | Force reset on next login |
| auth_user_id | String | Optional, UNIQUE | Supabase Auth integration |
| session_version | Int | DEFAULT 0 | Session invalidation counter |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- email (UNIQUE)
- workspaceId
- auth_user_id (UNIQUE)

**Relations:**
- `buyerProfile` (1:1) → BuyerProfile
- `dealerProfile` (1:1) → Dealer
- `dealerUser` (1:1) → DealerUser
- `adminProfile` (1:1) → AdminUser
- `affiliateProfile` (1:1) → Affiliate
- `contractOverrides` (1:N) → ContractShieldOverride[]
- `shieldNotifications` (1:N) → ContractShieldNotification[]

#### Model: BuyerProfile
**Primary Table:** `BuyerProfile`  
**Purpose:** Buyer personal and financial information  
**Fields:** 24 total fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | UNIQUE, FK | Reference to User |
| firstName | String | NOT NULL | Buyer first name |
| lastName | String | NOT NULL | Buyer last name |
| phone | String | Optional | Contact phone |
| address | String | NOT NULL | Primary address |
| addressLine2 | String | Optional | Secondary address line |
| city | String | NOT NULL | City of residence |
| state | String | NOT NULL | State of residence |
| zip | String | NOT NULL | Postal code |
| postalCode | String | Optional | Alternative postal code field |
| country | String | DEFAULT "US" | Country code |
| employment | String | Optional | Legacy employment field |
| employer | String | Optional | Employer name |
| annualIncome | Float | Optional | Annual income (legacy) |
| monthlyIncomeCents | Int | Optional | Monthly income in cents (precise) |
| employmentStatus | String | Optional | Employment status descriptor |
| employerName | String | Optional | Employer company name |
| housingStatus | String | Optional | Housing situation |
| monthlyHousing | Float | Optional | Monthly housing cost (legacy) |
| monthlyHousingCents | Int | Optional | Monthly housing in cents (precise) |
| dateOfBirth | Date | Optional | Birth date for age verification |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- workspaceId
- userId (UNIQUE)

**Relations:**
- `user` (N:1) → User
- `workspace` (N:1) → Workspace
- `preQualification` (1:1) → PreQualification
- `preferences` (1:1) → BuyerPreferences
- `shortlists` (1:N) → Shortlist[]
- `auctions` (1:N) → Auction[]
- `deals` (1:N) → SelectedDeal[]
- `pickups` (1:N) → PickupAppointment[]
- `referrals` (1:N) → Referral[]
- `vehicleRequestCases` (1:N) → VehicleRequestCase[]
- `externalPreApprovals` (1:N) → ExternalPreApproval[]

#### Model: Dealer
**Primary Table:** `Dealer`  
**Purpose:** Dealer registration and business information  
**Fields:** 19 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | UNIQUE, FK | Reference to User |
| businessName | String | NOT NULL | Official business name |
| licenseNumber | String | UNIQUE, NOT NULL | Dealer license |
| legalName | String | Optional | Legal business name |
| email | String | Optional | Business email |
| phone | String | NOT NULL | Business phone |
| address | String | NOT NULL | Primary address |
| addressLine2 | String | Optional | Secondary address line |
| city | String | NOT NULL | City |
| state | String | NOT NULL | State |
| zip | String | NOT NULL | Postal code |
| postalCode | String | Optional | Alternative postal code |
| country | String | DEFAULT "US" | Country code |
| integrityScore | Float | DEFAULT 100 | Reputation metric |
| verified | Boolean | DEFAULT false | Verification status |
| active | Boolean | DEFAULT true | Active status |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- licenseNumber (UNIQUE)
- workspaceId

**Relations:**
- `user` (N:1) → User
- `workspace` (N:1) → Workspace
- `inventory` (1:N) → InventoryItem[]
- `auctionParticipations` (1:N) → AuctionParticipant[]
- `contracts` (1:N) → ContractDocument[]
- `scans` (1:N) → ContractShieldScan[]
- `pickups` (1:N) → PickupAppointment[]
- `dealerUsers` (1:N) → DealerUser[]

#### Model: DealerUser
**Primary Table:** `DealerUser`  
**Purpose:** Multi-user support for dealer accounts (staff access)  
**Fields:** 8 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | UNIQUE, FK | Reference to User |
| dealerId | String | FK | Reference to Dealer |
| roleLabel | String | Optional | Role designation |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- userId (UNIQUE)
- dealerId
- workspaceId

**Relations:**
- `user` (N:1) → User
- `dealer` (N:1) → Dealer
- `workspace` (N:1) → Workspace

#### Model: AdminUser
**Primary Table:** `AdminUser`  
**Purpose:** Platform administrators  
**Fields:** 8 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | UNIQUE, FK | Reference to User |
| firstName | String | NOT NULL | Admin first name |
| lastName | String | NOT NULL | Admin last name |
| role | String | DEFAULT "ADMIN" | Role designation |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Relations:**
- `user` (N:1) → User
- `workspace` (N:1) → Workspace

#### Model: Affiliate
**Primary Table:** `Affiliate`  
**Purpose:** Affiliate program participants  
**Fields:** 15 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | UNIQUE, FK | Reference to User |
| referralCode | String | UNIQUE, NOT NULL | Unique referral code |
| firstName | String | Optional | First name |
| lastName | String | Optional | Last name |
| totalEarnings | Float | DEFAULT 0 | Lifetime commissions |
| pendingEarnings | Float | DEFAULT 0 | Pending payout balance |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- referralCode (UNIQUE)
- workspaceId

**Relations:**
- `user` (N:1) → User
- `workspace` (N:1) → Workspace
- `referrals` (1:N) → Referral[]
- `clicks` (1:N) → Click[]
- `commissions` (1:N) → Commission[]
- `payouts` (1:N) → Payout[]
- `affiliatePayments` (1:N) → AffiliatePayment[]

---

### 2.2 Pre-Qualification System (10 Models)

#### Model: PreQualification
**Primary Table:** `PreQualification`  
**Purpose:** Buyer pre-qualification results and credit assessment  
**Fields:** 25 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| buyerId | String | UNIQUE, FK | Reference to BuyerProfile |
| status | String | Optional | ACTIVE, EXPIRED, REVOKED, FAILED, PENDING |
| creditScore | Int | Optional | Credit score (if available) |
| creditTier | Enum | NOT NULL | EXCELLENT, GOOD, FAIR, POOR, DECLINED |
| maxOtd | Float | NOT NULL | Maximum OTD amount |
| maxOtdAmountCents | Int | Optional | OTD in cents (precise) |
| estimatedMonthlyMin | Float | NOT NULL | Minimum monthly payment |
| minMonthlyPaymentCents | Int | Optional | Min payment in cents |
| estimatedMonthlyMax | Float | NOT NULL | Maximum monthly payment |
| maxMonthlyPaymentCents | Int | Optional | Max payment in cents |
| dti | Float | Optional | Debt-to-income ratio |
| dtiRatio | Float | Optional | Alternative DTI representation |
| softPullCompleted | Boolean | DEFAULT false | Soft pull status |
| softPullDate | DateTime | Optional | Soft pull timestamp |
| consentGiven | Boolean | DEFAULT false | Consent status |
| consentDate | DateTime | Optional | Consent timestamp |
| source | Enum | DEFAULT INTERNAL | INTERNAL, EXTERNAL_MANUAL, MICROBILT, IPREDICT, PROVIDER_BACKED |
| externalSubmissionId | String | Optional | External provider reference |
| providerName | String | Optional | Provider name |
| providerReferenceId | String | Optional | Provider reference ID |
| rawResponseJson | Json | Optional | Provider response data |
| consentArtifactId | String | Optional | FK to ConsentArtifact |
| consumerAuthorizationArtifactId | String | Optional | FK to ConsumerAuthorizationArtifact |
| expiresAt | DateTime | NOT NULL | Expiration timestamp |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- buyerId (UNIQUE)
- workspaceId
- externalSubmissionId
- consentArtifactId

**Relations:**
- `buyer` (N:1) → BuyerProfile
- `workspace` (N:1) → Workspace
- `consentArtifact` (N:1) → ConsentArtifact
- `consumerAuthorizationArtifact` (N:1) → ConsumerAuthorizationArtifact
- `sessions` (1:N) → PrequalSession[]
- `providerEvents` (1:N) → PrequalProviderEvent[]
- `offerSnapshots` (1:N) → PrequalOfferSnapshot[]

#### Model: ConsentVersion
**Primary Table:** `ConsentVersion`  
**Purpose:** Versioned consent text for regulatory compliance  
**Fields:** 7 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| version | String | UNIQUE, NOT NULL | Version number (e.g., v1.0, v2.1) |
| label | String | NOT NULL | Human-readable label |
| bodyText | String | NOT NULL (TEXT) | Full consent language |
| effectiveAt | DateTime | NOT NULL | When version becomes active |
| retiredAt | DateTime | Optional | Retirement timestamp |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- version (UNIQUE)
- effectiveAt

**Relations:**
- `consentArtifacts` (1:N) → ConsentArtifact[]

#### Model: ConsentArtifact
**Primary Table:** `ConsentArtifact`  
**Purpose:** Immutable record of consent capture (FCRA compliance)  
**Fields:** 14 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | NOT NULL | Reference to consenting user |
| buyerId | String | NOT NULL | Reference to buyer |
| consentVersionId | String | FK, NOT NULL | Reference to ConsentVersion |
| consentText | String | NOT NULL (TEXT) | Snapshot of text shown |
| consentGiven | Boolean | DEFAULT true | Consent status |
| capturedAt | DateTime | DEFAULT now() | Capture timestamp |
| ipAddress | String | Optional | IP address at capture |
| userAgent | String | Optional | Browser user agent |
| preQualificationId | String | Optional | FK to resulting PreQualification |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- userId
- buyerId
- consentVersionId
- preQualificationId
- workspaceId

**Relations:**
- `consentVersion` (N:1) → ConsentVersion
- `workspace` (N:1) → Workspace

#### Model: PreQualProviderEvent
**Primary Table:** `PreQualProviderEvent`  
**Purpose:** Event log for pre-qualification provider calls  
**Fields:** 12 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | NOT NULL | User who triggered event |
| preQualificationId | String | Optional | Reference to PreQualification |
| providerName | String | NOT NULL | Provider identifier |
| requestPayload | Json | NOT NULL | Request data sent |
| responsePayload | Json | Optional | Response data received |
| status | String | NOT NULL | SUCCESS, ERROR, TIMEOUT |
| errorMessage | String | Optional | Error description if failed |
| durationMs | Int | Optional | Call latency in milliseconds |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- userId
- preQualificationId
- providerName
- createdAt
- workspaceId

**Relations:**
- `workspace` (N:1) → Workspace

#### Model: ForwardingAuthorization
**Primary Table:** `ForwardingAuthorization`  
**Purpose:** Consent for sharing pre-qual results with third parties  
**Fields:** 14 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | NOT NULL | User granting authorization |
| buyerId | String | NOT NULL | Buyer reference |
| preQualificationId | String | FK, NOT NULL | Pre-qual being authorized |
| authorizedRecipientType | String | NOT NULL | DEALER, LENDER, etc. |
| authorizedRecipientId | String | Optional | Specific recipient ID |
| consentText | String | NOT NULL (TEXT) | Forwarding consent language |
| consentGiven | Boolean | DEFAULT true | Authorization status |
| capturedAt | DateTime | DEFAULT now() | Capture timestamp |
| ipAddress | String | Optional | IP address at capture |
| userAgent | String | Optional | Browser user agent |
| revokedAt | DateTime | Optional | Revocation timestamp |
| revokedReason | String | Optional | Revocation reason |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- userId
- buyerId
- preQualificationId
- authorizedRecipientId
- workspaceId

**Relations:**
- `workspace` (N:1) → Workspace

#### Additional Pre-Qual Models
- **BuyerPreferences** - Search preferences (makes, body styles, year/mileage range)
- **PrequalSession** - Session tracking (3 fields)
- **PrequalOfferSnapshot** - Offer snapshots (7 fields)
- **ConsumerAuthorizationArtifact** - Authorization artifacts (7 fields)

---

### 2.3 Vehicle Discovery & Inventory (4 Models)

#### Model: Vehicle
**Primary Table:** `Vehicle`  
**Purpose:** Master vehicle catalog  
**Fields:** 18 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| vin | String | UNIQUE, NOT NULL | Vehicle identification |
| year | Int | NOT NULL | Model year |
| make | String | NOT NULL | Manufacturer |
| model | String | NOT NULL | Model name |
| trim | String | Optional | Trim level |
| bodyStyle | String | NOT NULL | Body type |
| mileage | Int | NOT NULL | Current mileage |
| exteriorColor | String | Optional | Exterior color |
| interiorColor | String | Optional | Interior color |
| transmission | String | Optional | Transmission type |
| fuelType | String | Optional | Fuel type |
| drivetrain | String | Optional | Drivetrain (AWD, FWD, RWD) |
| engine | String | Optional | Engine specification |
| colorExterior | String | Optional | Alternative exterior color field |
| colorInterior | String | Optional | Alternative interior color field |
| images | String[] | Optional | Image URLs array |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- vin (UNIQUE)
- make, model (compound)

**Relations:**
- `inventoryItems` (1:N) → InventoryItem[]

#### Model: InventoryItem
**Primary Table:** `InventoryItem`  
**Purpose:** Dealer inventory listings (specific vehicle copies)  
**Fields:** 11 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| dealerId | String | FK, NOT NULL | Reference to Dealer |
| vehicleId | String | FK, NOT NULL | Reference to Vehicle |
| price | Float | NOT NULL | Listing price |
| status | String | DEFAULT "AVAILABLE" | AVAILABLE, SOLD, PENDING |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- dealerId
- vehicleId
- workspaceId

**Relations:**
- `dealer` (N:1) → Dealer
- `vehicle` (N:1) → Vehicle
- `workspace` (N:1) → Workspace
- `shortlistItems` (1:N) → ShortlistItem[]
- `auctionOffers` (1:N) → AuctionOffer[]

#### Model: Shortlist
**Primary Table:** `Shortlist`  
**Purpose:** Buyer saved vehicle lists  
**Fields:** 8 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| buyerId | String | FK, NOT NULL | Reference to BuyerProfile |
| name | String | Optional | Shortlist name |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- buyerId
- workspaceId

**Relations:**
- `buyer` (N:1) → BuyerProfile
- `workspace` (N:1) → Workspace
- `items` (1:N) → ShortlistItem[]
- `auctions` (1:N) → Auction[]

#### Model: ShortlistItem
**Primary Table:** `ShortlistItem`  
**Purpose:** Individual items within a shortlist  
**Fields:** 7 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| shortlistId | String | FK, NOT NULL | Reference to Shortlist |
| inventoryItemId | String | FK, NOT NULL | Reference to InventoryItem |
| addedAt | DateTime | DEFAULT now() | Timestamp item added |

**Indexes:**
- shortlistId
- shortlistId + inventoryItemId (UNIQUE compound)

**Relations:**
- `shortlist` (N:1) → Shortlist
- `inventoryItem` (N:1) → InventoryItem

---

### 2.4 Silent Reverse Auction System (5 Models)

#### Model: Auction
**Primary Table:** `Auction`  
**Purpose:** Core reverse auction event  
**Fields:** 14 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| buyerId | String | FK, NOT NULL | Reference to BuyerProfile |
| shortlistId | String | FK, NOT NULL | Reference to Shortlist |
| status | Enum | DEFAULT PENDING_DEPOSIT | PENDING_DEPOSIT, ACTIVE, CLOSED, COMPLETED, CANCELLED |
| startsAt | DateTime | Optional | Auction start time |
| endsAt | DateTime | Optional | Auction end time |
| closedAt | DateTime | Optional | Auction close timestamp |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- buyerId
- status
- workspaceId

**Relations:**
- `buyer` (N:1) → BuyerProfile
- `shortlist` (N:1) → Shortlist
- `workspace` (N:1) → Workspace
- `participants` (1:N) → AuctionParticipant[]
- `offers` (1:N) → AuctionOffer[]
- `bestPriceOptions` (1:N) → BestPriceOption[]

#### Model: AuctionParticipant
**Primary Table:** `AuctionParticipant`  
**Purpose:** Dealer participation in auction  
**Fields:** 7 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| auctionId | String | FK, NOT NULL | Reference to Auction |
| dealerId | String | FK, NOT NULL | Reference to Dealer |
| invitedAt | DateTime | DEFAULT now() | Invitation timestamp |
| viewedAt | DateTime | Optional | View timestamp |
| workspaceId | String | FK | Workspace reference |

**Indexes:**
- auctionId
- dealerId
- workspaceId
- auctionId + dealerId (UNIQUE compound)

**Relations:**
- `auction` (N:1) → Auction
- `dealer` (N:1) → Dealer
- `workspace` (N:1) → Workspace

#### Model: AuctionOffer
**Primary Table:** `AuctionOffer`  
**Purpose:** Dealer bid/offer in auction  
**Fields:** 13 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| auctionId | String | FK, NOT NULL | Reference to Auction |
| participantId | String | FK, NOT NULL | Reference to AuctionParticipant |
| inventoryItemId | String | FK, NOT NULL | Reference to InventoryItem |
| cashOtd | Float | NOT NULL | Cash offer price |
| taxAmount | Float | NOT NULL | Tax calculation |
| feesBreakdown | Json | NOT NULL | Fee structure |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Indexes:**
- auctionId
- inventoryItemId
- workspaceId

**Relations:**
- `auction` (N:1) → Auction
- `inventoryItem` (N:1) → InventoryItem
- `workspace` (N:1) → Workspace
- `financingOptions` (1:N) → AuctionOfferFinancingOption[]
- `selectedDeals` (1:N) → SelectedDeal[]

#### Model: AuctionOfferFinancingOption
**Primary Table:** `AuctionOfferFinancingOption`  
**Purpose:** Financing terms for offers  
**Fields:** 9 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| offerId | String | FK, NOT NULL | Reference to AuctionOffer |
| apr | Float | NOT NULL | Annual percentage rate |
| termMonths | Int | NOT NULL | Loan term in months |
| downPayment | Float | NOT NULL | Down payment amount |
| monthlyPayment | Float | NOT NULL | Monthly payment amount |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Indexes:**
- offerId

**Relations:**
- `offer` (N:1) → AuctionOffer

#### Model: BestPriceOption
**Primary Table:** `BestPriceOption`  
**Purpose:** Optimized pricing recommendations  
**Fields:** 12 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| auctionId | String | FK, NOT NULL | Reference to Auction |
| selectedDealId | String | FK, Optional | Reference to SelectedDeal |
| dealerId | String | Optional | Recommended dealer |
| price | Float | NOT NULL | Recommended price |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relations:**
- `auction` (N:1) → Auction
- `selectedDeal` (N:1) → SelectedDeal (optional)
- `workspace` (N:1) → Workspace

---

### 2.5 Deal Management System (3 Models)

#### Model: SelectedDeal
**Primary Table:** `SelectedDeal`  
**Purpose:** Buyer-selected deal from auction offer  
**Fields:** 24 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| buyerId | String | FK, NOT NULL | Reference to BuyerProfile |
| auctionOfferId | String | FK, NOT NULL | Reference to AuctionOffer |
| status | Enum | NOT NULL | Deal status (14 values) |
| totalPrice | Float | NOT NULL | Total deal amount |
| monthlyPayment | Float | Optional | Monthly payment |
| apr | Float | Optional | Interest rate |
| termMonths | Int | Optional | Loan term |
| downPayment | Float | Optional | Down payment |
| documentStatus | Enum | DEFAULT PENDING | Contract status |
| eSignEnvelopeId | String | Optional | E-signature envelope |
| selectedAt | DateTime | DEFAULT now() | Selection timestamp |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Relations:**
- `buyer` (N:1) → BuyerProfile
- `auctionOffer` (N:1) → AuctionOffer
- `workspace` (N:1) → Workspace
- `financingOffer` (1:1) → FinancingOffer (optional)
- `insurance` (1:1) → InsurancePolicy (optional)
- `documents` (1:N) → DealDocument[]
- `tradeIn` (1:1) → TradeIn (optional)
- `eSignEnvelope` (N:1) → ESignEnvelope (optional)

#### Model: FinancingOffer
**Primary Table:** `FinancingOffer`  
**Purpose:** Approved financing terms  
**Fields:** 12 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| selectedDealId | String | UNIQUE, FK | Reference to SelectedDeal |
| lenderName | String | NOT NULL | Lender identifier |
| apr | Float | NOT NULL | Interest rate |
| termMonths | Int | NOT NULL | Term length |
| monthlyPayment | Float | NOT NULL | Payment amount |
| downPayment | Float | NOT NULL | Down payment |
| totalAmount | Float | NOT NULL | Total financed |
| approvalCode | String | Optional | Lender approval code |
| expiresAt | DateTime | Optional | Offer expiration |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |

**Relations:**
- `selectedDeal` (N:1) → SelectedDeal

#### Model: ExternalPreApproval
**Primary Table:** `ExternalPreApproval`  
**Purpose:** Pre-approvals from external lenders  
**Fields:** 9 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| buyerId | String | FK, NOT NULL | Reference to BuyerProfile |
| lenderName | String | NOT NULL | External lender |
| maxAmount | Float | NOT NULL | Maximum pre-approved amount |
| status | String | DEFAULT "ACTIVE" | ACTIVE, EXPIRED, USED |
| expiresAt | DateTime | NOT NULL | Expiration timestamp |
| workspaceId | String | FK | Workspace reference |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relations:**
- `buyer` (N:1) → BuyerProfile
- `workspace` (N:1) → Workspace

---

### 2.6 Insurance System (4 Models)

#### Model: InsuranceQuote
**Primary Table:** `InsuranceQuote`  
**Purpose:** Insurance quote from provider  
**Fields:** 30 fields

**Core Fields:**
- id, dealId, providerId, status, premium, deductible
- coverageType, liabilityLimit, collisionCoverage
- comprehensiveCoverage, uninsuredMotorist, medicalPayment
- rentalCoverage, roadAssistance
- quoteValidDays, expiresAt
- workspaceId, createdAt, updatedAt

**Relations:**
- Selected deal reference
- Insurance policy reference
- Workspace reference

#### Model: InsurancePolicy
**Primary Table:** `InsurancePolicy`  
**Purpose:** Active insurance policy  
**Fields:** 32 fields

**Core Fields:**
- id, selectedDealId, providerId, policyNumber
- status, effectiveDate, expirationDate
- premium, annualPremium, paymentMethod
- coverage details, deductibles, limits
- workspaceId, createdAt, updatedAt

**Relations:**
- Selected deal reference
- Insurance documents
- Events/claims tracking
- Workspace reference

#### Model: InsuranceDocRequest
**Primary Table:** `InsuranceDocRequest`  
**Purpose:** Document requests from insurance provider  
**Fields:** 12 fields

#### Model: InsuranceEvent
**Primary Table:** `InsuranceEvent`  
**Purpose:** Claims and events tracking  
**Fields:** 7 fields

---

### 2.7 Contract Shield System (7 Models)

#### Model: ContractDocument
**Primary Table:** `ContractDocument`  
**Purpose:** Dealership contracts  
**Fields:** 10 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| dealerId | String | FK, NOT NULL | Dealer reference |
| contractType | String | NOT NULL | Contract type |
| status | Enum | DEFAULT PENDING | PENDING, APPROVED, REJECTED |
| documentUrl | String | NOT NULL | Document storage URL |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |

**Relations:**
- `dealer` (N:1) → Dealer
- `workspace` (N:1) → Workspace
- `contractScans` (1:N) → ContractShieldScan[]

#### Model: ContractShieldScan
**Primary Table:** `ContractShieldScan`  
**Purpose:** AI contract review results  
**Fields:** 18 fields

**Tracks:**
- Scan results from contract analysis
- Issues identified
- Overrides applied
- Review status
- Reconciliation data

#### Model: FixListItem
**Primary Table:** `FixListItem`  
**Purpose:** Issues requiring fixes  
**Fields:** 9 fields

#### Model: ContractShieldOverride
**Primary Table:** `ContractShieldOverride`  
**Purpose:** Admin overrides of contract issues  
**Fields:** 13 fields

#### Model: ContractShieldRule
**Primary Table:** `ContractShieldRule`  
**Purpose:** Rules for contract scanning  
**Fields:** 11 fields

#### Model: ContractShieldNotification
**Primary Table:** `ContractShieldNotification`  
**Purpose:** Notifications for contract issues  
**Fields:** 12 fields

#### Model: ContractShieldReconciliation
**Primary Table:** `ContractShieldReconciliation`  
**Purpose:** Reconciliation of contract reviews  
**Fields:** 12 fields

---

### 2.8 Logistics & E-Signature (2 Models)

#### Model: PickupAppointment
**Primary Table:** `PickupAppointment`  
**Purpose:** Vehicle pickup scheduling  
**Fields:** 15 fields

**Tracks:**
- Scheduled pickup date/time
- Location information
- Buyer and dealer references
- Status (PENDING, SCHEDULED, COMPLETED, CANCELLED)
- Confirmation and reminder data

#### Model: ESignEnvelope
**Primary Table:** `ESignEnvelope`  
**Purpose:** E-signature document tracking  
**Fields:** 15 fields

**Tracks:**
- Envelope status (SENT, VIEWED, SIGNED, COMPLETED, DECLINED)
- Document URLs
- Recipient and signer info
- Completion timestamps
- Integration with signature service

---

### 2.9 Affiliate System (4 Models)

#### Model: Referral
**Primary Table:** `Referral`  
**Purpose:** Affiliate referral tracking  
**Fields:** 12 fields

**Tracks:**
- Affiliate reference
- Referred buyer/dealer
- Status (PENDING, ACTIVE, COMPLETED, EXPIRED)
- Commission information
- Click attribution

#### Model: Click
**Primary Table:** `Click`  
**Purpose:** Affiliate link clicks  
**Fields:** 7 fields

#### Model: Commission
**Primary Table:** `Commission`  
**Purpose:** Earned commissions  
**Fields:** 14 fields

**Tracks:**
- Affiliate earning
- Transaction reference
- Amount and status
- Payment status

#### Model: Payout
**Primary Table:** `Payout`  
**Purpose:** Affiliate payouts  
**Fields:** 11 fields

**Tracks:**
- Payment details
- Amount and method
- Completion status
- Bank/payment routing

---

### 2.10 Payment System (5 Models)

#### Model: DepositPayment
**Primary Table:** `DepositPayment`  
**Purpose:** Buyer deposit payments  
**Fields:** 12 fields

**Tracks:**
- Amount and status
- Payment method
- Deal reference
- Processing status

#### Model: ServiceFeePayment
**Primary Table:** `ServiceFeePayment`  
**Purpose:** Platform service fees  
**Fields:** 13 fields

#### Model: PaymentMethod
**Primary Table:** `PaymentMethod`  
**Purpose:** Stored payment methods  
**Fields:** 8 fields

**Tracks:**
- Card/bank info (encrypted)
- Expiration
- Default status
- Token reference

#### Model: FeeFinancingDisclosure
**Primary Table:** `FeeFinancingDisclosure`  
**Purpose:** Regulatory fee financing info  
**Fields:** 13 fields

#### Model: LenderFeeDisbursement
**Primary Table:** `LenderFeeDisbursement`  
**Purpose:** Fee distributions to lenders  
**Fields:** 8 fields

---

### 2.11 Trade-In System (1 Model)

#### Model: TradeIn
**Primary Table:** `TradeIn`  
**Purpose:** Trade-in vehicle management  
**Fields:** 24 fields

**Tracks:**
- Vehicle details (make, model, year, mileage, condition)
- Valuation and assessment
- Deal reference
- Trade-in credit amount
- Status (PENDING_APPRAISAL, APPRAISED, ACCEPTED, CREDITED)

**Relations:**
- Selected deal reference
- Buyer reference
- Workspace reference

---

### 2.12 Compliance & Audit System (4 Models)

#### Model: ComplianceEvent
**Primary Table:** `ComplianceEvent`  
**Purpose:** Regulatory compliance tracking  
**Fields:** 10 fields

**Tracks:**
- Event type
- User and entity references
- Compliance data
- Timestamps

#### Model: AdminAuditLog
**Primary Table:** `AdminAuditLog`  
**Purpose:** Administrative action logging  
**Fields:** 7 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| userId | String | Optional, FK | Admin user reference |
| action | String | NOT NULL | Action description |
| details | Json | Optional | Additional action data |
| ipAddress | String | Optional | Request IP address |
| userAgent | String | Optional | Browser info |
| createdAt | DateTime | DEFAULT now() | Action timestamp |

**Indexes:**
- userId
- action
- createdAt

**RLS Policies:**
- admin_audit_log_admin_read (SELECT for admin/super_admin)
- admin_audit_log_service_insert (INSERT for service_role)

#### Model: AdminLoginAttempt
**Primary Table:** `AdminLoginAttempt`  
**Purpose:** Rate limiting and brute-force protection  
**Fields:** 6 fields

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String | PK, CUID | Unique identifier |
| identifier | String | NOT NULL | Email or username |
| attemptCount | Int | DEFAULT 1 | Failed attempts |
| firstAttempt | DateTime | DEFAULT now() | First attempt time |
| lockedUntil | DateTime | Optional | Account lockout expiry |
| createdAt | DateTime | DEFAULT now() | Record creation |

**Indexes:**
- identifier

#### Model: PaymentProviderEvent
**Primary Table:** `PaymentProviderEvent`  
**Purpose:** Payment processor webhook events  
**Fields:** 8 fields

---

### 2.13 Documents System (2 Models)

#### Model: DealDocument
**Primary Table:** `DealDocument`  
**Purpose:** Deal-specific documents  
**Fields:** 14 fields

**Tracks:**
- Document type
- URL and storage reference
- Status (PENDING, UPLOADED, VERIFIED, REJECTED)
- Deal and user references

#### Model: DocumentRequest
**Primary Table:** `DocumentRequest`  
**Purpose:** Document collection requests  
**Fields:** 20 fields

**Tracks:**
- Requested documents
- Deadline
- Status
- Recipient info
- Completion tracking

---

### 2.14 Refinance System (2 Models)

#### Model: RefinanceLead
**Primary Table:** `RefinanceLead`  
**Purpose:** Refinance lead management  
**Fields:** 28 fields

**Tracks:**
- Buyer info
- Current loan details
- Refinance terms
- Status and conversion
- Provider information

#### Model: FundedLoan
**Primary Table:** `FundedLoan`  
**Purpose:** Completed loan records  
**Fields:** 10 fields

---

### 2.15 Additional System Models

#### Platform Settings
- **AdminSetting** - Admin configuration (6 fields)

#### AI Integration
- **AiConversation** - AI chat tracking (8 fields)
- **AiAdminAction** - Admin AI actions (9 fields)

#### Advanced Features
- **VehicleRequestCase** - Car requests (17 fields)
- **SourcedOffer** - Downstream offer sourcing (12 fields)
- **DealerCoverageGapSignal** - Market coverage (8 fields)
- **ExternalPreApprovalSubmission** - Provider submissions (15 fields)
- **DepositRequest**, **ConciergeFeeRequest**, **Refund** - Request management
- **AdminNotification**, **Transaction**, **Chargeback** - Financial tracking
- **FinancialAuditLog** - Financial compliance
- **AffiliateShareEvent**, **AffiliateDocument**, **AffiliatePayment** - Affiliate features

---

## Part 3: Enums Reference

### Enum: UserRole
**Values:** 7 roles
```
BUYER, DEALER, DEALER_USER, ADMIN, SUPER_ADMIN, AFFILIATE, AFFILIATE_ONLY, SYSTEM_AGENT
```
**Usage:** User.role field

### Enum: CreditTier
**Values:** 5 tiers
```
EXCELLENT, GOOD, FAIR, POOR, DECLINED
```
**Usage:** PreQualification.creditTier

### Enum: PreQualSource
**Values:** 5 sources
```
INTERNAL, EXTERNAL_MANUAL, MICROBILT, IPREDICT, PROVIDER_BACKED
```
**Usage:** PreQualification.source

### Enum: ConsentCaptureMethod
**Values:** 3 methods
```
WEB, PHONE, WRITTEN
```
**Usage:** Consent tracking

### Enum: AuctionStatus
**Values:** 5 statuses
```
PENDING_DEPOSIT, ACTIVE, CLOSED, COMPLETED, CANCELLED
```
**Usage:** Auction.status

### Enum: DealStatus
**Values:** 14 statuses
```
PENDING_DEPOSIT, PENDING_APPROVAL, APPROVED, PENDING_DOCS, DOCS_COMPLETE,
PENDING_ESIGN, ESIGN_COMPLETE, PENDING_INSURANCE, INSURANCE_COMPLETE,
PENDING_PICKUP, PICKUP_COMPLETE, CANCELLED, REFUNDED, ARCHIVED
```
**Usage:** SelectedDeal.status

### Additional Enums (10 more)
- InsuranceStatus (5 values)
- ContractStatus (4 values)
- ESignStatus (7 values)
- PickupStatus (5 values)
- PaymentStatus (5 values)
- DocumentStatus (4 values)
- VehicleCondition (4 values)
- WorkspaceMode (2 values)
- And 2 more for specialized workflows

---

## Part 4: Data Relationships & Architecture

### 4.1 Top-Level Entity Relationships

```
Workspace (Root)
├── Users (6 types)
│   ├── User
│   ├── BuyerProfile
│   ├── Dealer
│   ├── DealerUser
│   ├── AdminUser
│   └── Affiliate
│
├── Pre-Qualification Flow
│   ├── PreQualification
│   ├── PreQualProviderEvent
│   ├── ConsentArtifact / ConsentVersion
│   └── ForwardingAuthorization
│
├── Vehicle & Inventory
│   ├── Vehicle (master)
│   ├── InventoryItem (listings)
│   ├── Shortlist / ShortlistItem (saved lists)
│   └── BuyerPreferences
│
├── Auction System
│   ├── Auction (event)
│   ├── AuctionParticipant (dealers)
│   ├── AuctionOffer (bids)
│   └── AuctionOfferFinancingOption (terms)
│
├── Deal Lifecycle
│   ├── SelectedDeal (core transaction)
│   ├── FinancingOffer (approved terms)
│   ├── ExternalPreApproval (lender pre-approval)
│   └── BestPriceOption (recommendations)
│
├── Insurance
│   ├── InsuranceQuote
│   ├── InsurancePolicy
│   ├── InsuranceDocRequest
│   └── InsuranceEvent
│
├── Contract Review (Contract Shield)
│   ├── ContractDocument (dealer contracts)
│   ├── ContractShieldScan (AI analysis)
│   ├── FixListItem (issues)
│   ├── ContractShieldOverride (exceptions)
│   ├── ContractShieldRule (rule engine)
│   ├── ContractShieldNotification (alerts)
│   └── ContractShieldReconciliation (tracking)
│
├── Logistics
│   ├── PickupAppointment (scheduling)
│   └── ESignEnvelope (e-signatures)
│
├── Affiliate System
│   ├── Affiliate (participant)
│   ├── Referral (tracking)
│   ├── Click (attribution)
│   ├── Commission (earnings)
│   └── Payout (distribution)
│
├── Payments
│   ├── DepositPayment (buyer funds)
│   ├── ServiceFeePayment (platform fees)
│   ├── PaymentMethod (stored methods)
│   ├── FeeFinancingDisclosure (regulatory)
│   └── LenderFeeDisbursement (distributions)
│
├── Trade-In
│   └── TradeIn (trade-in credit)
│
├── Compliance & Audit
│   ├── ComplianceEvent
│   ├── AdminAuditLog
│   ├── AdminLoginAttempt
│   └── PaymentProviderEvent
│
├── Documents
│   ├── DealDocument (deal-specific)
│   └── DocumentRequest (collection)
│
├── Refinance
│   ├── RefinanceLead
│   └── FundedLoan
│
└── Special Features
    ├── AiConversation / AiAdminAction
    ├── VehicleRequestCase
    ├── SourcedOffer
    ├── DealerCoverageGapSignal
    ├── AdminSetting
    └── Financial tracking (Transaction, Chargeback, FinancialAuditLog)
```

### 4.2 Critical Foreign Key Relationships

**User-centric relationships:**
- User → BuyerProfile (1:1)
- User → Dealer (1:1)
- User → DealerUser (1:1)
- User → AdminUser (1:1)
- User → Affiliate (1:1)

**Transaction flow relationships:**
- BuyerProfile → PreQualification (1:1)
- BuyerProfile → Shortlist (1:N)
- Shortlist → Auction (1:N)
- Auction → AuctionOffer (1:N)
- AuctionOffer → SelectedDeal (1:N)
- SelectedDeal → FinancingOffer (1:1)
- SelectedDeal → InsurancePolicy (1:1)
- SelectedDeal → TradeIn (1:1)

**Deal completion relationships:**
- SelectedDeal → ESignEnvelope (N:1)
- SelectedDeal → DealDocument (1:N)
- SelectedDeal → PickupAppointment (N:1)

---

## Part 5: Database Configuration & Access Patterns

### 5.1 Access Methods

**API Routes** (Direct Supabase SDK):
- Used for simple CRUD operations
- 30+ routes documented in codebase
- Direct table access via `.from("TableName")`
- Executed with service role key

**Service Layer** (Prisma Client):
- Used for complex operations with relations
- Transaction support for multi-step workflows
- Type-safe queries
- 15+ service files with 375+ Prisma operations

### 5.2 Row-Level Security (RLS)

**Protected Tables:**
- AdminAuditLog - SELECT restricted to admins
- AdminLoginAttempt - INSERT by service role
- User authentication flows - Policy-based access
- Sensitive compliance data

### 5.3 Indexing Strategy

**Indexed Fields:**
- All foreign keys (for join performance)
- Email fields (lookup optimization)
- Status fields (query filtering)
- Workspace IDs (tenant isolation)
- Timestamps (range queries)
- Unique business identifiers (licenseNumber, referralCode, VIN)

### 5.4 Soft/Precise Fields

**Cents-based fields** (for financial precision):
- maxOtdAmountCents
- minMonthlyPaymentCents
- maxMonthlyPaymentCents
- monthlyIncomeCents
- monthlyHousingCents

---

## Part 6: Data Integrity & Constraints

### 6.1 Uniqueness Constraints

| Table | Unique Field(s) | Purpose |
|-------|-----------------|---------|
| User | email | Login identifier |
| User | auth_user_id | Supabase Auth linkage |
| Dealer | licenseNumber | Business identification |
| Dealer | userId | User mapping |
| Affiliate | referralCode | Affiliate tracking |
| Vehicle | vin | Vehicle identification |
| Auction | (implicit on business logic) | Event uniqueness |
| SelectedDeal | (composite with user) | Deal uniqueness |
| BuyerProfile | userId | Profile mapping |
| AdminUser | userId | Admin mapping |

### 6.2 Cascading Relationships

**ON DELETE CASCADE:**
- User → BuyerProfile
- User → Dealer
- User → DealerUser
- User → AdminUser
- User → Affiliate
- Dealer → DealerUser
- Shortlist → ShortlistItem
- Auction → AuctionParticipant
- Auction → AuctionOffer
- AuctionOffer → AuctionOfferFinancingOption

### 6.3 Optional vs. Required Fields

**Always Required:**
- Primary identifiers (id)
- User references (userId, buyerId, etc.)
- Core transaction amounts (price, premium, etc.)
- Status enums

**Optional (Business logic determines):**
- Name fields (some are optional)
- Address line 2 (secondary address)
- Dates (many timestamps are conditional)
- Reference IDs for third-party integrations

---

## Part 7: Data Volume Indicators

### 7.1 Expected Growth Areas

**High-volume tables (millions of rows over time):**
- User / BuyerProfile / Dealer - User base growth
- AuctionOffer - Every auction generates offers
- SelectedDeal - Transaction history
- ComplianceEvent - Continuous audit trail

**Medium-volume tables (thousands to millions):**
- Auction - Regular event creation
- InventoryItem - Dealer inventory
- DealDocument - Per-deal documentation
- PreQualProviderEvent - Provider integration events

**Low-volume tables (hundreds to thousands):**
- Vehicle - Master catalog (growth with inventory)
- AuctionOfferFinancingOption - Per-offer financing
- AdminUser - Administrative staff
- AdminSetting - Configuration records

---

## Part 8: Data Access Patterns

### 8.1 Read Patterns

**Common Query Patterns:**
1. User lookup by email (authentication)
2. Buyer profile by user ID
3. Active auctions for buyer
4. Auction offers by auction ID
5. Deal history by buyer/dealer
6. Inventory search by vehicle attributes
7. Compliance events by type and date range
8. Commission calculations by affiliate
9. Insurance policy status lookups
10. Contract review results by deal

### 8.2 Write Patterns

**Transaction sequences:**
1. User registration → BuyerProfile creation
2. Auction initiation → AuctionParticipant invitations
3. Auction close → SelectedDeal creation
4. Deal selection → Insurance/Financing provisioning
5. Document collection → e-signature workflow
6. Pickup scheduling → PickupAppointment creation
7. Completion → Compliance event logging

### 8.3 Update Patterns

**State machine updates:**
- Auction: PENDING_DEPOSIT → ACTIVE → CLOSED → COMPLETED
- SelectedDeal: PENDING_DEPOSIT → ... → PICKUP_COMPLETE
- InsurancePolicy: QUOTE → ACTIVE → EXPIRED/CANCELLED
- ContractShieldScan: PENDING → REVIEWED → RESOLVED

---

## Part 9: Migration & Schema Evolution

### 9.1 Migration Files (6 total)

**Migration 02:** DealerUser table creation  
**Migration 03:** BuyerProfile field additions (employment, income)  
**Migration 04:** Dealer field additions (legal name, contact)  
**Migration 05:** Vehicle field additions (drivetrain, engine, colors)  
**Migration 94:** Admin MFA & audit tables (AdminAuditLog, AdminLoginAttempt)  
**Migration 95:** Connection canary table for health checks

### 9.2 Schema Version

**Current State:** 52 models, 16 enums, 6 migrations applied  
**Migration Pattern:** Additive (tables and fields added, rarely modified)  
**Backward Compatibility:** Maintained through optional fields

---

## Part 10: Special Tables & Features

### 10.1 System Tables

**_connection_canary**
- Single-row health check table
- Used by health check endpoint
- Validates database connectivity
- Queries: `SELECT * FROM _connection_canary ORDER BY id DESC LIMIT 1`

### 10.2 Audit Tables

**AdminAuditLog** - Administrative action tracking
- Records: User, action, timestamp, IP, user agent
- RLS: Admin-only read access
- Used for compliance and security review

**AdminLoginAttempt** - Rate limiting
- Tracks failed login attempts
- Implements lockout mechanism
- Prevents brute-force attacks

### 10.3 Immutable Records

**ConsentArtifact** - FCRA compliance
- Immutable record of consent capture
- Snapshots consent text at time of capture
- No updatedAt field (created only)

**PrequalProviderEvent** - Provider integration audit trail
- Records all provider calls (request/response)
- Used for debugging and compliance
- Immutable event log

---

## Part 11: Data Governance

### 11.1 Multi-Tenancy

**Workspace Isolation:**
- All user-facing tables include workspaceId
- Queries filtered by workspace
- Prevents cross-tenant data leakage
- Supports white-label scenarios

### 11.2 Soft Deletes

**Not Implemented** - Hard deletes used with CASCADE

### 11.3 Data Retention

**Indefinite Retention:**
- Audit logs - permanently retained
- Compliance events - permanently retained
- Transaction records - permanently retained
- User profiles - retained unless deleted

---

## Part 12: Summary Statistics

| Metric | Count | Details |
|--------|-------|---------|
| **Total Models** | 52 | Core business entities |
| **Total Enums** | 16 | Status and type definitions |
| **Total Fields** | ~500+ | Across all models |
| **Foreign Key Relations** | ~100+ | Model interconnections |
| **Unique Constraints** | 15+ | Business identifiers |
| **Indexes** | 150+ | Performance optimization |
| **Workspace-Isolated Models** | 48 | Multi-tenant support |
| **RLS-Protected Tables** | 4+ | Security enforcement |
| **Migration Files** | 6 | Schema evolution history |
| **API Routes Using DB** | 30+ | Direct database access |
| **Service Layer Files** | 15+ | Prisma-based operations |

---

## Part 13: Connection & Health Check

### 13.1 Health Endpoint

**Location:** `/api/health/db`

**Implementation:**
```
- Tests connection to canary table
- Returns latency metrics
- Verifies service role access
- Confirms schema readiness
```

**Expected Response:**
```json
{
  "ok": true,
  "projectRef": "xxx",
  "latencyMs": 45,
  "lastCanaryRow": {
    "id": 1,
    "created_at": "2026-02-08T...",
    "message": "canary alive"
  }
}
```

### 13.2 Connection String Format

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

---

## Conclusion

This comprehensive review documents the complete schema structure of the VercelAutoLenis platform database. The system is organized into 13 major business domains with 52 models supporting complex workflows including pre-qualification, reverse auctions, deal management, insurance integration, contract review, and affiliate management. The schema is designed for multi-tenant operations, includes strong audit trails for compliance, and maintains data integrity through appropriate constraints and relationships.

**Report Date:** March 9, 2026  
**Status:** Current snapshot of active database schema
