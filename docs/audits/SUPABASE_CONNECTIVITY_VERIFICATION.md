# Supabase Connectivity Verification Guide

This guide provides step-by-step instructions to verify that your application is correctly connected to your Supabase project.

## 1. Environment Variables

### Required Variables

Copy `.env.example` to `.env.local` and fill in these Supabase values:

```bash
cp .env.example .env.local
```

| Variable | Where to Find | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → Project API Keys → anon/public | ✅ Yes (or publishable key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → Project API Keys → service_role | ✅ Yes |
| `SUPABASE_PROJECT_ID` | Supabase Dashboard → Settings → General → Reference ID | ✅ Yes (for CLI) |
| `SUPABASE_URL` | Same value as `NEXT_PUBLIC_SUPABASE_URL` | Optional override |

**IMPORTANT**: `SUPABASE_SERVICE_ROLE_KEY` is used server-side only and is **never** logged or returned in API responses.

## 2. Database Setup

### Apply Migrations via Supabase CLI

The recommended way to apply migrations is via the Supabase CLI (already installed as a dev dependency):

```bash
# Link your project (run once per environment)
pnpm supabase:link

# Push all migrations to your remote project
pnpm supabase:db:push
```

This will apply `supabase/migrations/20240101000024_connection_canary.sql` which creates the `_connection_canary` health check table.

### Manual SQL (Supabase SQL Editor)

If you prefer to run manually, execute this in Supabase Dashboard → SQL Editor:

```sql
-- Create the connection canary table (idempotent)
CREATE TABLE IF NOT EXISTS public._connection_canary (
  id        BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message   TEXT
);

-- Insert initial test row
INSERT INTO public._connection_canary (message)
SELECT 'canary alive'
WHERE NOT EXISTS (SELECT 1 FROM public._connection_canary);

-- Grant SELECT permission to service_role only
GRANT SELECT ON public._connection_canary TO service_role;
REVOKE ALL ON public._connection_canary FROM anon;
REVOKE ALL ON public._connection_canary FROM authenticated;
```

## 3. Health Check Endpoint

### Endpoint Details

- **URL**: `/api/health/db`
- **Method**: GET
- **Authentication**: Admin role (`ADMIN`, `SUPER_ADMIN`, `COMPLIANCE_ADMIN`) **or** `x-internal-key` header matching `INTERNAL_API_KEY`
- **Purpose**: Verify Supabase connectivity and confirm the canary table exists

> **Security note**: This endpoint is restricted to authenticated admins and internal callers to prevent leaking connectivity details to unauthenticated users.

### Response Schema

```typescript
{
  ok: boolean          // true if canary query succeeded
  latencyMs: number    // Query round-trip time in milliseconds
  correlationId: string // UUID for request tracing
  timestamp: string    // ISO-8601 timestamp
  error?: string       // Human-readable error (on failure only)
}
```

### HTTP Status Codes

| Status | Meaning |
|---|---|
| `200 OK` | Database reachable, canary table exists |
| `401 Unauthorized` | No valid admin session or internal key |
| `503 Service Unavailable` | Canary table missing or database unreachable |
| `503 Service Unavailable` | Environment variables missing |
| `500 Internal Server Error` | Unexpected server error |

## 4. Testing Commands

### Authenticated Admin Test (Local)

```bash
# Using internal API key (set INTERNAL_API_KEY in .env.local first)
curl -X GET http://localhost:3000/api/health/db \
  -H "x-internal-key: your-internal-api-key"

# With formatted output (requires jq)
curl -X GET http://localhost:3000/api/health/db \
  -H "x-internal-key: your-internal-api-key" | jq .
```

### Production Test

```bash
curl -X GET https://autolenis.com/api/health/db \
  -H "x-internal-key: your-internal-api-key" | jq .
```

## 5. Example Responses

### ✅ Success

**HTTP Status**: 200 OK

```json
{
  "ok": true,
  "latencyMs": 234,
  "correlationId": "b3e4f1a2-...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### ❌ Canary Table Missing

**HTTP Status**: 503 Service Unavailable

```json
{
  "ok": false,
  "latencyMs": 156,
  "correlationId": "b3e4f1a2-...",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "error": "Canary table not found"
}
```

**Action**: Run the migration (section 2).

### ❌ Environment Variables Missing

**HTTP Status**: 503 Service Unavailable

```json
{
  "ok": false,
  "correlationId": "b3e4f1a2-...",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Action**: Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

### ❌ Unauthenticated Call

**HTTP Status**: 401 Unauthorized

```json
{
  "error": { "code": "UNAUTHENTICATED", "message": "Authentication required" },
  "correlationId": "b3e4f1a2-..."
}
```

**Action**: Pass the `x-internal-key` header or authenticate as an admin user.

## 6. Verification Checklist

- [ ] `.env.local` created from `.env.example`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set to your Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable key) set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `SUPABASE_PROJECT_ID` set (for Supabase CLI commands)
- [ ] Migration applied (`pnpm supabase:db:push` or manual SQL)
- [ ] `INTERNAL_API_KEY` set (for CLI health checks)
- [ ] Health check returns HTTP 200 with `ok: true`

## 7. Troubleshooting

### Problem: 503 — no `error` field in body

Missing environment variables. Check `.env.local`:

```bash
grep SUPABASE .env.local
# Should show NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
```

### Problem: 503 — `"error": "Canary table not found"`

The `_connection_canary` table does not exist. Run the migration:

```bash
pnpm supabase:link   # link CLI to your project (once)
pnpm supabase:db:push
```

Or manually run the SQL from section 2 in Supabase Dashboard → SQL Editor.

### Problem: 401 Unauthorized

Pass the `INTERNAL_API_KEY` as the `x-internal-key` header, or sign in as an admin user.

### Problem: Supabase CLI link fails

```bash
# Ensure SUPABASE_PROJECT_ID is set, then:
pnpm supabase link --project-ref $SUPABASE_PROJECT_ID
```

## 8. Security Notes

- ✅ `SUPABASE_SERVICE_ROLE_KEY` is used server-side only — never returned in responses or logs
- ✅ Health check endpoint requires admin authentication — not exposed to unauthenticated users
- ✅ Canary table grants `SELECT` to `service_role` only — `anon` and `authenticated` roles are revoked
- ✅ Response never includes the project reference, service key hints, or raw DB error messages
