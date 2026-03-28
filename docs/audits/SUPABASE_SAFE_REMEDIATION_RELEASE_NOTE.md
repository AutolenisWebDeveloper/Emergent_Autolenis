# Release Note — Supabase RLS Safe Remediation

**Version:** 2026-03-27  
**Category:** Security / Database Governance  
**Impact:** Internal infrastructure — no user-facing behavior changes

---

## Row-Level Security Hardening — 31 Tables

Completed a comprehensive Row-Level Security (RLS) remediation across all 31 user-facing and business-data tables in the Supabase PostgreSQL layer.

**What changed:**

- Enforced RLS policies on 14 previously unprotected tables (DealerUser, PreQualification, ContractShieldScan, ESignEnvelope, Workspace, BuyerPreferences, Vehicle, Shortlist, ShortlistItem, ExternalPreApproval, Click, PaymentMethod, InsuranceUpload, DealerApplication).
- Fixed type-safety issues in all existing RLS predicates — all comparisons now use CUID-based identity functions instead of raw UUID matching.
- Replaced JWT-claim-dependent dealer access with table-lookup-backed predicates for consistent multi-role support.
- Added schema-qualified function calls across all policies to prevent resolution ambiguity.

**What did not change:**

- No application-level behavior changes. Service-role connections (used by all API routes) bypass RLS and are unaffected.
- No schema migrations. No table or column modifications.
- No changes to authentication, session handling, or role assignments.

**Rollback:** Available via `scripts/rollback-rls-policies.sql`. Removes all 85 policies without disabling RLS, returning tables to deny-all posture for non-service-role connections.

**Risk:** Low. All changes are additive security hardening with no impact on existing application functionality.

**Documentation:** Full access matrix and policy rationale in `SUPABASE_VERCEL_AUDIT.md`. Handoff record in `docs/audits/SUPABASE_SAFE_REMEDIATION_HANDOFF.md`.
