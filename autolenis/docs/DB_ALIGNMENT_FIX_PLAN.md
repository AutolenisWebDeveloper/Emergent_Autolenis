# Database Alignment Fix Plan

**Document Version:** 1.0  
**Generated:** 2026-02-08  
**Purpose:** Detailed plan for fixing all identified mismatches with PASS/FAIL criteria.

---

## Executive Summary

This document outlines the **minimal, surgical fixes** required to address gaps identified in `DB_ALIGNMENT_GAPS.md`.

**Total Fixes Required:** 6  
**Critical (P1):** 3  
**Medium (P2):** 2  
**Low (P3):** 1

---

## FIX CLASSIFICATION

| Fix # | Description | Type | Priority | Backward Compatible? | Breaking Change? |
|-------|-------------|------|----------|---------------------|-----------------|
| 1 | Add RLS policies to 31 tables | RLS Policy | P1 | ✅ Yes | ❌ No |
| 2 | Fix RLS policy table name mismatches | RLS Policy | P1 | ✅ Yes | ❌ No |
| 3 | Insurance table column consolidation | Schema + Code | P1 | ⚠️ Phased | ⚠️ Potentially |
| 4 | Deprecate SelectedDeal legacy fields | Schema + Code | P2 | ✅ Yes | ❌ No |
| 5 | Fix InsuranceQuote RLS policy | RLS Policy | P2 | ✅ Yes | ❌ No |
| 6 | Document potentially unused columns | Documentation | P3 | ✅ Yes | ❌ No |

---

## FIX #1: Add RLS Policies to 31 Tables

**Priority:** 🔴 **P1 - Critical**  
**Type:** RLS Policy Change  
**Impact:** Security improvement  
**Backward Compatible:** ✅ Yes (server-side queries unaffected)  
**Breaking Change:** ❌ No (unless client-side queries exist)

### Problem Statement
31 tables lack RLS policies, creating potential security risk if client-side Supabase queries are used.

### Tables Requiring RLS

#### High-Sensitivity (12 tables):
1. `PreQualification` - Credit scores, DTI, financial data
2. `DepositPayment` - Payment information
3. `ServiceFeePayment` - Payment information
4. `FeeFinancingDisclosure` - Loan terms, consent
5. `LenderFeeDisbursement` - Disbursement data
6. `PaymentMethod` - Saved payment methods
7. `ESignEnvelope` - Signature status
8. `ContractShieldScan` - Contract analysis
9. `ContractDocument` - Legal documents
10. `DocumentRequest` - Document requests
11. `DealDocument` - Personal documents
12. `InsuranceDocRequest` - Insurance docs

#### Medium-Sensitivity (11 tables):
13. `BuyerPreferences`
14. `Shortlist`
15. `ShortlistItem`
16. `AuctionParticipant`
17. `AuctionOfferFinancingOption`
18. `BestPriceOption`
19. `ExternalPreApproval`
20. `FixListItem`
21. `ContractShieldOverride`
22. `ContractShieldNotification`
23. `AdminUser`

#### Low-Sensitivity (8 tables - Admin/System only):
24. `Vehicle` (could be public)
25. `ContractShieldRule` (system config)
26. `ContractShieldReconciliation` (background jobs)
27. `ComplianceEvent` (audit logs)
28. `PaymentProviderEvent` (webhooks)
29. `AdminSetting` (system settings)
30. `RefinanceLead` (admin-only)
31. `FundedLoan` (admin-only)

### Proposed Fix

**Create new SQL migration:** `scripts/03-add-missing-rls-policies.sql`

```sql
-- Missing RLS Policies for AutoLenis Database
-- Critical security enhancement

-- HIGH-SENSITIVITY TABLES

-- PreQualification: Buyer (own) + Admin
ALTER TABLE "PreQualification" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own pre-qualification"
  ON "PreQualification" FOR SELECT
  USING (
    "buyerId" IN (SELECT id FROM "BuyerProfile" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to pre-qualifications"
  ON "PreQualification" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- DepositPayment: Buyer (own) + Admin
ALTER TABLE "DepositPayment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own deposit payments"
  ON "DepositPayment" FOR SELECT
  USING ("buyerId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Admins have full access to deposit payments"
  ON "DepositPayment" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ServiceFeePayment: Buyer (via deal) + Admin
ALTER TABLE "ServiceFeePayment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own service fee payments"
  ON "ServiceFeePayment" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to service fee payments"
  ON "ServiceFeePayment" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- FeeFinancingDisclosure: Buyer (via fee payment) + Admin
ALTER TABLE "FeeFinancingDisclosure" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own fee financing disclosures"
  ON "FeeFinancingDisclosure" FOR SELECT
  USING (
    "feePaymentId" IN (
      SELECT sfp.id FROM "ServiceFeePayment" sfp
      JOIN "SelectedDeal" sd ON sfp."dealId" = sd.id
      WHERE sd."buyerId" = auth.user_id()
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to fee financing disclosures"
  ON "FeeFinancingDisclosure" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- LenderFeeDisbursement: Admin only
ALTER TABLE "LenderFeeDisbursement" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to lender fee disbursements"
  ON "LenderFeeDisbursement" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- PaymentMethod: User (own) + Admin
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payment methods"
  ON "PaymentMethod" FOR SELECT
  USING ("userId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Users can manage their own payment methods"
  ON "PaymentMethod" FOR ALL
  USING ("userId" = auth.user_id())
  WITH CHECK ("userId" = auth.user_id());

CREATE POLICY "Admins have full access to payment methods"
  ON "PaymentMethod" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ESignEnvelope: Buyer (via deal) + Dealer (via deal) + Admin
ALTER TABLE "ESignEnvelope" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own e-sign envelopes"
  ON "ESignEnvelope" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Dealers can view e-sign envelopes for their deals"
  ON "ESignEnvelope" FOR SELECT
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      JOIN "InventoryItem" ii ON sd."inventoryItemId" = ii.id
      WHERE ii."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to e-sign envelopes"
  ON "ESignEnvelope" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ContractShieldScan: Buyer (via deal) + Dealer (own) + Admin
ALTER TABLE "ContractShieldScan" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own contract scans"
  ON "ContractShieldScan" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Dealers can view scans for their deals"
  ON "ContractShieldScan" FOR SELECT
  USING (
    "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to contract scans"
  ON "ContractShieldScan" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ContractDocument: Buyer (via deal) + Dealer (own) + Admin
ALTER TABLE "ContractDocument" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own contract documents"
  ON "ContractDocument" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Dealers can manage their own contract documents"
  ON "ContractDocument" FOR ALL
  USING (
    "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  )
  WITH CHECK (
    "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to contract documents"
  ON "ContractDocument" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- DocumentRequest: Buyer (own) + Dealer (requester) + Admin
ALTER TABLE "DocumentRequest" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own document requests"
  ON "DocumentRequest" FOR SELECT
  USING ("buyerId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Dealers can view document requests they created"
  ON "DocumentRequest" FOR SELECT
  USING (
    "requestedByUserId" = auth.user_id() AND "requestedByRole" = 'DEALER'
    OR auth.is_admin()
  );

CREATE POLICY "Dealers can create document requests"
  ON "DocumentRequest" FOR INSERT
  WITH CHECK (
    "requestedByUserId" = auth.user_id() AND "requestedByRole" = 'DEALER'
  );

CREATE POLICY "Admins have full access to document requests"
  ON "DocumentRequest" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- DealDocument: Owner (own) + Dealer (view) + Admin
ALTER TABLE "DealDocument" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deal documents"
  ON "DealDocument" FOR SELECT
  USING ("ownerUserId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Users can manage their own deal documents"
  ON "DealDocument" FOR ALL
  USING ("ownerUserId" = auth.user_id())
  WITH CHECK ("ownerUserId" = auth.user_id());

CREATE POLICY "Dealers can view documents for their deals"
  ON "DealDocument" FOR SELECT
  USING (
    "dealId" IN (
      SELECT sd.id FROM "SelectedDeal" sd
      JOIN "InventoryItem" ii ON sd."inventoryItemId" = ii.id
      WHERE ii."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to deal documents"
  ON "DealDocument" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- InsuranceDocRequest: Buyer (own) + Dealer (requester) + Admin
ALTER TABLE "InsuranceDocRequest" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own insurance doc requests"
  ON "InsuranceDocRequest" FOR SELECT
  USING ("buyerId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Dealers can view insurance doc requests they created"
  ON "InsuranceDocRequest" FOR SELECT
  USING (
    "requestedByUserId" = auth.user_id() AND "requestedByRole" = 'DEALER'
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to insurance doc requests"
  ON "InsuranceDocRequest" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- MEDIUM-SENSITIVITY TABLES

-- BuyerPreferences: Buyer (own) + Admin
ALTER TABLE "BuyerPreferences" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own preferences"
  ON "BuyerPreferences" FOR SELECT
  USING (
    "buyerId" IN (SELECT id FROM "BuyerProfile" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Buyers can manage their own preferences"
  ON "BuyerPreferences" FOR ALL
  USING (
    "buyerId" IN (SELECT id FROM "BuyerProfile" WHERE "userId" = auth.user_id())
  )
  WITH CHECK (
    "buyerId" IN (SELECT id FROM "BuyerProfile" WHERE "userId" = auth.user_id())
  );

CREATE POLICY "Admins have full access to buyer preferences"
  ON "BuyerPreferences" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- Shortlist: Buyer (own) + Admin
ALTER TABLE "Shortlist" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own shortlists"
  ON "Shortlist" FOR SELECT
  USING (
    "buyerId" IN (SELECT id FROM "BuyerProfile" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Buyers can manage their own shortlists"
  ON "Shortlist" FOR ALL
  USING (
    "buyerId" IN (SELECT id FROM "BuyerProfile" WHERE "userId" = auth.user_id())
  )
  WITH CHECK (
    "buyerId" IN (SELECT id FROM "BuyerProfile" WHERE "userId" = auth.user_id())
  );

CREATE POLICY "Admins have full access to shortlists"
  ON "Shortlist" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ShortlistItem: Buyer (via shortlist) + Admin
ALTER TABLE "ShortlistItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own shortlist items"
  ON "ShortlistItem" FOR SELECT
  USING (
    "shortlistId" IN (
      SELECT s.id FROM "Shortlist" s
      JOIN "BuyerProfile" bp ON s."buyerId" = bp.id
      WHERE bp."userId" = auth.user_id()
    )
    OR auth.is_admin()
  );

CREATE POLICY "Buyers can manage their own shortlist items"
  ON "ShortlistItem" FOR ALL
  USING (
    "shortlistId" IN (
      SELECT s.id FROM "Shortlist" s
      JOIN "BuyerProfile" bp ON s."buyerId" = bp.id
      WHERE bp."userId" = auth.user_id()
    )
  )
  WITH CHECK (
    "shortlistId" IN (
      SELECT s.id FROM "Shortlist" s
      JOIN "BuyerProfile" bp ON s."buyerId" = bp.id
      WHERE bp."userId" = auth.user_id()
    )
  );

CREATE POLICY "Admins have full access to shortlist items"
  ON "ShortlistItem" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- AuctionParticipant: Dealer (own) + Buyer (auction owner) + Admin
ALTER TABLE "AuctionParticipant" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view their own auction participations"
  ON "AuctionParticipant" FOR SELECT
  USING (
    "dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    OR auth.is_admin()
  );

CREATE POLICY "Buyers can view participants in their auctions"
  ON "AuctionParticipant" FOR SELECT
  USING (
    "auctionId" IN (
      SELECT a.id FROM "Auction" a
      JOIN "BuyerProfile" bp ON a."buyerId" = bp.id
      WHERE bp."userId" = auth.user_id()
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to auction participants"
  ON "AuctionParticipant" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- AuctionOfferFinancingOption: Dealer (via offer) + Buyer (auction owner) + Admin
ALTER TABLE "AuctionOfferFinancingOption" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dealers can view their own financing options"
  ON "AuctionOfferFinancingOption" FOR SELECT
  USING (
    "offerId" IN (
      SELECT ao.id FROM "AuctionOffer" ao
      JOIN "Auction" a ON ao."auctionId" = a.id
      JOIN "AuctionParticipant" ap ON ap."auctionId" = a.id
      WHERE ap."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    )
    OR auth.is_admin()
  );

CREATE POLICY "Buyers can view financing options in their auctions"
  ON "AuctionOfferFinancingOption" FOR SELECT
  USING (
    "offerId" IN (
      SELECT ao.id FROM "AuctionOffer" ao
      JOIN "Auction" a ON ao."auctionId" = a.id
      JOIN "BuyerProfile" bp ON a."buyerId" = bp.id
      WHERE bp."userId" = auth.user_id()
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to financing options"
  ON "AuctionOfferFinancingOption" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- BestPriceOption: Buyer (auction owner) + Admin
ALTER TABLE "BestPriceOption" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own best price options"
  ON "BestPriceOption" FOR SELECT
  USING (
    "auctionId" IN (
      SELECT a.id FROM "Auction" a
      JOIN "BuyerProfile" bp ON a."buyerId" = bp.id
      WHERE bp."userId" = auth.user_id()
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to best price options"
  ON "BestPriceOption" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ExternalPreApproval: Buyer (own) + Admin
ALTER TABLE "ExternalPreApproval" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own external pre-approvals"
  ON "ExternalPreApproval" FOR SELECT
  USING ("buyerId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Buyers can manage their own external pre-approvals"
  ON "ExternalPreApproval" FOR ALL
  USING ("buyerId" = auth.user_id())
  WITH CHECK ("buyerId" = auth.user_id());

CREATE POLICY "Admins have full access to external pre-approvals"
  ON "ExternalPreApproval" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- FixListItem: Buyer (via scan) + Dealer (via scan) + Admin
ALTER TABLE "FixListItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view fix list items for their deals"
  ON "FixListItem" FOR SELECT
  USING (
    "scanId" IN (
      SELECT cs.id FROM "ContractShieldScan" cs
      JOIN "SelectedDeal" sd ON cs."dealId" = sd.id
      WHERE sd."buyerId" = auth.user_id()
    )
    OR auth.is_admin()
  );

CREATE POLICY "Dealers can view fix list items for their deals"
  ON "FixListItem" FOR SELECT
  USING (
    "scanId" IN (
      SELECT cs.id FROM "ContractShieldScan" cs
      WHERE cs."dealerId" IN (SELECT id FROM "Dealer" WHERE "userId" = auth.user_id())
    )
    OR auth.is_admin()
  );

CREATE POLICY "Admins have full access to fix list items"
  ON "FixListItem" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ContractShieldOverride: Buyer (view) + Admin (full)
ALTER TABLE "ContractShieldOverride" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view overrides for their deals"
  ON "ContractShieldOverride" FOR SELECT
  USING (
    "scanId" IN (
      SELECT cs.id FROM "ContractShieldScan" cs
      JOIN "SelectedDeal" sd ON cs."dealId" = sd.id
      WHERE sd."buyerId" = auth.user_id()
    )
    OR auth.is_admin()
  );

CREATE POLICY "Buyers can acknowledge overrides"
  ON "ContractShieldOverride" FOR UPDATE
  USING (
    "scanId" IN (
      SELECT cs.id FROM "ContractShieldScan" cs
      JOIN "SelectedDeal" sd ON cs."dealId" = sd.id
      WHERE sd."buyerId" = auth.user_id()
    )
  )
  WITH CHECK (
    "scanId" IN (
      SELECT cs.id FROM "ContractShieldScan" cs
      JOIN "SelectedDeal" sd ON cs."dealId" = sd.id
      WHERE sd."buyerId" = auth.user_id()
    )
  );

CREATE POLICY "Admins have full access to contract shield overrides"
  ON "ContractShieldOverride" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ContractShieldNotification: Recipient (own) + Admin
ALTER TABLE "ContractShieldNotification" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own contract shield notifications"
  ON "ContractShieldNotification" FOR SELECT
  USING ("recipientId" = auth.user_id() OR auth.is_admin());

CREATE POLICY "Admins have full access to contract shield notifications"
  ON "ContractShieldNotification" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- AdminUser: Admin only
ALTER TABLE "AdminUser" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin users"
  ON "AdminUser" FOR SELECT
  USING (auth.is_admin());

CREATE POLICY "Admins have full access to admin users"
  ON "AdminUser" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- LOW-SENSITIVITY TABLES (Admin-only or public)

-- Vehicle: Public read, Admin write
ALTER TABLE "Vehicle" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view vehicles"
  ON "Vehicle" FOR SELECT
  USING (true);

CREATE POLICY "Admins have full access to vehicles"
  ON "Vehicle" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ContractShieldRule: Public read, Admin write
ALTER TABLE "ContractShieldRule" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view contract shield rules"
  ON "ContractShieldRule" FOR SELECT
  USING (true);

CREATE POLICY "Admins have full access to contract shield rules"
  ON "ContractShieldRule" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ContractShieldReconciliation: Admin only
ALTER TABLE "ContractShieldReconciliation" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to contract shield reconciliations"
  ON "ContractShieldReconciliation" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- ComplianceEvent: Admin only
ALTER TABLE "ComplianceEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to compliance events"
  ON "ComplianceEvent" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- PaymentProviderEvent: Admin only
ALTER TABLE "PaymentProviderEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to payment provider events"
  ON "PaymentProviderEvent" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- AdminSetting: Admin only
ALTER TABLE "AdminSetting" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to admin settings"
  ON "AdminSetting" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- RefinanceLead: Admin only
ALTER TABLE "RefinanceLead" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to refinance leads"
  ON "RefinanceLead" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

-- FundedLoan: Admin only
ALTER TABLE "FundedLoan" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to funded loans"
  ON "FundedLoan" FOR ALL
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());

COMMENT ON SCHEMA public IS 'AutoLenis Platform Database - Complete RLS Policies Enabled';
```

### Verification Steps

**Pre-Deployment:**
1. Review SQL file for syntax errors
2. Test policies in Supabase staging environment
3. Verify helper functions `auth.user_id()` and `auth.is_admin()` exist

**Post-Deployment:**
1. Verify all 31 tables show "RLS enabled" in Supabase dashboard
2. Test buyer access to own data (should succeed)
3. Test buyer access to other buyer data (should fail)
4. Test admin access to all data (should succeed)
5. Monitor Supabase logs for policy violations

### PASS/FAIL Criteria

**PASS:**
- ✅ All 31 tables have RLS enabled
- ✅ All policies created without errors
- ✅ Buyers can access own data
- ✅ Buyers cannot access other users' data
- ✅ Admins can access all data
- ✅ No application functionality broken

**FAIL:**
- ❌ Any policy creation fails
- ❌ Buyers can access data they shouldn't
- ❌ Admins cannot access data they should
- ❌ Application queries fail due to RLS

### Rollback Plan

If policies cause issues:
```sql
-- Disable RLS on affected tables
ALTER TABLE "[TableName]" DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY "[PolicyName]" ON "[TableName]";
```

---

## FIX #2: Fix RLS Policy Table Name Mismatches

**Priority:** 🔴 **P1 - Critical**  
**Type:** RLS Policy Change  
**Impact:** Fix orphaned policies  
**Backward Compatible:** ✅ Yes  
**Breaking Change:** ❌ No

### Problem Statement
RLS policies reference tables `Offer` and `Contract` which don't exist in Prisma schema. Should be `AuctionOffer` and `ContractDocument`.

### Proposed Fix

**Update `scripts/02-add-rls-policies.sql`:**

```sql
-- REMOVE THESE LINES (lines 14-15):
-- ALTER TABLE "Offer" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Contract" ENABLE ROW LEVEL SECURITY;

-- REMOVE POLICY DEFINITIONS FOR NON-EXISTENT TABLES (if they exist)
-- DROP POLICY IF EXISTS ... ON "Offer";
-- DROP POLICY IF EXISTS ... ON "Contract";
```

**Note:** Fix #1 already includes correct policies for `ContractDocument`. No additional policy needed for `AuctionOffer` (already exists).

### Verification Steps

1. Search for all references to `Offer` and `Contract` tables in RLS scripts
2. Confirm no policies reference non-existent tables
3. Verify `AuctionOffer` and `ContractDocument` have proper policies

### PASS/FAIL Criteria

**PASS:**
- ✅ No RLS policies reference non-existent tables
- ✅ `AuctionOffer` has RLS policies (already exists)
- ✅ `ContractDocument` has RLS policies (from Fix #1)

**FAIL:**
- ❌ Orphaned policies still exist
- ❌ `AuctionOffer` or `ContractDocument` missing policies

---

## FIX #3: Insurance Table Column Consolidation

**Priority:** 🔴 **P1 - Critical**  
**Type:** Schema + Code Change  
**Impact:** Data consistency, storage reduction  
**Backward Compatible:** ⚠️ Phased migration required  
**Breaking Change:** ⚠️ Potentially (requires code audit)

### Problem Statement
`InsuranceQuote` and `InsurancePolicy` have 40+ redundant columns (camelCase + snake_case + cents variants).

### Phased Approach

#### Phase 1: Code Audit (Non-Breaking)
1. Grep entire codebase for insurance field usage
2. Identify which variant of each field is actively used
3. Document findings

**Commands:**
```bash
# Find all insurance field usage
grep -r "buyer_id" --include="*.ts" --include="*.tsx" lib/ app/ | grep -i insurance
grep -r "carrier_name" --include="*.ts" --include="*.tsx" lib/ app/ | grep -i insurance
grep -r "policy_number_v2" --include="*.ts" --include="*.tsx" lib/ app/
# ... repeat for all duplicate fields
```

#### Phase 2: Service Layer Standardization (Non-Breaking)
1. Update insurance.service.ts to use consistent field names
2. Write to core fields, read from core fields
3. Stop reading/writing service layer duplicate fields
4. Deploy and monitor

#### Phase 3: Schema Migration (Breaking - Requires Downtime Coordination)
1. Create migration to drop duplicate columns
2. Test in staging with realistic data
3. Schedule maintenance window
4. Run migration
5. Verify application still works

### Recommended Field Consolidation

#### InsuranceQuote
**Keep:**
- `id`, `buyerId`, `vehicleId`, `carrier`, `coverageType`
- `monthlyPremium`, `sixMonthPremium`, `coverageLimits`, `deductibles`
- `expiresAt`, `createdAt`

**Drop:**
- `buyer_id`, `selected_deal_id`, `vehicle_id`
- `carrier_name`, `provider_name`
- `productName`, `product_name`
- `premium_monthly_cents`, `premium_semi_annual_cents`, `premium_annual_cents`
- `six_month_premium`, `monthly_premium`
- `coverage_json`, `coverageJson`, `coverage_limits`
- `quote_ref` (move to core if needed)
- `quote_status` (move to core if needed)
- `valid_until` (duplicate of expiresAt)
- `vehicle_vin` (can join from Vehicle table)

#### InsurancePolicy
**Keep:**
- `id`, `dealId`, `status`, `carrier`, `policyNumber`, `coverageType`, `monthlyPremium`
- `effectiveDate`, `expirationDate`, `documentUrl`
- `is_verified`, `createdAt`, `updatedAt`

**Drop:**
- `selected_deal_id`, `deal_id` (duplicate of dealId)
- `userId`, `user_id` (can join from SelectedDeal)
- `type` (unclear purpose, may need to keep)
- `carrier_name` (duplicate of carrier)
- `policy_number`, `policy_number_v2` (duplicate of policyNumber)
- `vehicle_vin` (can join from deal)
- `startDate`, `start_date` (duplicate of effectiveDate)
- `endDate`, `end_date` (duplicate of expirationDate)
- `document_url` (duplicate of documentUrl)
- `raw_policy_json` (evaluate if needed)
- `coverage_type` (duplicate of coverageType)
- `monthly_premium` (duplicate of monthlyPremium)

### Migration Script (Phase 3)

```sql
-- BACKUP DATA FIRST!
-- CREATE BACKUP BEFORE RUNNING

-- InsuranceQuote cleanup
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "buyer_id";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "selected_deal_id";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "vehicle_id";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "carrier_name";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "provider_name";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "productName";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "product_name";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "premium_monthly_cents";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "premium_semi_annual_cents";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "premium_annual_cents";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "six_month_premium";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "monthly_premium";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "coverage_json";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "coverageJson";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "coverage_limits";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "valid_until";
ALTER TABLE "InsuranceQuote" DROP COLUMN IF EXISTS "vehicle_vin";

-- InsurancePolicy cleanup
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "selected_deal_id";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "deal_id";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "userId";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "user_id";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "carrier_name";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "policy_number";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "policy_number_v2";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "vehicle_vin";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "startDate";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "start_date";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "endDate";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "end_date";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "document_url";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "coverage_type";
ALTER TABLE "InsurancePolicy" DROP COLUMN IF EXISTS "monthly_premium";

-- Update Prisma schema to match
```

### PASS/FAIL Criteria

**Phase 1 PASS:**
- ✅ All insurance field usage documented
- ✅ Clear list of core vs duplicate fields

**Phase 2 PASS:**
- ✅ Service layer uses only core fields
- ✅ No duplicate field writes in code
- ✅ All insurance features still work

**Phase 3 PASS:**
- ✅ Duplicate columns dropped successfully
- ✅ Prisma schema updated and regenerated
- ✅ All insurance features still work
- ✅ Storage usage reduced

**FAIL:**
- ❌ Any insurance feature breaks
- ❌ Data loss occurs
- ❌ Migration fails

### Rollback Plan

**Phase 2:** Simply revert code changes (no DB changes yet)

**Phase 3:** Restore from backup:
```sql
-- Restore full table from backup
-- Or re-add columns (data loss if not backed up)
```

---

## FIX #4: Deprecate SelectedDeal Legacy Fields

**Priority:** 🟡 **P2 - Medium**  
**Type:** Schema + Code Change  
**Impact:** Remove dual source of truth  
**Backward Compatible:** ✅ Yes (if fields unused)  
**Breaking Change:** ❌ No

### Problem Statement
`SelectedDeal` has legacy fields `insurance_status` and `user_id` that duplicate relationship/existing field.

### Proposed Fix

#### Step 1: Code Audit
```bash
# Find all writes to insurance_status
grep -r "insurance_status" --include="*.ts" --include="*.tsx" lib/ app/

# Find all writes to user_id on SelectedDeal
grep -r "user_id" --include="*.ts" --include="*.tsx" lib/ app/ | grep -i "selecteddeal\|SelectedDeal"
```

#### Step 2: If Unused, Drop Columns

```sql
-- If audit confirms fields are not used:
ALTER TABLE "SelectedDeal" DROP COLUMN IF EXISTS "insurance_status";
ALTER TABLE "SelectedDeal" DROP COLUMN IF EXISTS "user_id";
```

#### Step 3: Update Prisma Schema

```prisma
// Remove from schema.prisma lines 453-454:
// insurance_status String?
// user_id          String?
```

#### Step 4: Regenerate Prisma Client

```bash
prisma generate
```

### PASS/FAIL Criteria

**PASS:**
- ✅ Code audit shows fields unused
- ✅ Columns dropped successfully
- ✅ Prisma schema updated
- ✅ All deal features still work

**FAIL:**
- ❌ Fields are actively used
- ❌ Any deal feature breaks

### Alternative (If Fields Are Used)

**Document usage** and create migration plan to transition to proper fields:
- `insurance_status` → use `selectedDeal.insurancePolicy.status`
- `user_id` → use `selectedDeal.buyerId`

---

## FIX #5: Fix InsuranceQuote RLS Policy

**Priority:** 🟡 **P2 - Medium**  
**Type:** RLS Policy Change  
**Impact:** Correct policy logic  
**Backward Compatible:** ✅ Yes  
**Breaking Change:** ❌ No

### Problem Statement
RLS policy for `InsuranceQuote` uses `dealId` field which doesn't exist in schema (only `buyerId` and `vehicleId` exist).

### Current Policy (Incorrect)
```sql
CREATE POLICY "Buyers can view their insurance quotes"
  ON "InsuranceQuote" FOR SELECT
  USING (
    "dealId" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
    OR auth.is_admin()
  );
```

### Proposed Fix
```sql
-- Drop incorrect policy
DROP POLICY IF EXISTS "Buyers can view their insurance quotes" ON "InsuranceQuote";

-- Create correct policy using buyerId
CREATE POLICY "Buyers can view their insurance quotes"
  ON "InsuranceQuote" FOR SELECT
  USING ("buyerId" = auth.user_id() OR auth.is_admin());

-- Alternative if quotes should be linked to deals:
-- Add selected_deal_id index if not exists, then use:
-- CREATE POLICY "Buyers can view their insurance quotes"
--   ON "InsuranceQuote" FOR SELECT
--   USING (
--     "selected_deal_id" IN (SELECT id FROM "SelectedDeal" WHERE "buyerId" = auth.user_id())
--     OR "buyerId" = auth.user_id()
--     OR auth.is_admin()
--   );
```

### PASS/FAIL Criteria

**PASS:**
- ✅ Policy references valid schema fields
- ✅ Buyers can access own quotes
- ✅ Buyers cannot access other quotes

**FAIL:**
- ❌ Policy syntax error
- ❌ Buyers cannot access own quotes
- ❌ Buyers can access other quotes

---

## FIX #6: Document Potentially Unused Columns

**Priority:** 🟢 **P3 - Low**  
**Type:** Documentation  
**Impact:** Clarity  
**Backward Compatible:** ✅ Yes  
**Breaking Change:** ❌ No

### Problem Statement
Some columns may be unused (service layer duplicates), but this needs verification before removal.

### Proposed Fix

Create documentation file: `docs/POTENTIALLY_UNUSED_COLUMNS.md`

```markdown
# Potentially Unused Columns

## InsuranceQuote Service Layer Fields
All fields marked "Service layer fields" in schema.prisma may be unused if service
layer uses core fields instead.

**Verification Needed:**
- Grep codebase for usage of each field
- Check if writes occur to both core and service fields
- Determine if service fields are legacy

## InsurancePolicy Service Layer Fields
Same as InsuranceQuote - 20+ fields may be redundant.

## SelectedDeal Legacy Fields
- `insurance_status` - may be unused if insurancePolicy.status used
- `user_id` - may be unused if buyerId used

**Recommendation:**
After code audit, either:
1. Drop unused columns (if truly unused)
2. Document as legacy but kept for backward compatibility
3. Create migration plan to deprecate
```

### PASS/FAIL Criteria

**PASS:**
- ✅ Documentation created
- ✅ Lists all potentially unused columns
- ✅ Provides verification steps

**FAIL:**
- ❌ Documentation incomplete

---

## MIGRATION NOTES

### Prerequisites
- [ ] Full database backup before any schema changes
- [ ] Test all migrations in staging environment
- [ ] Verify Prisma schema matches live DB before starting
- [ ] Coordinate maintenance window for breaking changes (Fix #3 Phase 3)

### Deployment Order
1. **Fix #2** (RLS policy cleanup) - Low risk, deploy anytime
2. **Fix #1** (Add RLS policies) - Medium risk, deploy during low-traffic window
3. **Fix #5** (Fix InsuranceQuote RLS) - Low risk, deploy with Fix #1
4. **Fix #6** (Documentation) - No risk, deploy anytime
5. **Fix #4 Step 1-2** (Code audit) - No risk, deploy anytime
6. **Fix #3 Phase 1-2** (Code audit + service layer) - Medium risk, deploy in stages
7. **Fix #4 Step 3-4** (Drop columns if unused) - Medium risk, deploy after audit
8. **Fix #3 Phase 3** (Drop duplicate columns) - High risk, requires maintenance window

### Rollback Procedures
Each fix includes specific rollback instructions. In general:
1. RLS policy changes: Drop policies, disable RLS if needed
2. Schema changes: Restore from backup
3. Code changes: Git revert

---

## FINAL CHECKLIST

### Pre-Deployment
- [ ] All SQL scripts reviewed and tested in staging
- [ ] Code audits completed for Fixes #3 and #4
- [ ] Backup procedures in place
- [ ] Rollback plans documented
- [ ] Maintenance window scheduled (if needed)

### Post-Deployment
- [ ] All fixes deployed successfully
- [ ] PASS criteria met for each fix
- [ ] Application functionality verified
- [ ] No data loss confirmed
- [ ] Performance impact measured
- [ ] Security improvements verified

### Documentation
- [ ] DB_SCHEMA_INVENTORY.md updated
- [ ] DATA_USAGE_INVENTORY.md updated
- [ ] DB_ALIGNMENT_GAPS.md marked as resolved
- [ ] FINAL_ALIGNMENT_STATUS.md created

---

**END OF FIX PLAN**
