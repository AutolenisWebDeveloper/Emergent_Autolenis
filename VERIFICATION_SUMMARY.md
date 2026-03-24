# Supabase Connectivity - End-to-End Verification

## Overview

This document provides the exact commands and expected outputs to verify that the application is correctly connected to Supabase.

---

## Task 1: Confirm Environment Variables Are Wired

### Verification Script

Run the environment verification script:

```bash
bash scripts/verify-supabase-env.sh
```

### Expected Output (when configured):

```
================================================
Supabase Environment Variables Verification
================================================

✅ NEXT_PUBLIC_SUPABASE_URL is set
   Project Reference: abc123xyz
   Format: Valid URL format detected

✅ SUPABASE_SERVICE_ROLE_KEY is set
   Key length: 243 characters
   Format: Appears to be a valid JWT token

================================================
Summary
================================================
Configured: 2/2 required variables

✅ All required Supabase environment variables are configured

Next step: Test the health check endpoint
  curl http://localhost:3000/api/health/db | jq .
```

**SECURITY NOTE**: The script verifies presence without printing the actual service key.

---

## Task 2: Health Check Route

### Implementation Status

✅ **Route exists**: `/api/health/db` (app/api/health/db/route.ts)

### Key Features:

- ✅ Parses `projectRef` from NEXT_PUBLIC_SUPABASE_URL subdomain
- ✅ Performs real DB call: `select * from _connection_canary order by id desc limit 1`
- ✅ Returns JSON with: `ok`, `projectRef`, `latencyMs`, `lastCanaryRow`, `error`
- ✅ Returns status codes:
  - **200** if query succeeds (even if table empty)
  - **503** if table missing or DB unreachable
  - **500** if env vars missing/misconfigured
- ✅ Never logs secrets

---

## Task 3: Canary Table SQL

### Migration File

**Location**: `migrations/95-add-connection-canary-table.sql`

### SQL to Create Table:

```sql
-- Create the connection canary table
CREATE TABLE IF NOT EXISTS public._connection_canary (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  message TEXT
);

-- Insert initial test row
INSERT INTO public._connection_canary (message) 
VALUES ('canary alive')
ON CONFLICT DO NOTHING;

-- Grant SELECT permission to service_role (for health checks)
GRANT SELECT ON public._connection_canary TO service_role;
```

### How to Run:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Paste and run the SQL above
3. Verify: `SELECT * FROM public._connection_canary;`

---

## Task 4: Prove Connectivity End-to-End

### Test Commands

#### Local Testing (Development Server)

```bash
# Start the dev server (if not already running)
npm run dev

# In another terminal, test the endpoint
curl -X GET http://localhost:3000/api/health/db
```

#### Production Testing (Deployed)

```bash
curl -X GET https://autolenis.com/api/health/db
```

#### With Formatted Output (using jq)

```bash
curl -X GET http://localhost:3000/api/health/db | jq .
```

---

### Example Outputs

#### ✅ Success with a Row

**HTTP Status**: `200 OK`

```json
{
  "ok": true,
  "projectRef": "abc123xyz",
  "latencyMs": 234,
  "lastCanaryRow": {
    "id": 1,
    "created_at": "2024-01-15T10:30:00.000Z",
    "message": "canary alive"
  }
}
```

**What this means**:
- ✅ Environment variables are configured
- ✅ Connected to Supabase project: `abc123xyz`
- ✅ Database query succeeded in 234ms
- ✅ Canary table exists and has data

---

#### ✅ Success with Empty Table

**HTTP Status**: `200 OK`

```json
{
  "ok": true,
  "projectRef": "abc123xyz",
  "latencyMs": 189,
  "lastCanaryRow": null
}
```

**What this means**:
- ✅ Environment variables are configured
- ✅ Connected to Supabase project: `abc123xyz`
- ✅ Database query succeeded
- ⚠️ Table exists but has no rows (run the INSERT SQL)

---

#### ❌ Failure When Table Missing

**HTTP Status**: `503 Service Unavailable`

```json
{
  "ok": false,
  "projectRef": "abc123xyz",
  "latencyMs": 156,
  "error": "Table public._connection_canary does not exist"
}
```

**What this means**:
- ✅ Environment variables are configured
- ✅ Connected to Supabase project: `abc123xyz`
- ❌ Canary table does not exist

**Action**: Run the SQL migration (Task 3)

---

#### ❌ Failure - Missing Environment Variables

**HTTP Status**: `500 Internal Server Error`

```json
{
  "ok": false,
  "error": "Missing Supabase environment variables",
  "latencyMs": 1
}
```

**What this means**:
- ❌ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set

**Action**: Configure environment variables

---

## Final Verification

### Step-by-Step Verification Process

1. **Verify environment variables** (without exposing secrets):
   ```bash
   bash scripts/verify-supabase-env.sh
   ```
   Expected: All variables configured ✅

2. **Run the SQL migration**:
   - Open Supabase Dashboard → SQL Editor
   - Run `migrations/95-add-connection-canary-table.sql`
   
3. **Test the health check endpoint**:
   ```bash
   curl http://localhost:3000/api/health/db | jq .
   ```
   Expected: HTTP 200 with `"ok": true` ✅

4. **Verify project reference**:
   - Check that `projectRef` in response matches your Supabase project
   - Example: If URL is `https://abc123xyz.supabase.co`, projectRef should be `abc123xyz`

---

## Final Status

Once you see a response like this:

```json
{
  "ok": true,
  "projectRef": "abc123xyz",
  "latencyMs": 234,
  "lastCanaryRow": {
    "id": 1,
    "created_at": "2024-01-15T10:30:00.000Z",
    "message": "canary alive"
  }
}
```

You can confirm:

**PASS: Connected to <projectRef>**

Replace `<projectRef>` with the actual value from your response (e.g., `abc123xyz`).

---

## Troubleshooting

### If you get 500 error:
- Check `.env.local` file exists and has both variables
- Verify variable names are exactly: `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Restart dev server after changing env variables

### If you get 503 error:
- Run the SQL migration to create the table
- Verify your Supabase project is accessible
- Check Supabase project status in dashboard

### If projectRef looks wrong:
- Verify `NEXT_PUBLIC_SUPABASE_URL` points to the correct Supabase project
- The projectRef is extracted from the subdomain

---

## Security Checklist

- ✅ Service role key is used server-side only
- ✅ Key is never logged or exposed in API responses
- ✅ Only the parsed projectRef (subdomain) is returned
- ✅ Verification script checks presence without printing secrets
- ✅ Health check endpoint is safe for public monitoring

---

## Related Files

- Health check route: `app/api/health/db/route.ts`
- SQL migration: `migrations/95-add-connection-canary-table.sql`
- Env verification script: `scripts/verify-supabase-env.sh`
- Full guide: `SUPABASE_CONNECTIVITY_VERIFICATION.md`
