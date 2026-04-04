# Auth Implementation Status — Baseline

> Generated: 2026-02-25
> Purpose: Initial audit of authentication and authorization state before implementation.

## Repository Structure (2 levels)

```
VercelAutoLenis/
├── app/                        # Next.js App Router (200+ pages)
│   ├── auth/                   # Auth pages (signin, signup, verify, reset)
│   ├── admin/                  # Admin portal (dashboard, users, MFA)
│   ├── buyer/                  # Buyer portal
│   ├── dealer/                 # Dealer portal
│   ├── affiliate/              # Affiliate portal
│   └── api/                    # API routes (~150+)
├── lib/                        # Shared libraries
│   ├── auth.ts                 # JWT session creation/verification
│   ├── auth-server.ts          # Server-side auth utilities
│   ├── auth-edge.ts            # Edge-compatible JWT verification
│   ├── admin-auth.ts           # Admin portal + MFA
│   ├── authz/                  # ✅ NEW: Canonical roles + guard
│   ├── middleware/              # CSRF + rate limiting
│   ├── services/               # Auth service, email service
│   └── validators/             # Zod schemas
├── __tests__/                  # 62 test files (1396 tests)
├── docs/                       # 36+ documentation files
├── migrations/                 # 14 SQL migration files
├── prisma/                     # Prisma schema (83+ models)
├── scripts/                    # Utility scripts
└── proxy.ts                    # Root proxy/middleware (Next.js 16)
```

## Auth Pages (under /app)

| Route | Purpose |
|-------|---------|
| /auth/signin | User sign-in |
| /auth/signup | User registration |
| /auth/forgot-password | Password reset request |
| /auth/reset-password | Password reset completion |
| /auth/verify-email | Email verification |
| /admin/sign-in | Admin sign-in |
| /admin/mfa/enroll | Admin MFA enrollment |
| /admin/mfa/challenge | Admin MFA challenge |

## Auth API Routes (under /app/api)

| Route | Method | Purpose |
|-------|--------|---------|
| /api/auth/signin | POST | User sign-in |
| /api/auth/signup | POST | User registration |
| /api/auth/signout | POST | User sign-out |
| /api/auth/verify-email | POST/GET | Email verification |
| /api/auth/resend-verification | POST | Resend verification email |
| /api/auth/forgot-password | POST | Password reset request |
| /api/auth/reset-password | POST | Password reset completion |
| /api/auth/mfa/enroll | POST | MFA enrollment |
| /api/auth/mfa/verify | POST | MFA verification |
| /api/admin/auth/signin | POST | Admin sign-in |
| /api/admin/auth/mfa/verify | POST | Admin MFA verification |
| /api/admin/auth/signout | POST | Admin sign-out |

## Auth-Related Libraries

| File | Purpose |
|------|---------|
| lib/auth.ts | JWT session management (jose) |
| lib/auth-server.ts | Server-side getSession, requireAuth, password hashing |
| lib/auth-edge.ts | Edge-compatible JWT verification (Web Crypto) |
| lib/admin-auth.ts | Admin portal auth + TOTP MFA |
| lib/authz/roles.ts | ✅ NEW: Canonical role definitions |
| lib/authz/guard.ts | ✅ NEW: Standardized API auth guard |
| lib/middleware/csrf.ts | Double-submit CSRF protection |
| lib/middleware/rate-limit.ts | In-memory rate limiting |
| lib/services/auth.service.ts | Auth business logic (signup/signin) |
| lib/services/email-verification.service.ts | Email verification tokens |
| lib/validators/auth.ts | Zod auth schemas |

## Baseline Test Status

| Check | Status | Notes |
|-------|--------|-------|
| `pnpm lint` | ✅ PASS | No errors |
| `pnpm typecheck` | ✅ PASS | Fixed 2 pre-existing errors |
| `pnpm test:unit` | ✅ PASS | 62 files, 1396 tests |
| `pnpm test:e2e` | ⏭️ SKIP | Requires browser + running server |

## Prisma Schema — UserRole Enum

```prisma
enum UserRole {
  BUYER
  DEALER
  DEALER_USER
  ADMIN
  SUPER_ADMIN
  AFFILIATE
  AFFILIATE_ONLY
  SYSTEM_AGENT
}
```

All 8 roles are present in the Prisma schema and match the canonical roles in `lib/authz/roles.ts`.

## Key Security Features Present

- ✅ JWT sessions with session_version for revocation
- ✅ auth_user_id field for Supabase Auth migration
- ✅ CSRF double-submit cookie pattern
- ✅ Rate limiting on auth endpoints
- ✅ TOTP MFA for admin portal
- ✅ Email verification enforcement at sign-in
- ✅ Password hashing with bcrypt
- ✅ RLS functions and policies (migration 101)
- ✅ EmailSendLog for email idempotency (migration 100)
