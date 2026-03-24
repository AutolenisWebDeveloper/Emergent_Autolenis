# TESTING_AND_CI.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## Unit Tests (Vitest)

**Config:** `vitest.config.ts`, `vitest.setup.ts`
**Location:** `__tests__/`
**Total files:** 44

| Test File | What It Validates |
|-----------|------------------|
| `admin-auth.test.ts` | Admin authentication flow, MFA, session management |
| `admin-auction-detail.test.ts` | Admin auction detail page rendering |
| `admin-buyer-detail.test.ts` | Admin buyer detail page rendering |
| `admin-create-user-audit.test.ts` | Admin user creation + audit log generation |
| `admin-dealer-detail.test.ts` | Admin dealer detail page rendering |
| `admin-dealers-affiliates.test.ts` | Admin dealers and affiliates management |
| `admin-layout.test.ts` | Admin layout component rendering |
| `admin-list-shell.test.ts` | Admin list page shell component |
| `admin-notifications.test.ts` | Admin notification system |
| `admin-payments-pages.test.ts` | Admin payment pages rendering |
| `admin-search-signup-refinance.test.ts` | Admin search, signup, and refinance flows |
| `affiliate-dashboard-audit.test.ts` | Affiliate dashboard data integrity |
| `affiliate-detail.test.ts` | Affiliate detail page |
| `affiliate-payments.test.ts` | Affiliate payment processing |
| `affiliate-referrals-visibility.test.ts` | Affiliate referral data isolation (affiliates only see own referrals) |
| `affiliate-share-link.test.ts` | Affiliate share link email functionality |
| `ai-gemini-security.test.ts` | AI Gemini integration security (input sanitization, PII detection) |
| `ai-orchestrator.test.ts` | AI orchestrator routing and agent selection |
| `api-admin-dealers-auth.test.ts` | Admin dealer API authentication enforcement |
| `auth.test.ts` | Core authentication (JWT creation, verification, role-based redirects) |
| `calculator-parity.test.ts` | Calculator consistency (affordability calculations match expectations) |
| `deal-status.test.ts` | Deal status transitions and state machine |
| `documents.test.ts` | Document CRUD operations |
| `email-service.test.ts` | Email service (Resend integration, template rendering) |
| `email-verification.test.ts` | Email verification token flow |
| `financial-reporting.test.ts` | Financial reporting data aggregation |
| `income-calculator.test.ts` | Affiliate income calculator |
| `insurance.test.ts` | Insurance service (quote, select, bind, external proof) |
| `knowledge-retrieval.test.ts` | AI knowledge base retrieval |
| `lenis-concierge-prompt.test.ts` | AI concierge prompt templates |
| `link-checker.test.ts` | Internal link validity |
| `middleware.test.ts` | Middleware (proxy.ts) role enforcement, public routes, redirects |
| `mobile-responsive.test.tsx` | Mobile responsive rendering |
| `mock-mode.test.ts` | Mock/test mode behavior |
| `production-readiness.test.ts` | Production readiness checks (env vars, security, etc.) |
| `quick-prompts.test.ts` | AI quick prompt functionality |
| `resend-verification.test.ts` | Resend email verification |
| `rls-visibility.test.ts` | Row-level security visibility checks |
| `seo.test.ts` | SEO metadata and schema generation |
| `signin-resilience.test.ts` | Sign-in resilience (error handling, edge cases) |
| `system-agent.test.ts` | AI system agent behavior |
| `test-route-guard.test.ts` | /test/* route guard (TEST workspace only) |
| `workspace-isolation.test.ts` | Workspace isolation (queries scoped by workspace_id) |
| `workspace-scope.test.ts` | workspaceScope() helper function |

## E2E Tests (Playwright)

**Config:** `playwright.config.ts`
**Location:** `e2e/`
**Total files:** 15

| Test File | What It Validates |
|-----------|------------------|
| `admin-buyer-detail.spec.ts` | Admin buyer detail page e2e flow |
| `admin-payments-pages.spec.ts` | Admin payment pages rendering and interaction |
| `admin-smoke.spec.ts` | Admin portal smoke test (navigation, key pages) |
| `affiliate-detail.spec.ts` | Affiliate detail page e2e |
| `affiliate-payments.spec.ts` | Affiliate payment flows e2e |
| `affiliate-portal.spec.ts` | Affiliate portal navigation and functionality |
| `api-dealers-e2e.spec.ts` | Dealer API e2e tests |
| `audit-validation.spec.ts` | Audit log validation e2e |
| `auth.spec.ts` | Authentication flow e2e (signup, signin, signout) |
| `buyer-documents.spec.ts` | Buyer document upload and management |
| `buyer-smoke.spec.ts` | Buyer portal smoke test |
| `dealer-smoke.spec.ts` | Dealer portal smoke test |
| `financial-reporting.spec.ts` | Financial reporting e2e |
| `link-checker.spec.ts` | Internal link checker e2e |
| `mobile-responsive.spec.ts` | Mobile responsive design e2e |

## CI Workflows

### 1. `.github/workflows/ci.yml` — Main CI
**Triggers:** Pull requests to `main`, pushes to `main`

**Steps:**
1. Checkout code
2. Enable Corepack + pnpm 10.28.0
3. Setup Node.js 22
4. Install dependencies (`pnpm install --no-frozen-lockfile`)
5. Lint changed files (`pnpm lint:changed`)
6. Full lint (`pnpm lint`) — `continue-on-error: true` (TODO: enforce after cleanup)
7. Prisma schema validation (`pnpm prisma validate`)
8. Build knowledge corpus (`npx tsx scripts/build-knowledge.ts`)
9. Build application (`pnpm build`)
10. Security patch verification (happy-dom >= 20.0.0)

**Gates:** Build must pass. Lint is soft-enforced. Prisma schema must validate.

### 2. `.github/workflows/codeql.yml` — CodeQL Security Analysis
**Triggers:** Push to `main`, PRs to `main`, weekly schedule (Tue 04:37 UTC)

**Steps:**
1. Checkout repository
2. Initialize CodeQL (`javascript-typescript`, `security-extended` queries)
3. Autobuild
4. Perform CodeQL analysis

### 3. `.github/workflows/production-readiness-gate.yml` — Production Readiness
**Triggers:** Pull requests to `main`, pushes to `main`

**Steps:**
1. Install dependencies
2. Prisma validate
3. Full build (with all env vars stubbed)
4. Build safety scan (`scripts/verify-build-safety.mjs`)
5. Security gate: verify happy-dom >= 20.0.0
6. Navigation gate: check internal links and route existence (`scripts/ci/check-routes-and-links.mjs`)

**Concurrency:** `cancel-in-progress: true` — only latest run per ref

## CI Scripts

| Script | Purpose |
|--------|---------|
| `scripts/verify-build-safety.mjs` | Post-build safety scan |
| `scripts/ci/check-happy-dom-version.mjs` | Verify happy-dom security patch |
| `scripts/ci/check-routes-and-links.mjs` | (Also at `.github/workflows/scripts/ci/`) Detect broken internal links and missing pages |
| `scripts/build-knowledge.ts` | Build AI knowledge corpus from codebase |

## Coverage Gaps: Critical Paths Not Tested

| Critical Path | Test Coverage | Risk |
|--------------|--------------|------|
| Full refund + commission reversal (atomic) | No dedicated test | HIGH — financial integrity |
| Stripe webhook replay/dedup | No dedicated test | HIGH — payment correctness |
| E-sign webhook status transitions | No dedicated test | MEDIUM — signing flow integrity |
| Best-price scoring algorithm | No dedicated test | MEDIUM — recommendation accuracy |
| Concierge fee loan inclusion flow | No dedicated test | MEDIUM — financial disclosure compliance |
| Pickup QR code check-in | No dedicated test | LOW — operational flow |
| Contract Shield reconciliation cron | No dedicated test | MEDIUM — stale scan detection |
| Cron security (IP validation) | No dedicated test | LOW — security boundary |
| Rate limit bypass under load | No dedicated test | MEDIUM — abuse prevention |
| Multi-workspace data isolation | `workspace-isolation.test.ts` exists | Covered ✅ |
| Auth JWT lifecycle | `auth.test.ts` exists | Covered ✅ |
| Affiliate referral visibility | `affiliate-referrals-visibility.test.ts` exists | Covered ✅ |
| Deal status state machine | `deal-status.test.ts` exists | Covered ✅ |
| Email verification flow | `email-verification.test.ts` exists | Covered ✅ |
