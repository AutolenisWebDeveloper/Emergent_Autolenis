# Supabase RLS Policy Matrix — AutoLenis Platform

## Overview

This document defines the **Row-Level Security (RLS)** policy matrix for all user-facing domain tables. Every policy enforces workspace isolation, role-based access, and ownership checks as specified in `SUPABASE_MASTER_SPEC.md`.

> **See also:** `docs/RLS_POLICY_ATLAS.md` for existing RLS helper functions and migration references.

---

## 1. RLS Enforcement Baseline

- RLS must be enabled on **all** user-facing domain tables
- Every policy must validate `auth.uid()` is not null
- Every policy must enforce `workspace_id` match against session claims
- Policies must use helper functions (e.g., `current_user_id()`, `current_workspace_id()`, `current_role()`) defined in `RLS_POLICY_ATLAS.md`
- Service-role bypass is permitted only for backend server operations

---

## 2. Helper Functions

| Function | Returns | Description |
|---|---|---|
| `current_user_id()` | `uuid` | Extracts `user_id` from JWT claims |
| `current_workspace_id()` | `uuid` | Extracts `workspace_id` from JWT claims |
| `current_role()` | `text` | Extracts `role` from JWT claims |
| `current_dealer_id()` | `uuid` | Extracts `dealer_id` from JWT claims |
| `current_affiliate_id()` | `uuid` | Extracts `affiliate_id` from JWT claims |
| `current_buyer_id()` | `uuid` | Extracts `buyer_id` from JWT claims |
| `is_admin()` | `boolean` | Returns true if role is `ADMIN`, `SUPER_ADMIN`, or `COMPLIANCE_ADMIN` |
| `is_super_admin()` | `boolean` | Returns true if role is `SUPER_ADMIN` |

---

## 3. Access Matrix by Role

### 3.1 Buyer Access

| Table | SELECT | INSERT | UPDATE | DELETE | Policy Rule |
|---|---|---|---|---|---|
| `User` | ✓ | — | ✓ | — | Own record only (`id = current_user_id()`) |
| `BuyerProfile` | ✓ | — | ✓ | — | Own record (`userId = current_user_id()`) |
| `BuyerPreferences` | ✓ | ✓ | ✓ | ✓ | Own record (`buyerId = current_buyer_id()`) + workspace match |
| `PreQualification` | ✓ | — | — | — | Own record (`userId = current_user_id()`) + workspace match |
| `PrequalConsentVersion` | ✓ | — | — | — | Own record (`userId = current_user_id()`) |
| `PrequalConsentArtifact` | ✓ | — | — | — | Own record via consent version |
| `Shortlist` | ✓ | ✓ | ✓ | ✓ | Own record (`buyerId = current_buyer_id()`) + workspace match |
| `ShortlistItem` | ✓ | ✓ | ✓ | ✓ | Via owned `Shortlist` |
| `Auction` | ✓ | ✓ | — | — | Created by or participant (`buyerId = current_buyer_id()`) + workspace match |
| `AuctionOffer` | ✓ | — | — | — | Via owned `Auction` only (surfaced offers) |
| `BestPriceOption` | ✓ | — | — | — | Via owned `Auction` |
| `SelectedDeal` | ✓ | — | ✓ | — | Own deal (`buyerId = current_buyer_id()`) + workspace match |
| `FinancingOffer` | ✓ | — | — | — | Via own `SelectedDeal` |
| `InsuranceQuote` | ✓ | — | — | — | Via own `SelectedDeal` + workspace match |
| `InsurancePolicy` | ✓ | — | — | — | Via own `SelectedDeal` |
| `ContractDocument` | ✓ | — | — | — | Via own `SelectedDeal` |
| `ESignEnvelope` | ✓ | — | — | — | Via own `SelectedDeal` |
| `PickupAppointment` | ✓ | — | ✓ | — | Own appointment (`buyerId = current_buyer_id()`) + workspace match |
| `DepositPayment` | ✓ | — | — | — | Own payment (`buyerId = current_buyer_id()`) + workspace match |
| `ServiceFeePayment` | ✓ | — | — | — | Own payment (`buyerId = current_buyer_id()`) + workspace match |
| `Referral` | ✓ | — | — | — | Own referral (`referredUserId = current_user_id()`) |
| `Commission` | ✓ | — | — | — | Own commission (`affiliateId = current_affiliate_id()`) + workspace match |
| `Payout` | ✓ | — | — | — | Own payout (`affiliateId = current_affiliate_id()`) + workspace match |

### 3.2 Dealer User Access

| Table | SELECT | INSERT | UPDATE | DELETE | Policy Rule |
|---|---|---|---|---|---|
| `Dealer` | ✓ | — | ✓ | — | Own dealership (`id = current_dealer_id()`) + workspace match |
| `DealerUser` | ✓ | — | ✓ | — | Same dealership (`dealerId = current_dealer_id()`) |
| `InventoryItem` | ✓ | ✓ | ✓ | ✓ | Own dealership (`dealerId = current_dealer_id()`) + workspace match |
| `AuctionParticipant` | ✓ | — | — | — | Own dealership participant + workspace match |
| `AuctionOffer` | ✓ | ✓ | ✓ | — | Own dealership offers (`dealerId = current_dealer_id()`) + workspace match |
| `AuctionOfferFinancingOption` | ✓ | ✓ | ✓ | ✓ | Via own `AuctionOffer` |
| `ContractDocument` | ✓ | ✓ | — | — | Own dealership contracts + workspace match |
| `ContractShieldScan` | ✓ | — | — | — | Via own `ContractDocument` |
| `PickupAppointment` | ✓ | — | ✓ | — | Own dealership pickups + workspace match |
| `DealerApplication` | ✓ | — | — | — | Own application |
| `DealDocument` | ✓ | ✓ | ✓ | — | Own dealership documents + workspace match |
| `DocumentRequest` | ✓ | — | ✓ | — | Own dealership requests + workspace match |

### 3.3 Affiliate Access

| Table | SELECT | INSERT | UPDATE | DELETE | Policy Rule |
|---|---|---|---|---|---|
| `Affiliate` | ✓ | — | ✓ | — | Own profile (`id = current_affiliate_id()`) + workspace match |
| `Referral` | ✓ | — | — | — | Own referrals (`affiliateId = current_affiliate_id()`) + workspace match |
| `Click` | ✓ (agg) | — | — | — | Own clicks (aggregated, `affiliateId = current_affiliate_id()`) + workspace match |
| `Commission` | ✓ | — | — | — | Own commissions (`affiliateId = current_affiliate_id()`) + workspace match |
| `Payout` | ✓ | — | — | — | Own payouts (`affiliateId = current_affiliate_id()`) + workspace match |
| `AffiliateShareEvent` | ✓ | — | — | — | Own events (`affiliateId = current_affiliate_id()`) |
| `AffiliateDocument` | ✓ | ✓ | ✓ | — | Own documents (`affiliateId = current_affiliate_id()`) + workspace match |

### 3.4 Admin Access

| Table | SELECT | INSERT | UPDATE | DELETE | Policy Rule |
|---|---|---|---|---|---|
| All domain tables | ✓ | Per scope | Per scope | Per scope | `is_admin()` + workspace match (super-admin may cross workspace with logging) |
| `AdminAuditLog` | ✓ | ✓ | — | — | `is_admin()` + workspace match |
| `AdminSetting` | ✓ | ✓ | ✓ | — | `is_admin()` + workspace match |
| `AdminNotification` | ✓ | — | ✓ | — | Own notifications or `is_admin()` |
| `Refund` | ✓ | ✓ | ✓ | — | `is_admin()` + workspace match |
| `ContractShieldOverride` | ✓ | ✓ | — | — | `is_admin()` + workspace match |
| `ContractManualReview` | ✓ | ✓ | ✓ | — | `is_admin()` + workspace match |

---

## 4. Backend-Only Tables (No Browser RLS)

These tables must **never** be directly accessible from the browser. Access is via service-role only:

| Table | Reason |
|---|---|
| `PaymentProviderEvent` | Raw webhook payloads |
| `DocuSignConnectEvent` | Raw provider events |
| `AdminAuditLog` (raw) | Sensitive audit data |
| `FinancialAuditLog` | Financial internals |
| `DecisionAuditLog` | Decision internals |
| `PermissiblePurposeLog` | Compliance internals |
| `CircumventionAlert` | Fraud detection data |
| `PreQualProviderEvent` | Raw credit bureau data |
| `IdentityTrustRecord` | KYC internals |
| `ConsumerAuthorizationArtifact` | Authorization internals |
| `Transaction` (raw detail) | Ledger internals |

---

## 5. Workspace Isolation Enforcement

All RLS policies must enforce workspace isolation using this pattern:

```sql
CREATE POLICY "workspace_isolation" ON "TableName"
  FOR ALL
  USING (
    "workspaceId" = current_workspace_id()
  );
```

Super-admin cross-workspace queries require explicit opt-in and are logged:

```sql
CREATE POLICY "super_admin_cross_workspace" ON "TableName"
  FOR SELECT
  USING (
    is_super_admin()
    -- Cross-workspace access is logged via trigger
  );
```

---

## 6. RLS Policy Implementation Pattern

Every RLS policy must follow this template:

```sql
-- Enable RLS
ALTER TABLE "TableName" ENABLE ROW LEVEL SECURITY;

-- Deny all by default
ALTER TABLE "TableName" FORCE ROW LEVEL SECURITY;

-- Buyer select policy
CREATE POLICY "buyer_select_own" ON "TableName"
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND "workspaceId" = current_workspace_id()
    AND current_role() = 'BUYER'
    AND "buyerId" = current_buyer_id()
  );

-- Admin select policy
CREATE POLICY "admin_select" ON "TableName"
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND "workspaceId" = current_workspace_id()
    AND is_admin()
  );
```

---

## 7. Verification Checklist

- [ ] RLS is enabled on all user-facing tables
- [ ] `FORCE ROW LEVEL SECURITY` is set on all protected tables
- [ ] Every policy validates `auth.uid() IS NOT NULL`
- [ ] Every policy validates workspace match
- [ ] Buyer policies restrict to owned records
- [ ] Dealer policies restrict to dealership membership
- [ ] Affiliate policies restrict to own affiliate ID
- [ ] Admin policies enforce admin role check
- [ ] Backend-only tables have no browser-accessible policies
- [ ] Super-admin cross-workspace access is logged
- [ ] No policy allows cross-workspace data leakage
- [ ] `LIVE`/`TEST` workspace mode isolation is enforced
