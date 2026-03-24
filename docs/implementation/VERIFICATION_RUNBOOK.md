# AutoLenis — Verification Runbook

> Exact commands for linting, typechecking, unit tests, E2E tests, database operations, and deployment verification.

---

## Prerequisites

```bash
# Ensure you are in the project root
cd /path/to/VercelAutoLenis

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Fill in required values: DATABASE_URL, JWT_SECRET, STRIPE keys, RESEND_API_KEY, etc.
```

---

## 1. Code Quality

### Lint

```bash
pnpm lint
```

**Expected:** 0 errors (1 warning in `components/layout/public-nav.tsx` is non-blocking).

### Typecheck

```bash
pnpm typecheck
```

**Expected:** 0 errors when all test files are clean. Currently 2 pre-existing type errors in test files — see [Implementation Status Report](./IMPLEMENTATION_STATUS_REPORT.md) for details.

### Check Unused Imports

```bash
pnpm check:unused
```

### Check Placeholders

```bash
pnpm check:placeholders
```

---

## 2. Unit Tests (Vitest)

### Run All Unit Tests

```bash
pnpm test:unit
```

**Expected:** 1,174+ tests passing. 2 pre-existing failures in `email-service.test.ts`.

### Run Specific Test File

```bash
pnpm test:unit -- <pattern>
```

Examples:

```bash
# Authentication
pnpm test:unit -- auth
pnpm test:unit -- admin-auth
pnpm test:unit -- signin-resilience
pnpm test:unit -- email-verification
pnpm test:unit -- resend-verification

# Buyer / Deal
pnpm test:unit -- deal-context
pnpm test:unit -- deal-status
pnpm test:unit -- sourcing
pnpm test:unit -- downstream-sourced-deals

# Dealer
pnpm test:unit -- admin-dealer
pnpm test:unit -- api-admin-dealers-auth

# Admin
pnpm test:unit -- admin-auth
pnpm test:unit -- admin-buyer-detail
pnpm test:unit -- admin-create-user-audit
pnpm test:unit -- admin-payments
pnpm test:unit -- admin-notifications
pnpm test:unit -- admin-auction-detail

# Affiliate
pnpm test:unit -- affiliate-dashboard
pnpm test:unit -- affiliate-detail
pnpm test:unit -- affiliate-payments
pnpm test:unit -- affiliate-referrals
pnpm test:unit -- affiliate-share

# AI
pnpm test:unit -- ai-orchestrator
pnpm test:unit -- ai-gemini
pnpm test:unit -- context-loader
pnpm test:unit -- knowledge-retrieval
pnpm test:unit -- system-agent

# Payments / Finance
pnpm test:unit -- financial-reporting

# Insurance
pnpm test:unit -- insurance

# External Preapproval
pnpm test:unit -- external-preapproval

# Infrastructure
pnpm test:unit -- middleware
pnpm test:unit -- workspace
pnpm test:unit -- mock-mode
pnpm test:unit -- production-readiness
pnpm test:unit -- nav-config
pnpm test:unit -- seo
```

### Run with Coverage

```bash
pnpm test:coverage
```

### Run with UI

```bash
pnpm test:ui
```

---

## 3. End-to-End Tests (Playwright)

### Run All E2E Tests

```bash
pnpm test:e2e
```

**Note:** Requires a running dev server (`pnpm dev`) or the Playwright config to handle server startup.

### Run Specific E2E Test

```bash
pnpm test:e2e -- <pattern>
```

Examples:

```bash
# Auth
pnpm test:e2e -- auth

# Buyer flows
pnpm test:e2e -- buyer-smoke
pnpm test:e2e -- buyer-documents

# Dealer flows
pnpm test:e2e -- dealer-smoke
pnpm test:e2e -- api-dealers

# Admin flows
pnpm test:e2e -- admin-smoke
pnpm test:e2e -- admin-buyer-detail
pnpm test:e2e -- admin-payments-pages

# Affiliate flows
pnpm test:e2e -- affiliate-portal
pnpm test:e2e -- affiliate-payments
pnpm test:e2e -- affiliate-detail

# Sourcing
pnpm test:e2e -- sourcing

# Financial reporting
pnpm test:e2e -- financial-reporting

# Audit
pnpm test:e2e -- audit-validation

# Link integrity
pnpm test:links

# Mobile responsiveness
pnpm test:e2e -- mobile-responsive

# Header navigation
pnpm test:e2e -- header-navigation
```

### Run E2E with UI

```bash
pnpm test:e2e:ui
```

---

## 4. Database Operations

### Generate Prisma Client

```bash
npx prisma generate
```

### Push Schema to Database (Development)

```bash
pnpm db:push
```

### Run Migrations (Production)

```bash
pnpm db:migrate
```

### Setup Database (Initial)

```bash
pnpm db:setup
```

### Seed Database

```bash
# Via API (requires running server)
curl -X POST http://localhost:3000/api/test/seed \
  -H "Content-Type: application/json"
```

### Open Prisma Studio

```bash
pnpm db:studio
```

### Validate Schema

```bash
npx prisma validate
```

---

## 5. Build Verification

### Full Production Build

```bash
pnpm build
```

This runs `prisma generate` then `next build`.

### Bundle Analysis

```bash
pnpm analyze
```

---

## 6. Development Server

### Start Development Server

```bash
pnpm dev
```

Default: `http://localhost:3000`

### Start Production Server

```bash
pnpm build && pnpm start
```

---

## 7. System-Specific Verification

### 7.1 Authentication

```bash
# Unit tests
pnpm test:unit -- auth
pnpm test:unit -- admin-auth
pnpm test:unit -- middleware
pnpm test:unit -- workspace

# E2E
pnpm test:e2e -- auth
```

### 7.2 Payment System (Stripe)

```bash
# Unit tests
pnpm test:unit -- admin-payments
pnpm test:unit -- financial-reporting

# E2E
pnpm test:e2e -- admin-payments-pages
pnpm test:e2e -- financial-reporting

# Stripe webhook testing (local)
# Install Stripe CLI, then:
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### 7.3 Affiliate Engine

```bash
# Unit tests
pnpm test:unit -- affiliate-dashboard
pnpm test:unit -- affiliate-payments
pnpm test:unit -- affiliate-referrals
pnpm test:unit -- affiliate-share

# E2E
pnpm test:e2e -- affiliate-portal
pnpm test:e2e -- affiliate-payments
```

### 7.4 Contract Shield

```bash
# Unit tests (gating)
pnpm test:unit -- deal-status

# Verify cron job
curl -X POST http://localhost:3000/api/cron/contract-shield-reconciliation \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"job": "SYNC_STATUSES"}'
```

### 7.5 Vehicle Sourcing

```bash
# Unit tests
pnpm test:unit -- sourcing
pnpm test:unit -- downstream-sourced-deals

# E2E
pnpm test:e2e -- sourcing
```

### 7.6 Insurance

```bash
pnpm test:unit -- insurance
```

### 7.7 AI Assistant

```bash
pnpm test:unit -- ai-orchestrator
pnpm test:unit -- ai-gemini
pnpm test:unit -- context-loader
pnpm test:unit -- knowledge-retrieval
pnpm test:unit -- system-agent
```

---

## 8. Health Checks

### Application Health

```bash
curl http://localhost:3000/api/health
```

### Database Health

```bash
curl http://localhost:3000/api/health/db
```

### Admin Health

```bash
curl http://localhost:3000/api/admin/health \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Auth Diagnostics

```bash
curl http://localhost:3000/api/auth/diagnostics
```

---

## 9. Cron Jobs

### Contract Shield Reconciliation

```bash
curl -X POST http://localhost:3000/api/cron/contract-shield-reconciliation \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"job": "SYNC_STATUSES"}'

curl -X POST http://localhost:3000/api/cron/contract-shield-reconciliation \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"job": "CHECK_STALE_SCANS"}'

curl -X POST http://localhost:3000/api/cron/contract-shield-reconciliation \
  -H "x-cron-secret: $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"job": "NOTIFY_PENDING"}'
```

### Affiliate Reconciliation

```bash
curl -X POST http://localhost:3000/api/cron/affiliate-reconciliation \
  -H "x-cron-secret: $CRON_SECRET"
```

### Close Expired Auctions

```bash
curl -X POST http://localhost:3000/api/auction/close-expired \
  -H "x-cron-secret: $CRON_SECRET"
```

---

## 10. Full CI Pipeline (Recommended Order)

```bash
# 1. Install dependencies
pnpm install

# 2. Generate Prisma client
npx prisma generate

# 3. Lint
pnpm lint

# 4. Typecheck
pnpm typecheck

# 5. Unit tests
pnpm test:unit

# 6. Build
pnpm build

# 7. E2E tests (requires server or Playwright webServer config)
pnpm test:e2e

# 8. Link integrity
pnpm test:links
```
