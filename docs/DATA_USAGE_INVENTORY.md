# Data Usage Inventory

**Document Version:** 1.0  
**Generated:** 2026-02-08  
**Purpose:** Comprehensive mapping of how the application uses database tables across all layers (services, APIs, UI).

---

## Executive Summary

This document maps every feature in the AutoLenis platform to its database representations:
- **50 database tables** across 18 subsystems
- **23 service files** implementing business logic
- **100+ API endpoints** across 7 major route groups
- **4 user roles** with distinct data access patterns

---

## 1. SERVICE LAYER DATA USAGE

### 1.1 Authentication & User Management

#### auth.service.ts
**Tables:** User, BuyerProfile, Dealer, Affiliate, Referral

| Operation | Tables Written | Tables Read | Columns Accessed | Role Access |
|-----------|----------------|-------------|------------------|-------------|
| signup | User, BuyerProfile/Dealer/Affiliate, Referral (if refCode) | User (email check) | email, passwordHash, role, firstName, lastName, is_email_verified | Public |
| signin | - | User | email, passwordHash, role, mfa_enrolled, mfa_secret | Public |
| getUserById | - | User, BuyerProfile, Dealer, Affiliate | id, email, role, firstName, lastName, phone | Self |

**Data Flow:**
1. User creation → cascade to role-specific profile (BuyerProfile/Dealer/Affiliate)
2. If referral code provided → create Referral record linking to Affiliate

---

#### email-verification.service.ts
**Tables:** User

| Operation | Tables Written | Tables Read | Role Access |
|-----------|----------------|-------------|-------------|
| verifyEmail | User | User | Public |

**Columns Updated:** `is_email_verified` → true

---

#### password-reset.service.ts
**Tables:** User

| Operation | Tables Written | Tables Read | Role Access |
|-----------|----------------|-------------|-------------|
| resetPassword | User | User | Public |

**Columns Updated:** `passwordHash`, `force_password_reset` → false

---

### 1.2 Pre-Qualification

#### prequal.service.ts
**Tables:** PreQualification, BuyerProfile, User

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| createPreQual | PreQualification, BuyerProfile (employment fields) | BuyerProfile | creditScore, creditTier, maxOtd, estimatedMonthlyMin/Max, dti, softPullCompleted, consentGiven, expiresAt | Buyer, Admin |
| getActivePreQual | - | PreQualification | All + buyer details | Buyer (self), Admin |
| updatePreQual | PreQualification | PreQualification | status, expiresAt, creditTier | Admin |

**Key Business Logic:**
- Expires after 90 days
- Soft pull consent required before credit check
- Determines `maxOtd` used in auction/financing

**Source of Truth:** Database (not derived)

---

### 1.3 Vehicle Discovery & Shortlisting

#### inventory.service.ts
**Tables:** InventoryItem, Vehicle, Dealer

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| searchInventory | - | InventoryItem, Vehicle, Dealer | price, mileage, year, make, model, bodyStyle, status, dealerId, images | Public |
| getInventoryItem | - | InventoryItem, Vehicle, Dealer | All vehicle and inventory details | Public |

**Filters Supported:**
- make, model, year range, maxMileage, maxPrice
- bodyStyle, isNew
- distance from buyer (requires geocoding)

**Source of Truth:** Database

---

#### shortlist.service.ts
**Tables:** Shortlist, ShortlistItem, InventoryItem, Vehicle, Dealer, PreQualification

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| addToShortlist | Shortlist (if first item), ShortlistItem | Shortlist, ShortlistItem, InventoryItem | shortlistId, inventoryItemId, notes, is_primary_choice, addedAt | Buyer (self) |
| getShortlist | - | Shortlist, ShortlistItem, InventoryItem, Vehicle, Dealer | All shortlist items with full vehicle details | Buyer (self), Admin |
| removeFromShortlist | ShortlistItem (soft delete via removed_at) | ShortlistItem | removed_at | Buyer (self) |
| updateShortlistItem | ShortlistItem | ShortlistItem | notes, is_primary_choice, status | Buyer (self) |

**Key Business Logic:**
- Auto-create shortlist on first item add
- Soft delete via `removed_at` timestamp (items not physically deleted)
- Shortlist required to start auction

**Source of Truth:** Database

---

### 1.4 Auctions & Bidding

#### auction.service.ts
**Tables:** Auction, AuctionParticipant, AuctionOffer, AuctionOfferFinancingOption, BuyerProfile, PreQualification, Shortlist, DepositPayment, InventoryItem, Vehicle, Dealer, ComplianceEvent

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| createAuction | Auction, AuctionParticipant (auto-invite dealers) | Shortlist, ShortlistItem, InventoryItem, Dealer, DepositPayment | buyerId, shortlistId, status=PENDING_DEPOSIT, startsAt, endsAt | Buyer (self) |
| startAuction | Auction | Auction, DepositPayment | status → ACTIVE, startsAt, endsAt | System (after deposit paid) |
| submitOffer | AuctionOffer, AuctionOfferFinancingOption, AuctionOffer (delete existing for dealer) | Auction, AuctionParticipant, InventoryItem | auctionId, participantId, inventoryItemId, cashOtd, taxAmount, feesBreakdown, apr, termMonths, monthlyPayment | Dealer (participant) |
| getAuctionOffers | - | AuctionOffer, AuctionOfferFinancingOption, InventoryItem, Vehicle, Dealer | All offer details with financing options | Buyer (auction owner), Admin |
| closeAuction | Auction | Auction | status → CLOSED, closedAt | System (timer) |

**Key Business Logic:**
- Auction requires $99 deposit (DepositPayment.status = SUCCEEDED)
- Only invited dealers can submit offers (AuctionParticipant)
- One offer per dealer (replaces existing)
- Silent auction: dealers can't see other offers
- Auto-closes after 48 hours

**Source of Truth:** Database (status transitions tracked)

---

#### offer.service.ts
**Tables:** AuctionOffer, AuctionOfferFinancingOption

| Operation | Tables Written | Tables Read | Role |
|-----------|----------------|-------------|------|
| createOffer | AuctionOffer, AuctionOfferFinancingOption | Dealer (self) |
| getOffersByAuction | - | AuctionOffer, AuctionOfferFinancingOption | Buyer (auction owner), Dealer (own offers), Admin |

**Columns:** cashOtd, taxAmount, feesBreakdown, apr, termMonths, downPayment, monthlyPayment

---

### 1.5 Best Price Engine

#### best-price.service.ts
**Tables:** BestPriceOption, Auction, AuctionOffer, AuctionOfferFinancingOption, InventoryItem, Vehicle, Dealer, PreQualification, BuyerPreferences, AdminSetting

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| computeBestPriceOptions | BestPriceOption (delete existing, create 3 new: BEST_CASH, BEST_MONTHLY, BALANCED) | Auction, AuctionOffer, AuctionOfferFinancingOption, PreQualification, AdminSetting | type, offerId, inventoryItemId, dealerId, cashOtd, monthlyPayment, score, rank, snapshot_json | System (triggered on auction close) |
| getBestPriceOptions | - | BestPriceOption, AuctionOffer, InventoryItem, Vehicle, Dealer | All with full offer/vehicle details | Buyer (auction owner) |
| declineOption | BestPriceOption | BestPriceOption | is_declined → true, declined_at | Buyer (auction owner) |

**Algorithm:**
- BEST_CASH: Lowest cashOtd
- BEST_MONTHLY: Lowest monthlyPayment (if financing)
- BALANCED: Weighted score (70% monthly, 30% cash)
- Considers dealer integrityScore
- Excludes declined options

**Source of Truth:** Computed from AuctionOffer, persisted to DB

---

### 1.6 Deal Selection & Financing

#### deal.service.ts
**Tables:** SelectedDeal, FinancingOffer, BestPriceOption, AuctionOffer, InventoryItem, Auction, ServiceFeePayment, InsurancePolicy, ContractShieldScan, ESignEnvelope, PickupAppointment, TradeIn

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| selectDeal | SelectedDeal, FinancingOffer, Auction (status), InventoryItem (status), BestPriceOption (other options declined) | BestPriceOption, AuctionOffer | buyerId, auctionId, offerId, inventoryItemId, dealerId, status=SELECTED, cashOtd, taxAmount, feesBreakdown | Buyer (auction owner) |
| getDeal | - | SelectedDeal, AuctionOffer, InventoryItem, Vehicle, Dealer, BuyerProfile, FinancingOffer, ServiceFeePayment, InsurancePolicy, ContractShieldScan, ESignEnvelope, PickupAppointment, TradeIn | All deal details with related entities | Buyer (deal owner), Dealer (deal participant), Admin |
| updateDealStatus | SelectedDeal | SelectedDeal | status, updatedAt | Admin, System |
| getDealsByBuyer | - | SelectedDeal, AuctionOffer, InventoryItem, Vehicle | buyer's deals | Buyer (self), Admin |

**Deal Status Flow:**
1. SELECTED → 2. FINANCING_PENDING → 3. FINANCING_APPROVED → 4. FEE_PENDING → 5. FEE_PAID → 6. INSURANCE_PENDING → 7. INSURANCE_COMPLETE → 8. CONTRACT_PENDING → 9. CONTRACT_REVIEW → 10. CONTRACT_APPROVED → 11. SIGNING_PENDING → 12. SIGNED → 13. PICKUP_SCHEDULED → 14. COMPLETED

**Source of Truth:** Database (status is persisted, not UI-only)

---

### 1.7 Payments

#### payment.service.ts
**Tables:** DepositPayment, ServiceFeePayment, FeeFinancingDisclosure, LenderFeeDisbursement, SelectedDeal, Auction, Commission, Affiliate, Referral, ComplianceEvent

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| createDepositPayment | DepositPayment, ComplianceEvent | - | buyerId, auctionId, amount=9900 cents, status=PENDING, stripePaymentIntentId | Buyer |
| confirmDepositPayment | DepositPayment, Auction (status), ComplianceEvent | DepositPayment | status → SUCCEEDED, Auction.status → ACTIVE | System (Stripe webhook) |
| refundDeposit | DepositPayment, ComplianceEvent | DepositPayment | refunded → true, refundedAt, refundReason, status → REFUNDED | Admin, System (non-winning bidders) |
| createServiceFeePayment | ServiceFeePayment, Commission (if affiliate referral), ComplianceEvent | SelectedDeal, DepositPayment, Referral, Affiliate | dealId, baseFeeCents, depositAppliedCents, remainingCents, method, status | Buyer |
| confirmServiceFeePayment | ServiceFeePayment, SelectedDeal (status), Commission, Affiliate, ComplianceEvent | ServiceFeePayment, Commission | status → SUCCEEDED, SelectedDeal.status → FEE_PAID, Commission.status → PAID | System (Stripe webhook) |
| createFeeFinancingDisclosure | FeeFinancingDisclosure | ServiceFeePayment | feeAmount, apr, termMonths, monthlyIncrease, totalExtraCost, consentGiven, consentTimestamp, ipAddress, userAgent | Buyer (selecting LOAN_INCLUSION) |

**Key Business Logic:**
- Deposit: $99 (refunded if buyer doesn't win auction)
- Service Fee: $499 (Premium plan flat fee)
- Deposit credits toward service fee
- Fee can be financed or paid directly
- Affiliate commissions triggered on fee payment

**Source of Truth:** Database + Stripe (payment intent status)

---

### 1.8 Insurance

#### insurance.service.ts
**Tables:** InsuranceQuote, InsurancePolicy, SelectedDeal, BuyerProfile, Vehicle

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| requestQuotes | InsuranceQuote (multiple carriers) | SelectedDeal, BuyerProfile, Vehicle | buyerId, vehicleId, carrier, productName, monthlyPremium, sixMonthPremium, coverageLimits, deductibles, quoteRef, validUntil | Buyer (deal owner) |
| getQuotes | - | InsuranceQuote | All quote details | Buyer (deal owner), Admin |
| selectQuote | InsurancePolicy, SelectedDeal (status) | InsuranceQuote | dealId, carrier, productName, policyNumber, status=POLICY_SELECTED, monthlyPremium, effectiveDate, expirationDate, documentUrl | Buyer (deal owner) |
| bindPolicy | InsurancePolicy, SelectedDeal (status) | InsurancePolicy, InsuranceQuote | status → POLICY_BOUND, policyNumber, documentUrl, SelectedDeal.status → INSURANCE_COMPLETE | System (provider callback) |
| uploadExternalPolicy | InsurancePolicy, SelectedDeal (status) | SelectedDeal | dealId, status=EXTERNAL_UPLOADED, carrier, policyNumber, documentUrl, SelectedDeal.status → INSURANCE_COMPLETE | Buyer (deal owner) |

**Insurance Providers (Mock):**
- Progressive, Geico, State Farm
- Full Coverage, Liability Only

**Columns with Redundancy (CRITICAL FINDING):**
- InsuranceQuote: carrier/carrier_name, productName/product_name, monthlyPremium/monthly_premium/premium_monthly_cents
- InsurancePolicy: dealId/deal_id/selected_deal_id, carrier/carrier_name, policyNumber/policy_number/policy_number_v2

**Source of Truth:** Database (external provider data cached)

---

### 1.9 Contract Shield

#### contract-shield.service.ts
**Tables:** ContractDocument, ContractShieldScan, FixListItem, ContractShieldOverride, ContractShieldRule, ContractShieldNotification, ContractShieldReconciliation, SelectedDeal, Dealer, User

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| uploadDocument | ContractDocument, ContractShieldScan (create if not exists) | ContractDocument | dealId, dealerId, documentType, documentUrl, version, ContractShieldScan.status=PENDING | Dealer, Admin |
| scanDocument | ContractShieldScan, FixListItem (multiple), ContractDocument | ContractDocument, SelectedDeal, FinancingOffer | status=SCANNING→ISSUES_FOUND/PASSED, aprMatch, paymentMatch, otdMatch, junkFeesDetected, missingAddendums, overallScore, FixListItem records | System (triggered after upload) |
| getFixList | - | FixListItem, ContractShieldScan | category, description, severity, expectedFix, resolved | Buyer (deal owner), Dealer, Admin |
| resolveFixItem | FixListItem | FixListItem | resolved → true | Dealer |
| overrideScan | ContractShieldOverride, ContractShieldScan | ContractShieldScan | scanId, adminId, action=FORCE_PASS/FORCE_FAIL, reason, previousStatus, newStatus, ContractShieldScan.status | Admin |
| acknowledgeOverride | ContractShieldOverride | ContractShieldOverride | buyerAcknowledged → true, buyerAckAt, buyerAckComment | Buyer (deal owner) |

**Scan Checks:**
- APR match (contract vs financing offer)
- Monthly payment match
- Out-the-door total match
- Junk fees detection (nitrogen tire, vin etching, market adjustment, etc.)
- Missing required addendums

**Source of Truth:** Database (scan results persisted)

---

### 1.10 E-Signature

#### esign.service.ts
**Tables:** ESignEnvelope, SelectedDeal, ContractDocument

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| createEnvelope | ESignEnvelope, SelectedDeal (status) | SelectedDeal, ContractDocument | dealId, providerId, providerEnvelopeId, status=CREATED, documentsUrl, signUrl, SelectedDeal.status=SIGNING_PENDING | Admin, System |
| sendEnvelope | ESignEnvelope | ESignEnvelope | status → SENT, sentAt, signUrl | Admin, System |
| trackEnvelopeStatus | ESignEnvelope, SelectedDeal | ESignEnvelope | status, viewedAt, signedAt, completedAt, SelectedDeal.status → SIGNED/COMPLETED | System (provider webhook) |

**Providers:** DocuSign (configured), HelloSign (planned)

**Source of Truth:** Database + Provider (envelope status synced)

---

### 1.11 Pickup Scheduling

#### pickup.service.ts
**Tables:** PickupAppointment, SelectedDeal, BuyerProfile, Dealer

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| schedulePickup | PickupAppointment, SelectedDeal (status) | SelectedDeal | dealId, buyerId, dealerId, scheduledDate, scheduledTime, qrCode, status=SCHEDULED, SelectedDeal.status=PICKUP_SCHEDULED | Buyer (deal owner), Admin |
| confirmPickup | PickupAppointment | PickupAppointment | status → CONFIRMED | Dealer |
| markArrived | PickupAppointment | PickupAppointment (via qrCode) | status → BUYER_ARRIVED, arrivedAt | Dealer (scans QR) |
| completePickup | PickupAppointment, SelectedDeal (status) | PickupAppointment | status → COMPLETED, completedAt, SelectedDeal.status → COMPLETED | Dealer |

**Source of Truth:** Database (appointment tracked)

---

### 1.12 Affiliate System

#### affiliate.service.ts
**Tables:** Affiliate, Referral, Commission, Payout, Click, User, ServiceFeePayment

| Operation | Tables Written | Tables Read | Columns | Role |
|-----------|----------------|-------------|---------|------|
| createAffiliate | Affiliate, User | User | userId, referralCode, firstName, lastName, totalEarnings=0, pendingEarnings=0 | Buyer (self-enroll) |
| trackClick | Click | Affiliate (via refCode) | affiliateId, ipAddress, userAgent, referer, clickedAt | Public (tracking pixel) |
| createReferral | Referral | Affiliate, User | affiliateId, referredUserId, referredBuyerId, level=1, dealCompleted=false | System (on signup with refCode) |
| calculateCommissions | Commission (multi-level up to 3), Affiliate, Referral | Referral, ServiceFeePayment, Affiliate | affiliateId, referralId, level, dealId, baseAmount, commissionRate, commissionAmount, status=PENDING | System (on ServiceFeePayment.status=SUCCEEDED) |
| requestPayout | Payout, Affiliate | Affiliate, Commission | affiliateId, amount, status=PENDING, paymentMethod, Affiliate.pendingEarnings → 0 | Affiliate |
| processPayout | Payout, Commission, Affiliate | Payout | status → SUCCEEDED, paidAt, paymentId, Commission.status → PAID, Affiliate.totalEarnings += amount | Admin, System |

**Commission Tiers:**
- Level 1: 15% of service fee
- Level 2: 3%
- Level 3: 2%

**Source of Truth:** Database (commissions calculated on fee payment)

---

### 1.13 Admin Services

#### admin.service.ts
**Tables:** User, BuyerProfile, Dealer, Auction, SelectedDeal, ServiceFeePayment, DepositPayment, Payout, Affiliate, Commission, Referral, InsuranceQuote, InsurancePolicy, ContractShieldScan, ComplianceEvent

| Operation | Tables Read | Aggregations | Role |
|-----------|-------------|--------------|------|
| getDashboardStats | All major tables | User counts by role, revenue totals, active auctions, completed deals, pending payouts, insurance quotes | Admin |
| getRevenueReport | ServiceFeePayment, DepositPayment | Total collected, pending, refunded by date range | Admin |
| getAffiliateReport | Affiliate, Commission, Payout, Referral | Total affiliates, active, total earnings, pending payouts, conversion rates | Admin |
| getComplianceLog | ComplianceEvent | All events with filters by type, severity, date range | Admin |

**Source of Truth:** Database (read-only aggregations)

---

### 1.14 Dealer Services

#### dealer.service.ts
**Tables:** Dealer, InventoryItem, Vehicle, Auction, AuctionParticipant, AuctionOffer, SelectedDeal, ContractDocument, PickupAppointment

| Operation | Tables Written | Tables Read | Role |
|-----------|----------------|-------------|------|
| getDealerDashboard | - | All dealer-related tables | Dealer (self) |
| addInventory | InventoryItem, Vehicle | Dealer | Dealer (self) |
| updateInventory | InventoryItem | InventoryItem | Dealer (self) |

---

#### dealer-approval.service.ts
**Tables:** DealerApplication, Dealer, User

| Operation | Tables Written | Tables Read | Role |
|-----------|----------------|-------------|------|
| submitApplication | DealerApplication | - | Dealer applicant |
| approveDealer | Dealer, User | DealerApplication | Admin |
| rejectDealer | DealerApplication | DealerApplication | Admin |

---

## 2. API ROUTES DATA USAGE

### 2.1 Admin APIs

**Base Path:** `/api/admin/`  
**Role Required:** ADMIN

| Endpoint | Method | Service/Tables | Operation | Key Columns |
|----------|--------|----------------|-----------|-------------|
| `/dashboard` | GET | admin.service, All tables | READ | Aggregate stats |
| `/deals` | GET | SelectedDeal, BuyerProfile, Dealer, Vehicle | READ | All deal fields |
| `/deals/[dealId]` | GET, PUT | SelectedDeal, all related | READ/WRITE | status updates |
| `/deals/[dealId]/insurance` | GET, POST | InsurancePolicy | READ/WRITE | Verify external insurance |
| `/deals/[dealId]/status` | PUT | SelectedDeal | WRITE | status |
| `/buyers` | GET | User, BuyerProfile, PreQualification | READ | All buyer fields |
| `/buyers/[id]/prequal` | GET, PUT | PreQualification | READ/WRITE | credit data |
| `/payments` | GET | DepositPayment, ServiceFeePayment | READ | All payment fields |
| `/payments/refund` | POST | DepositPayment | WRITE | refund operations |
| `/trade-ins` | GET | TradeIn | READ | All trade-in fields |
| `/contract-shield/overrides` | GET, POST | ContractShieldOverride | READ/WRITE | Manual approvals |
| `/contract-shield/rules` | GET, POST, PUT | ContractShieldRule | READ/WRITE | Rule configuration |

---

### 2.2 Buyer APIs

**Base Path:** `/api/buyer/`  
**Role Required:** BUYER (self-data only)

| Endpoint | Method | Service/Tables | Operation | Key Columns |
|----------|--------|----------------|-----------|-------------|
| `/profile` | GET, PUT | BuyerProfile | READ/WRITE | All profile fields |
| `/dashboard` | GET | buyer.service, multiple tables | READ | Aggregated buyer data |
| `/deals` | GET | SelectedDeal | READ | Own deals only |
| `/auction` | GET, POST | auction.service | READ/WRITE | Create/view auctions |
| `/shortlist` | GET, POST, DELETE | shortlist.service | READ/WRITE | Shortlist management |

---

### 2.3 Dealer APIs

**Base Path:** `/api/dealer/`  
**Role Required:** DEALER, DEALER_USER

| Endpoint | Method | Service/Tables | Operation | Key Columns |
|----------|--------|----------------|-----------|-------------|
| `/dashboard` | GET | dealer.service | READ | Dealer-specific aggregates |
| `/inventory` | GET, POST, PUT | InventoryItem, Vehicle | READ/WRITE | Own inventory |
| `/auctions` | GET | Auction, AuctionParticipant | READ | Invited auctions |
| `/offers` | POST | AuctionOffer | WRITE | Submit offers |
| `/documents` | GET, POST | ContractDocument | READ/WRITE | Upload contracts |

---

### 2.4 Affiliate APIs

**Base Path:** `/api/affiliate/`  
**Role Required:** AFFILIATE, BUYER (self-enroll)

| Endpoint | Method | Service/Tables | Operation | Key Columns |
|----------|--------|----------------|-----------|-------------|
| `/referrals` | GET | Referral, Commission | READ | Own referrals |
| `/commissions` | GET | Commission | READ | Own commissions |
| `/payouts` | GET, POST | Payout | READ/WRITE | Request payouts |
| `/analytics` | GET | Click, Referral, Commission | READ | Performance data |

---

### 2.5 Payment APIs

**Base Path:** `/api/payments/`  
**Role Required:** BUYER (own payments)

| Endpoint | Method | Service/Tables | Operation | Key Columns |
|----------|--------|----------------|-----------|-------------|
| `/deposit` | POST | payment.service, DepositPayment | WRITE | Create deposit payment |
| `/fee` | POST | payment.service, ServiceFeePayment | WRITE | Create fee payment |
| `/confirm` | POST | payment.service, DepositPayment/ServiceFeePayment | WRITE | Confirm payment (webhook) |

---

### 2.6 Insurance APIs

**Base Path:** `/api/insurance/`  
**Role Required:** BUYER (deal owner)

| Endpoint | Method | Service/Tables | Operation | Key Columns |
|----------|--------|----------------|-----------|-------------|
| `/quotes` | POST | insurance.service, InsuranceQuote | WRITE | Request quotes |
| `/select` | POST | insurance.service, InsurancePolicy | WRITE | Select and bind policy |
| `/upload` | POST | insurance.service, InsurancePolicy | WRITE | Upload external policy |

---

### 2.7 Document APIs

**Base Path:** `/api/documents/`  
**Role Required:** BUYER (owner), DEALER, ADMIN

| Endpoint | Method | Service/Tables | Operation | Key Columns |
|----------|--------|----------------|-----------|-------------|
| `/` | GET, POST | DealDocument, DocumentRequest | READ/WRITE | Upload/list documents |
| `/[documentId]` | GET, DELETE | DealDocument | READ/WRITE | Download/delete document |

---

## 3. UI/PAGE LAYER DATA USAGE

### 3.1 Buyer Pages

| Page Path | Data Fetched | Services/APIs Used | Columns Displayed |
|-----------|-------------|-------------------|-------------------|
| `/buyer/dashboard` | BuyerProfile, PreQualification, Shortlist count, Auction count, Deal count | buyer.service | firstName, lastName, preQual status, shortlist count, active auctions |
| `/buyer/profile` | BuyerProfile | BuyerProfile API | All profile fields |
| `/buyer/prequal` | PreQualification | prequal.service | creditTier, maxOtd, estimatedMonthly range, expiresAt |
| `/buyer/inventory` | InventoryItem, Vehicle, Dealer | inventory.service | Vehicle details, price, dealer info |
| `/buyer/shortlist` | Shortlist, ShortlistItem, InventoryItem, Vehicle | shortlist.service | Shortlisted vehicles with details |
| `/buyer/auction/[id]` | Auction, BestPriceOption, AuctionOffer | auction.service, best-price.service | Auction status, best price options |
| `/buyer/deal/[id]` | SelectedDeal, all related entities | deal.service | Full deal details, financing, insurance, contract, pickup |
| `/buyer/documents` | DealDocument, DocumentRequest | document APIs | Uploaded docs, requested docs |

---

### 3.2 Dealer Pages

| Page Path | Data Fetched | Services/APIs Used | Columns Displayed |
|-----------|-------------|-------------------|-------------------|
| `/dealer/dashboard` | Dealer, InventoryItem count, Auction count, SelectedDeal count | dealer.service | Business stats, active auctions, pending offers |
| `/dealer/inventory` | InventoryItem, Vehicle | inventory APIs | Own inventory list |
| `/dealer/auctions` | Auction, AuctionParticipant, AuctionOffer | auction.service | Invited auctions, submitted offers |
| `/dealer/deals` | SelectedDeal (where dealerId) | deal.service | Deals involving dealer's inventory |
| `/dealer/contracts` | ContractDocument | contract APIs | Uploaded contracts, scan results |

---

### 3.3 Admin Pages

| Page Path | Data Fetched | Services/APIs Used | Columns Displayed |
|-----------|-------------|-------------------|-------------------|
| `/admin/dashboard` | All aggregates | admin.service | Revenue, user counts, system stats |
| `/admin/buyers` | User, BuyerProfile, PreQualification | admin APIs | All buyers with prequal status |
| `/admin/dealers` | Dealer, InventoryItem count | admin APIs | All dealers with verification status |
| `/admin/deals` | SelectedDeal, all related | admin APIs | All deals with full details |
| `/admin/payments` | DepositPayment, ServiceFeePayment | admin APIs | All payments, refunds |
| `/admin/affiliates` | Affiliate, Commission, Payout | admin APIs | Affiliate performance, payouts |
| `/admin/contract-shield` | ContractShieldScan, ContractShieldRule, ContractShieldOverride | contract-shield.service | All scans, rules, overrides |

---

### 3.4 Affiliate Pages

| Page Path | Data Fetched | Services/APIs Used | Columns Displayed |
|-----------|-------------|-------------------|-------------------|
| `/affiliate/dashboard` | Affiliate, Referral count, Commission sum, Payout sum | affiliate.service | Earnings, pending, paid |
| `/affiliate/referrals` | Referral, Commission | affiliate APIs | Referral tree, commission by level |
| `/affiliate/payouts` | Payout | affiliate APIs | Payout history |

---

## 4. FEATURE-TO-DATABASE MAPPING

### 4.1 Buyer Deal Flow

**Feature:** Complete journey from signup to vehicle pickup

| Step | UI Action | Tables Written | Tables Read | Status Transition |
|------|-----------|----------------|-------------|-------------------|
| 1. Signup | Create account | User, BuyerProfile, Referral (if refCode) | - | - |
| 2. Pre-Qualification | Submit financial info | PreQualification, BuyerProfile (employment) | - | - |
| 3. Browse Inventory | Search vehicles | - | InventoryItem, Vehicle, Dealer | - |
| 4. Create Shortlist | Add to shortlist | Shortlist, ShortlistItem | InventoryItem | - |
| 5. Start Auction | Initiate auction | Auction, AuctionParticipant | Shortlist, ShortlistItem | Auction.status: PENDING_DEPOSIT |
| 6. Pay Deposit | Submit $99 deposit | DepositPayment | - | DepositPayment.status: SUCCEEDED, Auction.status: ACTIVE |
| 7. Wait for Offers | Dealers submit bids | AuctionOffer, AuctionOfferFinancingOption | Auction | - |
| 8. Auction Closes | Auto-close after 48h | Auction, BestPriceOption | AuctionOffer | Auction.status: CLOSED |
| 9. View Best Prices | See top 3 options | - | BestPriceOption, AuctionOffer, InventoryItem, Vehicle | - |
| 10. Select Deal | Choose best option | SelectedDeal, FinancingOffer, Auction, InventoryItem | BestPriceOption | SelectedDeal.status: SELECTED, Auction.status: COMPLETED, InventoryItem.status: RESERVED |
| 11. Pay Service Fee | Submit $499 | ServiceFeePayment, Commission (multi-level), Affiliate, SelectedDeal | SelectedDeal | ServiceFeePayment.status: SUCCEEDED, SelectedDeal.status: FEE_PAID |
| 12. Get Insurance | Select insurance quote | InsurancePolicy, SelectedDeal | InsuranceQuote | InsurancePolicy.status: POLICY_BOUND, SelectedDeal.status: INSURANCE_COMPLETE |
| 13. Contract Review | Upload/scan contract | ContractDocument, ContractShieldScan, FixListItem | SelectedDeal, FinancingOffer | ContractShieldScan.status: SCANNING → PASSED/ISSUES_FOUND, SelectedDeal.status: CONTRACT_REVIEW |
| 14. E-Sign | Sign contract | ESignEnvelope, SelectedDeal | ContractDocument | ESignEnvelope.status: SIGNED, SelectedDeal.status: SIGNED |
| 15. Schedule Pickup | Choose pickup time | PickupAppointment, SelectedDeal | SelectedDeal | PickupAppointment.status: SCHEDULED, SelectedDeal.status: PICKUP_SCHEDULED |
| 16. Complete Pickup | Arrive and collect | PickupAppointment, SelectedDeal | PickupAppointment (via QR) | PickupAppointment.status: COMPLETED, SelectedDeal.status: COMPLETED |

**Source of Truth:** Database (every status transition persisted)

---

### 4.2 Insurance Feature

**Feature:** Insurance quote request → selection → binding

| Step | Tables Touched | Columns Read | Columns Written | Source of Truth |
|------|----------------|--------------|-----------------|-----------------|
| Request Quotes | InsuranceQuote, BuyerProfile, Vehicle, SelectedDeal | buyerId, firstName, lastName, address, vehicleId, make, model, year, vin | buyerId, vehicleId, carrier, productName, monthlyPremium, sixMonthPremium, coverageLimits, deductibles, quoteRef, validUntil | DB (provider responses cached) |
| View Quotes | InsuranceQuote | All quote fields | - | DB |
| Select Quote | InsurancePolicy, InsuranceQuote, SelectedDeal | quoteRef, carrier, productName, monthlyPremium | dealId, carrier, productName, policyNumber, status, monthlyPremium, effectiveDate, expirationDate, documentUrl, SelectedDeal.status | DB |
| Upload External | InsurancePolicy, SelectedDeal | - | dealId, status=EXTERNAL_UPLOADED, carrier, policyNumber, documentUrl, SelectedDeal.status | DB |

**Data Flow:**
1. Buyer completes deal selection (SelectedDeal created)
2. Request insurance quotes (InsuranceQuote records created)
3. Select quote (InsurancePolicy created, linked to dealId)
4. Bind policy (InsurancePolicy.status updated, documentUrl added)
5. Deal progresses (SelectedDeal.status → INSURANCE_COMPLETE)

**Redundant Columns (CRITICAL):**
- InsuranceQuote has 15+ duplicate field variants
- InsurancePolicy has 12+ duplicate field variants
- Example: `carrier` vs `carrier_name`, `monthlyPremium` vs `monthly_premium` vs `premium_monthly_cents`

**Writes Persist:** Yes  
**Reads Reflect Source of Truth:** Yes  
**Status Transitions DB-Backed:** Yes

---

### 4.3 Financing Feature

**Feature:** Financing offer display → selection → approval

| Step | Tables Touched | Columns Read | Columns Written | Source of Truth |
|------|----------------|--------------|-----------------|-----------------|
| View Financing Options | AuctionOfferFinancingOption, AuctionOffer | apr, termMonths, downPayment, monthlyPayment | - | DB (dealer-provided) |
| Select Deal with Financing | FinancingOffer, SelectedDeal | AuctionOfferFinancingOption fields | dealId, lenderName, apr, termMonths, downPayment, monthlyPayment, totalFinanced, approved | DB |
| Lender Approval | FinancingOffer | - | approved → true | DB |

**Data Flow:**
1. Dealer submits offer with financing options (AuctionOfferFinancingOption records)
2. Buyer selects deal (FinancingOffer created from chosen option)
3. Lender approves (FinancingOffer.approved updated)
4. Deal progresses (SelectedDeal.status → FINANCING_APPROVED)

**Writes Persist:** Yes  
**Reads Reflect Source of Truth:** Yes  
**Status Transitions DB-Backed:** Yes

---

### 4.4 Documents Feature

**Feature:** Document upload → request → review

| Step | Tables Touched | Columns Read | Columns Written | Source of Truth |
|------|----------------|--------------|-----------------|-----------------|
| Upload Document | DealDocument | - | ownerUserId, dealId, type, fileName, mimeType, fileSize, fileUrl, status=UPLOADED | DB + Storage (file URL) |
| Request Document | DocumentRequest, DealDocument | dealId, buyerId | dealId, buyerId, requestedByUserId, requestedByRole, type, required, notes, dueDate, status=REQUESTED | DB |
| Fulfill Request | DealDocument, DocumentRequest | DocumentRequest fields | DealDocument (with requestId), DocumentRequest.status → UPLOADED | DB |
| Approve/Reject | DealDocument, DocumentRequest | - | DealDocument.status → APPROVED/REJECTED, DocumentRequest.status, DocumentRequest.decidedAt, decidedByUserId | DB |

**Data Flow:**
1. Dealer/Admin requests document (DocumentRequest created)
2. Buyer uploads document (DealDocument created, linked to requestId)
3. Dealer/Admin reviews (DealDocument.status updated)

**Writes Persist:** Yes  
**Reads Reflect Source of Truth:** Yes

---

### 4.5 Auctions Feature

**Feature:** Silent reverse auction

| Step | Tables Touched | Columns Read | Columns Written | Source of Truth |
|------|----------------|--------------|-----------------|-----------------|
| Create Auction | Auction, AuctionParticipant, Shortlist, ShortlistItem, InventoryItem, Dealer | Shortlist, ShortlistItem, InventoryItem, Dealer | buyerId, shortlistId, status=PENDING_DEPOSIT, AuctionParticipant records | DB |
| Pay Deposit | DepositPayment, Auction | Auction | DepositPayment record, Auction.status → ACTIVE, startsAt, endsAt | DB |
| Submit Offer | AuctionOffer, AuctionOfferFinancingOption, AuctionParticipant | Auction, AuctionParticipant | auctionId, participantId, inventoryItemId, cashOtd, taxAmount, feesBreakdown, financing options | DB |
| Close Auction | Auction, BestPriceOption | Auction, AuctionOffer, AuctionOfferFinancingOption | Auction.status → CLOSED, closedAt, BestPriceOption records | DB |

**Data Flow:**
1. Buyer creates shortlist
2. Buyer initiates auction (Auction + AuctionParticipant records)
3. Buyer pays deposit (Auction.status → ACTIVE)
4. Dealers submit offers (AuctionOffer records)
5. Auction closes after 48h (Auction.status → CLOSED)
6. System computes best prices (BestPriceOption records)

**Writes Persist:** Yes  
**Reads Reflect Source of Truth:** Yes  
**Status Transitions DB-Backed:** Yes

---

### 4.6 Admin Dashboards

**Feature:** Admin analytics and management

| Dashboard | Tables Read | Aggregations | Filters | Source of Truth |
|-----------|-------------|--------------|---------|-----------------|
| Revenue | ServiceFeePayment, DepositPayment | SUM(amount), COUNT(*) by status | Date range, payment type | DB |
| Users | User, BuyerProfile, Dealer, Affiliate | COUNT(*) by role, verified | Date range, role | DB |
| Deals | SelectedDeal, AuctionOffer, InventoryItem, Vehicle | COUNT(*) by status, AVG(cashOtd) | Date range, status, dealer | DB |
| Affiliates | Affiliate, Commission, Payout, Referral | SUM(commissionAmount), COUNT(referrals), conversion rate | Date range, affiliate, level | DB |
| Compliance | ComplianceEvent | COUNT(*) by eventType, severity | Date range, user, eventType | DB |

**Data Flow:** Read-only aggregations, no writes

**Source of Truth:** Database

---

### 4.7 Dealer Dashboards

**Feature:** Dealer performance tracking

| Dashboard | Tables Read | Aggregations | Filters | Source of Truth |
|-----------|-------------|--------------|---------|-----------------|
| Inventory | InventoryItem, Vehicle | COUNT(*) by status | Dealer (self) | DB |
| Auctions | Auction, AuctionParticipant, AuctionOffer | COUNT(*) active, pending, closed | Dealer (self) | DB |
| Deals | SelectedDeal, AuctionOffer, InventoryItem | COUNT(*) by status, revenue | Dealer (self) | DB |
| Performance | SelectedDeal, AuctionOffer, AuctionParticipant | Win rate, avg sale price, integrityScore | Dealer (self) | DB |

**Data Flow:** Read-only aggregations, no writes

**Source of Truth:** Database

---

## 5. ROLE-BASED ACCESS SUMMARY

| Role | Tables Can Read (Own Data) | Tables Can Write | Tables Can Read (All Data) | Admin-Only Tables |
|------|----------------------------|------------------|----------------------------|-------------------|
| **BUYER** | User (self), BuyerProfile (self), PreQualification (self), Shortlist (self), ShortlistItem (self), Auction (self), BestPriceOption (self), SelectedDeal (self), FinancingOffer (self), ServiceFeePayment (self), InsuranceQuote (self), InsurancePolicy (self), ContractDocument (self), ESignEnvelope (self), PickupAppointment (self), TradeIn (self), DealDocument (self), DocumentRequest (self), DepositPayment (self) | BuyerProfile, PreQualification (via admin), Shortlist, ShortlistItem, Auction, DepositPayment, SelectedDeal (select only), ServiceFeePayment, InsurancePolicy, TradeIn, DealDocument, ContractShieldOverride (acknowledge) | - | - |
| **DEALER** | User (self), Dealer (self), InventoryItem (self), Vehicle (self inventory), Auction (participated), AuctionParticipant (self), AuctionOffer (self), SelectedDeal (own inventory), ContractDocument (self), ContractShieldScan (self), PickupAppointment (own deals), DealDocument (own deals) | InventoryItem, Vehicle, AuctionOffer, AuctionOfferFinancingOption, ContractDocument, PickupAppointment (status), FixListItem (resolve) | - | - |
| **AFFILIATE** | User (self), Affiliate (self), Referral (self), Click (self), Commission (self), Payout (self) | Payout (request) | - | - |
| **ADMIN** | All tables | All tables (full CRUD) | All tables | ContractShieldRule, ContractShieldOverride, AdminSetting, ComplianceEvent, PaymentProviderEvent, ContractShieldReconciliation |

---

## 6. CRITICAL FINDINGS

### 6.1 Column Redundancy

**InsuranceQuote:**
- `buyerId` / `buyer_id`
- `vehicleId` / `vehicle_id`
- `carrier` / `carrier_name` / `provider_name`
- `productName` / `product_name`
- `monthlyPremium` / `monthly_premium` / `premium_monthly_cents`
- `sixMonthPremium` / `six_month_premium` / `premium_semi_annual_cents`
- `coverageLimits` / `coverage_limits` / `coverageJson` / `coverage_json`
- `expiresAt` / `valid_until`

**InsurancePolicy:**
- `dealId` / `deal_id` / `selected_deal_id`
- `userId` / `user_id`
- `carrier` / `carrier_name`
- `policyNumber` / `policy_number` / `policy_number_v2`
- `coverageType` / `coverage_type`
- `monthlyPremium` / `monthly_premium`
- `effectiveDate` / `startDate` / `start_date`
- `expirationDate` / `endDate` / `end_date`
- `documentUrl` / `document_url`

**Impact:** Service layer uses inconsistent field names, creating confusion and potential bugs.

---

### 6.2 Legacy Fields

**SelectedDeal:**
- `insurance_status` (String) - should use InsurancePolicy relationship
- `user_id` (String) - should use buyerId

**Impact:** These fields may be used by legacy code paths, creating dual sources of truth.

---

### 6.3 Missing RLS Policies

31 tables lack RLS policies, including sensitive ones:
- PreQualification
- DepositPayment
- ServiceFeePayment
- ESignEnvelope
- ContractShieldScan
- FeeFinancingDisclosure
- DocumentRequest

**Impact:** If client-side queries are used, users could access data they shouldn't.

---

### 6.4 Orphaned RLS Policies

RLS policies reference tables that don't exist in Prisma:
- `Offer` (should be AuctionOffer)
- `Contract` (should be ContractDocument)

**Impact:** These policies have no effect and create confusion.

---

## 7. VERIFICATION CHECKLIST

✅ **UI → API → Service → DB path exists:** Yes for all major features  
✅ **Writes persist correctly:** Yes, all write operations commit to DB  
✅ **Reads reflect correct source of truth:** Yes, all reads from DB (except computed BestPriceOption)  
✅ **Status transitions are DB-backed:** Yes, all status fields persisted  
⚠️ **Column naming consistency:** No, insurance tables have significant redundancy  
⚠️ **RLS coverage:** No, 31 tables without policies  
⚠️ **Legacy field usage:** Unknown, requires runtime analysis  

---

**END OF INVENTORY**
