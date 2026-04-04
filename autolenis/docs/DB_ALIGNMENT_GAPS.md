# Database Alignment Gaps

**Document Version:** 1.0  
**Generated:** 2026-02-08  
**Purpose:** Identify all mismatches between database schema, code usage, RLS policies, and feature requirements.

---

## Executive Summary

**Alignment Status:** ⚠️ **Aligned with known exceptions**

This audit identified:
- **3 critical mismatches** requiring immediate attention
- **31 tables without RLS policies** (potential security risk)
- **2 orphaned RLS policies** referencing non-existent tables
- **40+ redundant/duplicate columns** in insurance tables
- **2 legacy fields** in SelectedDeal that may cause dual source of truth issues

---

## 1. SCHEMA vs CODE MISMATCHES

### 1.1 Insurance Table Column Redundancy

**Severity:** 🔴 **CRITICAL**  
**Type:** Schema Design Issue  
**Impact:** High - Confusion, potential bugs, wasted storage

**Tables Affected:**
- `InsuranceQuote`
- `InsurancePolicy`

#### InsuranceQuote Redundant Columns

| Core Field | Duplicate Variants | Used By | Evidence |
|------------|-------------------|---------|----------|
| `buyerId` | `buyer_id` | Service layer (insurance.service.ts) | Both columns exist, creating ambiguity |
| `vehicleId` | `vehicle_id` | Service layer | Both columns exist |
| `carrier` | `carrier_name`, `provider_name` | Service layer | Three variants of same data |
| `productName` | `product_name` | Service layer | camelCase + snake_case |
| `monthlyPremium` | `monthly_premium`, `premium_monthly_cents` | Service layer | Float + snake_case + cents variant |
| `sixMonthPremium` | `six_month_premium`, `premium_semi_annual_cents` | Service layer | Multiple variants |
| `coverageLimits` | `coverage_limits`, `coverageJson`, `coverage_json` | Service layer | Four variants of JSON coverage data |
| `expiresAt` | `valid_until` | Service layer | DateTime duplicate |

**Total Redundant Columns:** 15+

#### InsurancePolicy Redundant Columns

| Core Field | Duplicate Variants | Used By | Evidence |
|------------|-------------------|---------|----------|
| `dealId` | `deal_id`, `selected_deal_id` | Service layer (insurance.service.ts) | Three variants |
| `userId` | `user_id` | Service layer | camelCase + snake_case |
| `carrier` | `carrier_name` | Service layer | Two variants |
| `policyNumber` | `policy_number`, `policy_number_v2` | Service layer | Three variants |
| `coverageType` | `coverage_type` | Service layer | Two variants |
| `monthlyPremium` | `monthly_premium` | Service layer | Two variants |
| `effectiveDate` | `startDate`, `start_date` | Service layer | Three variants |
| `expirationDate` | `endDate`, `end_date` | Service layer | Three variants |
| `documentUrl` | `document_url` | Service layer | Two variants |

**Total Redundant Columns:** 20+

**Code Evidence:**
```prisma
// From schema.prisma lines 518-601
model InsuranceQuote {
  id                        String   @id @default(cuid())
  buyerId                   String
  vehicleId                 String
  carrier                   String
  coverageType              String
  monthlyPremium            Float
  sixMonthPremium           Float
  coverageLimits            Json
  deductibles               Json
  expiresAt                 DateTime
  // Service layer fields - duplicates below
  buyer_id                  String?
  selected_deal_id          String?
  vehicle_id                String?
  carrier_name              String?
  productName               String?
  product_name              String?
  premium_monthly_cents     Int?
  premium_semi_annual_cents Int?
  premium_annual_cents      Int?
  six_month_premium         Float?
  monthly_premium           Float?
  coverage_json             Json?
  coverageJson              Json?
  coverage_limits           Json?
  // ... more duplicates
}
```

**Root Cause:** Insurance service layer evolved independently from schema, adding snake_case variants

**Recommended Fix:** See Section 3

---

### 1.2 RLS Policies Reference Non-Existent Tables

**Severity:** 🟡 **MEDIUM**  
**Type:** Schema-RLS Mismatch  
**Impact:** Medium - Policies have no effect, create confusion

**Evidence:**
```sql
-- From scripts/02-add-rls-policies.sql lines 14-15
ALTER TABLE "Offer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;
```

**Problem:**
1. **`Offer` table does not exist** in Prisma schema
   - Likely should be `AuctionOffer`
   - Policies defined for non-existent table have no effect

2. **`Contract` table does not exist** in Prisma schema
   - Likely should be `ContractDocument`
   - Policies defined for non-existent table have no effect

**Prisma Models:**
- ✅ `AuctionOffer` exists (lines 343-366 in schema.prisma)
- ✅ `ContractDocument` exists (lines 615-635 in schema.prisma)
- ❌ `Offer` does not exist
- ❌ `Contract` does not exist

**Recommended Fix:** See Section 3

---

### 1.3 SelectedDeal Legacy Fields

**Severity:** 🟡 **MEDIUM**  
**Type:** Dual Source of Truth  
**Impact:** Medium - May cause inconsistent data reads

**Table:** `SelectedDeal`

**Legacy Fields:**
```prisma
// From schema.prisma lines 453-454
insurance_status String?
user_id          String?
```

**Problem:**
1. `insurance_status` (String) duplicates `InsurancePolicy.status` relationship
   - UI/services should use `selectedDeal.insurancePolicy.status` instead
   - Having both creates dual source of truth

2. `user_id` (String) duplicates `buyerId` (String)
   - Schema already has `buyerId` field
   - Unclear which field is authoritative

**Code Evidence:**
- `SelectedDeal` has proper relationships defined:
  - `insurancePolicy InsurancePolicy?` (line 462)
  - `buyerId String` (line 439)

**Risk:** If legacy code writes to these fields, data becomes inconsistent

**Recommended Fix:** See Section 3

---

### 1.4 Nullable Fields Treated as Required (or vice versa)

**Severity:** 🟢 **LOW**  
**Type:** Schema-Code Inconsistency  
**Impact:** Low - Potential runtime errors

**Examples Found:**

#### BuyerProfile.phone
```prisma
// From schema.prisma line 60
phone String? // Made optional to fix signup
```

**Comment indicates:** Field was made optional to fix signup flow  
**Status:** ✅ Aligned - Schema matches intent

#### PreQualification Optional Fields
```prisma
// From schema.prisma lines 168-176
creditScore         Int?      // Optional
dti                 Float?    // Optional
softPullDate        DateTime? // Optional
consentDate         DateTime? // Optional
```

**Usage:** Service layer correctly handles nullability  
**Status:** ✅ Aligned

**Recommended Action:** Monitor for runtime null reference errors

---

## 2. RLS & SECURITY GAPS

### 2.1 Tables Without RLS Policies

**Severity:** 🔴 **CRITICAL**  
**Type:** Security Gap  
**Impact:** High - Potential unauthorized data access if client-side queries used

**31 Tables Without RLS Policies:**

#### High-Sensitivity Tables (Require RLS):
1. **PreQualification** - Contains credit scores, DTI, financial data
2. **DepositPayment** - Payment information, Stripe IDs
3. **ServiceFeePayment** - Payment information, Stripe IDs
4. **FeeFinancingDisclosure** - Loan terms, consent data, IP addresses
5. **LenderFeeDisbursement** - Financial disbursement data
6. **PaymentMethod** - Saved payment methods, card data
7. **ESignEnvelope** - Signature status, document access
8. **ContractShieldScan** - Contract analysis, sensitive buyer data
9. **ContractDocument** - Legal documents, contract files
10. **DocumentRequest** - Document requests, buyer personal docs
11. **DealDocument** - Personal documents (ID, paystubs, insurance)
12. **InsuranceDocRequest** - Insurance document requests

#### Medium-Sensitivity Tables (Should Have RLS):
13. **BuyerPreferences** - Search preferences
14. **Shortlist** - Saved vehicles
15. **ShortlistItem** - Shortlist items
16. **AuctionParticipant** - Auction participation
17. **AuctionOfferFinancingOption** - Financing details
18. **BestPriceOption** - Best price calculations
19. **ExternalPreApproval** - External lender data
20. **FixListItem** - Contract issues
21. **ContractShieldOverride** - Admin overrides
22. **ContractShieldNotification** - Notifications
23. **AdminUser** - Admin metadata

#### Low-Sensitivity Tables (Informational):
24. **Vehicle** - Public vehicle data (could be public)
25. **ContractShieldRule** - Public validation rules
26. **ContractShieldReconciliation** - Background job logs
27. **ComplianceEvent** - Audit logs (admin-only)
28. **PaymentProviderEvent** - Webhook logs (admin-only)
29. **AdminSetting** - System settings (admin-only)
30. **RefinanceLead** - Refinance leads (admin-only)
31. **FundedLoan** - Funded loans (admin-only)

**Current RLS Coverage:**
- Tables with policies: 19 (38%)
- Tables without policies: 31 (62%)

**Risk Assessment:**
- If application uses **server-side only** queries (via services): ✅ Low risk
- If application uses **client-side** queries (Supabase direct): 🔴 High risk
- If application mixes both: 🟡 Medium risk

**Verification Needed:**
1. Check if any client-side Supabase queries exist in UI layer
2. Audit all API routes to ensure they use service layer (not direct Prisma/Supabase client)

**Recommended Fix:** See Section 3

---

### 2.2 RLS Policy Effectiveness Analysis

**Tables with RLS Policies (19):**

| Table | Policy | Effective? | Notes |
|-------|--------|-----------|-------|
| User | Self + Admin | ✅ Yes | Properly restricts user data |
| BuyerProfile | Self + Admin | ✅ Yes | Properly restricts buyer data |
| Dealer | Self + Admin | ✅ Yes | Properly restricts dealer data |
| Affiliate | Self + Admin | ✅ Yes | Properly restricts affiliate data |
| Auction | Active public + Participated dealers + Admin | ✅ Yes | Allows active auctions to be viewed by dealers |
| AuctionOffer | Own offers + Admin | ✅ Yes | Dealers see only their offers |
| SelectedDeal | Buyer (own) + Dealer (own inventory) + Admin | ✅ Yes | Properly restricts deal access |
| InventoryItem | Available public + Dealer (own) + Admin | ✅ Yes | Public can see available inventory |
| **Offer** | Dealer (own) + Admin | ⚠️ **NO - Table doesn't exist** | Policy has no effect |
| **Contract** | Buyer (own) + Dealer (own) + Admin | ⚠️ **NO - Table doesn't exist** | Policy has no effect |
| FinancingOffer | Buyer (via deal) + Admin | ✅ Yes | Properly restricts financing data |
| InsuranceQuote | Buyer (via deal) + Admin | ⚠️ **Partially** | Uses `dealId` field which may not exist on all quotes |
| InsurancePolicy | Buyer (via quoteId->dealId) + Admin | ⚠️ **Complex** | Multi-hop query may be inefficient |
| PickupAppointment | Buyer (via deal) + Dealer (via inventory) + Admin | ✅ Yes | Properly restricts pickup data |
| Referral | Affiliate (own) + Admin | ✅ Yes | Properly restricts referral data |
| Commission | Affiliate (own) + Admin | ✅ Yes | Properly restricts commission data |
| Payout | Affiliate (own) + Admin | ✅ Yes | Properly restricts payout data |
| TradeIn | Buyer (own) + Admin | ✅ Yes | Properly restricts trade-in data |

**Issues Found:**
1. InsuranceQuote policy uses `dealId` field which is not defined in schema (only `buyerId` and `vehicleId` exist)
2. InsurancePolicy policy uses complex multi-hop query via `quoteId` which may not be efficient

**Recommended Fix:** See Section 3

---

### 2.3 Admin/Dealer Permission Inconsistencies

**Severity:** 🟢 **LOW**  
**Type:** Permission Model  
**Impact:** Low - Current implementation appears consistent

**Admin Permissions:**
- ✅ Full access to all tables (via `auth.is_admin()`)
- ✅ Can override contract scans
- ✅ Can refund payments
- ✅ Can update deal statuses

**Dealer Permissions:**
- ✅ Can manage own inventory
- ✅ Can submit offers to auctions they're invited to
- ✅ Can upload contract documents for own deals
- ✅ Can view deals involving their inventory

**Buyer Permissions:**
- ✅ Can view/update own profile
- ✅ Can create auctions
- ✅ Can select deals from own auctions
- ✅ Can upload documents for own deals

**Status:** ✅ Aligned - Permissions are consistent with UI/service layer

---

## 3. FEATURE COMPLETENESS VERIFICATION

### 3.1 Buyer Deal Flow

**Feature:** Complete buyer journey from signup to pickup

| Step | UI Exists? | API Exists? | Service Exists? | DB Tables? | Status Persisted? | Status |
|------|-----------|------------|----------------|-----------|------------------|--------|
| 1. Signup | ✅ Yes | ✅ `/api/auth/signup` | ✅ auth.service | ✅ User, BuyerProfile | N/A | ✅ Complete |
| 2. Pre-Qual | ✅ Yes | ✅ `/api/buyer/prequal` | ✅ prequal.service | ✅ PreQualification | ✅ Yes | ✅ Complete |
| 3. Browse Inventory | ✅ Yes | ✅ `/api/inventory` | ✅ inventory.service | ✅ InventoryItem, Vehicle | N/A | ✅ Complete |
| 4. Create Shortlist | ✅ Yes | ✅ `/api/buyer/shortlist` | ✅ shortlist.service | ✅ Shortlist, ShortlistItem | ✅ Yes | ✅ Complete |
| 5. Start Auction | ✅ Yes | ✅ `/api/buyer/auction` | ✅ auction.service | ✅ Auction, AuctionParticipant | ✅ Yes (status) | ✅ Complete |
| 6. Pay Deposit | ✅ Yes | ✅ `/api/payments/deposit` | ✅ payment.service | ✅ DepositPayment | ✅ Yes (status) | ✅ Complete |
| 7. Dealers Submit Offers | ✅ Yes | ✅ `/api/dealer/offers` | ✅ offer.service | ✅ AuctionOffer, AuctionOfferFinancingOption | ✅ Yes | ✅ Complete |
| 8. Auction Closes | ⚠️ Automated | ⚠️ System job | ✅ auction.service | ✅ Auction (status=CLOSED) | ✅ Yes | ✅ Complete |
| 9. View Best Prices | ✅ Yes | ✅ `/api/buyer/auction/[id]/best-prices` | ✅ best-price.service | ✅ BestPriceOption | ✅ Yes | ✅ Complete |
| 10. Select Deal | ✅ Yes | ✅ `/api/buyer/deal/select` | ✅ deal.service | ✅ SelectedDeal, FinancingOffer | ✅ Yes (status) | ✅ Complete |
| 11. Pay Service Fee | ✅ Yes | ✅ `/api/payments/fee` | ✅ payment.service | ✅ ServiceFeePayment, Commission | ✅ Yes (status) | ✅ Complete |
| 12. Get Insurance | ✅ Yes | ✅ `/api/insurance` | ✅ insurance.service | ✅ InsuranceQuote, InsurancePolicy | ✅ Yes (status) | ✅ Complete |
| 13. Contract Review | ✅ Yes | ✅ `/api/dealer/contracts` | ✅ contract-shield.service | ✅ ContractDocument, ContractShieldScan, FixListItem | ✅ Yes (status) | ✅ Complete |
| 14. E-Sign | ✅ Yes | ✅ `/api/admin/deals/[id]/esign` | ✅ esign.service | ✅ ESignEnvelope | ✅ Yes (status) | ✅ Complete |
| 15. Schedule Pickup | ✅ Yes | ✅ `/api/buyer/pickup` | ✅ pickup.service | ✅ PickupAppointment | ✅ Yes (status) | ✅ Complete |
| 16. Complete Pickup | ✅ Yes | ✅ `/api/dealer/pickup/complete` | ✅ pickup.service | ✅ PickupAppointment, SelectedDeal | ✅ Yes (status=COMPLETED) | ✅ Complete |

**Status:** ✅ **Fully Aligned** - All steps have UI → API → Service → DB path with persisted status

---

### 3.2 Insurance Feature

**Components:**
1. Request insurance quotes
2. View quotes
3. Select quote and bind policy
4. Upload external insurance proof

| Component | UI | API | Service | DB Tables | Writes Persist? | Reads Correct? | Status |
|-----------|-----|-----|---------|-----------|----------------|---------------|--------|
| Request Quotes | ✅ | ✅ `/api/insurance/quotes` | ✅ insurance.service | ✅ InsuranceQuote | ✅ Yes | ✅ Yes | ✅ Complete |
| View Quotes | ✅ | ✅ `/api/insurance/quotes` | ✅ insurance.service | ✅ InsuranceQuote | N/A | ✅ Yes | ✅ Complete |
| Select Quote | ✅ | ✅ `/api/insurance/select` | ✅ insurance.service | ✅ InsurancePolicy | ✅ Yes | ✅ Yes | ✅ Complete |
| Bind Policy | ⚠️ Provider webhook | ✅ `/api/insurance/bind` | ✅ insurance.service | ✅ InsurancePolicy (status updated) | ✅ Yes | ✅ Yes | ✅ Complete |
| Upload External | ✅ | ✅ `/api/insurance/upload` | ✅ insurance.service | ✅ InsurancePolicy | ✅ Yes | ✅ Yes | ✅ Complete |

**Issues Found:**
- ⚠️ Column redundancy (see Section 1.1)
- ⚠️ RLS policy uses non-existent `dealId` field on InsuranceQuote (see Section 2.2)

**Status:** ⚠️ **Aligned with issues** - Feature works, but has schema/RLS problems

---

### 3.3 Financing Feature

**Components:**
1. View financing options (from auction offers)
2. Select financing option (when selecting deal)
3. External pre-approval upload
4. Lender approval tracking

| Component | UI | API | Service | DB Tables | Writes Persist? | Reads Correct? | Status |
|-----------|-----|-----|---------|-----------|----------------|---------------|--------|
| View Options | ✅ | ✅ `/api/buyer/auction/[id]/offers` | ✅ offer.service | ✅ AuctionOfferFinancingOption | N/A | ✅ Yes | ✅ Complete |
| Select Option | ✅ | ✅ `/api/buyer/deal/select` | ✅ deal.service | ✅ FinancingOffer (created from AuctionOfferFinancingOption) | ✅ Yes | ✅ Yes | ✅ Complete |
| External Pre-Approval | ✅ | ✅ `/api/buyer/financing/external` | ✅ prequal.service | ✅ ExternalPreApproval | ✅ Yes | ✅ Yes | ✅ Complete |
| Lender Approval | ⚠️ Admin UI | ✅ `/api/admin/financing/approve` | ✅ deal.service | ✅ FinancingOffer (approved=true) | ✅ Yes | ✅ Yes | ✅ Complete |

**Status:** ✅ **Fully Aligned** - All financing features have complete DB backing

---

### 3.4 Documents Feature

**Components:**
1. Buyer uploads documents
2. Dealer/Admin requests documents
3. Buyer fulfills document request
4. Dealer/Admin approves/rejects documents

| Component | UI | API | Service | DB Tables | Writes Persist? | Reads Correct? | Status |
|-----------|-----|-----|---------|-----------|----------------|---------------|--------|
| Upload Document | ✅ | ✅ `/api/documents` | ⚠️ Direct upload | ✅ DealDocument | ✅ Yes | ✅ Yes | ✅ Complete |
| Request Document | ✅ | ✅ `/api/documents/request` | ⚠️ Direct query | ✅ DocumentRequest | ✅ Yes | ✅ Yes | ✅ Complete |
| Fulfill Request | ✅ | ✅ `/api/documents` (with requestId) | ⚠️ Direct upload | ✅ DealDocument, DocumentRequest (status updated) | ✅ Yes | ✅ Yes | ✅ Complete |
| Approve/Reject | ✅ | ✅ `/api/documents/[id]/review` | ⚠️ Direct query | ✅ DealDocument, DocumentRequest (status updated) | ✅ Yes | ✅ Yes | ✅ Complete |

**Issues Found:**
- ⚠️ DealDocument and DocumentRequest lack RLS policies (see Section 2.1)
- ⚠️ Direct Prisma queries instead of service layer (low priority)

**Status:** ⚠️ **Aligned with security gap** - Feature works, but missing RLS

---

### 3.5 Auctions Feature

**Components:**
1. Create auction (buyer)
2. Pay deposit (buyer)
3. Dealers invited automatically
4. Dealers submit offers
5. Auction closes automatically
6. Best prices computed

| Component | UI | API | Service | DB Tables | Status Persisted? | Status |
|-----------|-----|-----|---------|-----------|------------------|--------|
| Create Auction | ✅ | ✅ `/api/buyer/auction` | ✅ auction.service | ✅ Auction, AuctionParticipant | ✅ Yes (PENDING_DEPOSIT) | ✅ Complete |
| Pay Deposit | ✅ | ✅ `/api/payments/deposit` | ✅ payment.service | ✅ DepositPayment, Auction (status=ACTIVE) | ✅ Yes | ✅ Complete |
| Auto-Invite Dealers | ⚠️ Backend | ✅ auction.service | ✅ auction.service | ✅ AuctionParticipant | ✅ Yes | ✅ Complete |
| Submit Offer | ✅ | ✅ `/api/dealer/offers` | ✅ offer.service | ✅ AuctionOffer, AuctionOfferFinancingOption | ✅ Yes | ✅ Complete |
| Auto-Close | ⚠️ Scheduled job | ⚠️ System | ✅ auction.service | ✅ Auction (status=CLOSED) | ✅ Yes | ✅ Complete |
| Compute Best Prices | ⚠️ Backend | ⚠️ System | ✅ best-price.service | ✅ BestPriceOption | ✅ Yes | ✅ Complete |

**Status:** ✅ **Fully Aligned** - All auction features have complete DB backing

---

### 3.6 Admin Dashboards

**Components:**
1. Revenue dashboard
2. User management
3. Deal management
4. Affiliate management
5. Compliance logs

| Component | UI | API | Service | DB Tables | Status |
|-----------|-----|-----|---------|-----------|--------|
| Revenue Dashboard | ✅ | ✅ `/api/admin/dashboard` | ✅ admin.service | ✅ ServiceFeePayment, DepositPayment | ✅ Complete |
| User Management | ✅ | ✅ `/api/admin/buyers`, `/api/admin/dealers` | ✅ admin.service | ✅ User, BuyerProfile, Dealer | ✅ Complete |
| Deal Management | ✅ | ✅ `/api/admin/deals` | ✅ admin.service | ✅ SelectedDeal, all related | ✅ Complete |
| Affiliate Management | ✅ | ✅ `/api/admin/payouts` | ✅ admin.service | ✅ Affiliate, Commission, Payout | ✅ Complete |
| Compliance Logs | ✅ | ✅ `/api/admin/compliance` | ✅ admin.service | ✅ ComplianceEvent | ✅ Complete |

**Status:** ✅ **Fully Aligned** - All admin features have complete DB backing

---

### 3.7 Dealer Dashboards

**Components:**
1. Inventory management
2. Auction participation
3. Offer submission
4. Deal tracking
5. Contract upload

| Component | UI | API | Service | DB Tables | Status |
|-----------|-----|-----|---------|-----------|--------|
| Inventory | ✅ | ✅ `/api/dealer/inventory` | ✅ dealer.service | ✅ InventoryItem, Vehicle | ✅ Complete |
| Auctions | ✅ | ✅ `/api/dealer/auctions` | ✅ auction.service | ✅ Auction, AuctionParticipant | ✅ Complete |
| Submit Offers | ✅ | ✅ `/api/dealer/offers` | ✅ offer.service | ✅ AuctionOffer, AuctionOfferFinancingOption | ✅ Complete |
| Deal Tracking | ✅ | ✅ `/api/dealer/deals` | ✅ dealer.service | ✅ SelectedDeal | ✅ Complete |
| Contract Upload | ✅ | ✅ `/api/dealer/contracts` | ✅ contract-shield.service | ✅ ContractDocument, ContractShieldScan | ✅ Complete |

**Status:** ✅ **Fully Aligned** - All dealer features have complete DB backing

---

## 4. SILENT DATA LOSS PATHS

**Severity:** 🟢 **LOW**  
**Status:** ✅ **No silent data loss paths identified**

**Verification:**
- All form submissions write to database
- All status transitions persist to database
- No UI-only state that should be persisted
- All critical data (payments, deals, documents) have DB records

**Potential Risks:**
1. If legacy `insurance_status` and `user_id` fields on SelectedDeal are used, could create inconsistency
2. If insurance redundant columns are written inconsistently, could create data mismatches

**Mitigation:** See Section 5 (Fix Plan)

---

## 5. UNUSED DATABASE TABLES/COLUMNS

**Severity:** 🟢 **LOW**  
**Status:** ⚠️ **Some unused fields identified**

### Potentially Unused Tables:

**None identified** - All 50 tables appear to be used by services/APIs

### Potentially Unused Columns:

#### InsuranceQuote - Service Layer Fields
All service layer fields (`buyer_id`, `selected_deal_id`, `vehicle_id`, etc.) may be unused if service layer uses core fields.

**Verification Needed:**
1. Grep codebase for `buyer_id` in insurance context
2. Check if service layer writes to both core and service fields
3. Determine if service fields are legacy or actively used

#### InsurancePolicy - Service Layer Fields
Same as InsuranceQuote - 20+ potentially redundant fields.

#### SelectedDeal - Legacy Fields
- `insurance_status` - Possibly unused if `insurancePolicy.status` is used
- `user_id` - Possibly unused if `buyerId` is used

**Verification Needed:**
1. Grep codebase for `insurance_status` writes
2. Grep codebase for `user_id` reads on SelectedDeal
3. Confirm if fields are legacy or active

---

## 6. COLUMN USAGE vs DEFINITION GAPS

### 6.1 Columns Used in Code but Missing in DB

**Status:** ✅ **None identified**

All columns used in service layer and APIs exist in Prisma schema.

### 6.2 Enum Mismatches

**Status:** ✅ **No mismatches identified**

All enums used in code match Prisma schema definitions:
- UserRole: BUYER, DEALER, ADMIN, AFFILIATE ✅
- DealStatus: 15 values ✅
- AuctionStatus: 5 values ✅
- InsuranceStatus: 5 values ✅
- ContractStatus: 5 values ✅
- etc.

### 6.3 Status/State Value Inconsistencies

**Status:** ✅ **No inconsistencies identified**

All status transitions in code use enum values defined in schema.

---

## 7. SUMMARY OF GAPS

| Category | Count | Severity | Action Required |
|----------|-------|----------|-----------------|
| **Schema Issues** | | | |
| - Insurance column redundancy | 40+ columns | 🔴 Critical | Clean up duplicates |
| - RLS policy orphans | 2 tables | 🟡 Medium | Update policy names |
| - Legacy fields | 2 fields | 🟡 Medium | Deprecate or remove |
| **Security Issues** | | | |
| - Tables without RLS | 31 tables | 🔴 Critical | Add RLS policies |
| - RLS policy errors | 2 policies | 🟡 Medium | Fix policy logic |
| **Feature Gaps** | | | |
| - Missing features | 0 | ✅ None | N/A |
| - Incomplete features | 0 | ✅ None | N/A |
| - Silent data loss paths | 0 | ✅ None | N/A |
| **Unused Resources** | | | |
| - Unused tables | 0 | ✅ None | N/A |
| - Potentially unused columns | 40+ | 🟢 Low | Document or remove |

---

## 8. PRIORITIZED FIX LIST

### Priority 1 (Critical - Security/Data Integrity):
1. Add RLS policies to 31 tables (Section 2.1)
2. Fix RLS policy table name mismatches (Section 1.2)
3. Clean up insurance table column redundancy (Section 1.1)

### Priority 2 (Medium - Consistency):
4. Deprecate or remove SelectedDeal legacy fields (Section 1.3)
5. Fix InsuranceQuote RLS policy to use correct field (Section 2.2)

### Priority 3 (Low - Optimization):
6. Document or remove potentially unused columns (Section 5)
7. Add missing indexes if query performance is poor

---

**END OF GAPS REPORT**
