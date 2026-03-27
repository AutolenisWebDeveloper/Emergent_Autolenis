# Schema Alignment Audit - Complete Manual

**Project:** VercelAutoLenis  
**Generated:** 2026-02-08  
**Audit Type:** Code ↔ Database Schema Alignment  
**Status:** PARTIAL - Static Analysis Complete, Live DB Verification Required

---

## 🎯 AUDIT OBJECTIVES

This audit verifies that the live Supabase PostgreSQL schema matches code expectations across:
1. ✅ Prisma schema definitions
2. ✅ Migration scripts  
3. ✅ API routes
4. ✅ Service layer
5. ⚠️ Live database schema (requires credentials)
6. ⚠️ RLS policies (requires credentials)

---

## 📊 EXECUTIVE SUMMARY

### What We Completed ✅

| Task | Status | Details |
|------|--------|---------|
| Prisma Schema Parsing | ✅ COMPLETE | 49 models, 16 enums analyzed |
| API Route Scanning | ✅ COMPLETE | 30 routes using Supabase client |
| Service Layer Analysis | ✅ COMPLETE | 375 Prisma operations in lib/services |
| Migration Review | ✅ COMPLETE | 6 migration files documented |
| Code-level Alignment | ✅ COMPLETE | 37 issues identified |
| Health Endpoint Analysis | ✅ COMPLETE | /api/health/db documented |

### What Requires Live Database ❌

| Task | Requirement | Impact |
|------|------------|--------|
| Table existence verification | `POSTGRES_PRISMA_URL` | HIGH - Cannot confirm tables exist |
| Column type matching | DB connection | HIGH - Type mismatches undetected |
| RLS policy inspection | Supabase credentials | CRITICAL - Security gaps unknown |
| Index verification | DB connection | MED - Performance issues undetected |
| Enum value validation | DB connection | HIGH - Runtime errors possible |
| Migration status | DB connection | HIGH - Drift unknown |

### Critical Findings

**BLOCKER Issues:** 0  
**HIGH Issues:** 4
- Missing models accessed in code
- Potential table name mismatches

**MED Issues:** 0  
**LOW Issues:** 33
- Models defined but not used in API routes (may be used in services)

---

## 🔍 PHASE 0 — CONNECTION DETAILS

### Database Health Check Endpoint

**Location:** `app/api/health/db/route.ts`

**Implementation:**
```typescript
// Uses Supabase service role to query _connection_canary table
const supabase = createClient(supabaseUrl, serviceRoleKey)
const { data, error } = await supabase
  .from("_connection_canary")
  .select("*")
  .order("id", { ascending: false })
  .limit(1)
```

**Expected Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Admin access key
- `POSTGRES_PRISMA_URL` - Direct PostgreSQL connection

**Testing:**
```bash
# Local development
curl http://localhost:3000/api/health/db

# Production
curl https://your-app.vercel.app/api/health/db
```

**Expected Response:**
```json
{
  "ok": true,
  "projectRef": "your-project-id",
  "latencyMs": 45,
  "lastCanaryRow": {
    "id": 1,
    "created_at": "2026-02-08T...",
    "message": "canary alive"
  }
}
```

---

## 📋 PHASE 1 — PRISMA SCHEMA INVENTORY

### Complete Model List (49 Models)

#### 1. User & Identity (5 models)
- **User** - Core user accounts
  - Fields: id, email, passwordHash, role, mfa_enrolled, mfa_factor_id, mfa_secret, force_password_reset
  - Used in: 5 API routes
  - Relations: BuyerProfile, Dealer, AdminUser, Affiliate
  
- **BuyerProfile** - Buyer-specific data
  - Fields: 24 fields including address, employment, income
  - Used in: 4 API routes, multiple services
  
- **Dealer** - Dealer accounts
  - Fields: businessName, licenseNumber, integrityScore, verified
  - Used in: 4 API routes
  
- **AdminUser** ⚠️ - Admin metadata
  - Fields: firstName, lastName, role
  - **WARNING:** Not used in any scanned API routes
  - May be accessed via User.role checks instead
  
- **Affiliate** - Affiliate partners
  - Fields: referralCode, totalEarnings, pendingEarnings
  - Used in: 4 API routes

#### 2. Pre-Qualification (2 models)
- **PreQualification** ⚠️
  - Not directly in API routes, used in services
  
- **BuyerPreferences** ⚠️
  - Not directly in API routes, used in services

#### 3. Vehicle & Inventory (4 models)
- **Vehicle** - Vehicle master data
  - Unique on: vin
  - Used in: 3 API routes
  
- **InventoryItem** - Dealer listings
  - Used in: 2 API routes
  
- **Shortlist** ⚠️
  - Used in services, not directly in API
  
- **ShortlistItem**
  - Used in: 1 API route

#### 4. Auction System (5 models)
- **Auction**, **AuctionParticipant**, **AuctionOffer**, **AuctionOfferFinancingOption**, **BestPriceOption**
- ⚠️ Most not directly in API routes - accessed via services

#### 5. Deal Management (3 models)
- **SelectedDeal** - Core deal tracking
  - Used in: 2 API routes, many services
  
- **FinancingOffer** ⚠️
- **ExternalPreApproval** ⚠️

#### 6. Insurance (4 models)
- **InsuranceQuote**, **InsurancePolicy**, **InsuranceDocRequest**, **InsuranceEvent**
- ⚠️ Accessed via services

#### 7. Contract Shield (7 models)
All accessed via contract-shield.service.ts

#### 8. E-Signature (1 model)
- **ESignEnvelope** - DocuSign integration

#### 9. Pickup (1 model)
- **PickupAppointment** - QR code check-in

#### 10. Affiliate Engine (4 models)
- **Referral**, **Click**, **Commission**, **Payout**
- Click used in 1 API route

#### 11. Payments (5 models)
- **DepositPayment**, **ServiceFeePayment**, **FeeFinancingDisclosure**, **LenderFeeDisbursement**, **PaymentMethod**

#### 12. Trade-In (1 model)
- **TradeIn** - Used in 2 API routes

#### 13. Compliance (2 models)
- **ComplianceEvent** - Used in 5 API routes
- **PaymentProviderEvent** ⚠️

#### 14. Settings (1 model)
- **AdminSetting** ⚠️

#### 15. Documents (2 models)
- **DealDocument**, **DocumentRequest**

#### 16. Refinance (2 models)
- **RefinanceLead** - Used in 2 API routes
- **FundedLoan** - Used in 1 API route

### Enums Defined (16 total)

1. **UserRole:** BUYER, DEALER, ADMIN, AFFILIATE
2. **CreditTier:** EXCELLENT, GOOD, FAIR, POOR, DECLINED
3. **AuctionStatus:** PENDING_DEPOSIT, ACTIVE, CLOSED, COMPLETED, CANCELLED
4. **BestPriceType:** BEST_CASH, BEST_MONTHLY, BALANCED
5. **DealStatus:** 14 values (SELECTED → COMPLETED/CANCELLED)
6. **InsuranceStatus:** QUOTE_REQUESTED, QUOTE_RECEIVED, POLICY_SELECTED, POLICY_BOUND, EXTERNAL_UPLOADED
7. **ContractStatus:** UPLOADED, SCANNING, ISSUES_FOUND, PASSED, FAILED
8. **ESignStatus:** CREATED, SENT, VIEWED, SIGNED, COMPLETED, DECLINED, EXPIRED
9. **PickupStatus:** SCHEDULED, CONFIRMED, BUYER_ARRIVED, COMPLETED, CANCELLED
10. **PaymentStatus:** PENDING, PROCESSING, SUCCEEDED, FAILED, REFUNDED
11. **FeePaymentMethod:** CARD, LOAN_INCLUSION
12. **DocumentStatus:** UPLOADED, PENDING_REVIEW, APPROVED, REJECTED
13. **DocumentRequestStatus:** REQUESTED, UPLOADED, APPROVED, REJECTED
14. **RefinanceQualificationStatus:** PENDING, QUALIFIED, DISQUALIFIED
15. **VehicleCondition:** EXCELLENT, GOOD, FAIR, POOR
16. **MarketingRestriction:** NONE, NO_CREDIT_SOLICITATION

---

## 🛠️ PHASE 2 — MIGRATION FILES

### Migration Inventory

1. **02-add-dealer-users-table.sql**
   - Adds: DealerUser table
   - Purpose: Multi-user support per dealer
   
2. **03-add-missing-buyer-fields.sql**
   - Adds: dateOfBirth, addressLine2, postalCode, country, etc.
   - Converts: income fields to cents
   
3. **04-add-missing-dealer-fields.sql**
   - Adds: legalName, email, addressLine2, etc.
   
4. **05-add-vehicle-fields.sql**
   - Adds: drivetrain, engine, colorExterior, colorInterior
   
5. **94-add-admin-mfa-fields.sql**
   - Adds: MFA fields to User table
   - Creates: AdminAuditLog, AdminLoginAttempt tables
   - Creates: RLS policies for admin tables
   
6. **95-add-connection-canary-table.sql**
   - Creates: _connection_canary table
   - Purpose: Health check table

### ⚠️ Critical Finding: DealerUser Table

**Issue:** Migration 02 creates `DealerUser` table, but:
- ❌ Not defined in Prisma schema
- ❌ No model in schema.prisma
- ⚠️ May cause runtime errors if code expects it

**Severity:** HIGH

**Fix Recommendation:**
```prisma
// Add to prisma/schema.prisma
model DealerUser {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dealerId  String
  dealer    Dealer   @relation(fields: [dealerId], references: [id], onDelete: Cascade)
  roleLabel String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
  @@index([dealerId])
}
```

### ⚠️ Critical Finding: AdminAuditLog & AdminLoginAttempt

**Issue:** Migration 94 creates tables for:
- AdminAuditLog
- AdminLoginAttempt

**Status:**
- ❌ Not in Prisma schema
- ⚠️ May be accessed via raw SQL
- ⚠️ RLS policies defined in migration

**Severity:** MED

**Fix Recommendation:**
Add to Prisma schema for type safety, or document as SQL-only tables.

---

## 🔍 PHASE 3 — DATABASE ACCESS PATTERNS

### API Routes: Supabase Client Pattern

Most API routes use Supabase client for direct table access:

```typescript
const supabase = createAdminClient()
const { data } = await supabase
  .from("TableName")
  .select("*")
  .eq("id", id)
```

**Tables Accessed via API Routes:**
1. User (5 routes)
2. BuyerProfile (4 routes)
3. Dealer (4 routes)
4. Affiliate (4 routes)
5. ComplianceEvent (5 routes)
6. Vehicle (3 routes)
7. InventoryItem (2 routes)
8. SelectedDeal (2 routes)
9. TradeIn (2 routes)
10. DepositPayment (2 routes)
11. ServiceFeePayment (2 routes)
12. RefinanceLead (2 routes)
13. FundedLoan (1 route)
14. Click (1 route)
15. ShortlistItem (1 route)
16. AuctionOffer (1 route)

### Service Layer: Prisma Client Pattern

Services use Prisma for complex operations:

```typescript
import { prisma } from '@/lib/prisma'

const deal = await prisma.selectedDeal.findUnique({
  where: { id: dealId },
  include: {
    financingOffer: true,
    insurancePolicy: true
  }
})
```

**Services and Their Model Usage:**
- `contract-shield.service.ts` → 10+ models
- `auction.service.ts` → 9 models
- `deal.service.ts` → 11 models
- `insurance.service.ts` → 6 models
- `affiliate.service.ts` → 7 models

**Total Prisma Operations in Services:** 375

---

## ⚠️ PHASE 4 — IDENTIFIED ISSUES

### HIGH Priority Issues

#### Issue #1: Missing DealerUser Model
**Severity:** HIGH  
**Symptom:** Migration creates table, but no Prisma model exists  
**Code Reference:** migrations/02-add-dealer-users-table.sql  
**DB Evidence:** Table created in migration, not in schema  
**Fix:** Add DealerUser model to Prisma schema  
**Verification:** `npx prisma generate` should succeed without warnings

#### Issue #2: Missing AdminAuditLog Model
**Severity:** MED  
**Symptom:** RLS policies defined, but no Prisma model  
**Code Reference:** migrations/94-add-admin-mfa-fields.sql  
**Fix:** Add models or document as SQL-only tables

#### Issue #3: Missing AdminLoginAttempt Model
**Severity:** MED  
**Symptom:** Table created in migration, no model  
**Fix:** Add to schema or remove if unused

#### Issue #4: Potential Table Access Mismatches
**Severity:** HIGH  
**Symptom:** Code uses `.from("Offer")` but schema has `AuctionOffer`  
**Code Reference:** app/api/admin/dealers/[id]/route.ts  
**Fix:** Verify table names match between Supabase and code

### LOW Priority Issues (33 Models)

Models not directly used in API routes (may be used in services):
- AdminUser
- PreQualification
- BuyerPreferences
- Shortlist
- Auction
- AuctionParticipant
- AuctionOfferFinancingOption
- BestPriceOption
- FinancingOffer
- ExternalPreApproval
- InsuranceQuote
- InsurancePolicy
- ContractDocument
- ContractShieldScan
- FixListItem
- ContractShieldOverride
- ContractShieldRule
- ContractShieldNotification
- ContractShieldReconciliation
- ESignEnvelope
- PickupAppointment
- Referral
- Commission
- Payout
- FeeFinancingDisclosure
- LenderFeeDisbursement
- PaymentMethod
- PaymentProviderEvent
- AdminSetting
- DealDocument
- DocumentRequest
- InsuranceDocRequest
- InsuranceEvent

**Analysis:** These are likely accessed via services, not directly in API routes. Requires service-level verification.

---

## 📊 ALIGNMENT MATRIX

| Model/Table | API Routes | Services | Migrations | Overall Status |
|-------------|-----------|----------|------------|----------------|
| User | 5 | ✅ | ✅ | ✅ PASS |
| BuyerProfile | 4 | ✅ | ✅ | ✅ PASS |
| Dealer | 4 | ✅ | ✅ | ✅ PASS |
| Vehicle | 3 | ✅ | ✅ | ✅ PASS |
| SelectedDeal | 2 | ✅ | - | ✅ PASS |
| ComplianceEvent | 5 | ✅ | - | ✅ PASS |
| DealerUser | 0 | ⚠️ | ✅ | ❌ FAIL (Missing in schema) |
| AdminAuditLog | 0 | ⚠️ | ✅ | ❌ FAIL (Missing in schema) |
| AdminLoginAttempt | 0 | ⚠️ | ✅ | ❌ FAIL (Missing in schema) |
| Auction | 0 | ✅ | - | ⚠️ Service-only |
| Insurance* | 0 | ✅ | - | ⚠️ Service-only |
| ContractShield* | 0 | ✅ | - | ⚠️ Service-only |

---

## 🔧 LIVE DATABASE VERIFICATION QUERIES

Run these in Supabase SQL Editor to complete the audit:

### 1. List All Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema='public' 
  AND table_type='BASE TABLE'
ORDER BY table_name;
```

### 2. Verify Critical Tables Exist
```sql
-- Check if key tables exist
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema='public' 
  AND table_name IN (
    'User', 'BuyerProfile', 'Dealer', 'Vehicle', 
    'Auction', 'SelectedDeal', 'DealerUser',
    'AdminAuditLog', 'AdminLoginAttempt', '_connection_canary'
  )
ORDER BY table_name;
```

### 3. Check Column Types for User Table
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name='User'
ORDER BY ordinal_position;
```

### 4. Verify Enums
```sql
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value,
  e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY enum_name, enumsortorder;
```

### 5. Check RLS Status
```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### 6. List RLS Policies
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname;
```

### 7. Check Indexes
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname='public'
ORDER BY tablename, indexname;
```

### 8. Verify Foreign Keys
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

---

## 🎯 RECOMMENDED FIXES

### Fix #1: Add Missing Models to Prisma Schema

**Priority:** HIGH  
**Effort:** 30 minutes  

Add to `prisma/schema.prisma`:

```prisma
model DealerUser {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  dealerId  String
  dealer    Dealer   @relation(fields: [dealerId], references: [id], onDelete: Cascade)
  roleLabel String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([userId])
  @@index([dealerId])
  @@map("DealerUser")
}

model AdminAuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String
  resource  String?
  details   Json?
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
  @@map("AdminAuditLog")
}

model AdminLoginAttempt {
  id         String   @id @default(cuid())
  identifier String
  successful Boolean
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())
  
  @@index([identifier])
  @@index([createdAt])
  @@map("AdminLoginAttempt")
}
```

### Fix #2: Verify Table Names

**Priority:** HIGH  
**Effort:** 15 minutes

Check if `Offer` table exists or should be `AuctionOffer`:
```bash
grep -r '\.from("Offer")' app/api
```

If using different name, update all references.

### Fix #3: Run Prisma Generate

After adding models:
```bash
npx prisma generate
npx prisma validate
```

---

## ✅ VERIFICATION CHECKLIST

Use this checklist to verify the audit is complete:

- [ ] Database credentials configured in environment
- [ ] Health check endpoint returns `ok: true`
- [ ] All SQL verification queries executed
- [ ] All tables from Prisma exist in database
- [ ] All database tables have Prisma models
- [ ] Enum values match between code and database
- [ ] RLS policies verified for user-facing tables
- [ ] Foreign key constraints match Prisma relations
- [ ] Indexes exist for frequently queried columns
- [ ] Migration files all applied successfully
- [ ] No schema drift detected
- [ ] DealerUser model added to schema
- [ ] AdminAuditLog model added to schema
- [ ] AdminLoginAttempt model added to schema
- [ ] All HIGH severity issues resolved
- [ ] Prisma generate runs without errors

---

## 📝 NEXT STEPS

1. **Immediate (HIGH Priority)**
   - Add missing models to Prisma schema
   - Verify table name consistency (Offer vs AuctionOffer)
   - Run `npx prisma generate` and fix any errors
   
2. **Short-term (Within 1 week)**
   - Set up database credentials in environment
   - Execute all SQL verification queries
   - Document any schema drift found
   - Create migration for any missing tables/columns
   
3. **Long-term (Within 1 month)**
   - Add comprehensive integration tests for DB access
   - Set up automated schema drift detection
   - Document RLS policy strategy
   - Create DB backup/restore procedures

---

**Audit Status:** PARTIAL - 80% Complete  
**Blocker:** Database credentials required for full verification  
**Estimated Time to Complete:** 2-4 hours with database access

