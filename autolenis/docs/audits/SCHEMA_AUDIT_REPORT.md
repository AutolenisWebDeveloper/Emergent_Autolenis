# Database Schema Alignment Audit Report

**Generated:** 2026-02-08
**Repository:** VercelAutoLenis
**Auditor:** Automated Schema Audit Tool

---

## ⚠️ IMPORTANT: DATABASE CONNECTION UNAVAILABLE

This audit was performed using **static code analysis only** because:
- No database credentials were available in the sandbox environment
- The `POSTGRES_PRISMA_URL` environment variable is not set

### What This Report Contains:
✅ Complete Prisma schema analysis (49 models)
✅ API route database usage mapping (20 unique tables accessed)
✅ Code-level alignment checks
✅ Recommendations for live database verification

### What Requires Live Database Access:
❌ Actual table/column existence verification
❌ Type matching (PostgreSQL types vs Prisma types)
❌ RLS policy inspection
❌ Index and constraint verification
❌ Enum value matching
❌ Migration application status

**To complete this audit:** Run with database credentials:
```bash
POSTGRES_PRISMA_URL=<your-connection-string> tsx scripts/schema-audit.ts
```

---

## PHASE 0 — CONNECTION VERIFICATION

### Database Health Check

**Endpoint:** `GET /api/health/db`

**Expected Response:**
```json
{
  "ok": true,
  "projectRef": "xxxxxxxxx",
  "latencyMs": <number>,
  "lastCanaryRow": { ... }
}
```

**Manual Verification Steps:**
1. Ensure environment variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `POSTGRES_PRISMA_URL`

2. Run health check:
   ```bash
   curl http://localhost:3000/api/health/db
   ```

3. Record the `projectRef` value for this audit.

---

## EXECUTIVE SUMMARY

### Issue Count by Severity

| Severity | Count | Issues |
|----------|-------|--------|
| BLOCKER | 0 | Runtime failures, missing tables/columns |
| HIGH | 4 | Type mismatches, missing constraints |
| MED | 0 | Performance issues, missing indexes |
| LOW | 33 | Unused models, documentation gaps |
| **TOTAL** | **37** | |

### Top Issues

1. **[LOW]** Unused Model: Model AdminUser is defined in Prisma but not used in any API routes
2. **[LOW]** Unused Model: Model PreQualification is defined in Prisma but not used in any API routes
3. **[LOW]** Unused Model: Model BuyerPreferences is defined in Prisma but not used in any API routes
4. **[LOW]** Unused Model: Model Shortlist is defined in Prisma but not used in any API routes
5. **[LOW]** Unused Model: Model Auction is defined in Prisma but not used in any API routes

---

## PHASE 1 — PRISMA SCHEMA SNAPSHOT

### Models Defined (49 total)

✅ **User** (19 fields, 5 routes)
✅ **BuyerProfile** (24 fields, 4 routes)
✅ **Dealer** (19 fields, 4 routes)
⚠️ **AdminUser** (8 fields, 0 routes)
✅ **Affiliate** (15 fields, 4 routes)
⚠️ **PreQualification** (16 fields, 0 routes)
⚠️ **BuyerPreferences** (11 fields, 0 routes)
✅ **Vehicle** (16 fields, 3 routes)
✅ **InventoryItem** (11 fields, 2 routes)
⚠️ **Shortlist** (8 fields, 0 routes)
✅ **ShortlistItem** (7 fields, 1 routes)
⚠️ **Auction** (14 fields, 0 routes)
⚠️ **AuctionParticipant** (7 fields, 0 routes)
✅ **AuctionOffer** (13 fields, 1 routes)
⚠️ **AuctionOfferFinancingOption** (9 fields, 0 routes)
⚠️ **BestPriceOption** (12 fields, 0 routes)
✅ **SelectedDeal** (24 fields, 2 routes)
⚠️ **FinancingOffer** (12 fields, 0 routes)
⚠️ **ExternalPreApproval** (9 fields, 0 routes)
⚠️ **InsuranceQuote** (30 fields, 0 routes)
⚠️ **InsurancePolicy** (32 fields, 0 routes)
⚠️ **ContractDocument** (10 fields, 0 routes)
⚠️ **ContractShieldScan** (18 fields, 0 routes)
⚠️ **FixListItem** (9 fields, 0 routes)
⚠️ **ContractShieldOverride** (13 fields, 0 routes)
⚠️ **ContractShieldRule** (11 fields, 0 routes)
⚠️ **ContractShieldNotification** (12 fields, 0 routes)
⚠️ **ContractShieldReconciliation** (12 fields, 0 routes)
⚠️ **ESignEnvelope** (15 fields, 0 routes)
⚠️ **PickupAppointment** (15 fields, 0 routes)
⚠️ **Referral** (12 fields, 0 routes)
✅ **Click** (7 fields, 1 routes)
⚠️ **Commission** (14 fields, 0 routes)
⚠️ **Payout** (11 fields, 0 routes)
✅ **DepositPayment** (12 fields, 2 routes)
✅ **ServiceFeePayment** (13 fields, 2 routes)
⚠️ **FeeFinancingDisclosure** (13 fields, 0 routes)
⚠️ **LenderFeeDisbursement** (8 fields, 0 routes)
⚠️ **PaymentMethod** (8 fields, 0 routes)
✅ **TradeIn** (24 fields, 2 routes)
✅ **ComplianceEvent** (10 fields, 5 routes)
⚠️ **PaymentProviderEvent** (8 fields, 0 routes)
⚠️ **AdminSetting** (6 fields, 0 routes)
⚠️ **DealDocument** (14 fields, 0 routes)
⚠️ **DocumentRequest** (20 fields, 0 routes)
✅ **RefinanceLead** (28 fields, 2 routes)
✅ **FundedLoan** (10 fields, 1 routes)
⚠️ **InsuranceDocRequest** (12 fields, 0 routes)
⚠️ **InsuranceEvent** (7 fields, 0 routes)

### Enums Detected

The following enums are defined in the Prisma schema:
- UserRole (BUYER, DEALER, ADMIN, AFFILIATE)
- CreditTier (EXCELLENT, GOOD, FAIR, POOR, DECLINED)
- AuctionStatus (PENDING_DEPOSIT, ACTIVE, CLOSED, COMPLETED, CANCELLED)
- BestPriceType (BEST_CASH, BEST_MONTHLY, BALANCED)
- DealStatus (14 values)
- InsuranceStatus (5 values)
- ContractStatus (4 values)
- ESignStatus (7 values)
- PickupStatus (5 values)
- PaymentStatus (5 values)
- FeePaymentMethod (2 values)
- DocumentStatus (4 values)
- DocumentRequestStatus (4 values)
- RefinanceQualificationStatus (3 values)
- VehicleCondition (4 values)
- MarketingRestriction (2 values)

**Live DB Verification Required:**
```sql
-- Run this query in Supabase SQL Editor to verify enums exist:
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

---

## PHASE 2 — CODE EXPECTATIONS SNAPSHOT

### Database Access Patterns

**Primary Method:** Supabase Client
- Most API routes use `supabase.from("TableName")` for queries
- Prisma client is defined in schema but accessed via Supabase

**Secondary Method:** Prisma Client (in services)
- Used in lib/services/* for complex operations
- Direct Prisma queries in some background jobs

### Table Usage Map

**ComplianceEvent** → 5 routes
  - admin/affiliates/[affiliateId]/status/route.ts
  - admin/auctions/[auctionId]/best-price/recompute/route.ts
  - admin/dealers/[id]/approve/route.ts

**User** → 5 routes
  - admin/auth/mfa/verify/route.ts
  - admin/auth/signup/route.ts
  - admin/health/route.ts

**Affiliate** → 4 routes
  - admin/affiliates/route.ts
  - affiliate/payouts/route.ts
  - auth/me/route.ts

**Dealer** → 4 routes
  - admin/dealers/[id]/route.ts
  - auth/me/route.ts
  - buyer/contracts/route.ts

**BuyerProfile** → 4 routes
  - auth/me/route.ts
  - buyer/prequal/route.ts
  - buyer/shortlist/route.ts

**Vehicle** → 3 routes
  - buyer/contracts/route.ts
  - dealer/inventory/bulk-upload/route.ts
  - dealer/inventory/route.ts

**RefinanceLead** → 2 routes
  - admin/refinance/leads/route.ts
  - admin/refinance/stats/route.ts

**TradeIn** → 2 routes
  - admin/trade-ins/route.ts
  - buyer/trade-in/route.ts

**InventoryItem** → 2 routes
  - dealer/dashboard/route.ts
  - dealer/inventory/bulk-upload/route.ts

**DepositPayment** → 2 routes
  - payments/create-checkout/route.ts
  - webhooks/stripe/route.ts

**SelectedDeal** → 2 routes
  - payments/create-checkout/route.ts
  - webhooks/stripe/route.ts

**ServiceFeePayment** → 2 routes
  - payments/create-checkout/route.ts
  - webhooks/stripe/route.ts

**AffiliatePayout** → 1 routes
  - admin/affiliates/payouts/route.ts

**Offer** → 1 routes
  - admin/dealers/[id]/route.ts

**FundedLoan** → 1 routes
  - admin/refinance/funded-loans/route.ts

**Click** → 1 routes
  - affiliate/dashboard/route.ts

**AuctionOffer** → 1 routes
  - buyer/contracts/route.ts

**ShortlistItem** → 1 routes
  - buyer/shortlist/route.ts

**contact_messages** → 1 routes
  - contact/route.ts

**DealerUser** → 1 routes
  - dealer/register/route.ts

---

## PHASE 3 — ALIGNMENT CHECKS




### Issue #1: Unused Model [LOW]

**Symptom:** Model AdminUser is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model AdminUser)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.AdminUser" app lib
```

---


### Issue #2: Unused Model [LOW]

**Symptom:** Model PreQualification is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model PreQualification)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.PreQualification" app lib
```

---


### Issue #3: Unused Model [LOW]

**Symptom:** Model BuyerPreferences is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model BuyerPreferences)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.BuyerPreferences" app lib
```

---


### Issue #4: Unused Model [LOW]

**Symptom:** Model Shortlist is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model Shortlist)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.Shortlist" app lib
```

---


### Issue #5: Unused Model [LOW]

**Symptom:** Model Auction is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model Auction)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.Auction" app lib
```

---


### Issue #6: Unused Model [LOW]

**Symptom:** Model AuctionParticipant is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model AuctionParticipant)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.AuctionParticipant" app lib
```

---


### Issue #7: Unused Model [LOW]

**Symptom:** Model AuctionOfferFinancingOption is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model AuctionOfferFinancingOption)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.AuctionOfferFinancingOption" app lib
```

---


### Issue #8: Unused Model [LOW]

**Symptom:** Model BestPriceOption is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model BestPriceOption)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.BestPriceOption" app lib
```

---


### Issue #9: Unused Model [LOW]

**Symptom:** Model FinancingOffer is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model FinancingOffer)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.FinancingOffer" app lib
```

---


### Issue #10: Unused Model [LOW]

**Symptom:** Model ExternalPreApproval is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model ExternalPreApproval)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.ExternalPreApproval" app lib
```

---


### Issue #11: Unused Model [LOW]

**Symptom:** Model InsuranceQuote is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model InsuranceQuote)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.InsuranceQuote" app lib
```

---


### Issue #12: Unused Model [LOW]

**Symptom:** Model InsurancePolicy is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model InsurancePolicy)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.InsurancePolicy" app lib
```

---


### Issue #13: Unused Model [LOW]

**Symptom:** Model ContractDocument is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model ContractDocument)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.ContractDocument" app lib
```

---


### Issue #14: Unused Model [LOW]

**Symptom:** Model ContractShieldScan is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model ContractShieldScan)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.ContractShieldScan" app lib
```

---


### Issue #15: Unused Model [LOW]

**Symptom:** Model FixListItem is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model FixListItem)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.FixListItem" app lib
```

---


### Issue #16: Unused Model [LOW]

**Symptom:** Model ContractShieldOverride is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model ContractShieldOverride)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.ContractShieldOverride" app lib
```

---


### Issue #17: Unused Model [LOW]

**Symptom:** Model ContractShieldRule is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model ContractShieldRule)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.ContractShieldRule" app lib
```

---


### Issue #18: Unused Model [LOW]

**Symptom:** Model ContractShieldNotification is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model ContractShieldNotification)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.ContractShieldNotification" app lib
```

---


### Issue #19: Unused Model [LOW]

**Symptom:** Model ContractShieldReconciliation is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model ContractShieldReconciliation)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.ContractShieldReconciliation" app lib
```

---


### Issue #20: Unused Model [LOW]

**Symptom:** Model ESignEnvelope is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model ESignEnvelope)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.ESignEnvelope" app lib
```

---


### Issue #21: Unused Model [LOW]

**Symptom:** Model PickupAppointment is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model PickupAppointment)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.PickupAppointment" app lib
```

---


### Issue #22: Unused Model [LOW]

**Symptom:** Model Referral is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model Referral)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.Referral" app lib
```

---


### Issue #23: Unused Model [LOW]

**Symptom:** Model Commission is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model Commission)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.Commission" app lib
```

---


### Issue #24: Unused Model [LOW]

**Symptom:** Model Payout is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model Payout)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.Payout" app lib
```

---


### Issue #25: Unused Model [LOW]

**Symptom:** Model FeeFinancingDisclosure is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model FeeFinancingDisclosure)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.FeeFinancingDisclosure" app lib
```

---


### Issue #26: Unused Model [LOW]

**Symptom:** Model LenderFeeDisbursement is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model LenderFeeDisbursement)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.LenderFeeDisbursement" app lib
```

---


### Issue #27: Unused Model [LOW]

**Symptom:** Model PaymentMethod is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model PaymentMethod)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.PaymentMethod" app lib
```

---


### Issue #28: Unused Model [LOW]

**Symptom:** Model PaymentProviderEvent is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model PaymentProviderEvent)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.PaymentProviderEvent" app lib
```

---


### Issue #29: Unused Model [LOW]

**Symptom:** Model AdminSetting is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model AdminSetting)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.AdminSetting" app lib
```

---


### Issue #30: Unused Model [LOW]

**Symptom:** Model DealDocument is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model DealDocument)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.DealDocument" app lib
```

---


### Issue #31: Unused Model [LOW]

**Symptom:** Model DocumentRequest is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model DocumentRequest)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.DocumentRequest" app lib
```

---


### Issue #32: Unused Model [LOW]

**Symptom:** Model InsuranceDocRequest is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model InsuranceDocRequest)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.InsuranceDocRequest" app lib
```

---


### Issue #33: Unused Model [LOW]

**Symptom:** Model InsuranceEvent is defined in Prisma but not used in any API routes

**Code Reference:**
`prisma/schema.prisma (model InsuranceEvent)`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Remove model from schema if truly unused
Option B: Add API endpoints that use this model

**Verification Steps:**
```bash
grep -r "prisma.InsuranceEvent" app lib
```

---


### Issue #34: Missing Model [HIGH]

**Symptom:** Table AffiliatePayout is used in code but not defined in Prisma schema

**Code Reference:**
`admin/affiliates/payouts/route.ts`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Add model to prisma/schema.prisma
Option B: Remove usage from code if table doesn't exist

**Verification Steps:**
```bash
grep -r "from.*AffiliatePayout" app/api
```

---


### Issue #35: Missing Model [HIGH]

**Symptom:** Table Offer is used in code but not defined in Prisma schema

**Code Reference:**
`admin/dealers/[id]/route.ts`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Add model to prisma/schema.prisma
Option B: Remove usage from code if table doesn't exist

**Verification Steps:**
```bash
grep -r "from.*Offer" app/api
```

---


### Issue #36: Missing Model [HIGH]

**Symptom:** Table contact_messages is used in code but not defined in Prisma schema

**Code Reference:**
`contact/route.ts`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Add model to prisma/schema.prisma
Option B: Remove usage from code if table doesn't exist

**Verification Steps:**
```bash
grep -r "from.*contact_messages" app/api
```

---


### Issue #37: Missing Model [HIGH]

**Symptom:** Table DealerUser is used in code but not defined in Prisma schema

**Code Reference:**
`dealer/register/route.ts`

**DB Evidence:**
N/A - Static analysis only

**Fix Recommendation:**
Option A: Add model to prisma/schema.prisma
Option B: Remove usage from code if table doesn't exist

**Verification Steps:**
```bash
grep -r "from.*DealerUser" app/api
```

---


## PHASE 4 — ALIGNMENT MATRIX

| Table/Model | Routes Using | Columns | RLS | Status |
|-------------|-------------|---------|-----|--------|
| User | 5 | 0 | UNKNOWN | UNKNOWN |
| BuyerProfile | 4 | 0 | UNKNOWN | UNKNOWN |
| Dealer | 4 | 0 | UNKNOWN | UNKNOWN |
| AdminUser | 0 | 0 | UNKNOWN | UNKNOWN |
| Affiliate | 4 | 0 | UNKNOWN | UNKNOWN |
| PreQualification | 0 | 0 | UNKNOWN | UNKNOWN |
| BuyerPreferences | 0 | 0 | UNKNOWN | UNKNOWN |
| Vehicle | 3 | 0 | UNKNOWN | UNKNOWN |
| InventoryItem | 2 | 0 | UNKNOWN | UNKNOWN |
| Shortlist | 0 | 0 | UNKNOWN | UNKNOWN |
| ShortlistItem | 1 | 0 | UNKNOWN | UNKNOWN |
| Auction | 0 | 0 | UNKNOWN | UNKNOWN |
| AuctionParticipant | 0 | 0 | UNKNOWN | UNKNOWN |
| AuctionOffer | 1 | 0 | UNKNOWN | UNKNOWN |
| AuctionOfferFinancingOption | 0 | 0 | UNKNOWN | UNKNOWN |
| BestPriceOption | 0 | 0 | UNKNOWN | UNKNOWN |
| SelectedDeal | 2 | 0 | UNKNOWN | UNKNOWN |
| FinancingOffer | 0 | 0 | UNKNOWN | UNKNOWN |
| ExternalPreApproval | 0 | 0 | UNKNOWN | UNKNOWN |
| InsuranceQuote | 0 | 0 | UNKNOWN | UNKNOWN |
| InsurancePolicy | 0 | 0 | UNKNOWN | UNKNOWN |
| ContractDocument | 0 | 0 | UNKNOWN | UNKNOWN |
| ContractShieldScan | 0 | 0 | UNKNOWN | UNKNOWN |
| FixListItem | 0 | 0 | UNKNOWN | UNKNOWN |
| ContractShieldOverride | 0 | 0 | UNKNOWN | UNKNOWN |
| ContractShieldRule | 0 | 0 | UNKNOWN | UNKNOWN |
| ContractShieldNotification | 0 | 0 | UNKNOWN | UNKNOWN |
| ContractShieldReconciliation | 0 | 0 | UNKNOWN | UNKNOWN |
| ESignEnvelope | 0 | 0 | UNKNOWN | UNKNOWN |
| PickupAppointment | 0 | 0 | UNKNOWN | UNKNOWN |
| Referral | 0 | 0 | UNKNOWN | UNKNOWN |
| Click | 1 | 0 | UNKNOWN | UNKNOWN |
| Commission | 0 | 0 | UNKNOWN | UNKNOWN |
| Payout | 0 | 0 | UNKNOWN | UNKNOWN |
| DepositPayment | 2 | 0 | UNKNOWN | UNKNOWN |
| ServiceFeePayment | 2 | 0 | UNKNOWN | UNKNOWN |
| FeeFinancingDisclosure | 0 | 0 | UNKNOWN | UNKNOWN |
| LenderFeeDisbursement | 0 | 0 | UNKNOWN | UNKNOWN |
| PaymentMethod | 0 | 0 | UNKNOWN | UNKNOWN |
| TradeIn | 2 | 0 | UNKNOWN | UNKNOWN |
| ComplianceEvent | 5 | 0 | UNKNOWN | UNKNOWN |
| PaymentProviderEvent | 0 | 0 | UNKNOWN | UNKNOWN |
| AdminSetting | 0 | 0 | UNKNOWN | UNKNOWN |
| DealDocument | 0 | 0 | UNKNOWN | UNKNOWN |
| DocumentRequest | 0 | 0 | UNKNOWN | UNKNOWN |
| RefinanceLead | 2 | 0 | UNKNOWN | UNKNOWN |
| FundedLoan | 1 | 0 | UNKNOWN | UNKNOWN |
| InsuranceDocRequest | 0 | 0 | UNKNOWN | UNKNOWN |
| InsuranceEvent | 0 | 0 | UNKNOWN | UNKNOWN |

---

## LIVE DATABASE VERIFICATION QUERIES

To complete this audit, run these queries in Supabase SQL Editor:

### 1. Tables and Columns
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public'
ORDER BY table_name, ordinal_position;
```

### 2. Constraints
```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema='public'
ORDER BY tc.table_name, tc.constraint_type;
```

### 3. Foreign Keys
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

### 4. Indexes
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname='public'
ORDER BY tablename, indexname;
```

### 5. RLS Status
```sql
SELECT relname AS table, relrowsecurity AS rls_enabled
FROM pg_class
JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
WHERE nspname='public'
AND relkind='r'
ORDER BY relname;
```

### 6. RLS Policies
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, policyname;
```

---

## RECOMMENDATIONS

### Immediate Actions Required

1. **Set Up Database Access**
   - Configure `POSTGRES_PRISMA_URL` in environment
   - Verify Supabase connection via `/api/health/db`
   - Run live verification queries above

2. **Review Unused Models**
   - 33 models have no API route usage
   - Determine if these are dead code or accessed elsewhere

3. **Migration Verification**
   - Check if all migrations in `migrations/` have been applied
   - Compare migration SQL with actual database schema

### Database Security Checks

1. **RLS Policies**
   - Verify all user-facing tables have RLS enabled
   - Ensure policies match application role assumptions
   - Test with anon key to verify access restrictions

2. **Service Role Usage**
   - Audit which routes use service role key
   - Ensure sensitive operations are server-side only
   - Check for service role leakage to client

---

## APPENDIX: MIGRATION FILES

The following migration files exist:

- `migrations/02-add-dealer-users-table.sql`
- `migrations/03-add-missing-buyer-fields.sql`
- `migrations/04-add-missing-dealer-fields.sql`
- `migrations/05-add-vehicle-fields.sql`
- `migrations/94-add-admin-mfa-fields.sql`
- `migrations/95-add-connection-canary-table.sql`

**Verification Required:**
- Confirm all migrations have been applied to production
- Check for schema drift between migrations and live DB

---

**End of Report**

*This report was generated by automated static analysis. Complete database verification requires live database access.*
