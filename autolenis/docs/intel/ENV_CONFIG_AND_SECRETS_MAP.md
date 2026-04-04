# ENV_CONFIG_AND_SECRETS_MAP.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis
> Source: `.env.example`, code references via grep

## Environment Variables

### App Configuration

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Public | `http://localhost:3000` | Entire app, email links, SEO | Base application URL |
| `NEXT_PUBLIC_APP_VERSION` | No | Public | `0.1.0` | UI display | App version string |
| `NEXT_PUBLIC_ENV_BADGE` | No | Public | `development` | UI display | Environment badge (dev/staging/prod) |
| `ADMIN_SUBDOMAIN_ENABLED` | No | Config | `false` | `proxy.ts` | Enable admin subdomain routing |

### Authentication (JWT)

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `JWT_SECRET` | **Yes** | **Secret** | — | `lib/auth.ts`, `lib/auth-edge.ts` | HMAC-SHA256 signing key for JWT tokens. Generate with `openssl rand -base64 32` |
| `ADMIN_BOOTSTRAP_SECRET` | No | **Secret** | — | `app/api/admin/auth/signup` | One-time secret for first admin account creation. Remove after use. |

### NextAuth

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `NEXTAUTH_URL` | Conditional | Config | `http://localhost:3000` | `app/api/auth/[...nextauth]` | NextAuth base URL |
| `NEXTAUTH_SECRET` | Conditional | **Secret** | — | NextAuth internals | NextAuth signing secret |

### Supabase

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Public | — | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Public | — | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | **Secret** | — | `lib/supabase/admin.ts` | Supabase service role key (bypasses RLS) |
| `SUPABASE_URL` | **Yes** | Config | — | `lib/supabase/admin.ts` | Supabase URL (server-side) |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | No | Config | `http://localhost:3000/auth/callback` | Dev auth redirects | Development redirect URL |

### Database

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `POSTGRES_PRISMA_URL` | **Yes** | **Secret** | — | `prisma/schema.prisma`, `lib/prisma.ts` | PostgreSQL connection string (from Supabase) |

### Stripe

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `STRIPE_SECRET_KEY` | **Yes** | **Secret** | — | `lib/stripe.ts` | Stripe secret API key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **Yes** | Public | — | Client-side Stripe.js | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | **Yes** | **Secret** | — | `lib/stripe.ts:constructWebhookEvent()` | Stripe webhook signing secret |

### Email (Resend)

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `RESEND_API_KEY` | **Yes** | **Secret** | — | `lib/resend.ts`, `lib/services/email.service.tsx` | Resend API key |
| `FROM_EMAIL` | No | Config | `noreply@autolenis.com` | Email service | Sender email address |
| `FROM_NAME` | No | Config | `AutoLenis` | Email service | Sender display name |
| `ADMIN_NOTIFICATION_EMAIL` | No | Config | `info@autolenis.com` | Admin notifications | Admin notification recipient |
| `DEV_EMAIL_TO` | No | Config | — | Email service | Overrides ALL recipients in non-prod. Prevents real users from receiving dev emails. |

### Cron / Webhooks

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `CRON_SECRET` | **Yes** | **Secret** | — | `lib/middleware/cron-security.ts` | Bearer token for cron endpoint auth |
| `ESIGN_WEBHOOK_SECRET` | **Yes** | **Secret** | — | `app/api/esign/webhook`, `app/api/esign/provider-webhook` | E-sign webhook verification secret |
| `INTERNAL_API_KEY` | No | **Secret** | — | Internal API calls | Internal service-to-service auth |

### Monitoring

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | No | Public | — | `lib/monitoring/sentry.ts` | Sentry error tracking DSN |

### Third-Party Integrations

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `OPENROAD_PARTNER_ID` | No | Config | — | Refinance module | OpenRoad partner integration ID |

### AI / Gemini

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `GEMINI_API_KEY` | Conditional | **Secret** | — | `lib/ai/gemini-client.ts`, `lib/ai/providers/gemini.ts` | Google Gemini API key |
| `AI_ACTIONS_DISABLED` | No | Config | `false` | AI orchestrator | Kill switch for AI features |

### Runtime / Vercel

| Variable | Required | Sensitivity | Default | Modules | Description |
|----------|---------|------------|---------|---------|-------------|
| `NODE_ENV` | Auto | Config | — | Multiple (production checks) | Node.js environment |
| `VERCEL_ENV` | Auto | Config | — | `lib/middleware/rate-limit.ts` | Vercel environment (production/preview) |

## Security Classification Summary

### Secrets (must never be logged or exposed)
1. `JWT_SECRET`
2. `ADMIN_BOOTSTRAP_SECRET`
3. `NEXTAUTH_SECRET`
4. `SUPABASE_SERVICE_ROLE_KEY`
5. `POSTGRES_PRISMA_URL`
6. `STRIPE_SECRET_KEY`
7. `STRIPE_WEBHOOK_SECRET`
8. `RESEND_API_KEY`
9. `CRON_SECRET`
10. `ESIGN_WEBHOOK_SECRET`
11. `INTERNAL_API_KEY`
12. `GEMINI_API_KEY`

### Public (safe to expose to browser)
1. `NEXT_PUBLIC_APP_URL`
2. `NEXT_PUBLIC_APP_VERSION`
3. `NEXT_PUBLIC_ENV_BADGE`
4. `NEXT_PUBLIC_SUPABASE_URL`
5. `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
7. `NEXT_PUBLIC_SENTRY_DSN`
8. `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL`

### Configuration (not secret but environment-specific)
1. `ADMIN_SUBDOMAIN_ENABLED`
2. `NEXTAUTH_URL`
3. `SUPABASE_URL`
4. `FROM_EMAIL`, `FROM_NAME`
5. `ADMIN_NOTIFICATION_EMAIL`
6. `DEV_EMAIL_TO`
7. `OPENROAD_PARTNER_ID`
8. `AI_ACTIONS_DISABLED`

## Runtime Environment Implications

| Environment | Key Differences |
|-------------|----------------|
| **Development** | `DEV_EMAIL_TO` active (redirects all emails); rate limits relaxed (50/min signin); `NODE_ENV=development`; mock mode available |
| **Preview/Staging** | `VERCEL_ENV=preview`; relaxed signin rate limits; `DEV_EMAIL_TO` recommended; CI build safety checks run |
| **Production** | `VERCEL_ENV=production`; strict rate limits; `ADMIN_SUBDOMAIN_ENABLED` may be `true`; Cron IP validation active; `DEV_EMAIL_TO` should NOT be set |

## Module Dependencies on Env Vars

| Module | Required Env Vars |
|--------|------------------|
| Auth system | `JWT_SECRET` |
| Admin auth | `JWT_SECRET`, optionally `ADMIN_BOOTSTRAP_SECRET` |
| Database access | `POSTGRES_PRISMA_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Payment processing | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| Email delivery | `RESEND_API_KEY` |
| Cron jobs | `CRON_SECRET` |
| E-sign webhooks | `ESIGN_WEBHOOK_SECRET` |
| AI features | `GEMINI_API_KEY` |
| Monitoring | `NEXT_PUBLIC_SENTRY_DSN` (optional) |
| Refinance | `OPENROAD_PARTNER_ID` (optional) |
