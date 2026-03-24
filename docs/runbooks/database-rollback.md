# Database Rollback Runbook

**Severity**: CRITICAL
**Domain**: Infrastructure
**Affected System**: Supabase / PostgreSQL / Prisma

## Symptoms

- Application errors referencing missing columns, tables, or constraints
- Prisma client errors (P2002, P2025) on previously working queries
- Migration applied that breaks production functionality
- Data corruption detected

## Diagnosis Steps

1. Identify the problematic migration:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   ORDER BY version DESC LIMIT 5;
   ```

2. Review the migration SQL file in `supabase/migrations/`.

3. Check application error logs for specific SQL errors.

4. Verify Prisma schema matches the current database state.

## Resolution Steps

### Option A: Rollback Migration

1. **Review rollback SQL** in the migration file header comment.
2. **Execute rollback SQL** via Supabase SQL Editor or `psql`:
   ```sql
   -- Example: DROP TABLE IF EXISTS table_name CASCADE;
   ```
3. **Remove migration record** from `supabase_migrations.schema_migrations`.
4. **Regenerate Prisma client**: `npx prisma generate`.
5. **Deploy previous application version** if code depends on the rolled-back schema.

### Option B: Forward Fix

1. **Create a corrective migration** that fixes the issue.
2. **Apply and test** in staging before production.
3. **Deploy** the fix with the corrective migration.

## Post-Resolution

1. Verify application is functional with the corrected schema.
2. Run health checks to confirm database connectivity and table access.
3. Review the failed migration to understand what went wrong.
4. Update CI/CD migration validation to catch similar issues.
5. Update incident record with full timeline and root cause.

## Prevention

- Always test migrations against a copy of production data shape.
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotent migrations.
- Include rollback SQL in every migration file header.
- Run `pnpm typecheck` after schema changes to catch mismatches.
