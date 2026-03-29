# Supabase Migration Reconciliation Report

> Generated: 2026-03-29  
> Branch: `copilot/align-sql-to-supabase-rls`  
> Status: **Local state validated — remote validation pending credentials**

---

## A. Local Migration Inventory (Verified)

All 29 migration files in `supabase/migrations/` have valid 14-digit numeric timestamp prefixes.

| Version | File(s) | Description | Size |
|---|---|---|---|
| `00000000000000` | 1 | `initial_schema` | 227,197 B |
| `20240101000001` | 1 | `inventory_item_extended_fields` | 1,781 B |
| `20240101000004` | 1 | `external_preapproval_rpc` | 14,505 B |
| `20240101000005` | 1 | `fix_rls_predicates` | 8,225 B |
| `20240101000006` | 1 | `payment_tables_rls` | 1,890 B |
| `20240101000008` | 1 | `pickup_qr_expiry` | 392 B |
| `20240101000011` | 1 | `backfill_workspace_id` | 1,465 B |
| `20240101000012` | 1 | `selected_deal_origin_constraint` | 655 B |
| `20240101000013` | 1 | `soft_delete_columns` | 932 B |
| `20240101000015` | 1 | `deposit_payment_fk_refund_cleanup` | 1,065 B |
| `20240101000016` | 1 | `admin_audit_log_workspace_id` | 301 B |
| `20240101000017` | 1 | `compliance_event_unique` | 514 B |
| `20240101000018` | 1 | `dealer_application_approved` | 674 B |
| `20240101000019` | 1 | `workspace_id_not_null` | 5,775 B |
| `20240101000020` | 1 | `scrape_tables` | 1,231 B |
| `20240101000021` | **8** | `canonical_inventory_tables`, `inventory_admin_events`, `phase5_leads_sourcing`, `phase6_buyer_packages_sourcing`, `phase7_case_conversion`, `phase8_dealer_portal`, `phase9_workflow_automation`, `phase10_trust_compliance` | 27,821 B total |
| `20240101000022` | 1 | `buyer_package_billing_rpc` | 12,820 B |
| `20240101000023` | 2 | `phase11_analytics_views`, `phase12_system_operations` | 11,647 B total |
| `20240101000024` | 1 | `connection_canary` | 1,144 B |
| `20260325000001` | 1 | `insurance_readiness_workflow` | 2,030 B |
| `20260328000100` | 1 | `reconcile_runtime_compat` | 4,753 B |

**Totals:** 29 files, 21 unique versions

### Multi-File Timestamps

Two timestamps have multiple files sharing them:

- **`20240101000021`** — 8 files, sorted alphabetically. `canonical_inventory_tables` runs before `inventory_admin_events` (required: FK dependency on `inventory_listings_canonical`).
- **`20240101000023`** — 2 files. `phase11_analytics_views` runs before `phase12_system_operations` (alphabetical).

### Gap Analysis

The following version numbers are skipped (no files exist and never existed in git):

- `20240101000002`, `20240101000003` — gap between 000001 and 000004
- `20240101000007` — gap between 000006 and 000008
- `20240101000009`, `20240101000010` — gap between 000008 and 000011
- `20240101000014` — gap between 000013 and 000015

These gaps are expected. They correspond to migration versions that were either:
- Never created (numbering was not strictly sequential)
- Applied manually outside the Supabase migration system
- Prisma-managed migrations that don't appear in `supabase/migrations/`

---

## B. Known Historical Renames

| Old Filename | New Filename | Rename Type | Risk Level |
|---|---|---|---|
| `20240101000025_insurance_readiness_workflow.sql` | `20260325000001_insurance_readiness_workflow.sql` | Timestamp change (valid → valid) | **MEDIUM** — old version may exist in remote if db push was run before rename |
| `20240101000020b_canonical_inventory_tables.sql` | `20240101000021_canonical_inventory_tables.sql` | Invalid timestamp fixed | **LOW** — `20240101000020b` is invalid and was skipped by Supabase CLI |
| `202603280001_reconcile_runtime_compat.sql` | `20260328000100_reconcile_runtime_compat.sql` | 12-digit → 14-digit pad | **LOW** — `202603280001` is invalid and was skipped by Supabase CLI |

**Key insight:** Only `20240101000025` has a valid 14-digit timestamp that could have been recorded in the remote `schema_migrations` table. The other two had invalid timestamps that Supabase CLI would have silently skipped.

---

## C. Remote Validation Status

**Cannot validate remotely.** The `SUPABASE_ACCESS_TOKEN` environment variable is not available in the current execution environment. The Supabase CLI requires this token to authenticate against the remote project API.

### CLI Evidence

```
$ npx supabase link --project-ref vpwnjibcrqujclqalkgy --debug
Supabase CLI 2.84.4
Using profile: supabase (supabase.co)
Loading project ref from flag: vpwnjibcrqujclqalkgy
Missing required field in config: project_id
EXIT: 0

$ npx supabase migration list
Cannot find project ref. Have you run supabase link?
EXIT: 1
```

The `supabase link` command reports success but does not actually link without authentication. Subsequent commands fail with "Cannot find project ref."

---

## D. Possible Remote States and Recovery Paths

### Scenario 1: Remote has no migrations (fresh project)

All 21 local versions are pending. `supabase db push` will apply them in order.

**Action:** None. Run `pnpm supabase db push` directly.

### Scenario 2: Remote matches local exactly

No mismatches. Only truly new local versions will be applied.

**Action:** None. Run `pnpm supabase db push` directly.

### Scenario 3: Remote contains `20240101000025` (renamed to `20260325000001`)

The remote has a version that no longer exists locally.

**Action:**
```bash
pnpm supabase migration repair 20240101000025 --status reverted
pnpm supabase db push
```

The CI workflow now handles this automatically via the "Reconcile migration history" step.

### Scenario 4: Remote contains unknown versions

Versions that don't correspond to any known local file or rename.

**Action:** Manual investigation required. Do NOT proceed with db push.
```sql
-- Query the remote schema_migrations table directly
SELECT version, name, statements FROM supabase_migrations.schema_migrations ORDER BY version;
```

---

## E. Reconciliation Tooling

### Automated (CI Workflow)

The production migration workflow (`.github/workflows/db-migrate-production.yml`) now includes an automatic reconciliation step that runs before `supabase db push`. It:

1. Fetches the remote migration list
2. Compares against local versions
3. Auto-repairs known renames (marks old versions as `reverted`)
4. Fails with a clear error if unknown mismatches are found

### Manual (Reconciliation Script)

```bash
# Dry-run — reports mismatches without making changes
bash scripts/reconcile-supabase-migrations.sh

# Apply repairs
bash scripts/reconcile-supabase-migrations.sh --apply
```

The script includes:
- Local filename validation
- Remote version comparison
- Known rename detection
- Safety check blocking repair of unknown versions
- Repair execution with `--apply` flag

---

## F. Deployment Readiness Assessment

| Check | Status |
|---|---|
| Local filenames valid | ✅ All 29 files pass `^[0-9]{14}_.*\.sql$` |
| config.toml valid | ✅ `project_id = ""` (standard default) |
| CI pre-flight secrets check | ✅ Added in previous session |
| CI reconciliation step | ✅ Added in this session |
| Reconciliation script | ✅ Updated with known renames and safety checks |
| Remote validation | ⏳ **Blocked** — requires `SUPABASE_ACCESS_TOKEN` |
| `supabase db push` | ⏳ **Blocked** — requires remote validation first |

### Operator Checklist

Before production migration deployment is safe to continue:

1. [ ] Configure `SUPABASE_ACCESS_TOKEN` in GitHub → Settings → Environments → production → Secrets
2. [ ] Configure `SUPABASE_PROJECT_ID` in GitHub → Settings → Environments → production → Secrets
3. [ ] Run manual reconciliation:
   ```bash
   export SUPABASE_ACCESS_TOKEN=<token>
   pnpm supabase link --project-ref vpwnjibcrqujclqalkgy
   bash scripts/reconcile-supabase-migrations.sh
   ```
4. [ ] If dry-run shows only known renames: `bash scripts/reconcile-supabase-migrations.sh --apply`
5. [ ] Verify: `bash scripts/reconcile-supabase-migrations.sh` (should show zero mismatches)
6. [ ] Push: `pnpm supabase db push`
7. [ ] OR: Trigger CI workflow (which runs steps 3-6 automatically)
