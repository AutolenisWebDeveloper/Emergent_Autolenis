# Deployment Verification Guide

## Required Environment Variables

Set these in Vercel → Project Settings → Environment Variables:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | ✅ | Public URL (e.g., `https://your-app.vercel.app`) |
| `JWT_SECRET` | ✅ | Auth JWT secret. Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Same as `NEXT_PUBLIC_APP_URL` |
| `NEXTAUTH_SECRET` | ✅ | NextAuth secret. Generate with `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key |
| `POSTGRES_PRISMA_URL` | ✅ | PostgreSQL connection string |
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe webhook signing secret |
| `RESEND_API_KEY` | ⚡ | Email provider (Resend) |
| `CRON_SECRET` | ⚡ | Secret for cron job authentication |
| `ESIGN_WEBHOOK_SECRET` | ⚡ | E-sign webhook verification |
| `INTERNAL_API_KEY` | ⚡ | Internal API authentication |

✅ = Required for deployment  
⚡ = Required for specific features

## How to Deploy on Vercel

### 1. Connect Repository
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the GitHub repository
3. Vercel will auto-detect Next.js

### 2. Configure Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `pnpm build` (auto-detected)
- **Install Command**: `pnpm install` (auto-detected)
- **Output Directory**: `.next` (default)

### 3. Set Environment Variables
Add all required environment variables from the table above.

### 4. Deploy
Click **Deploy**. The build process:
1. `pnpm install` — installs dependencies
2. `prisma generate` — generates Prisma client (via postinstall)
3. `next build` — builds the application

### 5. Verify Deployment
After deployment, verify these endpoints:

```bash
# Health check (root level — no auth)
curl -i https://your-app.vercel.app/health
# Expected: 200 OK, {"status":"healthy","timestamp":"..."}

# API health check (no auth)
curl -i https://your-app.vercel.app/api/health
# Expected: 200 OK, {"status":"healthy","database":"up",...}
```

## Health Check Endpoints

| Endpoint | Auth Required | Description |
|---|---|---|
| `GET /health` | ❌ No | Simple health check for load balancers |
| `GET /api/health` | ❌ No | Detailed health with database check |
| `GET /api/auth/health` | ❌ No | Auth system health check |
| `GET /api/admin/health` | ✅ Admin | Admin-level system diagnostics |

## Prisma / Database

- **Prisma Client** is generated automatically via `postinstall` script
- **Migrations** are NOT run automatically during the Vercel build. The `vercel.json`
  buildCommand is simply `pnpm build` (which runs `prisma generate && next build`).
- To apply migrations, run them manually or via a deployment hook:
  ```bash
  # Local/manual deploys
  pnpm db:deploy

  # Or use the wrapper script (skips gracefully if DB env vars are not set)
  node scripts/prisma-migrate-deploy.js
  ```
- Once the migration baseline is registered (see below), you can optionally update
  the buildCommand in `vercel.json` to include automatic migrations:
  ```json
  "buildCommand": "node scripts/prisma-migrate-deploy.js && pnpm build"
  ```

### First-Time Baseline Registration

Before the first deployment with Prisma Migrate, the existing database must be
registered as the baseline. Run the following **once** against the target database:

```bash
export POSTGRES_PRISMA_URL="postgresql://..."
bash scripts/prisma-baseline-init.sh
```

This executes:
1. `npx prisma validate` — confirms schema validity
2. `npx prisma db pull` — syncs schema with live DB
3. `npx prisma generate` — regenerates Prisma client
4. `npx prisma migrate resolve --applied 0001_initial_baseline` — marks baseline as applied
5. `npx prisma migrate status` — verifies clean state

### Refund Data Normalization

If the live database contains any `Refund` rows with `status = 'COMPLETED'`, run
the canonicalization migration to convert them to `SUCCEEDED`:

```bash
psql $DATABASE_URL < migrations/M007-refund-status-canonicalization.sql
```

## Staging Deployment (staging.autolenis.com)

### DNS Setup

Add a CNAME record at your DNS provider (use the target provided by Vercel when adding the domain):

| Record Type | Name      | Value                                   | Status |
|-------------|-----------|---------------------------------------- |--------|
| CNAME       | `staging` | `90ee6f36f7268215.vercel-dns-016.com.`  | ✅ Live |

> Vercel assigns a project-specific DNS target when you add a domain. Use the exact value shown in the Vercel dashboard under **Project Settings → Domains**.

If using **Cloudflare**, set proxy status to **"DNS only"** (grey cloud) until verified.

### Vercel Dashboard

1. Go to **Project Settings → Domains**.
2. Add `staging.autolenis.com`.
3. Assign it to the **Preview** environment so it reflects the latest preview deployment.
4. Wait for Vercel to verify the domain and provision SSL.

### Staging Environment Variables

Set these in Vercel → **Environment Variables** scoped to the **Preview** environment:

| Variable | Staging Value |
|----------|--------------|
| `NEXT_PUBLIC_APP_URL` | `https://staging.autolenis.com` |
| `NEXTAUTH_URL` | `https://staging.autolenis.com` |
| `STRIPE_SECRET_KEY` | Stripe **test-mode** key (`sk_test_...`) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe **test-mode** key (`pk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe test webhook signing secret |
| All other required vars | Same as production, pointing to staging Supabase |

### Verify Staging

```bash
# DNS resolution
nslookup staging.autolenis.com

# HTTP response
curl -I https://staging.autolenis.com

# Health check
curl https://staging.autolenis.com/api/health

# Run buyer package UAT
SMOKE_BASE_URL=https://staging.autolenis.com pnpm test:e2e e2e/buyer-package-uat.spec.ts --project=chromium
```

### Alternative: Vercel Preview URL

If `staging.autolenis.com` is not yet configured, run UAT against a Vercel preview deployment URL:

```bash
SMOKE_BASE_URL=https://auto-lenis-<hash>.vercel.app pnpm test:e2e e2e/buyer-package-uat.spec.ts --project=chromium
```

Find the preview URL in the Vercel dashboard under **Deployments** or in the GitHub PR deployment status.

> See `DNS_CHECKLIST.md` for the full DNS configuration guide and troubleshooting.

## What to Do If NextAuth Breaks on Preview URLs

Vercel preview deployments get unique URLs (e.g., `your-app-abc123.vercel.app`). This can break auth:

### Problem
NextAuth may reject callbacks because the preview URL doesn't match `NEXTAUTH_URL`.

### Solutions

1. **Use Vercel's automatic URL detection**: NextAuth on Vercel will use `VERCEL_URL` automatically if `NEXTAUTH_URL` is not set. For preview deployments, you can leave `NEXTAUTH_URL` unset and rely on this.

2. **Set NEXTAUTH_URL per environment**:
   - Production: `NEXTAUTH_URL=https://your-domain.com`
   - Preview: Leave unset (Vercel auto-detects)

3. **Cookie domain issues**: The app uses dynamic cookie domain detection based on the request hostname, so cookies should work across all Vercel deployment URLs automatically.

4. **Debug auth issues**: Visit `/api/auth/diagnostics` (requires `INTERNAL_API_KEY` header) to see the current auth configuration state.

## Troubleshooting

### Build fails with "Neither apiKey nor config.authenticator provided"
→ Set `STRIPE_SECRET_KEY` in environment variables. The Stripe client is lazy-initialized and won't crash during build, but requires the key at runtime.

### Build fails with TypeScript errors
→ Run `pnpm typecheck` locally to see errors. Fix in the source files.

### Database connection fails at runtime
→ Verify `POSTGRES_PRISMA_URL` and `NEXT_PUBLIC_SUPABASE_URL` are correct and the database is accessible from Vercel's network.

### Emails not sending
→ Set `RESEND_API_KEY`. The email service falls back to mock mode if it is not configured.
