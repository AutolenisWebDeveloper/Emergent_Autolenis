# OPEN_QUESTIONS_AND_GAPS.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## TODOs and Incomplete Items

### 1. AI Configuration Not Wired to Database
- **File:** `lib/ai/gemini-client.ts:167`
- **TODO Text:** `// TODO: Wire to database or admin configuration table`
- **Impact:** AI model configuration is likely hardcoded rather than admin-configurable
- **Recommendation:** Wire to `AdminSetting` model to allow runtime configuration of AI parameters

### 2. Lint Enforcement Deferred
- **File:** `.github/workflows/ci.yml` (lint step)
- **Config:** `continue-on-error: true # TODO: enforce lint after cleanup`
- **Impact:** Lint failures don't block CI; code quality may degrade
- **Recommendation:** Complete lint cleanup and set `continue-on-error: false`

### 3. E-Sign Provider Integration
- **Files:** `lib/services/esign.service.ts`, `app/api/esign/provider-webhook/route.ts`
- **Evidence:** Service contains placeholder/TODO patterns; no specific e-sign provider (DocuSign, HelloSign, etc.) is clearly integrated
- **Impact:** E-signature flow may not be fully functional end-to-end
- **Recommendation:** Complete integration with chosen e-sign provider; add webhook handling tests

### 4. Prequal Service Placeholder Logic
- **File:** `lib/services/prequal.service.ts`
- **Evidence:** Found in placeholder/mock search results
- **Impact:** Soft pull / credit check may be simulated rather than connected to a real credit bureau
- **Recommendation:** If soft pull is meant to be simulated for MVP, document clearly; if real integration needed, wire to TransUnion/Experian/Equifax API

## Mock / Test Mode Concerns

### 5. ~~In-Memory Session Store for Admin~~ → RESOLVED
- **File:** `lib/admin-auth.ts`
- **Status:** ✅ Admin sessions are now **database-backed** via the `AdminSession` Prisma table (Issue 6).
- **Session lifecycle:** `setAdminSession()` upserts to DB, `getAdminSession()` reads from DB, `clearAdminSession()` deletes from DB, `cleanupExpiredAdminSessions()` prunes expired rows.
- **No Redis dependency:** Admin session persistence does not require Redis.

### 6. In-Memory Rate Limiting
- **File:** `lib/middleware/rate-limit.ts:12`
- **Code:** `const rateLimitStore = new Map<string, RateLimitEntry>()`
- **Impact:** Rate limits are per-instance, ineffective across distributed serverless functions
- **Recommendation:** Replace with Redis-based rate limiting via CacheAdapter (`REDIS_URL`)
- **Status:** ✅ Resolved — rate limiting now uses CacheAdapter backed by Redis in production

### 7. Custom TOTP Implementation
- **File:** `lib/admin-auth.ts:220-280`
- **Impact:** Custom TOTP implementation using basic hash function instead of standard HMAC-SHA1. May not be compatible with standard authenticator apps.
- **Recommendation:** Replace with battle-tested TOTP library (e.g., `otpauth` or `speakeasy`)

## Missing Tests

### 8. No Stripe Webhook Idempotency Test
- **Concern:** While `PaymentProviderEvent.eventId` unique index exists in schema, no test verifies that the webhook handler correctly deduplicates events
- **Recommendation:** Add unit test that simulates replayed webhook events and verifies no duplicate side effects

### 9. No Refund + Commission Reversal Atomic Test
- **Concern:** Commission reversal on refund is a critical financial flow with no dedicated test
- **Recommendation:** Add test covering: refund initiated → Stripe charge.refunded → commissions reversed → affiliate earnings updated

### 10. No Best-Price Scoring Algorithm Test
- **Concern:** `best-price.service.ts` (903 LOC) has no dedicated test for scoring accuracy
- **Recommendation:** Add unit tests with known offer sets to verify ranking correctness for BEST_CASH, BEST_MONTHLY, BALANCED types

### 11. No Contract Shield Reconciliation Cron Test
- **Concern:** Cron job logic untested
- **Recommendation:** Unit test each job type (SYNC_STATUSES, CHECK_STALE_SCANS, NOTIFY_PENDING)

## Incomplete Integrations

### 12. OpenRoad Refinance Partner
- **Evidence:** `OPENROAD_PARTNER_ID` env var; `RefinanceLead.partner @default("OpenRoad")`
- **Status:** Data model exists; qualification logic exists; but no direct API integration to OpenRoad visible
- **Impact:** Redirect to partner and funded loan tracking appear to be manual
- **Recommendation:** If partner API becomes available, wire lead submission and funded loan callback

### 13. QR Code Generation for Pickup
- **File:** `lib/admin-auth.ts:288-292` (for MFA), pickup QR references in `pickup.service.ts`
- **Evidence:** QR code generation uses external URL (`api.qrserver.com`) for MFA; pickup QR generation approach unclear
- **Impact:** Dependency on external QR service for admin MFA; pickup QR may be similar
- **Recommendation:** Use local QR library (e.g., `qrcode`) to avoid external dependency and potential SSRF

### 14. Build Safety Script
- **File:** `scripts/verify-build-safety.mjs`
- **Evidence:** Referenced in CI but previously commented out in `ci.yml`
- **Status:** Re-enabled in `production-readiness-gate.yml`
- **Recommendation:** Ensure this script covers all critical safety checks

## Inconsistencies

### 15. Commission Rate Discrepancy
- **File 1:** `lib/services/affiliate.service.ts:8-14` — Rates: L1=10%, L2=4%, L3=3%, L4=2%, L5=1%
- **File 2:** `lib/constants.ts:27-33` — Rates: L1=20%, L2=10%, L3=5%, L4=3%, L5=2%
- **Impact:** Two different commission rate definitions exist; unclear which is authoritative
- **Recommendation:** Consolidate to a single source of truth; remove the duplicate

### 16. Duplicate Field Conventions in Schema
- **Evidence:** `InsuranceQuote` model has both `monthlyPremium` and `monthly_premium`, both `coverageLimits` and `coverage_limits`, etc.
- **Impact:** Legacy migration artifacts; confusing for developers; potential data inconsistency
- **Recommendation:** Migrate to consistent naming convention; add migration to unify columns

### 17. Multiple Database Access Patterns
- **Supabase client** (`lib/db.ts`, `lib/supabase/*`) — used in some services
- **Prisma client** (`lib/prisma.ts`) — used in other services
- **Impact:** Inconsistent data access; some queries go through RLS (Supabase), others bypass (Prisma/service-role)
- **Recommendation:** Standardize on one pattern per context; document when to use each

## Security Gaps

### 18. API Routes Lack Edge-Level Auth
- **File:** `proxy.ts:87-89`
- **Evidence:** Middleware fast-paths API routes (`pathname.startsWith("/api/")`) without auth check
- **Impact:** All API auth enforcement is handler-level only; a missing `getSession()` call in any handler is a security hole
- **Recommendation:** Consider adding edge-level auth for API routes, or implement a middleware wrapper that enforces auth by default

### 19. No Explicit CORS Configuration
- **Evidence:** No `next.config.mjs` CORS headers or middleware CORS handling found
- **Impact:** Relies on browser same-origin policy and Next.js defaults
- **Recommendation:** Add explicit CORS policy, especially for API routes

### 20. Missing Webhook Event ID Check Before Processing
- **File:** `app/api/webhooks/stripe/route.ts`
- **Evidence:** Handler processes events without checking `PaymentProviderEvent` table first
- **Impact:** While DB unique constraints prevent duplicate records, side effects (emails, notifications) may fire twice on replay
- **Recommendation:** Add `PaymentProviderEvent` check at start of handler; skip if event already processed

## Architectural Gaps

### 21. No Distributed Job Queue
- **Impact:** All background processing relies on Vercel Cron (single execution); no retry, no dead-letter queue
- **Recommendation:** Consider adding a job queue (e.g., Inngest, QStash, or BullMQ) for reliable background processing

### 22. No Cron Schedule Configuration in Repository
- **Evidence:** No `vercel.json` with cron configuration found
- **Impact:** Cron scheduling must be configured in Vercel dashboard; not version-controlled
- **Recommendation:** Add `vercel.json` with cron configuration for reproducibility

### 23. Large Root-Level Markdown Files
- **Evidence:** 40+ markdown files (audit reports, verification docs) at repository root
- **Impact:** Cluttered root directory; files appear to be from prior audit sessions
- **Recommendation:** Move to `docs/audits/` or archive; keep root clean

### 24. Missing Database Migrations Verification
- **Evidence:** `migrations/` directory exists but migration history vs schema drift not verified in CI
- **Recommendation:** Add `prisma migrate diff` or equivalent check to CI to detect schema drift

## Recommended Next Actions (Priority Order)

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Fix commission rate discrepancy (#15) | Low | Correctness |
| P0 | Add Stripe webhook dedup check (#20) | Low | Payment reliability |
| P1 | ~~Replace in-memory admin sessions (#5)~~ — **RESOLVED** (database-backed) | — | — |
| P1 | Replace in-memory rate limiting (#6) | Medium | Security |
| P1 | Replace custom TOTP (#7) | Medium | Security |
| P1 | Add refund+commission reversal test (#9) | Medium | Financial integrity |
| P1 | Enforce lint in CI (#2) | Low | Code quality |
| P2 | Complete e-sign integration (#3) | High | Feature completeness |
| P2 | Add best-price scoring tests (#10) | Medium | Accuracy |
| P2 | Standardize DB access patterns (#17) | High | Maintainability |
| P2 | Add CORS policy (#19) | Low | Security |
| P3 | Wire AI config to DB (#1) | Low | Configurability |
| P3 | Clean up root markdown files (#23) | Low | Developer experience |
| P3 | Add vercel.json cron config (#22) | Low | Reproducibility |
