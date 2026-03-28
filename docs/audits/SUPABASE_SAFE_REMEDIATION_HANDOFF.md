# Supabase Safe Remediation — Production Handoff

> **Title:** Supabase RLS & Schema Safe Remediation — Production Handoff  
> **Date:** 2026-03-27  
> **Scope:** Row-Level Security policy remediation across 31 tables, schema alignment fixes, type-safe predicate enforcement  
> **Classification:** Internal — Engineering & Compliance  
> **PR Reference:** PR #12 — Production-safe RLS migration

---

## Summary of Safe Remediations Completed

### 1. RLS Policy Coverage (31 Tables)

Deployed a production-safe, idempotent RLS migration covering all user-facing and business-data tables.

| Tier | Tables | Count |
|------|--------|-------|
| **Tier 1 — Core user-facing** | User, BuyerProfile, Dealer, Affiliate, Auction, AuctionOffer, SelectedDeal, InventoryItem, ContractDocument, FinancingOffer, InsuranceQuote, InsurancePolicy, PickupAppointment, Referral, Commission, Payout, TradeIn | 17 |
| **Tier 2 — Previously missing** | DealerUser, PreQualification, ContractShieldScan, ESignEnvelope, Workspace, BuyerPreferences, Vehicle, Shortlist, ShortlistItem, ExternalPreApproval, Click, PaymentMethod, InsuranceUpload, DealerApplication | 14 |

### 2. Type-Safety Enforcement

- All RLS predicates now use `public.current_user_id()` (CUID text), not `auth.uid()` (UUID).
- BuyerProfile-owned tables use the correct subquery pattern: `buyerId IN (SELECT id FROM "BuyerProfile" WHERE "userId" = public.current_user_id())`.
- Dealer access uses `public.current_dealer_ids()` lookup — no JWT `dealer_id` claim dependency.
- Affiliate access uses `public.current_affiliate_ids()` lookup — no JWT `affiliate_id` claim dependency.
- All helper functions are schema-qualified (`public.*`).

### 3. Migration Safety

- Every policy uses `DROP POLICY IF EXISTS` before `CREATE POLICY` for idempotent re-runs.
- All policies target `TO authenticated` — `anon` role is excluded.
- Rollback script provided: `scripts/rollback-rls-policies.sql` (85 `DROP POLICY` statements).
- Migration wrapped in a single `BEGIN`/`COMMIT` transaction.

### 4. Access Matrix Documentation

- Full table-by-table access matrix published in `SUPABASE_VERCEL_AUDIT.md`.
- Each table entry includes: access model, code references, operations by role, and policy rationale.

---

## Advisor Findings Resolved

| # | Finding | Resolution | Status |
|---|---------|------------|--------|
| 1 | 14 tables missing RLS policies entirely | Policies created for all 14 Tier 2 tables | ✅ Resolved |
| 2 | UUID↔CUID type mismatch in existing predicates | All predicates rewritten to use `public.current_user_id()` (CUID) | ✅ Resolved |
| 3 | Bare function calls (unqualified `current_user_id()`) | All calls schema-qualified to `public.current_user_id()` | ✅ Resolved |
| 4 | JWT claim dependency for dealer access | Replaced with `public.current_dealer_ids()` table lookup | ✅ Resolved |
| 5 | Missing Prisma models for DealerUser, AdminAuditLog, AdminLoginAttempt | Models added to `prisma/schema.prisma` | ✅ Resolved |
| 6 | No rollback mechanism for RLS policies | Rollback script created: `scripts/rollback-rls-policies.sql` | ✅ Resolved |

---

## Remaining Deferred Items

The following items were identified during the safe remediation pass but deferred because they require deeper investigation, cross-team coordination, or carry non-trivial risk. Follow-up tickets have been drafted in `docs/audits/SUPABASE_REMEDIATION_FOLLOW_UP_TICKETS.md`.

| # | Item | Reason Deferred | Risk |
|---|------|----------------|------|
| D-1 | PK review: `public.default_workspace_id` | Variable used in backfill migrations; requires production data audit to confirm no orphaned references | Low |
| D-2 | Diagnostic table review: `private._diag_car_requests_buyer_backfill` | Private-schema diagnostic table; requires DBA review to determine retention/cleanup policy | Low |
| D-3 | Multiple permissive RLS policy review | Some tables have overlapping permissive policies; functional but may benefit from consolidation | Low |
| D-4 | Unused index review | Potential stale indexes identified during schema scan; requires `pg_stat_user_indexes` analysis against production traffic | Low |
| D-5 | Auth dashboard advisory remediation | Supabase Auth dashboard shows advisory-level warnings; cosmetic/informational, no security impact | Informational |

---

## Risk Classification

| Category | Rating | Notes |
|----------|--------|-------|
| **Security risk** | Low | RLS coverage is now comprehensive; all 31 user-data tables have enforced policies |
| **Data isolation risk** | Low | Workspace-scoped predicates applied; buyer/dealer/affiliate isolation verified |
| **Rollback risk** | Low | Tested rollback script available; idempotent migration supports safe re-application |
| **Regression risk** | Low | Service-role (`getSupabase()`) bypasses RLS — existing API routes unaffected |
| **Deferred items risk** | Low | All deferred items are advisory or diagnostic; none affect production security posture |

**Overall risk classification: LOW**

---

## Sign-Off Block

| Role | Name | Date | Status |
|------|------|------|--------|
| Database Governance Lead | _________________________ | ____-__-__ | ☐ Approved |
| Security Reviewer | _________________________ | ____-__-__ | ☐ Approved |
| Engineering Lead | _________________________ | ____-__-__ | ☐ Approved |
| Release Manager | _________________________ | ____-__-__ | ☐ Approved |

---

*This document is the authoritative handoff record for the Supabase safe remediation pass. It should be attached to the corresponding Jira/Notion ticket and referenced in the release changelog.*
