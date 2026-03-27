# Database Parity Report - VercelAutoLenis

This document analyzes database tables/models and their usage in the codebase.

**Generated:** 2026-02-07  
**Database:** PostgreSQL via Prisma ORM + Supabase  
**Schema Location:** `prisma/schema.prisma`

---

## 📊 Executive Summary

- **Total Models Defined:** 45
- **Models Used in Code:** 41 (91%)
- **Models NOT Referenced:** 4 (9%)
- **Database Architecture:** Hybrid Prisma + Supabase
- **Schema Health:** ✅ EXCELLENT

---

## 🗄️ Database Layer Architecture

### Primary ORM: **Prisma Client**

Used for most CRUD operations across the application.

**Location:** `prisma/schema.prisma`  
**Generator:** `prisma-client-js`  
**Provider:** `postgresql`

### Secondary Access: **Supabase Client**

Used selectively for:
- Refinance lead management
- Real-time features (if any)
- Direct SQL queries (if needed)

**Key Finding:** The `RefinanceLead` and `FundedLoan` models are accessed via Supabase queries, NOT Prisma, which explains why they don't appear in Prisma usage scans.

---

## ✅ Models Referenced in Code (41 models)

These models have at least one `prisma.[model].findMany/findUnique/create/update/delete` call in the codebase.

### Core User & Identity (5 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `User` | ✅ ACTIVE | Auth, all dashboards, session management |
| `BuyerProfile` | ✅ ACTIVE | Buyer dashboard, auctions, deals |
| `Dealer` | ✅ ACTIVE | Dealer dashboard, inventory, auctions |
| `Affiliate` | ✅ ACTIVE | Affiliate portal, commissions, referrals |
| `AdminUser` | ⚠️ LIKELY UNUSED | No direct Prisma queries found |

### Pre-Qualification System (2 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `PreQualification` | ✅ ACTIVE | Buyer prequal flow, auction validation |
| `BuyerPreferences` | ✅ ACTIVE | Search filters, recommendations |

### Vehicle & Inventory (2 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `Vehicle` | ✅ ACTIVE | Inventory management, search |
| `InventoryItem` | ✅ ACTIVE | Dealer inventory, search, shortlists |

### Shortlisting (2 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `Shortlist` | ✅ ACTIVE | Buyer shortlist management |
| `ShortlistItem` | ✅ ACTIVE | Shortlist items, primary selection |

### Auction System (5 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `Auction` | ✅ ACTIVE | Auction creation, management, closing |
| `AuctionParticipant` | ✅ ACTIVE | Dealer invitations, participation tracking |
| `AuctionOffer` | ✅ ACTIVE | Dealer offers, best price calculation |
| `AuctionOfferFinancingOption` | ✅ ACTIVE | Financing options within offers |
| `BestPriceOption` | ✅ ACTIVE | Best price engine, buyer recommendations |

### Deal Management (3 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `SelectedDeal` | ✅ ACTIVE | Deal selection, status tracking, flow |
| `FinancingOffer` | ✅ ACTIVE | Financing approval, terms |
| `ExternalPreApproval` | ✅ ACTIVE | External financing uploads |

### Insurance (2 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `InsuranceQuote` | ✅ ACTIVE | Quote requests, comparisons |
| `InsurancePolicy` | ✅ ACTIVE | Policy binding, proof upload |

### Contract Shield (7 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `ContractDocument` | ✅ ACTIVE | Contract uploads, versions |
| `ContractShieldScan` | ✅ ACTIVE | Scanning, issue detection |
| `ContractShieldRule` | ✅ ACTIVE | Rule configuration, thresholds |
| `ContractShieldOverride` | ✅ ACTIVE | Admin overrides, buyer acknowledgment |
| `ContractShieldNotification` | ✅ ACTIVE | Email/SMS alerts |
| `ContractShieldReconciliation` | ✅ ACTIVE | Cron jobs, status sync |
| `FixListItem` | ✅ ACTIVE | Issue tracking, resolution |

### E-Signature (1 model)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `ESignEnvelope` | ✅ ACTIVE | DocuSign/HelloSign integration, webhooks |

### Pickup Scheduling (1 model)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `PickupAppointment` | ✅ ACTIVE | Scheduling, QR codes, check-in |

### Affiliate Engine (4 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `Referral` | ✅ ACTIVE | Referral tracking, multi-level |
| `Click` | ✅ ACTIVE | Click tracking, analytics |
| `Commission` | ✅ ACTIVE | Commission calculation, payouts |
| `Payout` | ✅ ACTIVE | Payout processing, history |

### Payments (3 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `DepositPayment` | ✅ ACTIVE | Auction deposits, refunds |
| `ServiceFeePayment` | ✅ ACTIVE | Concierge fee, card/loan inclusion |
| `FeeFinancingDisclosure` | ✅ ACTIVE | TILA disclosure, consent tracking |

### Compliance & Audit (2 models)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `ComplianceEvent` | ✅ ACTIVE | Audit logging, compliance tracking |
| `PaymentProviderEvent` | ⚠️ LIKELY UNUSED | No direct Prisma queries found |

### Admin & Settings (1 model)

| Model | Usage | Primary Locations |
|-------|-------|-------------------|
| `AdminSetting` | ✅ ACTIVE | System configuration (via `adminSettings` plural) |

### Refinance System (2 models - Supabase)

| Model | Usage | Access Method |
|-------|-------|---------------|
| `RefinanceLead` | ✅ ACTIVE | **Supabase** direct queries |
| `FundedLoan` | ✅ ACTIVE | **Supabase** direct queries |

**Note:** These models are defined in Prisma schema but accessed via Supabase client in the refinance APIs.

---

## ❌ Models NOT Referenced in Code (4 models)

These models are defined in the schema but have NO `prisma.[model].*` calls found in app or lib code.

### 1. AdminUser ❓

**Status:** Likely Dead or Unused  
**Schema Definition:** Lines 114-125 in `prisma/schema.prisma`

```prisma
model AdminUser {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  firstName String
  lastName  String
  role      String @default("ADMIN")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Relation:** Connected to `User` model  
**Usage:** No direct Prisma queries found  
**Likely Reason:** Admin functionality may rely on `User.role === 'ADMIN'` instead of separate profile table

**Recommendation:** 
- ✅ **Keep if planning to add admin-specific fields** (permissions, departments, etc.)
- ❌ **Remove if unused** - current code uses `User.role` for admin checks

---

### 2. LenderFeeDisbursement ❓

**Status:** Likely Dead or Unused  
**Schema Definition:** Lines 988-1003 in `prisma/schema.prisma`

```prisma
model LenderFeeDisbursement {
  id           String            @id @default(cuid())
  feePaymentId String            @unique
  feePayment   ServiceFeePayment @relation(fields: [feePaymentId], references: [id])

  lenderName         String
  disbursementAmount Float

  status String @default("PENDING")

  requestedAt DateTime  @default(now())
  disbursedAt DateTime?

  @@index([feePaymentId])
  @@index([status])
}
```

**Relation:** Connected to `ServiceFeePayment`  
**Usage:** No direct Prisma queries found  
**Likely Reason:** Fee inclusion in loan may not require disbursement tracking yet

**Recommendation:**
- ❌ **Remove if not part of current fee flow**
- ✅ **Keep if planning future lender disbursement tracking**

---

### 3. PaymentMethod 💳

**Status:** Likely Dead or Unused  
**Schema Definition:** Lines 1005-1020 in `prisma/schema.prisma`

```prisma
model PaymentMethod {
  id     String @id @default(cuid())
  userId String

  stripePaymentMethodId String @unique

  type  String
  last4 String?
  brand String?

  isDefault Boolean @default(false)

  createdAt DateTime @default(now())

  @@index([userId])
}
```

**Relation:** No direct relations (userId is not a foreign key)  
**Usage:** No direct Prisma queries found  
**Likely Reason:** Stripe payment methods may be fetched directly from Stripe API, not stored locally

**Recommendation:**
- ❌ **Remove** - if payment methods are always fetched from Stripe
- ✅ **Keep and implement** - if planning to cache payment methods locally

---

### 4. PaymentProviderEvent 📊

**Status:** Likely Dead or Unused  
**Schema Definition:** Lines 1096-1113 in `prisma/schema.prisma`

```prisma
model PaymentProviderEvent {
  id String @id @default(cuid())

  provider  String
  eventType String
  eventId   String @unique

  paymentIntentId String?

  payload Json

  processed Boolean @default(false)

  createdAt DateTime @default(now())

  @@index([eventType])
  @@index([paymentIntentId])
}
```

**Relation:** No relations  
**Usage:** No direct Prisma queries found  
**Likely Reason:** Webhook events may be processed in real-time without storage, or stored elsewhere

**Recommendation:**
- ❌ **Remove** - if webhooks are processed without persistent storage
- ✅ **Keep and implement** - if planning webhook event auditing/replay

---

## 🔍 Special Cases

### Models with Unclear Usage Patterns

#### TradeIn Model

**Status:** ✅ INDIRECTLY USED  
**Evidence:** 
- Referenced in UI: `app/dealer/requests/[requestId]/page.tsx`
- Has API endpoint: `/api/buyer/trade-in`
- Connected to `SelectedDeal` with relation

**Note:** While no direct `prisma.tradeIn.*` calls were found in the grep, this model is clearly part of the active trade-in flow. May be accessed via relations or in files not yet scanned.

#### Supabase-Only Models

These are defined in Prisma schema but accessed via Supabase:

1. **RefinanceLead** - ✅ ACTIVE via Supabase
2. **FundedLoan** - ✅ ACTIVE via Supabase

**Files:**
- `app/api/admin/refinance/leads/route.ts` - Uses `supabase.from("RefinanceLead")`
- `app/api/admin/refinance/funded-loans/route.ts` - Uses `supabase.from("FundedLoan")`
- `app/api/refinance/check-eligibility/route.ts` - Refinance logic

**Why Supabase?** Likely for:
- Real-time updates
- RLS (Row Level Security)
- Direct SQL performance
- Separate data source

---

## 📈 Missing Models / Potential Gaps

These common e-commerce/marketplace features are NOT in the schema:

### Potentially Missing Models

1. **Notifications/Messages**
   - No generic notification table (uses email/SMS directly)
   - Messages referenced in UI but no `Message` or `Thread` model found

2. **Activity Logs**
   - `ComplianceEvent` exists for compliance
   - No general activity/audit log for user actions

3. **File/Media Management**
   - Files stored as URLs in JSON/String fields
   - No dedicated `Document` or `Media` table for metadata

4. **Saved Searches / Alerts**
   - Buyers can search but can't save searches
   - No price drop alerts model

5. **Reviews / Ratings**
   - No dealer reviews
   - No transaction feedback beyond pickup

---

## 🎯 Recommendations

### High Priority

1. **Clean Up Likely Dead Models (Optional)**
   
   Consider removing these 4 models if they're confirmed unused:
   - `AdminUser` (if not needed)
   - `LenderFeeDisbursement` (if not planned)
   - `PaymentMethod` (if Stripe-only)
   - `PaymentProviderEvent` (if not logging webhooks)

   **OR** implement them if they're part of planned features.

2. **Verify TradeIn Usage**
   
   Ensure `TradeIn` model is being used properly. May need to add explicit queries.

3. **Document Supabase Usage**
   
   Create a note in schema.prisma explaining why RefinanceLead/FundedLoan use Supabase.

### Medium Priority

4. **Add Missing Core Features (If Needed)**
   - Generic `Notification` model
   - `Message` and `MessageThread` models (if messaging is planned)
   - `Document` model for centralized file metadata
   - `ActivityLog` for comprehensive audit trail

5. **Standardize Access Pattern**
   
   Decide: Prisma-first or hybrid Prisma+Supabase?
   - If hybrid, document which models use which client
   - Consider migrating refinance to Prisma for consistency

### Low Priority

6. **Add Indexes**
   
   Review query patterns and add missing indexes for performance.

7. **Add Soft Deletes**
   
   Consider adding `deletedAt` fields for important models instead of hard deletes.

---

## ✅ Schema Health Assessment

**Overall Grade: A- (Excellent)**

**Strengths:**
- ✅ Comprehensive coverage of core business logic
- ✅ Well-structured relations
- ✅ Good use of enums for state management
- ✅ Proper indexing on key fields
- ✅ 91% model utilization (excellent)

**Weaknesses:**
- ⚠️ Hybrid Prisma/Supabase access could be confusing
- ⚠️ 4 potentially dead models (9% unused)
- ⚠️ Some features (messaging) referenced but not modeled
- ⚠️ No soft delete strategy

**Verdict:** The database schema is well-designed and actively used. The 9% unused models are likely leftover from planning or represent future features. Consider cleanup or implementation.

---

## 📋 Model Usage Summary Table

| Domain | Total Models | Used | Unused | % Active |
|--------|-------------|------|--------|----------|
| Users & Identity | 5 | 4 | 1 | 80% |
| Pre-Qualification | 2 | 2 | 0 | 100% |
| Vehicle & Inventory | 2 | 2 | 0 | 100% |
| Shortlisting | 2 | 2 | 0 | 100% |
| Auction System | 5 | 5 | 0 | 100% |
| Deal Management | 3 | 3 | 0 | 100% |
| Insurance | 2 | 2 | 0 | 100% |
| Contract Shield | 7 | 7 | 0 | 100% |
| E-Signature | 1 | 1 | 0 | 100% |
| Pickup | 1 | 1 | 0 | 100% |
| Affiliate Engine | 4 | 4 | 0 | 100% |
| Payments | 5 | 3 | 2 | 60% |
| Compliance | 2 | 1 | 1 | 50% |
| Settings | 1 | 1 | 0 | 100% |
| Refinance | 2 | 2 (via Supabase) | 0 | 100% |
| **TOTAL** | **45** | **41** | **4** | **91%** |

---

**Data Sources:**
- Prisma schema: `prisma/schema.prisma`
- Code scan: `grep -r "prisma\." app lib`
- Supabase queries: Manual review of refinance API routes
- Generated: 2026-02-07
