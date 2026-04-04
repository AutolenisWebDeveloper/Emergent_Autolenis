# TEST_COVERAGE_REPORT.md — AutoLenis Test Coverage Audit

## Test Infrastructure

| Component | Tool | Version | Config File |
|-----------|------|---------|-------------|
| Unit Tests | Vitest | 4.0.16 | `vitest.config.ts` |
| E2E Tests | Playwright | 1.49.0 | `playwright.config.ts` |
| DOM Environment | happy-dom | ^20.0.2 | vitest.setup.ts |
| React Testing | @testing-library/react | ^16.1.0 | — |
| Coverage | @vitest/coverage-v8 | ^4.0.16 | — |

---

## Unit Tests (44 files — Vitest)

### Authentication & Authorization (7 tests)
| Test File | What It Tests | System |
|-----------|--------------|--------|
| `auth.test.ts` | Auth service, password hashing, sign-in/sign-up validation | S1 |
| `admin-auth.test.ts` | Admin role detection (isAdminRole) | S12 |
| `middleware.test.ts` | Admin subdomain rewriting, auth edge verification | S12 |
| `signin-resilience.test.ts` | Sign-in workspace resilience (defaults to LIVE) | S1 |
| `email-verification.test.ts` | Email verification enforcement on sign-in | S1 |
| `resend-verification.test.ts` | Resend flow, enumeration attack prevention | S1 |
| `test-route-guard.test.ts` | /test/* route protection (404 in LIVE mode) | S12 |

### Payments & Financial (4 tests)
| Test File | What It Tests | System |
|-----------|--------------|--------|
| `admin-payments-pages.test.ts` | Admin payments API RBAC, correlationId | S12 |
| `affiliate-payments.test.ts` | Affiliate payment API RBAC | S10 |
| `financial-reporting.test.ts` | Financial reporting, Stripe webhook handling | S12 |
| `calculator-parity.test.ts` | Affordability calculator (calculatePrincipal) | S5 |

### Affiliate System (5 tests)
| Test File | What It Tests | System |
|-----------|--------------|--------|
| `affiliate-dashboard-audit.test.ts` | Commission rate consistency (3-level: 15/3/2%) | S10 |
| `affiliate-detail.test.ts` | Affiliate detail page route contract | S10 |
| `affiliate-share-link.test.ts` | Share link HTML escaping | S10 |
| `affiliate-referrals-visibility.test.ts` | Referrals API route existence | S10 |
| `affiliate-payments.test.ts` | Affiliate payment RBAC | S10 |

### Admin System (9 tests)
| Test File | What It Tests | System |
|-----------|--------------|--------|
| `admin-layout.test.ts` | Admin navigation icon mapping | S12 |
| `admin-list-shell.test.ts` | AdminListPageShell component export | S12 |
| `admin-dealer-detail.test.ts` | Dealer detail page mock data | S12 |
| `admin-buyer-detail.test.ts` | Buyer detail page route/params | S12 |
| `admin-auction-detail.test.ts` | Auction detail mock data | S12 |
| `admin-notifications.test.ts` | Notification service creation | S12 |
| `admin-create-user-audit.test.ts` | Admin create user, JSON responses | S12 |
| `admin-search-signup-refinance.test.ts` | Auth signup role/profile creation | S12 |
| `api-admin-dealers-auth.test.ts` | Admin dealers API x-pathname proof | S12 |

### AI System (5 tests)
| Test File | What It Tests | System |
|-----------|--------------|--------|
| `ai-orchestrator.test.ts` | Context builder, intent routing, tool registry | Cross |
| `ai-gemini-security.test.ts` | Prompt injection detection | Cross |
| `system-agent.test.ts` | System agent workspace modes | Cross |
| `lenis-concierge-prompt.test.ts` | Lenis Concierge™ identity/branding | Cross |
| `quick-prompts.test.ts` | Quick prompts validation | Cross |

### Feature Tests (8 tests)
| Test File | What It Tests | System |
|-----------|--------------|--------|
| `insurance.test.ts` | Insurance policy attachment | S6 |
| `documents.test.ts` | Document upload permissions (BUYER only) | S5 |
| `deal-status.test.ts` | Deal status normalization | S5 |
| `income-calculator.test.ts` | Income calculator, input sanitization | S5 |
| `rls-visibility.test.ts` | Deal visibility constants | S5 |
| `seo.test.ts` | SEO getSiteUrl validation | Cross |
| `knowledge-retrieval.test.ts` | Knowledge corpus validation | Cross |
| `link-checker.test.ts` | Link checker helpers | Cross |

### Infrastructure Tests (6 tests)
| Test File | What It Tests | System |
|-----------|--------------|--------|
| `workspace-isolation.test.ts` | Test workspace detection/isolation | Cross |
| `workspace-scope.test.ts` | Workspace scope helpers | Cross |
| `mock-mode.test.ts` | Mock mode data mapping | Cross |
| `production-readiness.test.ts` | Production safety (no placeholder URLs) | Cross |
| `email-service.test.ts` | Email service config validation | Cross |
| `mobile-responsive.test.tsx` | Mobile responsiveness | Cross |

---

## E2E Tests (15 files — Playwright)

| Test File | What It Tests | System |
|-----------|--------------|--------|
| `auth.spec.ts` | Sign-up/sign-in forms, validation, redirects | S1 |
| `admin-smoke.spec.ts` | Admin sign-in, error handling, protected routes | S12 |
| `admin-buyer-detail.spec.ts` | Admin buyer detail functionality | S12 |
| `admin-payments-pages.spec.ts` | Admin payments pages rendering | S12 |
| `affiliate-detail.spec.ts` | Affiliate detail page | S10 |
| `affiliate-payments.spec.ts` | Affiliate payments workflow | S10 |
| `affiliate-portal.spec.ts` | All affiliate portal pages | S10 |
| `buyer-smoke.spec.ts` | Buyer portal pages | S1-S9 |
| `buyer-documents.spec.ts` | Buyer document upload/management | S5 |
| `dealer-smoke.spec.ts` | Dealer routes and functionality | S11 |
| `api-dealers-e2e.spec.ts` | Dealers API end-to-end | S11 |
| `audit-validation.spec.ts` | Audit trail validation | S12 |
| `financial-reporting.spec.ts` | Financial reporting workflows | S12 |
| `link-checker.spec.ts` | Link validation | Cross |
| `mobile-responsive.spec.ts` | Mobile responsiveness | Cross |

---

## Coverage by Core System

| System | Unit Tests | E2E Tests | Coverage Level |
|--------|-----------|-----------|----------------|
| S1 — Buyer Onboarding | 5 | 2 | ✅ Good |
| S2 — Vehicle Discovery | 0 | 1 | ⚠️ Unit tests missing |
| S3 — Silent Auction | 1 | 2 | ⚠️ Light coverage |
| S4 — Best Price Engine | 1 | 0 | ⚠️ Light coverage |
| S5 — Financing | 4 | 1 | ✅ Good |
| S6 — Insurance | 1 | 0 | ⚠️ Light coverage |
| S7 — Contract Shield™ | 0 | 0 | ⚠️ No dedicated tests |
| S8 — E-Sign | 0 | 0 | ⚠️ No dedicated tests |
| S9 — Pickup & Delivery | 0 | 1 | ⚠️ No unit tests |
| S10 — Affiliate | 5 | 3 | ✅ Good |
| S11 — Dealer Portal | 1 | 2 | ⚠️ Light coverage |
| S12 — Admin Console | 9 | 4 | ✅ Good |

---

## Critical Test Gaps

### High Priority (Business Critical)
1. **Contract Shield™ math validation** — No unit tests for APR/OTD/payment verification logic
2. **Best Price algorithm** — No unit tests for ranking algorithms
3. **Auction lifecycle** — No unit tests for create/close/expire flow
4. **Commission calculation** — Tested for rate consistency, but not full calculation flow

### Medium Priority
5. **Insurance service** — No unit tests for quote/bind/verify flows
6. **E-Sign service** — No unit tests for envelope creation/webhook handling
7. **Pickup service** — No unit tests for QR generation/check-in
8. **Payment service** — No unit tests for deposit/fee/refund flows (relies on integration)

### Low Priority
9. **Webhook handler** — No unit tests for Stripe webhook event processing
10. **Deal lifecycle** — Status transitions not unit tested

---

## Test Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `test` | `vitest` | Watch mode |
| `test:unit` | `vitest run --reporter=verbose` | Single run (CI) |
| `test:coverage` | `vitest --coverage` | Coverage report |
| `test:e2e` | `playwright test` | E2E tests |
| `test:e2e:ui` | `playwright test --ui` | E2E with UI |
| `test:links` | `playwright test e2e/link-checker.spec.ts` | Link checking |

---

## Recommendations

1. Add unit tests for Contract Shield™ math validation (highest priority)
2. Add unit tests for Best Price ranking algorithm
3. Add unit tests for auction lifecycle (create → close → expire)
4. Add integration tests for payment flows (deposit → fee → refund)
5. Add webhook handler tests for all 6 Stripe event types
6. Add insurance service unit tests
7. Add e-sign service unit tests
