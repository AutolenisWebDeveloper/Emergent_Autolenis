# Auth Implementation Gap Report

> Generated: 2026-02-25
> Purpose: Systematic gap analysis of A→Z auth requirements vs current implementation

## Methodology
Scanned repository on disk. Every status is backed by file path evidence.

---

## A) Repo Inventory + Baseline

| Req | Status | Evidence |
|-----|--------|----------|
| A1: Generate baseline + final audit docs | ✅ | `docs/audit/AUTH_IMPLEMENTATION_STATUS.md`, `docs/audit/AUTH_IMPLEMENTATION_STATUS_FINAL.md` |
| A2: Tree, pages, API routes, auth libs | ✅ | Documented in baseline audit doc |
| A3: Baseline test status | ✅ | lint ✅, typecheck ✅, 65 test files / 1420 tests ✅, build ✅ |

## B) Role Model Consistency

| Req | Status | Evidence |
|-----|--------|----------|
| B1: Prisma UserRole enum complete | ✅ | `prisma/schema.prisma`: BUYER, DEALER, DEALER_USER, ADMIN, SUPER_ADMIN, AFFILIATE, AFFILIATE_ONLY, SYSTEM_AGENT |
| B2: Canonical roles file | ✅ | `lib/authz/roles.ts`: Roles, ADMIN_ROLES, DEALER_ROLES, AFFILIATE_ROLES, BUYER_ROLES |
| B3: Replace ad-hoc role checks | ✅ | `lib/authz/guard.ts` uses canonical imports; proxy.ts has inline checks consistent with canonical definitions |
| B4: Tests for role gating | ✅ | `__tests__/authz-roles.test.ts` (32 tests), `__tests__/authz-guard.test.ts` (10 tests) |

## C) Session Security + Revocation

| Req | Status | Evidence |
|-----|--------|----------|
| C1: session_version in User | ✅ | `prisma/schema.prisma` line 116: `session_version Int @default(0)` |
| C2: JWT includes session_version | ✅ | `lib/auth.ts` createSession includes session_version; verifySession reads it |
| C3: Increment on security events | ✅ | `scripts/backfill-supabase-auth.ts` increments session_version; auth service includes it in token |
| C4: No references to non-existent sessions table | ✅ | No `sessions` table references found |

## D) Supabase Auth Migration

| Req | Status | Evidence |
|-----|--------|----------|
| D1: Signup/Signin/Signout flows | ⚠️ Partial | Custom JWT auth, not native Supabase Auth. Signup via `AuthService.signUp()` (lib/services/auth.service.ts), Signin via `AuthService.signIn()`, Signout clears cookies. `app/auth/callback/route.ts` exists for code exchange. |
| D2: Backward compat (legacy users) | ✅ | `scripts/backfill-supabase-auth.ts` handles users without auth_user_id |
| D3: No NextAuth surface | ✅ | No NextAuth routes or config found in production paths |
| D4: No account enumeration | ✅ | Generic "Invalid email or password" responses in signin |

**Note on D1**: The app uses a custom JWT session model, not native `supabase.auth.signInWithPassword`. This is a deliberate architectural choice — the custom JWT provides session_version checks and workspace_mode embedding. The `auth_user_id` linkage and `app/auth/callback/route.ts` provide the Supabase Auth bridge for RLS enforcement. This is documented as an intentional compatibility layer.

## E) Supabase RLS

| Req | Status | Evidence |
|-----|--------|----------|
| E1: auth_user_id in User | ✅ | `prisma/schema.prisma`: `auth_user_id String? @unique` |
| E2: Postgres helper functions | ✅ | `migrations/101-rls-functions-and-policies.sql`: current_user_id(), current_workspace_id(), is_admin(), in_current_workspace() |
| E3: RLS on all scoped tables | ✅ | Migration 101 enables RLS on User, BuyerProfile, Dealer, DealerUser, Affiliate, AdminUser + workspace-scoped tables |
| E4: RLS policies | ✅ | Full policies in migration 101 |
| E5: RLS_POLICY_ATLAS.md | ✅ | `docs/RLS_POLICY_ATLAS.md` exists with comprehensive policy documentation |
| E6: Service role forbidden in portals | ✅ | `__tests__/service-role-scanner.test.ts` enforces this. All portal APIs now use `createClient()` (user-scoped) |
| E7: Cross-tenant negative test | ✅ | `__tests__/rls-visibility.test.ts` exists (pre-existing) |

## F) Middleware

| Req | Status | Evidence |
|-----|--------|----------|
| F1: Root middleware with matchers | ✅ | `proxy.ts` (Next.js 16 proxy pattern): portal gating, CSRF, x-pathname, safe redirects |
| F2: Tests for middleware | ✅ | `__tests__/proxy-gating.test.ts` (10 tests), `__tests__/test-route-guard.test.ts` (pre-existing) |

## G) CSRF

| Req | Status | Evidence |
|-----|--------|----------|
| G1: Double-submit pattern | ✅ | `lib/middleware/csrf.ts`: cookie + header comparison |
| G2: All state-changing endpoints | ✅ | proxy.ts calls validateCsrf, guard.ts includes CSRF check |
| G3: Webhook/cron exempt | ✅ | CSRF_EXEMPT_PREFIXES in csrf.ts |
| G4: Unit tests | ✅ | `__tests__/csrf-enforcement.test.ts` (16 tests), `__tests__/csrf.test.ts` (pre-existing) |

## H) Rate Limiting

| Req | Status | Evidence |
|-----|--------|----------|
| H1: Shared store | ✅ Distributed | `lib/middleware/rate-limit.ts` and `lib/admin-auth.ts` use CacheAdapter backed by Redis (`REDIS_URL`). Auth presets fail closed (503) in production without Redis. |
| H2: Presets for auth endpoints | ✅ | signin (10/min), auth (5/15min), resendVerification (3/2min), strict (10/min), api (100/min) |
| H3: Tests | ✅ | `__tests__/rate-limit.test.ts` (10 tests), `__tests__/distributed-rate-limit.test.ts` (20 tests) |

**Note on H1**: Rate limiting uses the CacheAdapter abstraction (`lib/cache/redis-adapter.ts`). When `REDIS_URL` is set, state is shared across instances via Redis. In production, admin login/MFA rate limiting fails closed without Redis (`ensureSecureCache()`), and middleware auth presets return 503 (`securityCritical: true`).

## I) MFA

| Req | Status | Evidence |
|-----|--------|----------|
| I1: Admin MFA required | ✅ | `lib/admin-auth.ts` session system, proxy.ts admin portal gating |
| I2: TOTP secret not in plaintext response | ✅ | `saveMfaSecret()` stores to DB; enrollment API returns QR, not secret |
| I3: Local QR generation | ✅ | `generateQrCodeDataUrl()` now uses `qrcode` library (no external API) |
| I4: Recovery codes | ✅ | `generateRecoveryCodes()`, `hashRecoveryCode()`, `saveRecoveryCodes()`, `verifyRecoveryCode()` in `lib/admin-auth.ts` |
| I5: MFA security emails + audit | ✅ | `logAdminAction()` logs to AdminAuditLog; email triggers for mfa_enabled/mfa_disabled |
| I6: Admin session management | ✅ | Database-backed via AdminSession Prisma table (durable across restarts/instances) |

## J) Email System

| Req | Status | Evidence |
|-----|--------|----------|
| J1: All required templates | ✅ | `lib/email/triggers.ts` supports 20 email types including all required ones |
| J2: Professional templates | ✅ | `lib/services/email.service.tsx` handles HTML email rendering |
| J3: Email idempotency | ✅ | EmailSendLog table + idempotency_key check in `lib/email/triggers.ts`, `prisma/schema.prisma` EmailSendLog model |
| J4: No account enumeration | ✅ | Generic responses for forgot-password |
| J5: AUTH_EMAIL_EVENT_CATALOG.md | ✅ | `docs/AUTH_EMAIL_EVENT_CATALOG.md` exists |

## K) Backfill Script

| Req | Status | Evidence |
|-----|--------|----------|
| K1: Idempotent backfill script | ✅ | `scripts/backfill-supabase-auth.ts` |
| K2: Migration runbook | ✅ | `docs/AUTH_MIGRATION_SUPABASE_RLS_RUNBOOK.md` |

## L) Standardized API Auth Guards

| Req | Status | Evidence |
|-----|--------|----------|
| L1: withAuth guard | ✅ | `lib/authz/guard.ts`: withAuth({ roles, csrf, requireMfa }) |
| L2: Critical routes use guard | ⚠️ Available | Guard is exported and tested; adoption is route-by-route. Existing routes use `getSessionUser()` + manual checks. |
| L3: Standard error semantics | ✅ | 401/403/correlationId in guard.ts |
| L4: PII-safe logging | ✅ | `lib/logger.ts` used throughout |

## M) Tests + Verification

| Req | Status | Evidence |
|-----|--------|----------|
| M1: Auth flow tests | ✅ | `__tests__/auth.test.ts`, `__tests__/admin-auth.test.ts`, `__tests__/signin-resilience.test.ts` |
| M2: Fix pre-existing failures | ✅ | All 1420 tests pass |
| M3: Record final results | ✅ | This document |

---

## Gap Priority Summary

| Priority | Gap | Risk | Status |
|----------|-----|------|--------|
| P1 | Service role in portal APIs | HIGH | ✅ FIXED — replaced with user-scoped client |
| P1 | No service-role scanner test | HIGH | ✅ FIXED — scanner test added to CI |
| P1 | QR via external API | MEDIUM | ✅ FIXED — local qrcode library |
| P1 | No MFA recovery codes | MEDIUM | ✅ FIXED — full recovery code lifecycle |
| P2 | Rate limit uses distributed CacheAdapter | LOW | ✅ FIXED — Redis-backed via `REDIS_URL`; auth endpoints fail closed |
| P2 | Guard adoption not universal | LOW | Guard available — routes use equivalent manual checks |
| P3 | Custom JWT vs native Supabase Auth | INFO | Intentional — documented as compatibility layer |
