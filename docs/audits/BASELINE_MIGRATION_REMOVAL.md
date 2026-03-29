# Baseline Migration Removal: `20260119104146_baseline_schema.sql`

> Generated: 2026-03-29
> Scope: Removal of baseline migration version `20260119104146` from repository and migration history

---

## A. File Status: ✅ Already Absent

The file `supabase/migrations/20260119104146_baseline_schema.sql` does **not exist** in the
repository. A comprehensive search confirmed:

- **File on disk:** Not found
- **References in codebase:** Zero matches across all file types (SQL, YAML, Markdown, TypeScript, JavaScript, Shell, TOML, JSON)
- **Reconcile script:** Did not previously reference version `20260119104146`

No local deletion was required — the file was already absent at the time of this audit.

---

## B. Remote State: ❓ Unknown — Cannot Be Determined

Remote migration state (the `supabase_migrations.schema_migrations` table) is **unknown**
because the production migration pipeline has never successfully connected:

- `SUPABASE_ACCESS_TOKEN` and `SUPABASE_PROJECT_ID` secrets are not configured in GitHub
- The only production workflow run (ID: 23676749811, 2026-03-28) failed at the `supabase link` step
- `supabase migration list` has never been executed against the remote project

**Implication:** We cannot confirm whether version `20260119104146` was ever recorded in the
remote `schema_migrations` table. If it was applied remotely, it must be explicitly reverted.

---

## C. Repo Changes Made

| File | Change | Reason |
|------|--------|--------|
| `scripts/reconcile-supabase-migrations.sh` | Added `20260119104146` to `KNOWN_REMOVED` array | If found remotely during reconciliation, the script will auto-revert it instead of flagging it as an unknown mismatch |
| `docs/audits/BASELINE_MIGRATION_REMOVAL.md` | Created (this file) | Documents the removal procedure, operator commands, and risk assessment |

No migration files were created, modified, or moved. No unrelated migrations were touched.

---

## D. Operator Commands (Post-Merge)

If version `20260119104146` exists in the remote `schema_migrations` table, operators must run:

```bash
# Step 1: Mark the baseline version as reverted in remote history
supabase migration repair 20260119104146 --status reverted

# Step 2: Verify the migration list is clean
supabase migration list
```

**Alternatively**, the automated reconciliation script handles this automatically:

```bash
# Dry-run (report only)
bash scripts/reconcile-supabase-migrations.sh

# Apply repairs
bash scripts/reconcile-supabase-migrations.sh --apply
```

The reconciliation script (used in CI via `db-migrate-production.yml`) will automatically
detect and revert `20260119104146` if it appears in the remote migration history.

### Prerequisites

- `SUPABASE_ACCESS_TOKEN` environment variable must be set
- Supabase project must be linked: `supabase link --project-ref <project-ref>`

---

## E. Final Verdict

| Check | Status |
|-------|--------|
| File deleted from repo | ✅ Already absent — no action needed |
| Codebase references cleaned | ✅ None existed — no action needed |
| Reconcile script updated | ✅ Version added to `KNOWN_REMOVED` array |
| Documentation created | ✅ This file |
| Remote repair automated | ✅ Reconcile script will auto-revert if found remotely |
| Remote repair likely required | ❓ Unknown — depends on whether the migration was ever applied remotely |
| Unrelated migrations modified | ✅ None |
| Repo is clean after removal | ✅ Yes — no traces of `20260119104146` remain in the codebase except the `KNOWN_REMOVED` entry for automated repair |

**The repository is clean.** If the version exists remotely, the reconciliation script
(or manual `supabase migration repair` command) will handle it on the next deployment.
