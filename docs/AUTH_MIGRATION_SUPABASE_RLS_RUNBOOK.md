# Auth Migration: Supabase + RLS Runbook

## Overview

This runbook covers the migration from custom JWT-only authentication to **Supabase Auth as canonical session identity**, with **Postgres Row-Level Security (RLS)** policies enforcing `auth.uid()`.

### Architecture Decision

| Layer | Authoritative System | Purpose |
|-------|---------------------|---------|
| Session Identity | **Supabase Auth** (`auth.users`) | Login, session cookies, email verification, password recovery |
| App Identity | **public."User"** | Role, tenant, profile, workspace, MFA state |
| Link | `User.auth_user_id` → `auth.users.id` | Bridges the two identity layers |

---

## Pre-Migration Checklist

- [ ] Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- [ ] Ensure `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] Ensure `JWT_SECRET` is set (legacy session compatibility)
- [ ] Run schema migration: `migrations/100-auth-hardening-schema.sql`
- [ ] Run RLS migration: `migrations/101-rls-functions-and-policies.sql`
- [ ] Verify Prisma schema is up to date: `npx prisma generate`

## Migration Steps

### 1. Apply Schema Changes

```bash
# Apply the auth hardening migration
psql $DATABASE_URL -f migrations/100-auth-hardening-schema.sql

# Apply RLS functions and policies
psql $DATABASE_URL -f migrations/101-rls-functions-and-policies.sql

# Regenerate Prisma client
npx prisma generate
```

### 2. Run Backfill Script

The backfill script creates Supabase auth users for all existing internal users:

```bash
npx tsx scripts/backfill-supabase-auth.ts
```

This script is **idempotent** — safe to re-run. It:
1. Finds all `User` rows where `auth_user_id IS NULL`
2. Creates a Supabase auth user for each
3. Links via `auth_user_id`
4. Sets `force_password_reset = true`
5. Sends recovery email
6. Outputs a CSV report

### 3. Verify RLS Policies

```sql
-- Test as authenticated user
SET request.jwt.claims = '{"sub": "<auth-user-uuid>"}';
SET role = 'authenticated';

-- Should only return the user's own row
SELECT * FROM "User";

-- Should only return own buyer profile
SELECT * FROM "BuyerProfile";

-- Reset
RESET role;
```

### 4. Deploy Application Changes

1. Deploy the updated codebase (middleware.ts, auth routes, CSRF)
2. Verify middleware is active: check for `x-pathname` header on responses
3. Verify CSRF cookie (`csrf_token`) is set on authenticated pages
4. Test login/signup/signout flows

## Session Revocation

Sessions are invalidated via `session_version`:

| Event | Action |
|-------|--------|
| Password reset | `session_version += 1` |
| Password change | `session_version += 1` |
| MFA disable | `session_version += 1` |
| Role change | `session_version += 1` |
| Admin force-logout | `session_version += 1` |

JWTs include `session_version`. On verification, the token's version is compared to the DB value. Stale tokens are rejected.

## CSRF Protection

All state-changing requests (POST/PUT/PATCH/DELETE) using cookie auth require:
1. `csrf_token` cookie (set automatically by middleware)
2. `x-csrf-token` header matching the cookie value

Exempt paths:
- `/api/webhooks/**` (verified via signature)
- `/api/cron/**` (verified via secret)

## Rollback Plan

1. Remove `middleware.ts` (reverts to no centralized middleware)
2. Revert `proxy.ts` CSRF import (remove CSRF validation)
3. Keep schema changes (additive, backward-compatible)
4. Legacy JWT cookies continue to work as before

## Monitoring

- Watch for `401` (unauthenticated) vs `403` (forbidden) response patterns
- Monitor `csrf_token` cookie presence on authenticated requests
- Check `EmailSendLog` for delivery status and deduplication
- Review `AdminAuditLog` for MFA events and break-glass usage
