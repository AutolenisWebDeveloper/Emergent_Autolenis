# Executive Summary — AutoLenis Platform Audit

> Generated: 2026-02-19 | Full-stack validation audit.

---

## Project Overview

| Attribute | Value |
|-----------|-------|
| **Framework** | Next.js 16.0.10 (App Router) |
| **React** | 19.2.0 (Server + Client Components) |
| **Runtime** | Node.js 22.x |
| **Package manager** | pnpm 10.28.0 |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS 4.1.9 + Radix UI (30+ components) |
| **Database** | PostgreSQL via Supabase |
| **ORM / Query** | Prisma (schema only) + Supabase JS Client (runtime) |
| **Auth** | Custom JWT + NextAuth + Supabase Auth + WebAuthn (passkeys) + MFA (TOTP) |
| **Payments** | Stripe (checkout, intents, webhooks) |
| **Email** | Resend |
| **AI** | Google Generative AI (Gemini) |
| **File storage** | Supabase Storage |
| **E-signatures** | External e-sign provider (webhook integration) |
| **Testing** | Vitest (993 unit tests) + Playwright (14 E2E test files) |
| **Linting** | ESLint (0 errors, 3 warnings) |
| **Type safety** | TypeScript strict mode (0 errors) |

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Next.js App Router (SSR + CSR)                 │
│  ├── Public marketing pages (19 routes)         │
│  ├── Buyer portal (43 routes)                   │
│  ├── Dealer portal (32 routes)                  │
│  ├── Affiliate portal (27 routes)               │
│  ├── Admin dashboard (76+ routes)               │
│  └── Test workspace (5 routes)                  │
├─────────────────────────────────────────────────┤
│                   BACKEND                        │
│  Next.js API Routes (~254 endpoint files)       │
│  ├── Auth (JWT, MFA, NextAuth)                  │
│  ├── Buyer/Dealer/Affiliate/Admin CRUD          │
│  ├── Payment (Stripe integration)               │
│  ├── Webhooks (Stripe, e-sign)                  │
│  ├── Cron jobs (background processing)          │
│  └── AI chat (Gemini orchestration)             │
├─────────────────────────────────────────────────┤
│                   DATA LAYER                     │
│  Supabase (PostgreSQL + Auth + Storage)         │
│  ├── ~45 tables with RLS policies               │
│  ├── Workspace isolation (multi-tenant)         │
│  ├── File storage (documents, affiliate docs)   │
│  └── 70+ SQL migrations                        │
├─────────────────────────────────────────────────┤
│              EXTERNAL SERVICES                   │
│  Stripe · Resend · Google Gemini · QR Server    │
│  OpenRoad Lending · E-sign Provider             │
└─────────────────────────────────────────────────┘
```

---

## Top 10 Critical Risks (Ranked)

### 1. 🔴 Placeholder Supabase client on config failure

- **Why it matters:** If env vars are missing, the app silently creates a non-functional DB client with placeholder credentials instead of failing fast. All data operations will silently fail.
- **Where:** `lib/db.ts`, lines ~21 and ~38

### 2. 🔴 ~100+ fetch calls without error handling

- **Why it matters:** Network failures, API errors, or malformed responses cause unhandled promise rejections. UI pages may crash or show blank content.
- **Where:** `app/buyer/search/page.tsx`, `app/dealer/leads/page.tsx`, `app/admin/seo/pages/page.tsx`, and 50+ other page components

### 3. 🔴 Admin signup link publicly exposed in footer

- **Why it matters:** The public footer links to `/admin/sign-in` and `/admin/signup`, visible to all visitors. Combined with any weakness in the bootstrap secret flow, this is an access control risk.
- **Where:** `components/layout/public-footer.tsx`, lines ~120–128

### 4. 🔴 ~30 empty catch blocks swallowing errors

- **Why it matters:** Failed operations (emails, DB writes, auth checks) are invisible to monitoring and alerting. Production incidents will have no trace in logs.
- **Where:** `components/ai/admin-ai-panel.tsx`, `proxy.ts`, `lib/ai/persistence.ts`, `lib/email/triggers.ts`, `lib/services/email.service.tsx`

### 5. 🔴 Missing input validation on public API endpoints

- **Why it matters:** The dealer registration endpoint (`/api/dealer/register`) accepts raw JSON with no schema validation. Malformed input → 500 errors or unexpected state. Potential DoS vector.
- **Where:** `app/api/dealer/register/route.ts`, line ~13

### 6. ⚠️ Service-role client bypasses all RLS

- **Why it matters:** Most API routes use the admin/service-role Supabase client, which bypasses Row Level Security. If any API route has an auth check bug, there is no defense-in-depth at the DB layer.
- **Where:** `lib/supabase/admin.ts` (used by ~80% of API routes)

### 7. ⚠️ Prisma schema vs runtime query divergence

- **Why it matters:** Prisma schema defines DDL but the app queries Supabase directly (not Prisma Client). Tables like `contact_messages` and `_connection_canary` exist in migrations but not in Prisma schema. Schema drift risk.
- **Where:** `prisma/schema.prisma` vs `migrations/96-schema-alignment-fixes.sql`

### 8. ⚠️ AI per-user disable is a stub

- **Why it matters:** The `isAiDisabledForUser()` function always returns `false`. The admin cannot disable AI for specific users — a compliance/safety feature gap.
- **Where:** `lib/ai/gemini-client.ts`, line ~167

### 9. ⚠️ Hardcoded external service URLs

- **Why it matters:** Production URLs for QR code generation, e-sign service, and partner lending are hardcoded with no fallback. If any external service changes URLs, the app breaks.
- **Where:** `lib/admin-auth.ts:192`, `lib/services/esign.service.ts`, `app/api/refinance/check-eligibility/route.ts`

### 10. ⚠️ Admin signup link publicly exposed in footer

- **Why it matters:** `/admin/sign-in` and `/admin/signup` links are visible to all visitors in the public footer, inviting unauthorized probing.
- **Where:** `components/layout/public-footer.tsx`, lines ~120–128

---

## Build & Test Health

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | ✅ 0 errors |
| ESLint | ✅ 0 errors, 3 warnings |
| Unit tests (Vitest) | ✅ 993/993 pass |
| Production build (`next build`) | ✅ Pass |
| E2E tests (Playwright) | ✅ 14 test files |

---

## Audit Export Files

| File | Contents |
|------|----------|
| `EXEC_SUMMARY.md` | This file — project overview and top 10 risks |
| `ROUTE_MAP.md` | Full route inventory (~209 routes) |
| `API_MAP.md` | Full API inventory (~254 endpoint files) |
| `NAV_LINK_CHECK.md` | 101 nav items checked, 0 broken links |
| `SUPABASE_INTEGRATION.md` | Supabase usage map, auth flows, 45 tables, RLS |
| `DATA_MODEL.md` | Prisma schema, 20+ enums, relationships, migrations |
| `ERROR_LOG.md` | Lint/test output, 10 critical/high risks, TODOs |
| `REPRO_STEPS.md` | 6 reproducible issues with steps |
| `FEATURE_MATRIX.md` | 187 features verified across all roles |
| `RLS_VERIFICATION.md` | 30+ tables with RLS, workspace isolation verified |
| `UI_QA_REPORT.md` | 209+ routes verified, 0 broken nav links |
