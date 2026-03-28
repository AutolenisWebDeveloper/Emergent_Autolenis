# Follow-Up Tickets — Supabase Safe Remediation Deferred Items

> **Source:** Supabase Safe Remediation Pass (2026-03-27)  
> **Status:** Deferred — requires follow-up tickets  
> **Parent:** `docs/audits/SUPABASE_SAFE_REMEDIATION_HANDOFF.md`

---

## Ticket D-1: PK Review — `public.default_workspace_id`

**Title:** Audit and validate `public.default_workspace_id` usage in backfill migrations

**Problem Statement:**
The variable `default_workspace_id` is used in two backfill migrations (`20240101000011_backfill_workspace_id.sql` and `20240101000019_workspace_id_not_null.sql`) to populate `workspaceId` on tables that previously lacked it. The variable resolves to the first workspace found via `SELECT id FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1`. In a multi-tenant deployment, this default assignment may have created orphaned or incorrectly scoped records if more than one workspace existed at migration time. A production data audit is required to confirm all `workspaceId` values are correctly assigned.

**Why It Was Deferred:**
Requires production database access to run the verification queries. The remediation pass was scoped to RLS policy creation only — data integrity validation against live data was out of scope. No security risk exists from the current state; this is a data correctness concern.

**Acceptance Criteria:**
- [ ] Run `SELECT COUNT(*) FROM "User" WHERE "workspaceId" = (SELECT id FROM "Workspace" ORDER BY "createdAt" ASC LIMIT 1)` against production to quantify default-assigned records.
- [ ] Verify that all records assigned the default workspace ID belong to users who should be in that workspace.
- [ ] If misassigned records are found, produce a remediation migration with explicit workspace reassignment.
- [ ] Document findings in a follow-up audit note.

**Risk Level:** Low — no security exposure; potential data scoping inaccuracy for edge-case records created during the backfill window.

---

## Ticket D-2: Diagnostic Table Review — `private._diag_car_requests_buyer_backfill`

**Title:** Review retention and cleanup policy for `private._diag_car_requests_buyer_backfill`

**Problem Statement:**
The diagnostic table `private._diag_car_requests_buyer_backfill` exists in the `private` schema and was created during a prior data backfill operation for car request/buyer profile linkage. Diagnostic tables in the `private` schema are not covered by RLS policies (they are outside the `public` schema) and are not referenced by application code. This table should be reviewed to determine whether it contains PII, whether it is still needed, and what the retention/cleanup policy should be.

**Why It Was Deferred:**
The safe remediation pass was scoped to `public` schema RLS enforcement only. Private-schema diagnostic tables require DBA-level review and a separate cleanup decision. No application code references this table, so it poses no runtime risk.

**Acceptance Criteria:**
- [ ] Confirm the table exists in production: `SELECT * FROM information_schema.tables WHERE table_schema = 'private' AND table_name = '_diag_car_requests_buyer_backfill'`.
- [ ] Audit the table contents for PII (buyer names, emails, phone numbers, financial data).
- [ ] If PII is present, determine retention period and apply appropriate cleanup (TRUNCATE or DROP).
- [ ] If the table is no longer needed, drop it with a documented migration: `DROP TABLE IF EXISTS private._diag_car_requests_buyer_backfill`.
- [ ] If retained, document the purpose and add a scheduled cleanup policy.

**Risk Level:** Low — table is in the `private` schema, not exposed to application queries or RLS. Risk is limited to unnecessary PII retention.

---

## Ticket D-3: Multiple Permissive Policy Review

**Title:** Consolidate overlapping permissive RLS policies on multi-role tables

**Problem Statement:**
Several tables (notably `Auction`, `SelectedDeal`, `InventoryItem`, and `ContractDocument`) have multiple `PERMISSIVE` RLS policies that grant overlapping access to different roles. In PostgreSQL, permissive policies are OR-combined — any single matching policy grants access. While functionally correct, having many overlapping permissive policies increases the evaluation cost per query and makes the access model harder to audit. A review should determine whether any policies can be consolidated without changing the effective access grants.

**Why It Was Deferred:**
The remediation pass prioritized correctness and coverage over optimization. All policies are functionally correct and provide the intended access. Consolidation is an optimization that requires careful testing to ensure no access regression. This work is best done as a separate, focused effort with before/after access verification.

**Acceptance Criteria:**
- [ ] Inventory all tables with 3+ permissive policies.
- [ ] For each, document the effective access matrix (role × operation) with current policies.
- [ ] Propose consolidated policy set that preserves the identical access matrix.
- [ ] Validate the consolidated policies in a staging environment using the existing test suite.
- [ ] Deploy the consolidated policies with a rollback script.
- [ ] Update `SUPABASE_VERCEL_AUDIT.md` to reflect the consolidated policy set.

**Risk Level:** Low — current policies are correct; consolidation is a maintainability and performance improvement only.

---

## Ticket D-4: Unused Index Review

**Title:** Identify and remove unused database indexes from production

**Problem Statement:**
During the schema audit, several indexes were noted that may not be actively used by production query patterns. Unused indexes consume disk space, slow down write operations (INSERT/UPDATE/DELETE), and add maintenance overhead during VACUUM operations. A production traffic analysis is required to identify indexes with zero or near-zero scans that can be safely removed.

**Why It Was Deferred:**
Index usage can only be reliably assessed against production traffic patterns using `pg_stat_user_indexes`. The remediation pass did not have production database access and was scoped to RLS policy work only. Removing an actively-used index would cause query performance regression, so this requires careful analysis.

**Acceptance Criteria:**
- [ ] Query `pg_stat_user_indexes` in production to identify indexes with `idx_scan = 0` over a 30-day observation window.
- [ ] Cross-reference each unused index against application query patterns (Prisma-generated queries, raw Supabase queries, RPC functions).
- [ ] For confirmed unused indexes, produce a migration to drop them with `IF EXISTS` safety.
- [ ] Provide a rollback migration that recreates any dropped indexes.
- [ ] Monitor query performance for 7 days post-deployment to confirm no regression.

**Risk Level:** Low — unused indexes only waste resources; removal improves write performance. The risk is in misidentifying a rarely-used-but-critical index, which the observation window mitigates.

---

## Ticket D-5: Auth Dashboard Advisory Remediation

**Title:** Resolve Supabase Auth dashboard advisory warnings

**Problem Statement:**
The Supabase dashboard displays advisory-level warnings related to authentication configuration. These are informational warnings — not security vulnerabilities — and typically relate to recommended settings such as email confirmation enforcement, password strength policies, or session timeout configuration. While the application-level auth layer (`lib/auth.ts`, `lib/auth-server.ts`, `proxy.ts`) enforces its own session management (HS256 JWT, 7-day expiry, MFA where required), the dashboard advisories should be reviewed and resolved to maintain a clean compliance posture.

**Why It Was Deferred:**
Auth dashboard settings require coordination with the DevOps/infrastructure team and may affect the Supabase-hosted auth UI (which is separate from the custom auth layer). Changes to Supabase auth configuration could interact with the existing session verification flow (`verifySession()`) and must be tested end-to-end. This was out of scope for the RLS remediation pass.

**Acceptance Criteria:**
- [ ] Document all current Supabase Auth dashboard advisory warnings with screenshots.
- [ ] For each advisory, determine whether it applies (some may be irrelevant given the custom auth layer).
- [ ] Resolve applicable advisories by updating the Supabase project configuration.
- [ ] For advisories that do not apply, document the reason for dismissal.
- [ ] Verify that auth flows (sign-in, sign-up, password reset, MFA) continue to function after any configuration changes.
- [ ] Confirm the dashboard shows zero advisory warnings post-remediation.

**Risk Level:** Informational — no security exposure. These are best-practice recommendations from the Supabase platform, not vulnerability findings.

---

*All tickets reference the parent handoff document at `docs/audits/SUPABASE_SAFE_REMEDIATION_HANDOFF.md`. Assign to the database governance or platform engineering team.*
