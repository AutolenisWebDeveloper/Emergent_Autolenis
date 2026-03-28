# Supabase RLS Audit — Access Matrix

> **Date:** 2026-03-27  
> **Scope:** All 31 tables requiring row-level security policies  
> **Migration:** `scripts/add-missing-rls-policies.sql`  
> **Rollback:** `scripts/rollback-rls-policies.sql`

---

## Executive Summary

This document provides a table-by-table access matrix for every table covered by the RLS migration. Each entry includes:

- **Table name** and tier classification
- **Intended access model** (who should access, via what mechanism)
- **Code references** that prove the access pattern
- **Operations** (SELECT / INSERT / UPDATE / DELETE) required by each role
- **Policy rationale** explaining the design decision

### Key Design Principles

1. **Type-safe comparisons**: All user ID comparisons use `public.current_user_id()` which returns the CUID `User.id`, not `auth.uid()` which returns a UUID. Direct UUID↔CUID comparisons never match.
2. **BuyerProfile subquery**: Tables with `buyerId` referencing `BuyerProfile.id` (not `User.id`) use `buyerId IN (SELECT id FROM "BuyerProfile" WHERE "userId" = public.current_user_id())`.
3. **Lookup-backed dealer access**: No policy depends on JWT `dealer_id` claims. All dealer access uses `public.current_dealer_ids()` which queries both `Dealer.userId` and `DealerUser.userId` tables.
4. **Lookup-backed affiliate access**: All affiliate access uses `public.current_affiliate_ids()` which queries `Affiliate.userId`.
5. **Schema-qualified functions**: All helper functions are schema-qualified (`public.current_user_id()`, `public.is_admin()`, etc.) — never bare `current_user_id()`.
6. **Idempotent migration**: Every policy uses `DROP POLICY IF EXISTS` before `CREATE POLICY` to support safe re-runs.
7. **Explicit role targeting**: All policies specify `TO authenticated` to exclude the `anon` role.

### Helper Functions (pre-existing, schema-qualified)

| Function | Returns | Purpose |
|----------|---------|---------|
| `public.current_user_id()` | TEXT | Maps `auth.uid()` → `User.id` (CUID) via `User.auth_user_id` |
| `public.is_admin()` | BOOLEAN | Checks `User.role IN ('ADMIN', 'SUPER_ADMIN')` via `auth.uid()` |
| `public.current_dealer_ids()` | SETOF TEXT | Returns dealer IDs from `Dealer` + `DealerUser` for current user |
| `public.current_affiliate_ids()` | SETOF TEXT | Returns affiliate IDs from `Affiliate` for current user |
| `public.current_workspace_id()` | TEXT | Maps `auth.uid()` → `User.workspaceId` |
| `public.current_user_id_uuid()` | UUID | Safe UUID cast from `auth.uid()` or JWT claims |

---

## Tier 1: Core User-Facing Tables (17)

### 1. User

| Attribute | Value |
|-----------|-------|
| **Access model** | Owner reads/updates own row; admins have full access |
| **Code references** | `lib/auth-server.ts` (session lookup), `lib/services/buyer.service.ts` (profile reads) |
| **Operations** | Owner: SELECT, UPDATE · Admin: SELECT, INSERT, UPDATE, DELETE |
| **Policy rationale** | `id = public.current_user_id()` for safe CUID text comparison. Admin bypass via `public.is_admin()`. |

### 2. BuyerProfile

| Attribute | Value |
|-----------|-------|
| **Access model** | Owner reads/updates own profile via `userId`; admins have full access |
| **Code references** | `app/api/buyer/profile/route.ts`, `lib/services/buyer.service.ts` |
| **Operations** | Owner: SELECT, UPDATE · Admin: SELECT, INSERT, UPDATE, DELETE |
| **Policy rationale** | `"userId" = public.current_user_id()` — BuyerProfile.userId stores User.id (CUID). |

### 3. Dealer

| Attribute | Value |
|-----------|-------|
| **Access model** | Owner reads/updates own dealer record via `userId`; admins have full access |
| **Code references** | `app/api/dealer/profile/route.ts`, `lib/services/dealer.service.ts` |
| **Operations** | Owner: SELECT, UPDATE · Admin: SELECT, INSERT, UPDATE, DELETE |
| **Policy rationale** | `"userId" = public.current_user_id()` — Dealer.userId stores User.id (CUID). |

### 4. Affiliate

| Attribute | Value |
|-----------|-------|
| **Access model** | Owner reads/updates own affiliate record via `userId`; admins have full access |
| **Code references** | `app/api/affiliate/profile/route.ts`, `lib/services/affiliate.service.ts` |
| **Operations** | Owner: SELECT, UPDATE · Admin: SELECT, INSERT, UPDATE, DELETE |
| **Policy rationale** | `"userId" = public.current_user_id()` — Affiliate.userId stores User.id (CUID). |

### 5. Auction

| Attribute | Value |
|-----------|-------|
| **Access model** | All authenticated users see ACTIVE auctions; dealers see auctions they participated in; admins have full access |
| **Code references** | `app/api/buyer/auctions/route.ts`, `app/api/dealer/auctions/route.ts` |
| **Operations** | Authenticated: SELECT (active) · Dealer: SELECT (participated) · Admin: ALL |
| **Policy rationale** | Public SELECT filtered by `status = 'ACTIVE'`. Dealer access via `AuctionParticipant.dealerId` → `public.current_dealer_ids()`. |

### 6. AuctionOffer

| Attribute | Value |
|-----------|-------|
| **Access model** | Dealers read/create offers via `participantId` → AuctionParticipant → Dealer; admins have full access |
| **Code references** | `app/api/dealer/auctions/[auctionId]/offers/route.ts` |
| **Operations** | Dealer: SELECT, INSERT · Admin: ALL |
| **Policy rationale** | `participantId` subquery through `AuctionParticipant.dealerId` → `public.current_dealer_ids()`. No direct JWT dealer_id. |

### 7. SelectedDeal

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read own deals via `buyerId` → BuyerProfile; dealers read deals for their inventory; admins have full access |
| **Code references** | `lib/services/deal/retrieval.ts`, `app/api/buyer/deals/route.ts`, `app/api/dealer/deals/route.ts` |
| **Operations** | Buyer: SELECT · Dealer: SELECT · Admin: ALL |
| **Policy rationale** | `buyerId` stores `BuyerProfile.id`, not `User.id` — requires BuyerProfile subquery. Dealer access via `inventoryItemId` → `InventoryItem.dealerId` → `public.current_dealer_ids()`. |

### 8. InventoryItem

| Attribute | Value |
|-----------|-------|
| **Access model** | All authenticated see AVAILABLE items; dealers manage own inventory; admins have full access |
| **Code references** | `app/api/dealer/inventory/route.ts`, `lib/services/inventory.service.ts` |
| **Operations** | Authenticated: SELECT (available) · Dealer: ALL (own) · Admin: ALL |
| **Policy rationale** | Public SELECT filtered by `status = 'AVAILABLE'`. Dealer access via `dealerId` → `public.current_dealer_ids()`. |

### 9. ContractDocument

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read contracts for their deals; dealers read contracts for their inventory; admins have full access |
| **Code references** | `app/api/buyer/deals/[dealId]/contracts/route.ts`, `app/api/dealer/deals/[dealId]/contracts/route.ts` |
| **Operations** | Buyer: SELECT · Dealer: SELECT · Admin: ALL |
| **Policy rationale** | Buyer access via `dealId` → `SelectedDeal.buyerId` → BuyerProfile subquery. Dealer access via `dealerId` → `public.current_dealer_ids()`. ContractDocument has a direct `dealerId` FK. |

### 10. FinancingOffer

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read financing offers for their deals; admins have full access |
| **Code references** | `app/api/buyer/deals/[dealId]/financing/route.ts` |
| **Operations** | Buyer: SELECT · Admin: ALL |
| **Policy rationale** | Buyer access via `dealId` → `SelectedDeal.buyerId` → BuyerProfile subquery. |

### 11. InsuranceQuote

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read own quotes via `buyerId` → BuyerProfile; admins have full access |
| **Code references** | `app/api/buyer/insurance/route.ts` |
| **Operations** | Buyer: SELECT · Admin: ALL |
| **Policy rationale** | `buyerId` stores `BuyerProfile.id` — requires BuyerProfile subquery. Fixed from original bug where `buyerId = auth.user_id()` always failed (BLOCKER 3). |

### 12. InsurancePolicy

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read policies for their deals; admins have full access |
| **Code references** | `app/api/buyer/insurance/route.ts` |
| **Operations** | Buyer: SELECT · Admin: ALL |
| **Policy rationale** | Buyer access via `dealId` → `SelectedDeal.buyerId` → BuyerProfile subquery. |

### 13. PickupAppointment

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read pickups for their deals; dealers read pickups for their inventory; admins have full access |
| **Code references** | `app/api/buyer/deals/[dealId]/pickup/route.ts`, `app/api/dealer/deals/[dealId]/pickup/route.ts` |
| **Operations** | Buyer: SELECT · Dealer: SELECT · Admin: ALL |
| **Policy rationale** | Buyer access via `dealId` → SelectedDeal → BuyerProfile. Dealer access via `dealId` → SelectedDeal → InventoryItem → `public.current_dealer_ids()`. |

### 14. Referral

| Attribute | Value |
|-----------|-------|
| **Access model** | Affiliates read own referrals; admins have full access |
| **Code references** | `app/api/affiliate/referrals/route.ts`, `lib/services/affiliate.service.ts` |
| **Operations** | Affiliate: SELECT · Admin: ALL |
| **Policy rationale** | `affiliateId` → `public.current_affiliate_ids()` (lookup-backed, not JWT claim). |

### 15. Commission

| Attribute | Value |
|-----------|-------|
| **Access model** | Affiliates read own commissions; admins have full access |
| **Code references** | `app/api/affiliate/commissions/route.ts`, `lib/services/affiliate.service.ts` |
| **Operations** | Affiliate: SELECT · Admin: ALL |
| **Policy rationale** | `affiliateId` → `public.current_affiliate_ids()`. |

### 16. Payout

| Attribute | Value |
|-----------|-------|
| **Access model** | Affiliates read own payouts; admins have full access |
| **Code references** | `app/api/affiliate/payouts/route.ts` |
| **Operations** | Affiliate: SELECT · Admin: ALL |
| **Policy rationale** | `affiliateId` → `public.current_affiliate_ids()`. |

### 17. TradeIn

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read/create/update own trade-ins via `buyerId` → BuyerProfile; admins have full access |
| **Code references** | `app/api/buyer/deals/[dealId]/trade-in/route.ts` |
| **Operations** | Buyer: SELECT, INSERT, UPDATE · Admin: ALL |
| **Policy rationale** | `buyerId` stores `BuyerProfile.id` — requires BuyerProfile subquery. Fixed from original bug where `buyerId = auth.user_id()` always failed (BLOCKER 10). |

---

## Tier 2: Previously Missing Tables (14)

### 18. DealerUser

| Attribute | Value |
|-----------|-------|
| **Access model** | Staff sees own record; dealer owners see their team; admins have full access |
| **Code references** | `app/api/dealer/team/route.ts`, `lib/services/dealer.service.ts` |
| **Operations** | Staff: SELECT (own) · Dealer owner: SELECT (team) · Admin: ALL |
| **Policy rationale** | Own row via `userId = public.current_user_id()`. Team view via `dealerId` → `public.current_dealer_ids()`. Had RLS enabled but zero policies = total deny. |

### 19. PreQualification

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read own pre-qualification via `buyerId` → BuyerProfile; admins have full access |
| **Code references** | `app/api/buyer/prequal/route.ts`, `lib/services/prequal/` |
| **Operations** | Buyer: SELECT · Admin: ALL |
| **Policy rationale** | `buyerId` stores `BuyerProfile.id` — requires BuyerProfile subquery. Had RLS enabled but zero policies = total deny. |

### 20. ContractShieldScan

| Attribute | Value |
|-----------|-------|
| **Access model** | Service-role only for writes; admin SELECT for dashboard review |
| **Code references** | `lib/services/contract-shield/`, `app/api/admin/contract-shield/` |
| **Operations** | Admin: SELECT · Service-role: ALL (bypasses RLS) |
| **Policy rationale** | Sensitive compliance data. Deny-all base (`USING (false)`) plus admin read. All mutations via Prisma (service_role bypass). Had RLS enabled but zero policies = total deny. |

### 21. ESignEnvelope

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read e-sign status for their deals; dealers read for their inventory deals; admins have full access |
| **Code references** | `app/api/buyer/deals/[dealId]/esign/route.ts`, `lib/services/esign.service.ts` |
| **Operations** | Buyer: SELECT · Dealer: SELECT · Admin: ALL |
| **Policy rationale** | Buyer via `dealId` → SelectedDeal → BuyerProfile. Dealer via `dealId` → SelectedDeal → InventoryItem → `public.current_dealer_ids()`. |

### 22. Workspace

| Attribute | Value |
|-----------|-------|
| **Access model** | Members can read their own workspace; admins have full access |
| **Code references** | `lib/auth-server.ts`, `app/api/admin/workspace/route.ts` |
| **Operations** | Member: SELECT (own) · Admin: ALL |
| **Policy rationale** | Members read via `id = public.current_workspace_id()`. Config mutations are admin-only. |

### 23. BuyerPreferences

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read/update own preferences via `buyerId` → BuyerProfile; admins have full access |
| **Code references** | `app/api/buyer/preferences/route.ts` |
| **Operations** | Buyer: SELECT, UPDATE · Admin: ALL |
| **Policy rationale** | `buyerId` stores `BuyerProfile.id` — requires BuyerProfile subquery. |

### 24. Vehicle

| Attribute | Value |
|-----------|-------|
| **Access model** | Public reference data — all authenticated users can SELECT; writes are service-role only |
| **Code references** | `lib/services/inventory.service.ts` (vehicle creation via Prisma) |
| **Operations** | Authenticated: SELECT · Admin: ALL · Service-role: ALL (bypasses RLS) |
| **Policy rationale** | Vehicle is a reference table (VIN/year/make/model). No user-owned data. Reads are unrestricted for authenticated users. |

### 25. Shortlist

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers manage own shortlists via `buyerId` → BuyerProfile; admins have full access |
| **Code references** | `app/api/buyer/shortlist/route.ts` |
| **Operations** | Buyer: SELECT, INSERT, UPDATE, DELETE · Admin: ALL |
| **Policy rationale** | `buyerId` stores `BuyerProfile.id` — requires BuyerProfile subquery. Full CRUD for buyers. |

### 26. ShortlistItem

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers manage items in own shortlists via `shortlistId` → Shortlist → BuyerProfile; admins have full access |
| **Code references** | `app/api/buyer/shortlist/[shortlistId]/items/route.ts` |
| **Operations** | Buyer: SELECT, INSERT, DELETE · Admin: ALL |
| **Policy rationale** | Access via `shortlistId` → `Shortlist.buyerId` → BuyerProfile subquery. No UPDATE needed (items are added/removed, not edited). |

### 27. ExternalPreApproval

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read own pre-approvals via `buyerId` → BuyerProfile; admins have full access |
| **Code references** | `app/api/buyer/prequal/external/route.ts` |
| **Operations** | Buyer: SELECT · Admin: ALL |
| **Policy rationale** | `buyerId` stores `BuyerProfile.id` — requires BuyerProfile subquery. Sensitive financial data, buyer read-only at RLS layer. |

### 28. Click

| Attribute | Value |
|-----------|-------|
| **Access model** | Affiliates read own click data; admins have full access; writes are service-role only |
| **Code references** | `app/api/affiliate/clicks/route.ts`, `lib/services/affiliate.service.ts` |
| **Operations** | Affiliate: SELECT · Admin: ALL · Service-role: INSERT (bypasses RLS) |
| **Policy rationale** | `affiliateId` → `public.current_affiliate_ids()`. Click tracking inserts go through service_role API routes. |

### 29. PaymentMethod

| Attribute | Value |
|-----------|-------|
| **Access model** | Owner manages own payment methods via `userId`; admins have full access |
| **Code references** | `app/api/buyer/payment-methods/route.ts` |
| **Operations** | Owner: SELECT, INSERT, UPDATE, DELETE · Admin: ALL |
| **Policy rationale** | `userId = public.current_user_id()` — direct User.id match. Full CRUD for card management. |

### 30. InsuranceUpload

| Attribute | Value |
|-----------|-------|
| **Access model** | Buyers read own uploads via `buyerId` → BuyerProfile; admins have full access; file uploads via service-role API route |
| **Code references** | `app/api/buyer/insurance/upload/route.ts` |
| **Operations** | Buyer: SELECT · Admin: ALL · Service-role: INSERT (bypasses RLS) |
| **Policy rationale** | `buyerId` stores `BuyerProfile.id` — requires BuyerProfile subquery. File upload API uses service_role client. |

### 31. DealerApplication

| Attribute | Value |
|-----------|-------|
| **Access model** | Applicant reads own application via `applicantUserId`; dealer owner reads via `dealerId`; admins have full access |
| **Code references** | `app/api/dealer/application/route.ts`, `app/api/admin/dealers/applications/route.ts` |
| **Operations** | Applicant: SELECT · Dealer: SELECT · Admin: ALL |
| **Policy rationale** | Applicant access via `applicantUserId = public.current_user_id()`. Dealer access via `dealerId` → `public.current_dealer_ids()`. |

---

## Remaining Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **107 Prisma tables without RLS** | Medium | These tables (AI, compliance, event logs, platform internals) are accessed exclusively via Prisma service_role which bypasses RLS. They are not exposed to Supabase client queries. Defense-in-depth would add deny-all policies, but this is lower priority. |
| **BuyerProfile subquery performance** | Low | Subqueries like `SELECT id FROM "BuyerProfile" WHERE "userId" = ...` rely on the `BuyerProfile.userId` index. Monitor query plans if latency increases. |
| **Existing initial_schema policies overlap** | Low | The migration uses `DROP IF EXISTS` before each `CREATE POLICY`, ensuring clean replacement. Old policies with the same name are safely removed. |
| **DealerUser multi-org edge case** | Low | If a user is a DealerUser in multiple dealers across workspaces, `public.current_dealer_ids()` returns all. Workspace isolation should be enforced at the API layer in addition to RLS. |
| **SEO/admin tables coverage** | Info | SEO tables (seo_pages, SeoPages, etc.) and admin tables (AdminUser, AdminAuditLog, AdminLoginAttempt) are covered by the existing `scripts/99-admin-rls-audit-fixes.sql` and are not duplicated here. |

---

## Merge-Readiness Verdict

| Criterion | Status |
|-----------|--------|
| All 31 tables covered | ✅ |
| No policy references nonexistent helper functions | ✅ |
| No policy relies on unverified JWT claims | ✅ |
| No claimed rollback is merely commented text | ✅ (`scripts/rollback-rls-policies.sql` is executable) |
| No table left with unproven access model | ✅ (every access pattern has code references) |
| Helper functions are schema-qualified | ✅ (`public.current_user_id()`, `public.is_admin()`, etc.) |
| Type-safe comparisons (no UUID↔CUID mismatch) | ✅ |
| No JWT dealer_id dependency | ✅ (uses `public.current_dealer_ids()` lookup) |
| Idempotent (safe to re-run) | ✅ (`DROP IF EXISTS` + `CREATE`) |
| Transactional (atomic apply/rollback) | ✅ (`BEGIN` / `COMMIT`) |

**Verdict: MERGE-READY** — pending standard code review.
