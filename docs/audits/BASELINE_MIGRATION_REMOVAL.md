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

## B. Remote State: 🔄 Pending — Will Be Repaired Automatically

Secrets are now configured (as of 2026-03-29):

- `SUPABASE_ACCESS_TOKEN` — Production environment ✅
- `SUPABASE_PROJECT_ID` — Production environment ✅

CI run 23701520078 (2026-03-29) confirmed secrets are present and `supabase link` succeeds,
but `supabase migration list` failed because `project_id` was empty in `config.toml`.

**Fix applied:** The CI workflow now injects `project_id` from the secret into `config.toml`
at runtime (via `sed`). Also fixed `db.major_version` from 15 → 17 to match the linked project.

When the workflow next runs on `main`, the reconciliation script will automatically detect
version `20260119104146` (if present remotely) and repair it to `reverted`.

---

## C. Repo Changes Made

| File | Change | Reason |
|------|--------|--------|
| `scripts/reconcile-supabase-migrations.sh` | Added `20260119104146` to `KNOWN_REMOVED` array | If found remotely during reconciliation, the script will auto-revert it instead of flagging it as an unknown mismatch |
| `supabase/config.toml` | Updated `db.major_version` from 15 → 17 | Matches the linked production database; eliminates CLI warning |
| `.github/workflows/db-migrate-production.yml` | Inject `project_id` into config.toml from secret; add trigger paths | Fixes `Missing required field in config: project_id` error that blocked reconciliation |
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
| CI config fixed for remote access | ✅ `project_id` injected at runtime; `db.major_version` corrected to 17 |
| Remote repair likely required | 🔄 Pending — will be handled automatically on next CI run |
| Unrelated migrations modified | ✅ None |
| Repo is clean after removal | ✅ Yes — no traces of `20260119104146` remain in the codebase except the `KNOWN_REMOVED` entry for automated repair |

**The repository is clean.** If the version exists remotely, the reconciliation script
(or manual `supabase migration repair` command) will handle it on the next deployment.
