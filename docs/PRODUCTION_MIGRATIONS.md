# Production Database Migrations

This document describes the automated database migration pipeline for AutoLenis production, how to configure it, how to run it manually, and how to recover from failures.

---

## Overview

AutoLenis uses a **hybrid migration model**:

| Layer | Location | Tool | Authority |
|---|---|---|---|
| Supabase SQL | `supabase/migrations/*.sql` | Supabase CLI (`supabase db push`) | **Primary** — creates tables, enums, RPC functions, RLS policies, indexes |
| Prisma ORM | `prisma/migrations/` | Prisma CLI (`prisma migrate deploy`) | **Secondary** — tracks schema state for the Prisma client; current baseline references the Supabase-managed schema |
| Legacy SQL | `migrations/` | Manual (Supabase Dashboard SQL Editor) | **Not automated** — legacy scripts, run once manually in sequence per `migrations/README.md` |

The automated workflow in `.github/workflows/db-migrate-production.yml` handles **Supabase SQL** and **Prisma** migrations only. Legacy scripts in `migrations/` are out of scope for automation.

---

## Required GitHub Secrets

Configure all four secrets under **GitHub → Repository Settings → Secrets and variables → Actions**:

| Secret Name | Where to find it | Purpose |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Account (top-right avatar) → **Access Tokens** → Generate new token | Authenticates the Supabase CLI for remote project operations |
| `SUPABASE_PROJECT_ID` | Supabase Dashboard → Project → **Settings → General → Reference ID** | Identifies the target Supabase project (e.g. `abcdefghijklmnop`) |
| `POSTGRES_URL_NON_POOLING` | Supabase Dashboard → Project → **Settings → Database → Connection string → URI** (Session mode, port **5432**) | Direct connection for Prisma migrations — PgBouncer (port 6543) does not support DDL |
| `POSTGRES_PRISMA_URL` | Supabase Dashboard → Project → **Settings → Database → Connection string → URI** (Transaction mode, port **6543**) + append `?pgbouncer=true` | Pooled connection used during `prisma generate` and normal app queries |

> **Security note:** Secrets are never echoed to the workflow log. The `environment: production` protection rule is applied to the job, enabling mandatory approval gates if configured in GitHub repository settings.

---

## Migration Execution Order

The workflow enforces a strict order:

```
1. supabase db push   ← Supabase SQL migrations
2. prisma migrate deploy  ← Prisma ORM migrations
```

**Why this order matters:**

Supabase SQL migrations (`supabase/migrations/`) create tables, enums, RPC functions, and RLS policies using raw SQL. Prisma migrations (`prisma/migrations/`) reference the schema that results from those SQL migrations. If Prisma runs first against a schema that does not yet contain the expected objects, it will fail.

The workflow uses `cancel-in-progress: false` so a concurrent push can never interrupt a migration run mid-execution.

---

## Trigger Conditions

The workflow runs automatically when a push to `main` changes any of:

- `prisma/migrations/**`
- `prisma/schema.prisma`
- `supabase/migrations/**`

It does **not** run on every push to `main` — only when schema-related files change. This prevents unnecessary migration runs on application-only changes.

---

## Manual Override (`workflow_dispatch`)

To force-run migrations without a schema file change (e.g. after a failed run or for a hot fix):

1. Go to **GitHub → Actions → Production DB Migrations**
2. Click **Run workflow**
3. Select branch `main`
4. Click **Run workflow** to confirm

The `force_run` input is available but currently informational — all steps execute regardless of its value.

---

## Relationship to Vercel Deployment

Vercel auto-deploys app code via a GitHub webhook on push to `main`. This workflow runs in parallel with the Vercel build.

**Expected timing:**

| Step | Duration |
|---|---|
| This migration workflow | ~45–90 seconds |
| Vercel build + deploy | ~3–6 minutes |

Migrations typically complete **before** Vercel finishes building. If the app code references new schema objects, it will fail on first request until migrations complete — this window is small in practice.

**For critical schema changes** (renaming columns, dropping tables, changing RPC signatures), pause Vercel auto-deployment in the Vercel dashboard before pushing to `main`, run migrations, verify, then re-enable deployments.

---

## Rollback Procedures

### Supabase SQL Migration Rollback

Supabase SQL migrations are not automatically reversible. To roll back:

1. Write a new migration file in `supabase/migrations/` that reverses the change (e.g. `DROP TABLE`, `ALTER TABLE DROP COLUMN`, drop the RPC, revert RLS policy).
2. Name it with the next timestamp: `YYYYMMDDHHMMSS_rollback_description.sql`.
3. Push to `main`. The workflow will apply the rollback migration.

### Prisma Migration Rollback

Prisma migrations are tracked in the `_prisma_migrations` table. Rollback uses the same forward-migration approach as Supabase:

1. Write a new migration file under `prisma/migrations/` containing the SQL that reverses the unwanted change (e.g. `DROP COLUMN`, `ALTER TABLE`, restore old index).
2. Update `prisma/schema.prisma` to match the rolled-back state.
3. Commit both files and push to `main`. `prisma migrate deploy` will apply the new rollback migration.

### Emergency: Disable the Workflow

If a runaway migration is causing harm:

1. Go to **GitHub → Actions → Production DB Migrations → (three-dot menu) → Disable workflow**.
2. Fix the problematic migration file.
3. Re-enable the workflow and push the fix.

---

## Failure Behavior

| Failure point | Behavior |
|---|---|
| `supabase link` fails | Workflow fails immediately; Prisma step does not run |
| `supabase db push` fails | Workflow fails immediately; Prisma step does not run |
| `prisma generate` fails | Workflow fails; `prisma migrate deploy` does not run |
| `prisma migrate deploy` fails | Workflow fails; run is recorded in `_prisma_migrations` as failed |

Both `supabase db push` and `prisma migrate deploy` are **idempotent** — re-running the workflow on the same commit safely skips already-applied migrations.

---

## Migration Reconciliation

When `supabase db push` reports "remote migration versions not found locally", the remote `schema_migrations` table contains versions that no longer match local filenames. This typically happens after renaming or deleting migration files.

### Diagnosis

```bash
# Link to the remote project (requires SUPABASE_ACCESS_TOKEN env var)
pnpm supabase link --project-ref "$SUPABASE_PROJECT_ID"

# List all remote vs local versions
pnpm supabase migration list
```

### Automated Reconciliation Script

```bash
# Dry-run — reports mismatches without making changes
bash scripts/reconcile-supabase-migrations.sh

# Apply repairs
bash scripts/reconcile-supabase-migrations.sh --apply
```

### Manual Repair

For each remote-only version, decide whether to **revoke** it (remove from remote tracking) or **restore** it (add the missing local file):

```bash
# Remove a version from remote tracking (migration SQL stays in the database)
pnpm supabase migration repair <version> --status reverted

# Mark a local migration as already applied (skip it during db push)
pnpm supabase migration repair <version> --status applied
```

### Known Historical Renames

| Old Version | New Version | Reason |
|---|---|---|
| `20240101000025` | `20260325000001` | Timestamp corrected for ordering |
| `20240101000020b` | `20240101000021` | Invalid suffix `b` in timestamp |
| `202603280001` | `20260328000100` | 12-digit padded to 14-digit |

If any of these old versions appear in remote history, repair them with `--status reverted`.

---

## Operational Checklist Before Adding a New Migration

- [ ] New Supabase SQL migration file follows the naming convention: `YYYYMMDDHHMMSS_description.sql`
- [ ] Migration is reversible (rollback SQL is documented in comments or a paired file)
- [ ] Migration includes a `workspaceId NOT NULL` constraint for any new user-facing tables
- [ ] RLS policies are included if the table stores user data
- [ ] Indexes are added for columns used in WHERE / JOIN / ORDER BY
- [ ] The migration has been tested against a copy of the production schema shape
- [ ] If the migration is breaking (rename/drop), Vercel auto-deployment is paused until migration completes
