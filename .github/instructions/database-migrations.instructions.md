---
applyTo: "prisma/schema.prisma|supabase/migrations/**|lib/db.ts|scripts/migrations/**"
---
# Database & Migrations (Non-Negotiable)

## Schema Changes
- Core models live in `prisma/schema.prisma`; run `prisma generate` after any schema change.
- Non-Prisma tables (RLS policies, views, functions, analytics) use Supabase SQL migrations in `supabase/migrations/`.
- Every new user-facing table MUST include `workspaceId` (NOT NULL) for tenant isolation.
- Every new table MUST include `createdAt` and `updatedAt` timestamps.
- Use soft deletes (`deletedAt` timestamp) for auditable records — never hard delete.

## Migration Safety
- Every migration must be reversible — include a rollback comment block at the top of the SQL file.
- Migrations must be backward-compatible: avoid renaming or dropping columns that are actively referenced by application code.
- Add indexes for columns used in WHERE, JOIN, ORDER BY, and foreign key clauses.
- Use `IF NOT EXISTS` for table/index creation to make migrations re-runnable.
- Test migrations against a copy of production data shape before merging.

## Data Access Patterns
- `prisma` from `lib/db.ts` is the typed ORM client — use for all CRUD on Prisma models.
- `getSupabase()` from `lib/db.ts` is a service-role Supabase client that **bypasses RLS** — use only in trusted server-side service code (cron jobs, webhooks, admin actions).
- `createClient()` from `lib/supabase/server` creates a user-scoped client that **respects RLS** — use for user-facing routes.
- Never mix Prisma and raw Supabase queries in the same transaction unless orchestrating via Supabase RPC.

## Referential Integrity
- Define foreign keys with explicit `ON DELETE` behavior (CASCADE, SET NULL, or RESTRICT).
- Never leave dangling references — if a parent record can be deleted, ensure child records are handled.
- Use Prisma relations (`@relation`) for all cross-model references in the schema.
