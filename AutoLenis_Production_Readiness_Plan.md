# AutoLenis — Production Readiness Master Plan
**Version:** 1.0 | **Date:** March 2026  
**Scope:** Full platform — Public Site, Buyer Portal, Dealer Portal, Affiliate Portal, Admin Console  
**Standard:** Fortune 500 fintech-grade production readiness  
**Platform State:** 96/96 features built (100%), 95/96 properly configured (99%) per verified audit

---

## How to Read This Document

This plan is organized into **7 sequential phases**. Each phase must be completed and verified before the next begins. Within each phase, items marked 🔴 are blockers — the platform cannot go live with these unresolved. Items marked 🟡 are high-priority but non-blocking. Items marked 🟢 are polish/optimization.

**Do not skip phases. Do not reorder them. Environment failures corrupt integration verification. Integration failures corrupt flow testing.**

---

## Phase 1 — Environment & Infrastructure Configuration
**Objective:** Confirm every environment variable, secret, and infrastructure dependency is correctly configured for LIVE/production mode before any runtime behavior is tested.

### 1.1 Environment Variables Audit

Every variable in `.env.example` or `env.d.ts` must be set in the production environment (Vercel dashboard or equivalent). Run this check first.

**Required variables by service:**

| Category | Variable | Required For | Verify By |
|---|---|---|---|
| Auth | `JWT_SECRET` | All session issuance | Decode a real issued token |
| Auth | `PREQUAL_ENCRYPTION_KEY` | SSN encryption (AES-256-GCM) | Prequal submission without error |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL` | Auth/access patterns | Signin flow |
| Supabase | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase access | Signin flow |
| Supabase | `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase ops | Admin operations |
| Database | `DATABASE_URL` | Prisma/Postgres | `prisma db pull` returns schema |
| Stripe | `STRIPE_SECRET_KEY` | All payments | Test charge succeeds |
| Stripe | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Embedded Checkout | Checkout renders |
| Stripe | `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Webhook event passes |
| Stripe | `DEPOSIT_AMOUNT_CENTS` | $99 deposit | Hardcoded constant in `lib/constants.ts` (9900) |
| Stripe | `PREMIUM_FEE_CENTS` | $499 concierge fee | Hardcoded constant in `lib/constants.ts` (49900) |
| Resend | `RESEND_API_KEY` | All transactional email | Email delivery |
| Resend | `FROM_EMAIL` | Email sender identity | Correct from address (fallback: `RESEND_FROM_EMAIL`) |
| DocuSign | `DOCUSIGN_INTEGRATION_KEY` | E-sign envelope creation | Envelope created |
| DocuSign | `DOCUSIGN_USER_ID` | DocuSign auth | Auth succeeds |
| DocuSign | `DOCUSIGN_ACCOUNT_ID` | DocuSign API calls | API calls succeed |
| DocuSign | `DOCUSIGN_PRIVATE_KEY_BASE64` | JWT auth flow (base64-encoded RSA key) | Token issued |
| DocuSign | `DOCUSIGN_BASE_PATH` | REST API base path | Set to production (not sandbox `demo.docusign.net`) |
| DocuSign | `DOCUSIGN_AUTH_SERVER` | OAuth auth server | Set to `account.docusign.com` (not sandbox `account-d.docusign.com`) |
| DocuSign | `DOCUSIGN_OAUTH_BASE_URL` | OAuth base URL | Set to `https://account.docusign.com` (not sandbox) |
| MicroBilt | `MICROBILT_CLIENT_ID` | Prequal soft pull | OAuth2 token issued |
| MicroBilt | `MICROBILT_CLIENT_SECRET` | Prequal soft pull | OAuth2 token issued |
| MicroBilt | `MICROBILT_TOKEN_URL` | OAuth2 token endpoint | Set to production (not sandbox `apitest.microbilt.com`) |
| MicroBilt | `MICROBILT_IPREDICT_BASE_URL` | iPredict API base path | Set to production (not sandbox `apitest.microbilt.com`) |
| MicroBilt | `MICROBILT_IBV_BASE_URL` | IBV API base path | Set to production (not sandbox `apitest.microbilt.com`) |
| App | `NEXT_PUBLIC_APP_URL` | Absolute URL generation | Set to `https://autolenis.com` |
| App | `NODE_ENV` | Environment branching | Set to `production` |
| Admin | Admin MFA seed / TOTP config | Admin auth | Admin login succeeds with TOTP |
| Cron | Cron secret / auth header | Vercel cron job protection | Cron routes reject unauthorized calls |

**🔴 BLOCKER:** Any missing production variable that falls back to a test/sandbox value means live transactions route to sandbox endpoints. This is not detectable from UI alone.

### 1.2 Database State

```bash
# Confirm no pending migrations
npx prisma migrate status

# Confirm schema is in sync with database
npx prisma db pull
npx prisma generate

# Confirm no drift between schema.prisma and live DB
```

Expected output: `Database schema is up to date.`  
If any migrations are pending: run `npx prisma migrate deploy` (not `dev`) in production.

### 1.3 Workspace Mode Verification

`lib/app-mode.ts` contains `isTestWorkspace()` and `WorkspaceMode` enum. Confirm the production environment does not inadvertently activate test workspace behavior.

- Check that no production routes return mock/seed data by inspecting `WorkspaceMode` branching
- Specifically: `/api/admin/reports/operations/route.ts` returns `{ summary: {}, lifecycle: [] }` in LIVE mode (known stub — acceptable) but must not return test mock data in production

### 1.4 Vercel Cron Jobs Verification

`vercel.json` defines 6 scheduled cron routes. Confirm each is:

| Cron Route | Schedule | Verify |
|---|---|---|
| `auction-close` | Every 5 min | Auctions transition to closed state |
| `holds` | Every 10 min | Hold logic executes |
| `affiliates` | Hourly | Commission events process |
| `contract-shield` | Hourly | Reconciliation runs |
| `sessions` | Every 6h | Stale sessions pruned |
| `prequal` | Daily | IBV reminders, purge, SLA escalation, stale cleanup |

Cron routes must be protected with an auth secret. Confirm all 14 cron routes reject unauthenticated calls with 401/403.

---

## Phase 2 — Third-Party Integration Verification
**Objective:** Confirm every external service is live-connected, properly authenticated, and returning real data before any end-to-end flow testing begins.

### 2.1 Stripe — Critical Path

Stripe handles deposits, concierge fees, refunds, affiliate payouts, and webhook events. Every piece must be verified in LIVE mode (not test mode).

**Checklist:**

- [ ] Stripe keys are LIVE keys (prefix `sk_live_`, `pk_live_`) — not test keys
- [ ] Embedded Checkout renders for $99 deposit with correct `DEPOSIT_AMOUNT_CENTS = 9900`
- [ ] Embedded Checkout renders for $499 concierge fee with correct `PREMIUM_FEE_CENTS = 49900`
- [ ] `checkout.session.completed` webhook fires and is received at `/api/webhooks/stripe`
- [ ] Webhook signature verification passes (correct `STRIPE_WEBHOOK_SECRET` for live endpoint)
- [ ] Deposit payment marks buyer record correctly in DB
- [ ] Refund endpoint creates refund in Stripe and updates DB
- [ ] Payout route (affiliate) creates Stripe transfer and creates `AffiliatePayout` record
- [ ] Idempotency: duplicate webhook events do not create duplicate DB records (verify via `ComplianceEvent` unique constraint)

### 2.2 DocuSign — Critical Path

DocuSign handles e-sign envelopes for dealer agreements and buyer purchase documents.

**Checklist:**

- [ ] `DOCUSIGN_BASE_URL` is set to production (`https://na4.docusign.net` or correct production base) — not demo/sandbox
- [ ] JWT auth flow produces valid access token via `lib/services/docusign/auth.ts`
- [ ] Envelope creation succeeds via `lib/services/docusign/envelope.ts`
- [ ] Recipient view URL is generated and accessible
- [ ] Webhook at `/api/webhooks/docusign` and `/api/esign/webhook` receives and processes status updates
- [ ] Signed document is archived in the system after completion
- [ ] Void operation works when deal is cancelled after e-sign initiation

### 2.3 Resend — Email Delivery

17 email templates are defined in `email.service.tsx` (70,678 bytes). Confirm delivery end-to-end.

**Checklist:**

- [ ] `RESEND_API_KEY` is live (not a test key)
- [ ] `EMAIL_FROM` domain is verified in Resend (DNS records confirmed)
- [ ] Signup verification email delivers
- [ ] Welcome email delivers after onboarding completion
- [ ] Auction notification email delivers to buyer
- [ ] Dealer invitation email delivers to dealer
- [ ] IBV reminder email delivers (prequal cron)
- [ ] Idempotency: `EmailSendLog` prevents duplicate sends for the same event

### 2.4 MicroBilt — Prequalification Soft Pull

MicroBilt OAuth2 + HMAC-SHA256 handles soft credit pulls during prequalification. This is the first gating dependency in the entire buyer lifecycle.

**Checklist:**

- [ ] `MICROBILT_BASE_URL` points to production endpoint (not sandbox)
- [ ] OAuth2 token is issued successfully using `MICROBILT_CLIENT_ID` and `MICROBILT_CLIENT_SECRET`
- [ ] HMAC-SHA256 request signing produces accepted signature
- [ ] Soft pull response returns credit data and triggers decision engine (`lib/decision/`)
- [ ] SSN is encrypted via AES-256-GCM before storage (verify `PREQUAL_ENCRYPTION_KEY` is set and correct length)
- [ ] Prequal result creates `PrequalDecision` record and `PrequalAuditLog` entry

### 2.5 Supabase — Auth and Access

- [ ] Supabase project is in production (not a dev project)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` works for server-side operations
- [ ] `proxy.ts` Supabase refresh logic works at runtime under live keys
- [ ] Session refresh does not throw in production

---

## Phase 3 — End-to-End Buyer Lifecycle Verification
**Objective:** Walk the full buyer lifecycle from account creation to deal completion, verifying every gate, every state transition, and every UI touchpoint. This is the revenue spine of the platform.

**Method:** Use a dedicated test buyer account in the LIVE environment with real (low-amount) Stripe transactions or confirmed test-mode override. Do not use placeholder data.

### Stage 1 — Account Creation and Onboarding

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| `POST /api/auth/signup` | Creates user, sends verification email, returns JWT | |
| Email verification link | Activates account, redirects to onboarding | |
| `app/buyer/onboarding/page.tsx` | Renders onboarding flow, collects required profile data | |
| Onboarding completion | Creates buyer profile, routes to prequal or dashboard | |
| Protected route | Non-onboarded buyer cannot access search, shortlist, auction | |

### Stage 2 — Prequalification

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Prequal step 1–4 | Form collects income, housing, employment, consent | |
| Soft pull consent | Consent recorded in `PrequalConsent` | |
| MicroBilt call | Returns credit data, decision engine runs | |
| `PrequalDecision` created | Stores result with `maxOtdAmountCents` | |
| Shopping power set | `PreQualification.maxOtdAmountCents` populated in DB | |
| IBV flow (if triggered) | IBV session created, buyer routed to IBV intro | |
| Prequal result page | Shows approved OTD band, shopping power | |
| Audit log | `PrequalAuditLog` entry created | |

### Stage 3 — Vehicle Search (Budget Guard Verification)

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| `/api/buyer/inventory/search` with `budgetOnly=true` | Queries `PreQualification.maxOtdAmountCents`, filters results | |
| Vehicles over budget | Not returned in search results | |
| Vehicles within budget | Returned in search results | |
| No prequal → search attempt | Buyer blocked from budget-sensitive search | |

### Stage 4 — Shortlist

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Add to shortlist | Vehicle added, `shortlist.service.ts` creates record | |
| Max 5 items enforced | 6th add is rejected with correct error | |
| Remove from shortlist | Record removed, count decrements | |
| Shortlist empty → auction attempt | Buyer blocked from activating auction | |

### Stage 5 — Deposit and Auction Activation

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| $99 Stripe Embedded Checkout renders | Correct amount, correct buyer | |
| Payment completes | `checkout.session.completed` webhook fires | |
| Deposit marked paid in DB | Buyer record updated | |
| Auction creation | Auction created, `AUCTION_DURATION_HOURS = 48` set | |
| Dealer invitations sent | Relevant dealers receive invitation emails | |
| No deposit → auction activation | Blocked with correct error | |
| Auction-close cron | Auction transitions to closed after 48h | |

### Stage 6 — Dealer Offers and Best Price Engine

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Dealer receives auction invitation | Dealer portal shows active auction | |
| Dealer submits structured offer | OTD, tax/fee breakdown, financing options stored | |
| Offer stored in DB | `offer.service.ts` creates record with structured JSON | |
| Best Price Engine runs | Generates Best Cash, Best Monthly, Balanced outputs | |
| Weights applied correctly | OTD 35%, monthly 35%, vehicle 15%, dealer 10%, junk fee 5% | |
| Buyer sees ranked offers | 3 outputs visible in buyer portal | |

### Stage 7 — Deal Selection and Financing

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Buyer selects offer | `deal.service.ts` creates selected-deal record | |
| Deal state: `SELECTED` | State machine initializes correctly | |
| Financing choice | CASH / FINANCED / EXTERNAL_PREAPPROVAL options presented | |
| `financingChoiceSchema` validates | Invalid financing type rejected | |
| Deal transitions to `FINANCING_PENDING` | State machine advances | |

### Stage 8 — Concierge Fee Handling

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Fee options presented | Direct payment vs financed inclusion shown | |
| Loan impact calculator renders | Shows monthly payment impact of financing inclusion | |
| Disclosure acknowledgment stored | Explicit borrower ack recorded in DB | |
| $99 deposit credited | Fee reduced to $400 if deposit paid | |
| Direct payment via Stripe | Charge succeeds, deal advances | |
| Financed inclusion path | Disclosure stored, deal advances | |
| Deal transitions to `FEE_PAID` | State machine advances | |

### Stage 9 — Insurance

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Insurance quote request | Provider adapter called, quotes returned | |
| Policy selection and bind | `InsuranceReadinessStatus` transitions correctly | |
| External proof upload | Upload accepted, status updated | |
| Insurance does NOT block auction | Confirm insurance state has no effect on stages 3–6 | |
| Deal transitions to `INSURANCE_COMPLETE` | State machine advances | |
| `coverage-gap.service.ts` | Coverage gap detection works | |

### Stage 10 — Contract Shield

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Dealer uploads contract | Contract stored, scan triggered | |
| PASS threshold (≥ 85) | Deal advances to `CONTRACT_APPROVED` | |
| WARNING threshold (70–84) | Manual review queue populated | |
| FAIL threshold (≤ 69) | Fix list generated, dealer notified | |
| Dealer corrects and re-uploads | New scan runs | |
| E-sign blocked before `CONTRACT_APPROVED` | `SIGNING_PENDING` state unreachable without approval | |
| `contract-shield.service.ts` | 38,428-byte service functions without error | |
| Admin override | Admin can override fail state | |

### Stage 11 — E-Sign

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Envelope created | DocuSign envelope created via `lib/services/docusign/envelope.ts` | |
| Recipient view URL | Generated and accessible by buyer | |
| Buyer signs | DocuSign webhook fires with completion status | |
| `/api/webhooks/docusign` receives event | Status synced to DB | |
| Signed document archived | Accessible in buyer document list | |
| Deal transitions to `SIGNED` | State machine advances | |

### Stage 12 — Pickup

| Checkpoint | Expected Behavior | Pass/Fail |
|---|---|---|
| Pickup scheduling | Appointment created via `pickup.service.ts` | |
| QR code generated | `qrcode` package generates valid QR | |
| Dealer QR check-in | Dealer scans QR, arrival confirmed | |
| Deal transitions to `PICKUP_SCHEDULED` then `COMPLETED` | State machine advances | |
| Post-completion state | Deal marked completed, referral credit triggered if applicable | |

---

## Phase 4 — Portal-Level Verification
**Objective:** Verify all portal surfaces independently — Dealer, Affiliate, Admin — confirming every route, dashboard, and action operates correctly.

### 4.1 Dealer Portal (44 Pages)

- [ ] Onboarding / agreement flow with DocuSign dealer agreement
- [ ] Admin approval workflow (dealer not active until approved)
- [ ] Inventory management — add, edit, bulk upload, import history
- [ ] Auction list, detail, invited, offers pages
- [ ] Structured offer submission form (all fields required)
- [ ] Contract upload and remediation workflow
- [ ] Pickup scheduling and QR check-in flow
- [ ] Messaging thread with buyer
- [ ] Payments list renders
- [ ] Settings GET/PATCH work

### 4.2 Affiliate Portal (27 Pages)

- [ ] Public enrollment and auto-enrollment from buyer lifecycle
- [ ] Referral code generated with format `AL` + 6 chars
- [ ] `?ref=` param captured in `proxy.ts`, 30-day httpOnly cookie set
- [ ] First-click attribution persists from referral entry through signup
- [ ] Dashboard renders (31 KB component)
- [ ] Commission levels correct: 15% L1, 3% L2, 2% L3
- [ ] MLM tree walk produces correct commission chain
- [ ] Payout list renders, Stripe payout creates transfer
- [ ] Income planner calculator functions
- [ ] Self-referral blocked (fraud control)

### 4.3 Admin Console (94 Pages)

- [ ] Admin signin with TOTP MFA (`lib/admin-auth.ts`)
- [ ] Recovery codes work for MFA fallback
- [ ] Rate limiting on admin auth active
- [ ] Dashboard renders (32.6 KB page)
- [ ] All 7 manual review action routes work
- [ ] Contract Shield override works
- [ ] E-sign void operation works
- [ ] Refund creation route works
- [ ] Affiliate payout trigger works
- [ ] Dealer approval / suspension works
- [ ] Prequal manual review queue populated correctly
- [ ] Event ledger shows 90+ event types with correct audit trail
- [ ] SEO management pages (7 routes) work
- [ ] System health page renders live data
- [ ] Operations report: currently returns `{ summary: {}, lifecycle: [] }` — acceptable as known stub; confirm it does not throw or break the page
- [ ] AI management — 38 AI module files, Gemini client, streaming chat widget renders

---

## Phase 5 — Known Issues Resolution
**Objective:** Address the 6 known issues from the verified audit. Three are actionable before launch.

### Issue 1 — Operations Report Stub 🟡 (Pre-launch recommended)

**File:** `/api/admin/reports/operations/route.ts`  
**Current state:** Returns `{ summary: {}, lifecycle: [] }` in LIVE mode.  
**Resolution options (choose one):**

Option A — Implement real aggregation queries (preferred):
```typescript
// Replace stub with:
// 1. Count deals by lifecycle stage
// 2. Calculate average stage durations
// 3. Aggregate daily/weekly completion rates
// Query: group deals by status, count, calculate timestamps
```

Option B — Remove from admin navigation until implemented:
- Comment out or hide the Operations tab in the admin reports navigation
- Prevents the visual of an empty tab in production

**Recommendation:** Option B for launch, Option A in the first post-launch sprint.

### Issue 2 — 1,109 `any` Types 🟡 (Post-launch sprint)

Not a launch blocker but must be addressed in the first post-launch sprint. Priority order:
1. Payment service types (highest risk — financial data)
2. Prequal service types (financial/credit data)
3. Webhook handler types
4. Remaining services

**Copilot prompt for this:** Separate remediation prompt required per service file. Do not attempt to fix all 1,109 at once — fix by service, test, commit.

### Issue 3 — 113 Console Statements in `lib/` 🟡 (Post-launch sprint)

Replace with calls to `lib/logger.ts`. This is an observability and operational risk issue. Non-blocking for launch but important for production log management.

### Issue 4 — 7 Error Boundaries (Public Routes Unprotected) 🟡 (Pre-launch recommended)

**Add error boundaries to:**
- `app/auth/error.tsx`
- `app/prequal/error.tsx`
- `app/contact/error.tsx`
- `app/refinance/error.tsx`

Root `app/error.tsx` provides a fallback but public routes should have contextual recovery UX, not the generic admin-facing error screen.

### Issue 5 — 51 Markdown Audit Files in Repo Root 🟢 (Any time)

```bash
mkdir -p docs/audits
mv *.md docs/audits/
# Keep README.md in root
```

### Issue 6 — Stale Middleware Backups 🟢 (Any time)

```bash
rm middleware.ts.bak
rm middleware.ts.txt
# Active middleware is proxy.ts — backups are inactive but confusing
```

---

## Phase 6 — Security and Compliance Hardening
**Objective:** Confirm all security controls are active in production. These must be verified — not assumed.

### 6.1 Authentication and Authorization

- [ ] All buyer routes reject unauthenticated requests (401/403)
- [ ] All dealer routes reject non-dealer roles
- [ ] All admin routes reject non-admin roles
- [ ] Admin routes additionally require TOTP MFA session
- [ ] `proxy.ts` (350 lines) CSRF double-submit cookie active on all state-modifying routes
- [ ] JWT 7-day TTL enforced — expired tokens rejected
- [ ] `lib/middleware/csrf.ts` — confirm CSRF checks cannot be bypassed
- [ ] Workspace isolation: `isTestWorkspace()` never returns true in production
- [ ] Email verification fail-closed at signin (unverified users cannot proceed)

### 6.2 Financial Security

- [ ] Stripe webhook signature verification active (not disabled for convenience)
- [ ] DocuSign webhook signature verification active
- [ ] All payment amounts are defined server-side (`DEPOSIT_AMOUNT_CENTS`, `PREMIUM_FEE_CENTS`) — client cannot override amount
- [ ] Refund endpoint checks ownership — buyer cannot refund another buyer's payment
- [ ] Affiliate payout requires admin role — affiliate cannot self-trigger payout
- [ ] Commission creation is idempotent — duplicate qualifying events do not double-pay

### 6.3 Data Protection

- [ ] SSN encrypted at rest via AES-256-GCM (`PREQUAL_ENCRYPTION_KEY`)
- [ ] Prequal purge cron running — old sensitive data purged per retention policy
- [ ] No SSN or raw credit data in logs (check `console.log` statements in prequal service)
- [ ] Document uploads stored securely — not publicly accessible without auth
- [ ] Admin audit log captures sensitive actions: contract overrides, refunds, payout triggers, user suspensions

### 6.4 API Security

- [ ] All API routes validate ownership (buyer can only access their own deals)
- [ ] Dealer can only access auctions they are invited to
- [ ] Rate limiting active on prequal endpoints (prevent repeated soft pulls)
- [ ] Rate limiting active on admin auth endpoint
- [ ] Input validation (Zod schemas) active on all mutation routes
- [ ] No route returns more data than the requesting role is entitled to

### 6.5 Compliance

- [ ] All financial disclosures acknowledged and stored before fee processing
- [ ] Consent artifacts exist for prequal soft pull
- [ ] Contract Shield fix lists are audit-logged
- [ ] All webhook events stored in `ComplianceEvent` with idempotency key
- [ ] Event ledger (90+ types) capturing all required events
- [ ] Dealer agreement executed via DocuSign before dealer activation

---

## Phase 7 — Performance, Observability, and Pre-Launch Gate
**Objective:** Final verification before marking the platform production-ready.

### 7.1 Build and Type Safety

```bash
# Must all pass clean with zero errors
npx tsc --noEmit
npm run build
npm run lint
npm run test        # 211 test files
```

Expected: Zero TypeScript errors introduced by any changes. Build output clean. All tests passing.

### 7.2 Core Web Vitals

Using Vercel Analytics or PageSpeed Insights against production URL:

| Metric | Target | Why |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | Homepage hero, buyer console preview |
| FID / INP | < 200ms | Qualification estimate strip interactions |
| CLS (Cumulative Layout Shift) | < 0.1 | Testimonial carousel, dynamic content |

### 7.3 Observability Readiness

- [ ] Error monitoring active (Sentry or equivalent configured for production)
- [ ] Vercel deployment logs accessible
- [ ] Database connection pool not at limit under expected concurrency
- [ ] Cron job execution logs visible (Vercel cron logs)
- [ ] Stripe webhook delivery logs monitored in Stripe dashboard
- [ ] Email delivery rate monitored in Resend dashboard

### 7.4 Pre-Launch Final Gate Checklist

This checklist must be signed off by the technical lead before launch.

**Infrastructure**
- [ ] All production environment variables set and verified
- [ ] Database migrations fully deployed
- [ ] No pending schema drift
- [ ] All 6 cron jobs scheduled and verified
- [ ] Cron routes protected against unauthorized calls

**Integrations**
- [ ] Stripe LIVE keys active, webhooks verified
- [ ] DocuSign production endpoint active, JWT auth working
- [ ] Resend domain verified, email delivery confirmed
- [ ] MicroBilt production endpoint active, soft pull working
- [ ] Supabase production project active

**Flows**
- [ ] Full buyer lifecycle completed end-to-end (Stage 1–12)
- [ ] Dealer onboarding and offer submission completed
- [ ] Affiliate referral attribution confirmed
- [ ] Admin actions (override, refund, approve, suspend) all tested

**Security**
- [ ] All route protection verified
- [ ] CSRF active
- [ ] Admin MFA active
- [ ] Financial amounts server-enforced
- [ ] SSN encryption confirmed
- [ ] Webhook signatures verified

**Quality**
- [ ] TypeScript: zero errors
- [ ] Build: clean
- [ ] Tests: all passing
- [ ] StatsBlock replacement deployed (zero-counter issue resolved)
- [ ] Operations report: stubbed output acceptable OR removed from navigation
- [ ] Error boundaries added to public auth and prequal routes (recommended)

**Legal / Compliance**
- [ ] Terms of Service live and linked
- [ ] Privacy Policy live and linked
- [ ] Dealer Terms live and linked
- [ ] Compliance disclaimer on homepage accurate
- [ ] Prequal consent flow stores explicit consent before any soft pull

---

## Execution Sequencing Summary

| Phase | Owner | Estimated Effort | Blocker? |
|---|---|---|---|
| 1. Environment & Infrastructure | DevOps / Backend | 0.5–1 day | Yes — do first |
| 2. Integration Verification | Backend | 1–2 days | Yes — do second |
| 3. Buyer Lifecycle E2E | QA / Backend | 2–3 days | Yes — revenue spine |
| 4. Portal Verification | QA / Frontend | 1–2 days | Yes |
| 5. Known Issues Resolution | Engineering | 1 day | Partial |
| 6. Security Hardening | Security / Backend | 1–2 days | Yes |
| 7. Final Gate | Tech Lead | 0.5 day | Yes — last gate |

**Total realistic timeline for a disciplined team:** 7–11 business days  
**Total realistic timeline for a solo engineer:** 14–20 business days

---

## Post-Launch Sprint (First 30 Days)

These are not launch blockers but must be addressed in the first post-launch sprint:

1. Implement real operations report aggregation queries (replace stub)
2. Remediate `any` types in payment and prequal services (highest risk)
3. Replace `console.log/error/warn` in `lib/` with `lib/logger.ts` calls
4. Move 51 markdown audit files to `/docs/audits/`
5. Delete stale middleware backups
6. Add WCAG 2.2 AA accessibility audit across all buyer portal flows
7. Load test auction-close cron and webhook handlers under concurrent buyer volume

---

*This document is the authoritative production readiness reference for AutoLenis. All phases must be completed in order. All 🔴 blockers must be resolved before the platform goes live.*
