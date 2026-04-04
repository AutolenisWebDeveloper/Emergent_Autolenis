# Migration History Repair Analysis

> **Date:** 2026-03-29
> **Error:** `ERROR: type "AdminSubStatus" already exists (SQLSTATE 42710)`
> **Affected migration:** `00000000000000_initial_schema.sql`

## Root Cause

This is a **migration-history mismatch**, not a schema idempotency gap.

### Evidence from CI Runs

| Run ID | Timestamp | Remote Column for `00000000000000` | Result |
|---|---|---|---|
| 23719141827 | 2026-03-29T21:10 | EMPTY | `db push` failed: `AdminSubStatus already exists` |
| 23719271230 | 2026-03-29T21:17 | EMPTY | `db push` failed: `AdminSubStatus already exists` |

The `supabase migration list` output from both runs shows **all local versions have empty
Remote columns** — none are recorded in the remote `schema_migrations` table.

### Why the Reconciliation Script Missed It

The script's remote version parser used `grep -oE '\b[0-9]{14}\b'` which extracts 14-digit
numbers from **all columns** of the CLI output (Local, Remote, and Time), not just the Remote
column. This caused it to treat versions in the Local column as remote, masking the mismatch:

```
Remote versions:  21   ← actually 0 truly remote
Local versions:   21
✅ No remote-only versions
✅ No pending local migrations
```

### Sequence of Events

1. Old baseline `20260119104146` was the only remote record and created all schema objects
2. Reconciliation script correctly reverted `20260119104146` (known removed)
3. Remote history became **completely empty**
4. `db push` tried to apply all 29 migration files from scratch
5. First migration `00000000000000_initial_schema.sql` failed on `CREATE TYPE "AdminSubStatus"`
   because the type already existed from the old baseline

## Fix Applied

### 1. Fixed Remote Version Parsing

Replaced `grep` with column-aware `awk` parsing that extracts only the 2nd column (Remote)
from the pipe-delimited `supabase migration list` output.

### 2. Added Baseline Reconciliation Logic

When the baseline version `00000000000000` is detected as local-only (missing from remote
history), the script now marks **all local-only versions** as `applied` using:

```bash
supabase migration repair <version> --status applied
```

This is the correct Supabase repair path for the baseline replacement scenario.

## Answers to Investigation Questions

### A. Was remote history missing `00000000000000`?

**YES.** The Remote column for `00000000000000` (and all other versions) was empty in both
CI runs. The old baseline `20260119104146` was the only remote record and was reverted,
leaving an empty remote history.

### B. Was repair executed?

**NOT YET (at time of analysis).** The parsing bug in the reconciliation script prevented
detection. The fix enables automatic repair in the next CI run:
- `supabase migration repair 00000000000000 --status applied`
- (And all other local-only versions)

### C. Did `db push` succeed?

**NOT YET.** Requires the fix to be merged and CI to re-run. After baseline reconciliation
marks all versions as "applied", `db push` will find nothing pending and succeed.

### D. Do any additional duplicate-object conflicts remain?

**NONE EXPECTED.** All local-only versions will be marked as "applied" before `db push` runs.
Since `db push` only applies versions not in remote history, there will be no migrations to
execute and therefore no duplicate-object conflicts.

## Recommendation: Idempotent Baseline (Future Hardening)

While the repair path resolves the immediate issue, consider making
`00000000000000_initial_schema.sql` idempotent as defense-in-depth for future scenarios:

- Wrap `CREATE TYPE` → `DO $$ BEGIN IF NOT EXISTS ... END $$`
- Ensure `CREATE TABLE` uses `IF NOT EXISTS`
- Ensure `CREATE INDEX` uses `IF NOT EXISTS`

This is a separate, lower-priority change and is NOT required for the current fix.
