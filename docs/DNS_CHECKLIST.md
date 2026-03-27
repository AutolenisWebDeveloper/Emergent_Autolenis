# DNS & Staging Deployment Checklist

## Overview

AutoLenis supports two staging/preview strategies:

1. **Custom domain**: `staging.autolenis.com` — requires DNS CNAME configuration
2. **Vercel preview URLs**: Auto-generated per deployment (e.g. `auto-lenis-<hash>.vercel.app`) — works immediately

If `staging.autolenis.com` is not yet configured in DNS, **use Vercel preview URLs** for UAT.

## Vercel Preview URL (Recommended Fallback)

Every Vercel deployment gets a unique preview URL that is immediately reachable.
Find it in the Vercel dashboard under **Deployments** or in the GitHub PR deployment status.

```bash
# Run UAT against a Vercel preview deployment
SMOKE_BASE_URL=https://auto-lenis-<hash>.vercel.app pnpm test:e2e e2e/buyer-package-uat.spec.ts --project=chromium

# Run staging smoke test
SMOKE_BASE_URL=https://auto-lenis-<hash>.vercel.app pnpm test:e2e e2e/staging-smoke.spec.ts --project=chromium
```

No DNS configuration required — Vercel preview URLs resolve immediately.

## Custom Domain: staging.autolenis.com

### Problem

`admin.autolenis.com` and `staging.autolenis.com` return **NXDOMAIN** in the browser. This is a DNS-side issue — **code cannot fix this**. Each domain must be configured at the DNS provider and in the Vercel dashboard.

## Temporary Access (No Subdomain)

If the admin subdomain is not ready yet, keep admin access on the main domain:

- Leave `ADMIN_SUBDOMAIN_ENABLED` unset (or set to `false`) in the environment.
- Visit the admin dashboard at `https://autolenis.com/admin`.

Once DNS is configured, set `ADMIN_SUBDOMAIN_ENABLED=true` to redirect `/admin` to `admin.autolenis.com`.

## Required DNS Configuration

### For `admin.autolenis.com`

| Record Type | Name    | Value                    |
|-------------|---------|--------------------------|
| CNAME       | `admin` | `cname.vercel-dns.com.`  |

### For `staging.autolenis.com` ✅ DNS Configured

| Record Type | Name      | Value                                    | Status |
|-------------|-----------|------------------------------------------|--------|
| CNAME       | `staging` | `90ee6f36f7268215.vercel-dns-016.com.`   | ✅ Live |

> **Note**: Vercel assigns a project-specific DNS target (e.g. `90ee6f36f7268215.vercel-dns-016.com`) when you add a domain in the Vercel dashboard. This is the correct CNAME value — not the generic `cname.vercel-dns.com`.

**For both subdomains:**

- Use the CNAME target provided by Vercel when adding the domain in **Project Settings → Domains**.
- Ensure no conflicting A or CNAME records exist for the subdomain.
- If using **Cloudflare**: set the proxy status to **"DNS only"** (grey cloud) while validating, then enable proxy after verification if desired.

### Vercel Dashboard

1. Go to **Project Settings → Domains** in the Vercel dashboard.
2. Add `admin.autolenis.com` as a domain.
3. Add `staging.autolenis.com` as a domain.
4. Vercel will provide the required DNS records — verify they match the CNAMEs above.
5. Wait for Vercel to confirm each domain is verified and SSL is provisioned.
6. For `staging.autolenis.com`, assign it to the **Preview** environment so it always reflects the latest preview deployment.

### Staging Environment Variables (Vercel)

Set these in Vercel → Project Settings → Environment Variables for the **Preview** environment:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://staging.autolenis.com` |
| `NEXTAUTH_URL` | `https://staging.autolenis.com` |
| All other required vars | Same as production, pointing to staging Supabase / Stripe test-mode keys |

## Staging UAT (Buyer Package)

Once `staging.autolenis.com` is DNS-reachable (or using a Vercel preview URL), run the UAT:

```bash
# Against staging.autolenis.com (once DNS is configured)
SMOKE_BASE_URL=https://staging.autolenis.com pnpm test:e2e e2e/buyer-package-uat.spec.ts --project=chromium

# Against any Vercel preview URL (works immediately)
SMOKE_BASE_URL=https://auto-lenis-<hash>.vercel.app pnpm test:e2e e2e/buyer-package-uat.spec.ts --project=chromium
```

### Quick Smoke Test

Run the lightweight staging smoke test before the full buyer package UAT:

```bash
SMOKE_BASE_URL=https://auto-lenis-<hash>.vercel.app pnpm test:e2e e2e/staging-smoke.spec.ts --project=chromium
```

This verifies deployment health, page rendering, and API error contracts without exercising the full buyer package flows.

### CI: Manual Staging UAT

Trigger the staging UAT from GitHub Actions:

1. Go to **Actions → Production Readiness Gate → Run workflow**
2. Set `run_staging_uat` to `true`
3. Set `staging_url` to the target URL (staging domain or Vercel preview URL)

The CI job includes DNS pre-check and deployment health verification with retry logic.

### Which URL to Use

| Scenario | URL to use |
|----------|-----------|
| DNS configured ✅ | `https://staging.autolenis.com` |
| DNS not configured (NXDOMAIN) | Vercel preview URL from PR deployment |
| Local development | `http://localhost:3000` (default, no SMOKE_BASE_URL needed) |

## Verification Commands

```bash
# Check DNS resolution — admin
nslookup admin.autolenis.com
dig admin.autolenis.com CNAME

# Check DNS resolution — staging
nslookup staging.autolenis.com
dig staging.autolenis.com CNAME

# Test HTTP response (after DNS propagates)
curl -I https://admin.autolenis.com
curl -I https://staging.autolenis.com

# Run buyer package staging UAT
SMOKE_BASE_URL=https://staging.autolenis.com pnpm test:e2e e2e/buyer-package-uat.spec.ts --project=chromium
```

## Troubleshooting

- **NXDOMAIN**: The DNS record does not exist. Add the CNAME record above.
- **SERVFAIL**: DNS server issue. Wait and retry, or check DNS provider status.
- **SSL errors after DNS is set**: Wait for Vercel to provision the SSL certificate (can take up to 24 hours, usually minutes).
- **DNS propagation**: Changes can take up to 48 hours to propagate globally, though typically 5–30 minutes.
- **All UAT tests skipped**: DNS lookup for the target hostname failed. Either DNS is not configured, or the CI runner cannot resolve external hostnames (sandboxed network). Run from a machine with real network access.

## Important Note

> NXDOMAIN is DNS-side; code cannot fix this. The middleware and routing logic in this repository are correct — the domain simply needs to be pointed to Vercel's servers via DNS.
