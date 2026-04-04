# Supabase Environment Matrix — AutoLenis Platform

## Overview

This document defines the **environment separation, secrets management, and workspace mode isolation** requirements for all Supabase-related configuration across the AutoLenis platform. All environments must maintain strict isolation as specified in `SUPABASE_MASTER_SPEC.md`.

---

## 1. Environments

| Environment | Purpose | Supabase Project | Workspace Mode |
|---|---|---|---|
| **Local** | Developer workstation | Local Supabase CLI instance | `TEST` |
| **Preview** | PR preview deployments (Vercel) | Shared staging project | `TEST` |
| **Staging** | Pre-production validation | Dedicated staging project | `TEST` |
| **Production** | Live platform | Dedicated production project | `LIVE` + `TEST` |

### Key Rules

- Each environment must use its own Supabase project (or local instance)
- Preview and staging may share a Supabase project but must use distinct workspaces
- Production must have both `LIVE` and `TEST` workspaces bootstrapped
- No environment may access another environment's Supabase project

---

## 2. Environment Variables

### 2.1 Client-Safe Variables (Browser-Accessible)

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | All environments | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All environments | Supabase anonymous/public key |

**Rules:**
- These are the **only** Supabase variables that may appear in client-side bundles
- Values must differ per environment
- Anon key grants only RLS-gated access

### 2.2 Backend-Only Variables (Server-Side Only)

| Variable | Scope | Description |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only | Service-role key for admin operations |
| `SUPABASE_DB_URL` | Backend only | Direct Postgres connection string |
| `SUPABASE_JWT_SECRET` | Backend only | JWT verification secret |

**Rules:**
- Must **never** appear in browser bundles or client-side code
- Must **never** be committed to source control
- Must be stored in Vercel environment variables or equivalent secrets manager
- Service-role key grants full bypass of RLS — backend use only

### 2.3 Provider Secrets (Backend-Only)

| Variable | Provider | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signature verification |
| `RESEND_API_KEY` | Resend | Email delivery |
| `MICROBILT_API_KEY` | MicroBilt | Credit prequalification |
| `MICROBILT_API_SECRET` | MicroBilt | Credit prequalification |
| `DOCUSIGN_INTEGRATION_KEY` | DocuSign | E-signature |
| `DOCUSIGN_SECRET_KEY` | DocuSign | E-signature |
| `CRON_SECRET` | Internal | Cron job authentication |
| `APP_URL` | Internal | Application base URL |
| `WEBHOOK_SECRET` | Internal | Generic webhook verification |

**Rules:**
- All provider secrets are backend-only
- Must be rotated on schedule per provider requirements
- Must use distinct values per environment
- No provider secret may be shared across production and non-production

---

## 3. Environment Configuration Matrix

| Variable | Local | Preview | Staging | Production |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `http://localhost:54321` | Staging project URL | Staging project URL | Production project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local anon key | Staging anon key | Staging anon key | Production anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Local service key | Staging service key | Staging service key | Production service key |
| `SUPABASE_DB_URL` | `postgresql://...localhost:54322/...` | Staging DB URL | Staging DB URL | Production DB URL |
| `STRIPE_SECRET_KEY` | Test key (`sk_test_...`) | Test key | Test key | Live key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Local webhook secret | Staging secret | Staging secret | Production secret |
| `RESEND_API_KEY` | Test key | Test key | Test key | Production key |
| `MICROBILT_API_KEY` | Sandbox key | Sandbox key | Sandbox key | Production key |
| `APP_URL` | `http://localhost:3000` | PR preview URL | `https://staging.autolenis.com` | `https://autolenis.com` |
| Workspace Mode | `TEST` only | `TEST` only | `TEST` only | `LIVE` + `TEST` |

---

## 4. Workspace Mode Isolation

### 4.1 Mode Definitions

| Mode | Purpose | Data Scope |
|---|---|---|
| `LIVE` | Real transactions, real users | Production data |
| `TEST` | Development, QA, demo | Test/sandbox data |

### 4.2 Isolation Rules

- `LIVE` workspace data must **never** be accessible from `TEST` workspace queries
- `TEST` workspace data must **never** be accessible from `LIVE` workspace queries
- RLS policies must enforce `workspace_mode` alignment with the active session
- Stripe test-mode keys must be used for `TEST` workspaces; live keys for `LIVE` workspaces
- Email delivery in `TEST` mode should use Resend sandbox or suppressed delivery
- Credit bureau calls in `TEST` mode must use sandbox/test endpoints

### 4.3 Workspace Bootstrapping

Each environment must have workspace records pre-seeded:

```sql
-- Production environment: LIVE workspace
INSERT INTO "Workspace" (id, name, slug, mode, status)
VALUES (
  gen_random_uuid(),
  'AutoLenis Production',
  'autolenis-production',
  'LIVE',
  'ACTIVE'
);

-- Production environment: TEST workspace
INSERT INTO "Workspace" (id, name, slug, mode, status)
VALUES (
  gen_random_uuid(),
  'AutoLenis Test',
  'autolenis-test',
  'TEST',
  'ACTIVE'
);
```

---

## 5. Secrets Management Rules

### 5.1 Storage

| Approach | Environment |
|---|---|
| `.env.local` (git-ignored) | Local development |
| Vercel environment variables | Preview, Staging, Production |
| GitHub Actions secrets | CI/CD pipelines |

### 5.2 Rotation Schedule

| Secret Category | Rotation Frequency |
|---|---|
| Supabase service-role key | On suspected compromise |
| Supabase JWT secret | On suspected compromise |
| Stripe keys | Annual or on compromise |
| Resend API key | Annual or on compromise |
| MicroBilt credentials | Per provider requirements |
| E-sign provider secrets | Annual or on compromise |
| Cron/webhook secrets | Semi-annual |

### 5.3 Access Controls

- Only DevOps and authorized engineers may access production secrets
- Secrets must be audited quarterly for unused or stale entries
- Secret access must be logged where the secrets manager supports it
- Emergency rotation procedures must be documented and tested

---

## 6. CI/CD Environment Separation

### 6.1 GitHub Actions

| Secret | Used In | Scope |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Migration, RLS tests | Per environment |
| `STRIPE_SECRET_KEY` | Payment tests | Test key only |
| `DATABASE_URL` | Prisma operations | Per environment |

### 6.2 Deployment Pipeline

```
PR Merge → Preview (TEST workspace)
         → Staging (TEST workspace, full validation)
         → Production (LIVE + TEST workspaces)
```

Each stage must:

1. Apply Prisma migrations
2. Apply RLS policy migrations
3. Run environment-specific seed scripts
4. Validate workspace bootstrapping
5. Run integration tests against the target environment

---

## 7. Verification Checklist

- [ ] Each environment has its own Supabase project (or local CLI)
- [ ] `NEXT_PUBLIC_*` variables are the only Supabase values in client bundles
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is never in browser-accessible code
- [ ] Provider secrets are backend-only across all environments
- [ ] Stripe test keys are used for non-production; live keys for production
- [ ] `LIVE` and `TEST` workspace modes are isolated
- [ ] Workspace records are pre-seeded in each environment
- [ ] Secrets are stored in Vercel environment variables (not source control)
- [ ] Secret rotation schedule is documented and followed
- [ ] CI/CD pipelines use environment-specific secrets
- [ ] No secrets are shared between production and non-production
- [ ] `.env.local` is in `.gitignore`
