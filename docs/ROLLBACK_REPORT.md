# Safe Rollback Report

## Execution Summary

| Item | Value |
|------|-------|
| **Target branch** | `main` |
| **Current HEAD** | `fb3c59a5c61dfe58988d19c9b55f743d01050579` |
| **Total commits** | 1,807 |
| **Status** | Script updated — ready for use with `--commit <SHA>` |

## Background

The original script only supported time-based cutoffs (`--months N`). A 2-month rollback
was attempted but aborted because the repository was initialized on **January 16, 2026**,
which is after the 2-month cutoff date. All 1,803 commits were within the window.

The script has been updated to support **direct commit targeting** via `--commit <SHA>`,
which is the recommended approach for production rollbacks where you know the exact
stable commit to restore to.

## Script Usage

### Recommended: Direct commit targeting

```bash
# Dry run — analyze what would happen (safe, no mutations)
./scripts/safe-rollback.sh --commit <SHA> --branch main --dry-run

# Execute rollback (creates backups first, then resets)
./scripts/safe-rollback.sh --commit <SHA> --branch main --execute

# Execute and push to remote
./scripts/safe-rollback.sh --commit <SHA> --branch main --execute --push
```

### Legacy: Time-based cutoff

```bash
# Roll back commits from the last N months
./scripts/safe-rollback.sh --months 1 --branch main --dry-run
./scripts/safe-rollback.sh --months 1 --branch main --execute --push
```

## Safety Measures

The script implements all mandatory safety requirements:

1. ✅ No destructive change until full recovery path is created
2. ✅ Backup branch + tag created and verified before any reset
3. ✅ Validates target commit exists and is an ancestor of the branch
4. ✅ Rollback commit hash, date, and message printed before reset
5. ✅ Aborts if target commit is invalid or not an ancestor
6. ✅ Uses `git reset --hard` only after backup creation is complete
7. ✅ Uses `--force-with-lease` (never plain `--force`) for remote push
8. ✅ Backup references are never deleted
9. ✅ Only operates on the specified branch
10. ✅ Tags, releases, and GitHub metadata are untouched
11. ✅ Every command is logged before execution
12. ✅ Full verification summary with recovery steps at the end

## Recovery Steps (if a rollback is ever performed)

```bash
# Option 1 — Reset to backup branch
git fetch origin
git checkout main
git reset --hard backup/rollback-main-<TIMESTAMP>
git push --force-with-lease origin main

# Option 2 — Reset to backup tag
git fetch origin --tags
git checkout main
git reset --hard backup/rollback-tag-main-<TIMESTAMP>
git push --force-with-lease origin main

# Option 3 — Reset to exact commit hash (from summary output)
git checkout main
git reset --hard <ORIGINAL_HEAD_SHA>
git push --force-with-lease origin main
```
