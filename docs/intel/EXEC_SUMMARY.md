# EXEC_SUMMARY.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## What AutoLenis Is

AutoLenis is a **full-stack automotive concierge platform** built on Next.js 14+ (App Router) that digitises the entire used-car buying journey — from pre-qualification through deal closure and vehicle pickup. It serves four primary user personas (Buyer, Dealer, Affiliate, Admin) and monetises via a flat concierge fee ($499 Premium) and an affiliate commission engine.

**Evidence:** `app/page.tsx` (landing), `lib/constants.ts:1-58` (fee tiers, deposit, commission rates), `prisma/schema.prisma` (2,188 lines, 60+ models spanning 13 labelled subsystems).

## Core Value Propositions (Implemented in Code)

| # | Value Prop | Implementation |
|---|-----------|---------------|
| 1 | **Pre-qualification engine** — soft credit pull, tier assignment, affordability ceiling | `lib/services/prequal.service.ts` (544 LOC), `PreQualification` model |
| 2 | **Vehicle discovery + shortlisting** — inventory search w/ filters, up to 5 shortlist items | `lib/services/inventory.service.ts`, `lib/services/shortlist.service.ts`, `MAX_SHORTLIST_ITEMS=5` |
| 3 | **Silent reverse auction** — dealers compete to offer the lowest OTD price; buyer never negotiates | `lib/services/auction.service.ts` (525 LOC), `Auction`/`AuctionOffer`/`AuctionParticipant` models |
| 4 | **Best-price engine** — auto-ranks offers on cash OTD, monthly payment, and balanced score | `lib/services/best-price.service.ts` (903 LOC), `BestPriceOption` model |
| 5 | **Contract Shield** — automated contract review with fix lists, severity scoring, pass/fail gating | `lib/services/contract-shield.service.ts` (1,199 LOC), `ContractShieldScan`/`FixListItem`/`ContractShieldRule` |
| 6 | **E-signature orchestration** — create/send/track envelopes for deal signing | `lib/services/esign.service.ts` (457 LOC), `ESignEnvelope` model |
| 7 | **Insurance integration** — quote request, selection, bind, external proof upload | `lib/services/insurance.service.ts` (776 LOC), `InsuranceQuote`/`InsurancePolicy`/`InsuranceDocRequest` |
| 8 | **Payments (Stripe-only)** — $99 deposit, concierge fee (card or loan-inclusion), refunds, chargebacks | `lib/services/payment.service.ts` (983 LOC), `lib/stripe.ts`, `DepositPayment`/`ServiceFeePayment`/`Refund`/`Transaction`/`Chargeback` |
| 9 | **3-level affiliate engine** — referral tracking, multi-level commission accrual & reversal, payouts | `lib/services/affiliate.service.ts` (923 LOC), `Affiliate`/`Referral`/`Commission`/`Payout` |
| 10 | **AI concierge (Gemini)** — multi-agent chat w/ role-aware routing, tool calling, knowledge RAG | `lib/ai/orchestrator.ts`, `lib/ai/router.ts`, 7 agent files under `lib/ai/agents/`, `AiConversation`/`AiMessage`/`AiToolCall` |

## Top 10 Most Critical Modules

| Rank | Module | File(s) | Why Critical |
|------|--------|---------|-------------|
| 1 | Payment Service | `lib/services/payment.service.ts` | Revenue funnel; handles deposits + concierge fees + refunds; Stripe webhook side effects |
| 2 | Contract Shield | `lib/services/contract-shield.service.ts` | Consumer protection gate; compliance/legal risk surface |
| 3 | Affiliate Engine | `lib/services/affiliate.service.ts` | Multi-level commission accrual; self-referral prevention; atomic reversal on refunds |
| 4 | Auth + RBAC | `lib/auth.ts`, `lib/auth-edge.ts`, `proxy.ts` | JWT creation/verification; edge middleware RBAC; workspace isolation |
| 5 | Best-Price Engine | `lib/services/best-price.service.ts` | Core value prop; ranked recommendations affecting buyer decisions |
| 6 | Deal Service | `lib/services/deal.service.ts` (1,086 LOC) | Orchestrates state machine across 15 `DealStatus` states |
| 7 | Admin Service | `lib/services/admin.service.ts` (1,094 LOC) | Centralised admin operations; bridges all subsystems |
| 8 | Stripe Webhook Handler | `app/api/webhooks/stripe/route.ts` | Payment event intake; must be idempotent and replay-safe |
| 9 | Workspace Isolation | `lib/workspace-scope.ts` | Tenant boundary; every query must scope by workspace_id |
| 10 | Insurance Service | `lib/services/insurance.service.ts` | Regulatory-adjacent; quote→bind→proof lifecycle |

## Production Readiness Snapshot

### Security
- **Auth:** JWT (HS256) via `jose`, 7-day expiry. Edge verification in `proxy.ts`. Admin gets separate `admin_session` cookie + database-backed session store (AdminSession table) + MFA (TOTP). (`lib/auth.ts:35-60`, `lib/admin-auth.ts`)
- **RBAC:** Middleware enforces role-path mapping (buyer→`/buyer/*`, dealer→`/dealer/*`, admin→`/admin/*`, affiliate→`/affiliate/portal/*`). (`proxy.ts:90-145`)
- **Workspace isolation:** `workspaceScope()` helper extracts `workspace_id` from session; `workspaceFilter()` auto-appends `.eq("workspaceId", id)`. (`lib/workspace-scope.ts`)
- **Rate limiting:** Distributed rate limiter via CacheAdapter (Redis-backed in production) for auth (5/15m), signin (10/1m prod), API (100/1m), resend-verification (3/2m). (`lib/middleware/rate-limit.ts`)
- **Cron security:** Bearer token + Vercel IP allowlist in production. (`lib/middleware/cron-security.ts`)
- **Stripe webhooks:** Signature verification via `constructWebhookEvent()`. (`lib/stripe.ts:90-100`)
- **Gaps:** Rate limit is in-memory (not distributed); requires Redis (REDIS_URL) in production for distributed rate limiting. Admin sessions are now database-backed via the AdminSession table.

### Reliability
- **Error handling:** Centralised error handler module (`lib/middleware/error-handler.ts`); logger with structured output (`lib/logger.ts`).
- **Compliance logging:** `ComplianceEvent` and `AdminAuditLog` models; events written on key mutations.
- **Idempotency:** `PaymentProviderEvent.eventId` is unique-indexed, enabling webhook dedup. `stripePaymentIntentId` has unique constraints on `DepositPayment` and `ServiceFeePayment`.
- **Gaps:** No distributed job queue; cron jobs rely on Vercel Cron; no dead-letter queue or retry logic visible.

### Compliance
- **Contract Shield disclaimers:** "informational tool only; not legal/financial advice" enforced in `lib/services/contract-shield.service.ts:5-6`.
- **Consent tracking:** `PreQualification.consentGiven/consentDate`, `FeeFinancingDisclosure.consentGiven/consentTimestamp/ipAddress/userAgent`.
- **Audit trail:** `ComplianceEvent`, `AdminAuditLog`, `FinancialAuditLog`, `InsuranceEvent`, `EmailLog`.
- **Refinance compliance:** `MarketingRestriction` enum, `tcpaConsent` field on `RefinanceLead`.

### Testing
- **Unit tests (Vitest):** 44 test files under `__tests__/` covering auth, admin layout, affiliate, AI, deal status, documents, insurance, workspace isolation, etc.
- **E2E tests (Playwright):** 15 spec files under `e2e/` covering admin smoke, auth, buyer docs, dealer smoke, affiliate portal, financial reporting, link checker, mobile responsive.
- **CI:** GitHub Actions (`ci.yml`) — pnpm install → lint → Prisma validate → build knowledge corpus → build app → security patch check. Additional `codeql.yml` and `production-readiness-gate.yml`.
- **Gaps:** No visible coverage threshold enforcement; some critical paths (e.g., full refund+commission reversal, e-sign webhook) lack dedicated tests.

### Observability
- **Logging:** `lib/logger.ts` — structured logger (console-based).
- **Monitoring:** `lib/monitoring/sentry.ts` — Sentry integration (optional via `NEXT_PUBLIC_SENTRY_DSN`).
- **Health endpoints:** `/api/health`, `/api/health/db`, `/api/admin/health`, `/api/auth/health`.
- **Admin notifications:** Real-time SSE stream at `/api/admin/notifications/stream`; priority system (P0/P1/P2).
- **Gaps:** No metrics/APM integration beyond Sentry; no distributed tracing.
