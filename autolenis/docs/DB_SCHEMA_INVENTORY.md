# Database Schema Inventory

**Document Version:** 1.0  
**Generated:** 2026-02-08  
**Purpose:** Comprehensive inventory of all database tables, columns, relationships, and constraints in the AutoLenis platform.

---

## Executive Summary

The AutoLenis database consists of:
- **50 tables** (Prisma models)
- **16 enums** for type safety
- **13 major subsystems**
- **Primary database:** PostgreSQL (Supabase)
- **ORM:** Prisma Client (v6.10.0)

---

## 1. ENUMS (Type Definitions)

| Enum Name | Values | Usage |
|-----------|--------|-------|
| **UserRole** | BUYER, DEALER, ADMIN, AFFILIATE | User.role field |
| **CreditTier** | EXCELLENT, GOOD, FAIR, POOR, DECLINED | PreQualification.creditTier |
| **AuctionStatus** | PENDING_DEPOSIT, ACTIVE, CLOSED, COMPLETED, CANCELLED | Auction.status |
| **BestPriceType** | BEST_CASH, BEST_MONTHLY, BALANCED | BestPriceOption.type |
| **DealStatus** | SELECTED, FINANCING_PENDING, FINANCING_APPROVED, FEE_PENDING, FEE_PAID, INSURANCE_PENDING, INSURANCE_COMPLETE, CONTRACT_PENDING, CONTRACT_REVIEW, CONTRACT_APPROVED, SIGNING_PENDING, SIGNED, PICKUP_SCHEDULED, COMPLETED, CANCELLED | SelectedDeal.status |
| **InsuranceStatus** | QUOTE_REQUESTED, QUOTE_RECEIVED, POLICY_SELECTED, POLICY_BOUND, EXTERNAL_UPLOADED | InsurancePolicy.status |
| **ContractStatus** | UPLOADED, SCANNING, ISSUES_FOUND, PASSED, FAILED | ContractShieldScan.status |
| **ESignStatus** | CREATED, SENT, VIEWED, SIGNED, COMPLETED, DECLINED, EXPIRED | ESignEnvelope.status |
| **PickupStatus** | SCHEDULED, CONFIRMED, BUYER_ARRIVED, COMPLETED, CANCELLED | PickupAppointment.status |
| **PaymentStatus** | PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED | DepositPayment.status, ServiceFeePayment.status |
| **FeePaymentMethod** | CARD, LOAN_INCLUSION | ServiceFeePayment.paymentMethod |
| **DocumentStatus** | UPLOADED, PENDING_REVIEW, APPROVED, REJECTED | DealDocument.status |
| **DocumentRequestStatus** | REQUESTED, UPLOADED, APPROVED, REJECTED | DocumentRequest.status |
| **RefinanceQualificationStatus** | PENDING, QUALIFIED, DISQUALIFIED | RefinanceLead.qualificationStatus |
| **VehicleCondition** | EXCELLENT, GOOD, FAIR, POOR | RefinanceLead.vehicleCondition, TradeIn.condition |
| **MarketingRestriction** | NONE, NO_CREDIT_SOLICITATION | RefinanceLead.marketingRestriction |

---

## 2. TABLES BY SUBSYSTEM

### SUBSYSTEM 1: Users & Identity (5 tables)

#### User
**Purpose:** Core authentication and user identity
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| email | String | No | - | Unique, indexed |
| passwordHash | String | No | - | - |
| role | UserRole | No | - | BUYER/DEALER/ADMIN/AFFILIATE |
| is_email_verified | Boolean | No | false | - |
| first_name | String | Yes | - | - |
| last_name | String | Yes | - | - |
| mfa_enrolled | Boolean | No | false | Multi-factor authentication |
| mfa_factor_id | String | Yes | - | - |
| mfa_secret | String | Yes | - | - |
| force_password_reset | Boolean | No | false | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → BuyerProfile (1:1)
- → Dealer (1:1)
- → AdminUser (1:1)
- → Affiliate (1:1)
- → ContractShieldOverride[] (1:many)
- → ContractShieldNotification[] (1:many)

**Indexes:** email

---

#### BuyerProfile
**Purpose:** Extended buyer information and preferences
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| userId | String | No | - | FK to User, unique |
| firstName | String | No | - | - |
| lastName | String | No | - | - |
| phone | String | Yes | - | Made optional for signup |
| address | String | No | - | - |
| city | String | No | - | - |
| state | String | No | - | - |
| zip | String | No | - | - |
| employment | String | Yes | - | Employment status |
| employer | String | Yes | - | - |
| annualIncome | Float | Yes | - | - |
| housingStatus | String | Yes | - | Own/Rent/Other |
| monthlyHousing | Float | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → User (via userId)
- → PreQualification (1:1)
- → BuyerPreferences (1:1)
- → Shortlist[] (1:many)
- → Auction[] (1:many)
- → SelectedDeal[] (1:many)
- → PickupAppointment[] (1:many)
- → Referral[] (1:many, as referred buyer)

---

#### Dealer
**Purpose:** Dealer/seller information
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| userId | String | No | - | FK to User, unique |
| businessName | String | No | - | - |
| licenseNumber | String | No | - | Unique, indexed |
| phone | String | No | - | - |
| address | String | No | - | - |
| city | String | No | - | - |
| state | String | No | - | - |
| zip | String | No | - | - |
| integrityScore | Float | No | 100 | Performance metric |
| verified | Boolean | No | false | Admin verification |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → User (via userId)
- → InventoryItem[] (1:many)
- → AuctionParticipant[] (1:many)
- → ContractDocument[] (1:many)
- → ContractShieldScan[] (1:many)
- → PickupAppointment[] (1:many)

**Indexes:** licenseNumber

---

#### AdminUser
**Purpose:** Admin-specific metadata
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| userId | String | No | - | FK to User, unique |
| firstName | String | No | - | - |
| lastName | String | No | - | - |
| role | String | No | "ADMIN" | Default admin role |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → User (via userId)

---

#### Affiliate
**Purpose:** Referral/affiliate tracking
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| userId | String | No | - | FK to User, unique |
| referralCode | String | No | - | Unique, indexed |
| firstName | String | Yes | - | - |
| lastName | String | Yes | - | - |
| totalEarnings | Float | No | 0 | Lifetime earnings |
| pendingEarnings | Float | No | 0 | Unpaid balance |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → User (via userId)
- → Referral[] (1:many)
- → Click[] (1:many)
- → Commission[] (1:many)
- → Payout[] (1:many)

**Indexes:** referralCode

---

### SUBSYSTEM 2: Pre-Qualification (1 table)

#### PreQualification
**Purpose:** Buyer credit pre-qualification data
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | FK to BuyerProfile, unique, indexed |
| creditScore | Int | Yes | - | FICO score |
| creditTier | CreditTier | No | - | EXCELLENT/GOOD/FAIR/POOR/DECLINED |
| maxOtd | Float | No | - | Max out-the-door amount |
| estimatedMonthlyMin | Float | No | - | - |
| estimatedMonthlyMax | Float | No | - | - |
| dti | Float | Yes | - | Debt-to-income ratio |
| softPullCompleted | Boolean | No | false | Credit check status |
| softPullDate | DateTime | Yes | - | - |
| consentGiven | Boolean | No | false | User consent |
| consentDate | DateTime | Yes | - | - |
| expiresAt | DateTime | No | - | Expiration date |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → BuyerProfile (via buyerId)

**Indexes:** buyerId

---

### SUBSYSTEM 3: Vehicle Discovery & Shortlisting (5 tables)

#### BuyerPreferences
**Purpose:** Buyer vehicle search preferences
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | FK to BuyerProfile, unique |
| makes | String[] | No | - | Array of car makes |
| bodyStyles | String[] | No | - | SUV, Sedan, etc. |
| minYear | Int | Yes | - | - |
| maxYear | Int | Yes | - | - |
| maxMileage | Int | Yes | - | - |
| maxDistance | Int | Yes | - | Search radius |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → BuyerProfile (via buyerId)

---

#### Vehicle
**Purpose:** Vehicle master data
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| vin | String | No | - | Unique, indexed |
| year | Int | No | - | - |
| make | String | No | - | Indexed with model |
| model | String | No | - | Indexed with make |
| trim | String | Yes | - | - |
| bodyStyle | String | No | - | - |
| mileage | Int | No | - | - |
| exteriorColor | String | Yes | - | - |
| interiorColor | String | Yes | - | - |
| transmission | String | Yes | - | - |
| fuelType | String | Yes | - | - |
| images | String[] | No | - | Array of image URLs |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → InventoryItem[] (1:many)

**Indexes:** vin, [make, model]

---

#### InventoryItem
**Purpose:** Dealer's available vehicles
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealerId | String | No | - | FK to Dealer, indexed |
| vehicleId | String | No | - | FK to Vehicle, indexed |
| price | Float | No | - | Listed price |
| status | String | No | "AVAILABLE" | AVAILABLE/RESERVED/SOLD |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → Dealer (via dealerId)
- → Vehicle (via vehicleId)
- → ShortlistItem[] (1:many)
- → AuctionOffer[] (1:many)

**Indexes:** dealerId, vehicleId

---

#### Shortlist
**Purpose:** Buyer's saved vehicle list
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | FK to BuyerProfile, indexed |
| name | String | Yes | - | Optional list name |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → BuyerProfile (via buyerId)
- → ShortlistItem[] (1:many)
- → Auction[] (1:many)

**Indexes:** buyerId

---

#### ShortlistItem
**Purpose:** Individual items in shortlist
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| shortlistId | String | No | - | FK to Shortlist, indexed |
| inventoryItemId | String | No | - | FK to InventoryItem |
| addedAt | DateTime | No | now() | - |

**Relationships:**
- → Shortlist (via shortlistId)
- → InventoryItem (via inventoryItemId)

**Unique Constraint:** [shortlistId, inventoryItemId]  
**Indexes:** shortlistId

---

### SUBSYSTEM 4: Silent Reverse Auction (4 tables)

#### Auction
**Purpose:** Auction event management
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | FK to BuyerProfile, indexed |
| shortlistId | String | No | - | FK to Shortlist |
| status | AuctionStatus | No | PENDING_DEPOSIT | Indexed |
| startsAt | DateTime | Yes | - | - |
| endsAt | DateTime | Yes | - | - |
| closedAt | DateTime | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → BuyerProfile (via buyerId)
- → Shortlist (via shortlistId)
- → AuctionParticipant[] (1:many)
- → AuctionOffer[] (1:many)
- → BestPriceOption[] (1:many)

**Indexes:** buyerId, status

---

#### AuctionParticipant
**Purpose:** Dealers invited to auction
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| auctionId | String | No | - | FK to Auction, indexed |
| dealerId | String | No | - | FK to Dealer, indexed |
| invitedAt | DateTime | No | now() | - |
| viewedAt | DateTime | Yes | - | Tracking |

**Relationships:**
- → Auction (via auctionId)
- → Dealer (via dealerId)

**Unique Constraint:** [auctionId, dealerId]  
**Indexes:** auctionId, dealerId

---

#### AuctionOffer
**Purpose:** Dealer bids in auction
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| auctionId | String | No | - | FK to Auction, indexed |
| participantId | String | No | - | FK to AuctionParticipant |
| inventoryItemId | String | No | - | FK to InventoryItem, indexed |
| cashOtd | Float | No | - | Cash out-the-door price |
| taxAmount | Float | No | - | Tax calculation |
| feesBreakdown | Json | No | - | Itemized fees |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → Auction (via auctionId)
- → InventoryItem (via inventoryItemId)
- → AuctionOfferFinancingOption[] (1:many)
- → SelectedDeal[] (1:many)

**Indexes:** auctionId, inventoryItemId

---

#### AuctionOfferFinancingOption
**Purpose:** Financing terms for an offer
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| offerId | String | No | - | FK to AuctionOffer, indexed |
| apr | Float | No | - | Annual percentage rate |
| termMonths | Int | No | - | Loan term |
| downPayment | Float | No | - | Required down payment |
| monthlyPayment | Float | No | - | Calculated monthly |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → AuctionOffer (via offerId)

**Indexes:** offerId

---

### SUBSYSTEM 5: Best Price Engine (1 table)

#### BestPriceOption
**Purpose:** Computed best deals for buyer
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| auctionId | String | No | - | FK to Auction, indexed |
| type | BestPriceType | No | - | BEST_CASH/BEST_MONTHLY/BALANCED, indexed |
| offerId | String | No | - | FK to AuctionOffer |
| inventoryItemId | String | No | - | - |
| dealerId | String | No | - | - |
| cashOtd | Float | No | - | - |
| monthlyPayment | Float | Yes | - | - |
| score | Float | No | - | Algorithm score |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → Auction (via auctionId)

**Indexes:** auctionId, type

---

### SUBSYSTEM 6: Financing & Selected Deal (4 tables)

#### SelectedDeal
**Purpose:** Buyer's accepted deal
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | FK to BuyerProfile, indexed |
| auctionId | String | No | - | - |
| offerId | String | No | - | FK to AuctionOffer |
| inventoryItemId | String | No | - | - |
| dealerId | String | No | - | - |
| status | DealStatus | No | SELECTED | Indexed, 15 possible values |
| cashOtd | Float | No | - | - |
| taxAmount | Float | No | - | - |
| feesBreakdown | Json | No | - | - |
| insurance_status | String | Yes | - | Legacy field |
| user_id | String | Yes | - | Legacy field |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → BuyerProfile (via buyerId)
- → AuctionOffer (via offerId)
- → FinancingOffer (1:1)
- → ServiceFeePayment (1:1)
- → InsurancePolicy (1:1)
- → ContractDocument[] (1:many)
- → ContractShieldScan (1:1)
- → ESignEnvelope (1:1)
- → PickupAppointment (1:1)
- → TradeIn (1:1)

**Indexes:** buyerId, status

---

#### FinancingOffer
**Purpose:** Financing terms for selected deal
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | FK to SelectedDeal, unique |
| lenderName | String | No | - | - |
| apr | Float | No | - | - |
| termMonths | Int | No | - | - |
| downPayment | Float | No | - | - |
| monthlyPayment | Float | No | - | - |
| totalFinanced | Float | No | - | - |
| approved | Boolean | No | false | Approval status |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → SelectedDeal (via dealId)

---

#### ExternalPreApproval
**Purpose:** Outside lender pre-approvals
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | - |
| lenderName | String | No | - | - |
| approvedAmount | Float | No | - | - |
| apr | Float | Yes | - | - |
| termMonths | Int | Yes | - | - |
| documentUrl | String | Yes | - | - |
| createdAt | DateTime | No | now() | - |

---

### SUBSYSTEM 7: Insurance (3 tables)

#### InsuranceQuote
**Purpose:** Insurance quotes from providers
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | Indexed |
| vehicleId | String | No | - | - |
| carrier | String | No | - | Provider name |
| coverageType | String | No | - | Full/Liability |
| monthlyPremium | Float | No | - | - |
| sixMonthPremium | Float | No | - | - |
| coverageLimits | Json | No | - | - |
| deductibles | Json | No | - | - |
| expiresAt | DateTime | No | - | Quote expiry |
| **Service Layer Fields** | | | | **Additional fields used by insurance service** |
| buyer_id | String | Yes | - | Duplicate |
| selected_deal_id | String | Yes | - | Indexed |
| vehicle_id | String | Yes | - | Duplicate |
| carrier_name | String | Yes | - | Duplicate |
| productName | String | Yes | - | - |
| product_name | String | Yes | - | Duplicate |
| premium_monthly_cents | Int | Yes | - | Cents version |
| premium_semi_annual_cents | Int | Yes | - | - |
| premium_annual_cents | Int | Yes | - | - |
| six_month_premium | Float | Yes | - | Duplicate |
| monthly_premium | Float | Yes | - | Duplicate |
| coverage_json | Json | Yes | - | - |
| coverageJson | Json | Yes | - | Duplicate |
| coverage_limits | Json | Yes | - | Duplicate |
| quote_ref | String | Yes | - | Provider reference |
| quote_status | String | Yes | - | - |
| valid_until | DateTime | Yes | - | Duplicate of expiresAt |
| vehicle_vin | String | Yes | - | - |
| provider_name | String | Yes | - | - |
| createdAt | DateTime | No | now() | - |

**Relationships:** None defined in Prisma

**Indexes:** buyerId, selected_deal_id

**NOTE:** This table has significant column duplication/redundancy between core and service layer fields.

---

#### InsurancePolicy
**Purpose:** Bound insurance policies
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | FK to SelectedDeal, unique, indexed |
| status | InsuranceStatus | No | QUOTE_REQUESTED | - |
| carrier | String | Yes | - | - |
| policyNumber | String | Yes | - | - |
| coverageType | String | Yes | - | - |
| monthlyPremium | Float | Yes | - | - |
| effectiveDate | DateTime | Yes | - | - |
| expirationDate | DateTime | Yes | - | - |
| documentUrl | String | Yes | - | - |
| **Service Layer Fields** | | | | **Additional fields used by insurance service** |
| selected_deal_id | String | Yes | - | Duplicate of dealId |
| deal_id | String | Yes | - | Duplicate |
| userId | String | Yes | - | - |
| user_id | String | Yes | - | Duplicate |
| type | String | Yes | - | - |
| carrier_name | String | Yes | - | Duplicate |
| policy_number | String | Yes | - | Duplicate |
| policy_number_v2 | String | Yes | - | - |
| vehicle_vin | String | Yes | - | - |
| startDate | DateTime | Yes | - | - |
| start_date | DateTime | Yes | - | Duplicate |
| endDate | DateTime | Yes | - | - |
| end_date | DateTime | Yes | - | Duplicate |
| document_url | String | Yes | - | Duplicate |
| raw_policy_json | Json | Yes | - | - |
| coverage_type | String | Yes | - | Duplicate |
| monthly_premium | Float | Yes | - | Duplicate |
| is_verified | Boolean | No | false | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → SelectedDeal (via dealId)

**Indexes:** dealId

**NOTE:** This table has significant column duplication/redundancy between core and service layer fields.

---

### SUBSYSTEM 8: Contract Shield (7 tables)

#### ContractDocument
**Purpose:** Uploaded contract files
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | FK to SelectedDeal, indexed |
| dealerId | String | No | - | FK to Dealer, indexed |
| documentUrl | String | No | - | File storage URL |
| documentType | String | No | - | Doc category |
| version | Int | No | 1 | Version tracking |
| uploadedAt | DateTime | No | now() | - |

**Relationships:**
- → SelectedDeal (via dealId)
- → Dealer (via dealerId)
- → ContractShieldScan (1:1)

**Indexes:** dealId, dealerId

---

#### ContractShieldScan
**Purpose:** Automated contract analysis results
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | FK to SelectedDeal, unique, indexed |
| dealerId | String | No | - | FK to Dealer, indexed |
| contractDocumentId | String | Yes | - | FK to ContractDocument, unique |
| status | ContractStatus | No | SCANNING | Indexed |
| aprMatch | Boolean | Yes | - | Validation result |
| paymentMatch | Boolean | Yes | - | Validation result |
| otdMatch | Boolean | Yes | - | Validation result |
| junkFeesDetected | Boolean | Yes | - | Alert flag |
| missingAddendums | String[] | No | - | Required docs |
| overallScore | Float | Yes | - | 0-100 score |
| scannedAt | DateTime | No | now() | - |

**Relationships:**
- → SelectedDeal (via dealId)
- → Dealer (via dealerId)
- → ContractDocument (via contractDocumentId)
- → ContractShieldOverride[] (1:many)
- → ContractShieldNotification[] (1:many)
- → FixListItem[] (1:many)

**Indexes:** dealId, dealerId, status

---

#### FixListItem
**Purpose:** Specific issues found in scan
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| scanId | String | No | - | FK to ContractShieldScan, indexed |
| category | String | No | - | Issue type |
| description | String | No | - | - |
| severity | String | No | - | INFO/REVIEW/IMPORTANT/CRITICAL |
| expectedFix | String | No | - | Resolution guidance |
| resolved | Boolean | No | false | - |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → ContractShieldScan (via scanId)

**Indexes:** scanId

---

#### ContractShieldOverride
**Purpose:** Admin manual approval/rejection
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| scanId | String | No | - | FK to ContractShieldScan, indexed |
| adminId | String | No | - | FK to User, indexed |
| action | String | No | - | FORCE_PASS/FORCE_FAIL |
| reason | String (Text) | No | - | - |
| buyerAcknowledged | Boolean | No | false | - |
| buyerAckAt | DateTime | Yes | - | - |
| buyerAckComment | String (Text) | Yes | - | - |
| previousStatus | String | No | - | - |
| newStatus | String | No | - | - |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → ContractShieldScan (via scanId)
- → User (via adminId)

**Indexes:** scanId, adminId

---

#### ContractShieldRule
**Purpose:** Configurable validation rules
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| ruleKey | String | No | - | Unique, indexed |
| ruleName | String | No | - | - |
| ruleDescription | String (Text) | No | - | - |
| ruleType | String | No | - | THRESHOLD/VALIDATION/ALERT |
| severity | String | No | - | INFO/REVIEW/IMPORTANT/CRITICAL |
| enabled | Boolean | No | true | - |
| thresholdValue | Float | Yes | - | - |
| configJson | Json | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Indexes:** ruleKey

---

#### ContractShieldNotification
**Purpose:** Notification tracking
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| scanId | String | No | - | FK to ContractShieldScan, indexed |
| recipientId | String | No | - | FK to User, indexed |
| notificationType | String | No | - | EMAIL/SMS/IN_APP |
| status | String | No | - | PENDING/SENT/FAILED, indexed |
| subject | String | No | - | - |
| message | String (Text) | No | - | - |
| sentAt | DateTime | Yes | - | - |
| failedReason | String | Yes | - | - |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → ContractShieldScan (via scanId)
- → User (via recipientId)

**Indexes:** scanId, recipientId, status

---

#### ContractShieldReconciliation
**Purpose:** Background job tracking
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| jobType | String | No | - | Indexed |
| status | String | No | - | PENDING/RUNNING/COMPLETED/FAILED, indexed |
| itemsProcessed | Int | No | 0 | - |
| itemsUpdated | Int | No | 0 | - |
| itemsFailed | Int | No | 0 | - |
| errorLog | String (Text) | Yes | - | - |
| resultSummary | Json | Yes | - | - |
| startedAt | DateTime | Yes | - | - |
| completedAt | DateTime | Yes | - | - |
| createdAt | DateTime | No | now() | Indexed |

**Indexes:** jobType, status, createdAt

---

### SUBSYSTEM 9: E-Signature (1 table)

#### ESignEnvelope
**Purpose:** DocuSign/e-signature tracking
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | FK to SelectedDeal, unique, indexed |
| providerId | String | Yes | - | Provider ID |
| providerEnvelopeId | String | Yes | - | External reference |
| status | ESignStatus | No | CREATED | Indexed |
| documentsUrl | String[] | No | - | Array of URLs |
| signUrl | String | Yes | - | Signing link |
| sentAt | DateTime | Yes | - | - |
| viewedAt | DateTime | Yes | - | - |
| signedAt | DateTime | Yes | - | - |
| completedAt | DateTime | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → SelectedDeal (via dealId)

**Indexes:** dealId, status

---

### SUBSYSTEM 10: Pickup Scheduling (1 table)

#### PickupAppointment
**Purpose:** Vehicle pickup logistics
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | FK to SelectedDeal, unique, indexed |
| buyerId | String | No | - | FK to BuyerProfile |
| dealerId | String | No | - | FK to Dealer |
| status | PickupStatus | No | SCHEDULED | - |
| scheduledDate | DateTime | No | - | Indexed |
| scheduledTime | String | No | - | Time slot |
| qrCode | String | No | - | Unique, indexed |
| arrivedAt | DateTime | Yes | - | - |
| completedAt | DateTime | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → SelectedDeal (via dealId)
- → BuyerProfile (via buyerId)
- → Dealer (via dealerId)

**Indexes:** dealId, qrCode, scheduledDate

---

### SUBSYSTEM 11: Affiliate Engine (4 tables)

#### Referral
**Purpose:** Referral tracking
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| affiliateId | String | No | - | FK to Affiliate, indexed |
| referredUserId | String | Yes | - | - |
| referredBuyerId | String | Yes | - | FK to BuyerProfile, indexed |
| level | Int | No | 1 | Multi-level depth |
| dealCompleted | Boolean | No | false | - |
| dealId | String | Yes | - | - |
| commissionPaid | Boolean | No | false | - |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → Affiliate (via affiliateId)
- → BuyerProfile (via referredBuyerId)
- → Commission[] (1:many)

**Indexes:** affiliateId, referredBuyerId

---

#### Click
**Purpose:** Affiliate link click tracking
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| affiliateId | String | No | - | FK to Affiliate, indexed |
| ipAddress | String | Yes | - | - |
| userAgent | String | Yes | - | - |
| referer | String | Yes | - | - |
| clickedAt | DateTime | No | now() | Indexed |

**Relationships:**
- → Affiliate (via affiliateId)

**Indexes:** affiliateId, clickedAt

---

#### Commission
**Purpose:** Earned commissions
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| affiliateId | String | No | - | FK to Affiliate, indexed |
| referralId | String | No | - | FK to Referral |
| level | Int | No | - | 1st/2nd/3rd level |
| dealId | String | No | - | - |
| baseAmount | Float | No | - | Deal value |
| commissionRate | Float | No | - | % earned |
| commissionAmount | Float | No | - | Calculated |
| status | String | No | "PENDING" | Indexed |
| payoutId | String | Yes | - | FK to Payout |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → Affiliate (via affiliateId)
- → Referral (via referralId)
- → Payout (via payoutId)

**Indexes:** affiliateId, status

---

#### Payout
**Purpose:** Affiliate payments
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| affiliateId | String | No | - | FK to Affiliate, indexed |
| amount | Float | No | - | - |
| status | String | No | "PENDING" | Indexed |
| paymentMethod | String | Yes | - | - |
| paymentId | String | Yes | - | External reference |
| paidAt | DateTime | Yes | - | - |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → Affiliate (via affiliateId)
- → Commission[] (1:many)

**Indexes:** affiliateId, status

---

### SUBSYSTEM 12: Payments & Fee Inclusion (5 tables)

#### DepositPayment
**Purpose:** Auction deposit tracking
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | Indexed |
| auctionId | String | No | - | Indexed |
| amount | Float | No | - | - |
| status | PaymentStatus | No | PENDING | Indexed |
| stripePaymentIntentId | String | Yes | - | Unique |
| checkoutSessionId | String | Yes | - | Stripe Checkout Session ID |
| checkoutAttempt | Int | No | 0 | Idempotency attempt counter |
| refunded | Boolean | No | false | - |
| refundedAt | DateTime | Yes | - | - |
| refundReason | String | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Indexes:** buyerId, auctionId, status

---

#### ServiceFeePayment
**Purpose:** Platform service fee
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | FK to SelectedDeal, unique, indexed |
| baseFee | Float | No | - | - |
| depositCredit | Float | No | 0 | Applied credit |
| finalAmount | Float | No | - | - |
| paymentMethod | FeePaymentMethod | Yes | - | CARD/LOAN_INCLUSION |
| status | PaymentStatus | No | PENDING | Indexed |
| stripePaymentIntentId | String | Yes | - | Unique |
| checkoutSessionId | String | Yes | - | Stripe Checkout Session ID |
| checkoutAttempt | Int | No | 0 | Idempotency attempt counter |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → SelectedDeal (via dealId)
- → LenderFeeDisbursement (1:1)
- → FeeFinancingDisclosure (1:1)

**Indexes:** dealId, status

---

#### FeeFinancingDisclosure
**Purpose:** Fee financing consent
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| feePaymentId | String | No | - | FK to ServiceFeePayment, unique, indexed |
| feeAmount | Float | No | - | - |
| apr | Float | No | - | - |
| termMonths | Int | No | - | - |
| monthlyIncrease | Float | No | - | - |
| totalExtraCost | Float | No | - | - |
| consentGiven | Boolean | No | false | - |
| consentTimestamp | DateTime | Yes | - | - |
| ipAddress | String | Yes | - | Audit trail |
| userAgent | String | Yes | - | Audit trail |
| createdAt | DateTime | No | now() | - |

**Relationships:**
- → ServiceFeePayment (via feePaymentId)

**Indexes:** feePaymentId

---

#### LenderFeeDisbursement
**Purpose:** Lender fee disbursement tracking
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| feePaymentId | String | No | - | FK to ServiceFeePayment, unique, indexed |
| lenderName | String | No | - | - |
| disbursementAmount | Float | No | - | - |
| status | String | No | "PENDING" | Indexed |
| requestedAt | DateTime | No | now() | - |
| disbursedAt | DateTime | Yes | - | - |

**Relationships:**
- → ServiceFeePayment (via feePaymentId)

**Indexes:** feePaymentId, status

---

#### PaymentMethod
**Purpose:** Saved payment methods
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| userId | String | No | - | Indexed |
| stripePaymentMethodId | String | No | - | Unique |
| type | String | No | - | card/bank |
| last4 | String | Yes | - | - |
| brand | String | Yes | - | Visa/MC/etc |
| isDefault | Boolean | No | false | - |
| createdAt | DateTime | No | now() | - |

**Indexes:** userId

---

### SUBSYSTEM 13: Trade-In Vehicles (1 table)

#### TradeIn
**Purpose:** Buyer trade-in vehicle
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| buyerId | String | No | - | Indexed |
| shortlistId | String | Yes | - | Indexed |
| auctionId | String | Yes | - | Indexed |
| selectedDealId | String | Yes | - | Unique |
| hasTrade | Boolean | No | false | - |
| vin | String | Yes | - | - |
| year | Int | Yes | - | - |
| make | String | Yes | - | - |
| model | String | Yes | - | - |
| trim | String | Yes | - | - |
| mileage | Int | Yes | - | - |
| condition | String | Yes | - | EXCELLENT/GOOD/FAIR/POOR |
| photoUrls | String[] | No | - | Array |
| hasLoan | Boolean | Yes | - | - |
| lenderName | String | Yes | - | - |
| estimatedPayoffCents | Int | Yes | - | - |
| estimatedValueCents | Int | Yes | - | - |
| kbbValueCents | Int | Yes | - | - |
| stepCompleted | Boolean | No | false | - |
| completedAt | DateTime | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → SelectedDeal (via selectedDealId)

**Indexes:** buyerId, shortlistId, auctionId

---

### SUBSYSTEM 14: Compliance & Audit (2 tables)

#### ComplianceEvent
**Purpose:** Audit log
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| eventType | String | No | - | Indexed |
| userId | String | Yes | - | Indexed |
| buyerId | String | Yes | - | - |
| dealId | String | Yes | - | - |
| action | String | No | - | - |
| details | Json | No | - | - |
| ipAddress | String | Yes | - | - |
| userAgent | String | Yes | - | - |
| createdAt | DateTime | No | now() | Indexed |

**Indexes:** eventType, userId, createdAt

---

#### PaymentProviderEvent
**Purpose:** Payment webhook log
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| provider | String | No | - | Stripe/etc |
| eventType | String | No | - | Indexed |
| eventId | String | No | - | Unique |
| paymentIntentId | String | Yes | - | Indexed |
| payload | Json | No | - | - |
| processed | Boolean | No | false | - |
| createdAt | DateTime | No | now() | - |

**Indexes:** eventType, paymentIntentId

---

### SUBSYSTEM 15: Admin Settings (1 table)

#### AdminSetting
**Purpose:** Configuration key-value store
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| key | String | No | - | Unique, indexed |
| value | Json | No | - | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Indexes:** key

---

### SUBSYSTEM 16: Deal Documents & Document Requests (2 tables)

#### DealDocument
**Purpose:** Buyer-uploaded documents
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| ownerUserId | String | No | - | Indexed |
| dealId | String | Yes | - | Indexed |
| type | String | No | - | ID/INSURANCE_PROOF/PAY_STUB/etc |
| fileName | String | No | - | - |
| mimeType | String | Yes | - | - |
| fileSize | Int | Yes | - | - |
| fileUrl | String | No | - | - |
| status | DocumentStatus | No | UPLOADED | Indexed |
| rejectionReason | String | Yes | - | - |
| requestId | String | Yes | - | FK to DocumentRequest, unique |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → DocumentRequest (via requestId)

**Indexes:** ownerUserId, dealId, status

---

#### DocumentRequest
**Purpose:** Dealer/admin document requests
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | Indexed |
| buyerId | String | No | - | Indexed |
| requestedByUserId | String | No | - | - |
| requestedByRole | String | No | - | DEALER/ADMIN |
| type | String | No | - | - |
| required | Boolean | No | true | - |
| notes | String (Text) | Yes | - | - |
| dueDate | DateTime | Yes | - | - |
| status | DocumentRequestStatus | No | REQUESTED | Indexed |
| decidedByUserId | String | Yes | - | - |
| decidedByRole | String | Yes | - | - |
| decisionNotes | String (Text) | Yes | - | - |
| decidedAt | DateTime | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → DealDocument (1:1, reverse)

**Indexes:** dealId, buyerId, status

---

### SUBSYSTEM 17: Auto Refinance System (2 tables)

#### RefinanceLead
**Purpose:** OpenRoad partnership leads
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| leadType | String | No | "refinance" | - |
| partner | String | No | "OpenRoad" | Indexed |
| firstName | String | No | - | - |
| lastName | String | No | - | - |
| email | String | No | - | Indexed |
| phone | String | No | - | - |
| state | String | No | - | Indexed |
| tcpaConsent | Boolean | No | false | - |
| vehicleYear | Int | No | - | - |
| vehicleMake | String | No | - | - |
| vehicleModel | String | No | - | - |
| mileage | Int | No | - | - |
| vehicleCondition | VehicleCondition | No | - | - |
| loanBalance | Float | No | - | - |
| currentMonthlyPayment | Float | No | - | - |
| monthlyIncome | Float | No | - | - |
| qualificationStatus | RefinanceQualificationStatus | No | PENDING | Indexed |
| qualificationReasons | Json | No | "[]" | - |
| redirectedToPartnerAt | DateTime | Yes | - | - |
| openroadFunded | Boolean | No | false | Indexed |
| fundedAt | DateTime | Yes | - | - |
| fundedAmount | Float | Yes | - | - |
| commissionAmount | Float | Yes | - | - |
| marketingRestriction | MarketingRestriction | No | NONE | - |
| createdAt | DateTime | No | now() | Indexed |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → FundedLoan (1:1)

**Indexes:** email, qualificationStatus, openroadFunded, createdAt, partner, state

---

#### FundedLoan
**Purpose:** Confirmed refinance conversions
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| leadId | String | No | - | FK to RefinanceLead, unique, indexed |
| partner | String | No | "OpenRoad" | Indexed |
| fundedAt | DateTime | No | - | Indexed |
| fundedAmount | Float | No | - | - |
| commissionAmount | Float | No | - | - |
| rawPartnerReference | String | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Relationships:**
- → RefinanceLead (via leadId)

**Indexes:** leadId, fundedAt, partner

---

### SUBSYSTEM 18: Insurance Document Requests (1 table)

#### InsuranceDocRequest
**Purpose:** Insurance-specific document requests
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | String (cuid) | No | cuid() | PK |
| dealId | String | No | - | Indexed |
| buyerId | String | No | - | Indexed |
| requestedByRole | String | No | - | - |
| requestedByUserId | String | No | - | - |
| type | String | No | - | - |
| status | String | No | "REQUESTED" | Indexed |
| dueDate | DateTime | Yes | - | - |
| notes | String | Yes | - | - |
| documentUrl | String | Yes | - | - |
| createdAt | DateTime | No | now() | - |
| updatedAt | DateTime | No | - | Auto-updated |

**Indexes:** dealId, buyerId, status

---

## 3. RLS POLICIES INVENTORY

**RLS Status:** Enabled on 19 tables (per scripts/02-add-rls-policies.sql)

### Tables with RLS Policies:

1. **User** - Self + Admin
2. **BuyerProfile** - Self + Admin
3. **Dealer** - Self + Admin
4. **Affiliate** - Self + Admin
5. **Auction** - Active auctions public, participated dealers, admin
6. **AuctionOffer** - Own offers only, admin
7. **SelectedDeal** - Buyer (own), Dealer (own inventory), Admin
8. **InventoryItem** - Available items public, dealer (own), admin
9. **Offer** - Referenced but table doesn't exist in Prisma schema
10. **Contract** - Referenced but table doesn't exist in Prisma schema (should be ContractDocument)
11. **FinancingOffer** - Buyer (via deal), admin
12. **InsuranceQuote** - Buyer (via deal), admin
13. **InsurancePolicy** - Buyer (via quoteId->dealId), admin
14. **PickupAppointment** - Buyer (via deal), Dealer (via inventory), Admin
15. **Referral** - Affiliate (own), admin
16. **Commission** - Affiliate (own), admin
17. **Payout** - Affiliate (own), admin
18. **TradeIn** - Buyer (own), admin

### Tables WITHOUT RLS Policies:

- PreQualification
- BuyerPreferences
- Vehicle
- Shortlist
- ShortlistItem
- AuctionParticipant
- AuctionOfferFinancingOption
- BestPriceOption
- ExternalPreApproval
- ContractDocument
- ContractShieldScan
- FixListItem
- ContractShieldOverride
- ContractShieldRule
- ContractShieldNotification
- ContractShieldReconciliation
- ESignEnvelope
- DepositPayment
- ServiceFeePayment
- FeeFinancingDisclosure
- LenderFeeDisbursement
- PaymentMethod
- ComplianceEvent
- PaymentProviderEvent
- AdminSetting
- DealDocument
- DocumentRequest
- RefinanceLead
- FundedLoan
- InsuranceDocRequest
- AdminUser

---

## 4. CRITICAL FINDINGS

### Schema-Level Issues:

1. **RLS Policy References Non-Existent Tables:**
   - `Offer` - no Prisma model exists
   - `Contract` - should likely be `ContractDocument`

2. **Insurance Tables Have Significant Column Redundancy:**
   - `InsuranceQuote`: 25+ duplicate/variant column names
   - `InsurancePolicy`: 20+ duplicate/variant column names
   - Both tables have snake_case and camelCase variants of same data

3. **Tables Missing RLS Policies (31 tables):**
   - Many sensitive tables have no RLS protection
   - Examples: PreQualification, DepositPayment, ServiceFeePayment, ESignEnvelope

4. **Legacy/Orphaned Fields:**
   - `SelectedDeal.insurance_status` (String, should use InsurancePolicy relationship)
   - `SelectedDeal.user_id` (should use buyerId)

---

## 5. INDEXES SUMMARY

**Total Indexed Fields:** 70+

**Well-Indexed:**
- User lookups (email, userId references)
- Deal flow (buyerId, dealId, status)
- Audit trails (createdAt, eventType)

**Potentially Missing Indexes:**
- `InsuranceQuote.quote_ref` (if used for lookups)
- `ContractDocument.documentType` (if filtered frequently)
- `DealDocument.type` (if filtered frequently)

---

## APPENDIX: Field Type Summary

| Type | Count | Examples |
|------|-------|----------|
| String (cuid) | 50+ | All PKs |
| String | 200+ | Text fields |
| Boolean | 40+ | Flags |
| DateTime | 80+ | Timestamps |
| Float | 60+ | Money, scores |
| Int | 30+ | Counts, years |
| Json | 20+ | Flexible data |
| String[] | 10+ | Arrays |
| Enum | 16 | Type safety |

---

**END OF INVENTORY**
