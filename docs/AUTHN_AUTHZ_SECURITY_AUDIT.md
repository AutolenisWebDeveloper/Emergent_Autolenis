# AutoLenis AuthN/AuthZ Security Audit

> **Audit Date**: 2026-02-24
> **Scope**: Buyer · Dealer · Affiliate · Admin — all portals, API routes, and service-layer guards
> **Method**: Code-truth audit via structured traversal of the repository (no theory — implementation only)

---

## 1. System Summary

AutoLenis uses a **custom JWT-based authentication system** built on top of Next.js App Router (v16) with Prisma ORM and PostgreSQL (hosted on Supabase). There is **no NextAuth/Auth.js session management in active use** — although the `next-auth` package is listed in `package.json` and a `[...nextauth]` catch-all exists under `app/api/auth/`, all runtime auth flows use the custom JWT stack.

**Key characteristics:**

- **Stateless JWT sessions** signed with HS256 via the `jose` library, stored in an `httpOnly` cookie named `session` (7-day expiry).
- **Single `User` table** with an enum `UserRole` (`BUYER`, `DEALER`, `ADMIN`, `AFFILIATE`, `SYSTEM_AGENT`) — role is determined by the `role` column on the `User` model.
- **Role-specific profile tables** (`BuyerProfile`, `Dealer`, `DealerUser`, `Affiliate`, `AdminUser`) linked 1:1 to `User`.
- **Multi-tenant workspace isolation** via `workspaceId` FK on most entities, plus a `WorkspaceMode` enum (`LIVE`/`TEST`).
- **Defense-in-depth** at four layers: server-component layout gating → API route handler checks → service-layer scoping → database constraints (Prisma unique indexes + limited Supabase RLS).
- **Admin portal** has a **separate session cookie** (`admin_session`) with stricter settings (`sameSite: strict`, 24h expiry) plus optional **TOTP MFA**.
- **No Edge middleware file** (`middleware.ts`) exists — route protection relies on server-component layouts and per-handler checks.

---

## 2. Auth Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  Buyer   │  │  Dealer  │  │ Affiliate│  │  Admin   │                │
│  │  Portal  │  │  Portal  │  │  Portal  │  │  Portal  │                │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘                │
│       │              │              │              │                      │
│   useUser()      useUser()      useUser()      useUser()                │
│   (SWR→/api/    (SWR→/api/    (SWR→/api/    (SWR→/api/                │
│    auth/me)      auth/me)      auth/me)      auth/me)                  │
└───────┼──────────────┼──────────────┼──────────────┼─────────────────────┘
        │              │              │              │
        ▼              ▼              ▼              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    NEXT.JS SERVER (App Router)                            │
│                                                                          │
│  ┌─ Layout Gating (Server Components) ─────────────────────────────────┐│
│  │ app/buyer/layout.tsx     → getSessionUser() + role === "BUYER"      ││
│  │ app/dealer/layout.tsx    → getSessionUser() + role ∈ {DEALER,       ││
│  │                            DEALER_USER}                              ││
│  │ app/admin/layout.tsx     → getSessionUser() + role ∈ {ADMIN,        ││
│  │                            SUPER_ADMIN}                              ││
│  │ app/affiliate/portal/    → getSessionUser() + isAffiliateRole()     ││
│  │   layout.tsx                                                         ││
│  │ All: redirect() on fail + requireEmailVerification()                ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─ API Route Handlers ────────────────────────────────────────────────┐│
│  │ getSessionUser() → reads "session" cookie → verifySession(jwt)     ││
│  │ Role check: if (!user || user.role !== X) → 401/403                ││
│  │ Ownership check: userId / dealerId / affiliateId scoping           ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─ Service Layer ──────────────────────────────────────────────────────┐│
│  │ lib/services/auth.service.ts → signUp / signIn / token creation    ││
│  │ lib/auth.ts         → createSession(jwt) / verifySession(jwt)      ││
│  │ lib/auth-server.ts  → getSession / requireAuth / hash/verify pass  ││
│  │ lib/admin-auth.ts   → admin session, MFA, rate limit, audit log    ││
│  └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─ Database Layer ─────────────────────────────────────────────────────┐│
│  │ Prisma ORM → PostgreSQL (Supabase)                                  ││
│  │ User.email UNIQUE, User.role ENUM, workspaceId FK on most models   ││
│  │ Limited Supabase RLS: AdminAuditLog, AdminLoginAttempt              ││
│  └──────────────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. User Types & Role Model

### 3.1 UserRole Enum (`prisma/schema.prisma` lines 90–96)

| Value          | Description                              |
| -------------- | ---------------------------------------- |
| `BUYER`        | End-user purchasing a vehicle            |
| `DEALER`       | Dealership owner/primary account         |
| `ADMIN`        | Platform administrator                   |
| `AFFILIATE`    | Standalone referral partner              |
| `SYSTEM_AGENT` | Internal system agent (AI, cron, etc.)   |

> **Note:** `DEALER_USER`, `SUPER_ADMIN`, and `AFFILIATE_ONLY` appear in application code (`getRoleBasedRedirect`, layout checks) but are **not** present in the Prisma `UserRole` enum. These are used as logical sub-roles derived from profile tables or conventions.

### 3.2 Identity Models

| Model          | PK   | FK to User     | Tenant FK      | Key Fields                                                   |
| -------------- | ---- | -------------- | -------------- | ------------------------------------------------------------ |
| `User`         | `id` | —              | `workspaceId`  | `email` (unique), `passwordHash`, `role` (UserRole), `is_email_verified`, `mfa_enrolled`, `mfa_secret`, `mfa_factor_id`, `force_password_reset` |
| `BuyerProfile` | `id` | `userId` (1:1) | `workspaceId`  | `firstName`, `lastName`, `phone`, `address`, `annualIncome`, financial fields |
| `Dealer`       | `id` | `userId` (1:1) | `workspaceId`  | `businessName`, `licenseNumber` (unique), `verified`, `integrityScore`, `active` |
| `DealerUser`   | `id` | `userId` (1:1) | `workspaceId`  | `dealerId` (FK → Dealer), `roleLabel`                        |
| `Affiliate`    | `id` | `userId` (1:1) | `workspaceId`  | `referralCode` (unique), `totalEarnings`, `pendingEarnings`  |
| `AdminUser`    | `id` | `userId` (1:1) | `workspaceId`  | `firstName`, `lastName`, `role` (default "ADMIN")            |

### 3.3 Role Determination in Code

Role membership is determined by:

1. **`User.role` enum column** — set at signup, stored in JWT claims.
2. **JWT token claims** — `role`, `is_affiliate`, `workspace_id`, `workspace_mode` embedded at token creation time (`lib/auth.ts: createSession()`).
3. **Profile table existence** — e.g., `DealerUser` join table associates a user with a specific `Dealer` entity; `Affiliate` table holds `referralCode`.
4. **`is_affiliate` boolean on User** — allows `BUYER` role users to also function as affiliates (dual-role pattern checked via `isAffiliateRole()` in `lib/auth-server.ts`).

### 3.4 Workspace/Tenant Model (`prisma/schema.prisma` lines 23–84)

- `Workspace` model with `id`, `name`, `mode` (`LIVE`/`TEST`), `createdBy`.
- Most business entities carry a `workspaceId` FK.
- `WorkspaceMode.TEST` enables mock data paths (`lib/mocks/mockStore.ts` via `mockSelectors`).
- Workspace context is embedded in JWT claims at sign-in.

---

## 4. Session & Token Lifecycle

### 4.1 Token Format

| Property    | Value                                                                  |
| ----------- | ---------------------------------------------------------------------- |
| Algorithm   | HS256 (HMAC-SHA256)                                                    |
| Library     | `jose` (`lib/auth.ts`)                                                 |
| Secret      | `JWT_SECRET` env var                                                   |
| Expiration  | 7 days (`setExpirationTime("7d")`)                                     |
| Claims      | `id`, `userId`, `email`, `role`, `is_affiliate`, `workspace_id`, `workspace_mode` |

### 4.2 Cookie Configuration

#### Session Cookie (`session`)

| Flag       | Value                                | Source                                    |
| ---------- | ------------------------------------ | ----------------------------------------- |
| Name       | `session`                            | `lib/auth-server.ts: setSessionCookie()`  |
| httpOnly   | `true`                               | `lib/utils/cookies.ts: getSessionCookieOptions()` |
| secure     | `true` in production; HTTPS in dev   | `shouldUseSecureCookies()`                |
| sameSite   | `lax`                                | `getSessionCookieOptions()`               |
| maxAge     | `604800` (7 days)                    | `getSessionCookieOptions()`               |
| path       | `/`                                  | `getSessionCookieOptions()`               |
| domain     | `.autolenis.com` in production; unset for localhost/preview | `getCookieDomain()` |

#### Admin Session Cookie (`admin_session`)

| Flag       | Value                                | Source                                    |
| ---------- | ------------------------------------ | ----------------------------------------- |
| Name       | `admin_session`                      | `lib/admin-auth.ts: setAdminSession()`    |
| httpOnly   | `true`                               | `getAdminSessionCookieOptions()`          |
| secure     | `true` in production                 | `shouldUseSecureCookies()`                |
| sameSite   | `strict`                             | `getAdminSessionCookieOptions()`          |
| maxAge     | `86400` (24 hours)                   | `getAdminSessionCookieOptions()`          |
| path       | `/`                                  | `getAdminSessionCookieOptions()`          |
| domain     | `.autolenis.com` in production       | `getCookieDomain()`                       |

#### Affiliate Tracking Cookies

| Name               | httpOnly | maxAge   | Purpose                    |
| ------------------ | -------- | -------- | -------------------------- |
| `autolenis_ref`    | `true`   | 30 days  | Affiliate referral ID      |
| `autolenis_ref_code` | `true` | 30 days  | Referral code for attribution |

### 4.3 Lifecycle

```
Signup/Signin
    │
    ▼
AuthService.signUp/signIn()  →  createSession(jwt)  →  setSessionCookie(token)
                                    │
                                    ▼
                             Cookie "session" = JWT (7d)
                                    │
    ┌───────────────────────────────┘
    ▼
Request arrives
    │
    ▼
getSession()  →  cookies().get("session")  →  verifySession(jwt via jose)
    │                                              │
    ▼                                              ▼
SessionUser { userId, email, role, ... }     Throws on invalid/expired
    │
    ▼
getSessionUser()  →  TEST workspace? → mockSelectors  :  return session
    │
    ▼
Used by layouts + API routes for auth decisions

Logout
    │
    ▼
clearSession()  →  set cookie "" with maxAge=0 + delete cookie
```

**Refresh/Rotation:** None implemented. JWT is issued with a 7-day expiry and is not refreshed or rotated during the session lifetime.

**Revocation:** No server-side session store for regular users (stateless JWT). Admin sessions are database-backed via the `AdminSession` Prisma table and can be revoked via `clearAdminSession()`.

---

## 5. Buyer Auth Flow

### 5.1 Signup

| Step | Endpoint / File | Detail |
| ---- | --------------- | ------ |
| 1. Form submission | `app/auth/signup/page.tsx` | Client-side form with `SignUpForm` component |
| 2. API call | `POST /api/auth/signup` (`app/api/auth/signup/route.ts`) | CORS support, input validated via `signUpSchema` |
| 3. User creation | `lib/services/auth.service.ts: AuthService.signUp()` | Creates `User` (role=BUYER, `is_email_verified: false`) + `BuyerProfile` |
| 4. Referral binding | `AuthService.signUp()` | If `refCode` provided, creates `Referral` record linking to `Affiliate` |
| 5. Email verification | `lib/services/email-verification.service.ts` | Sends verification email with 24h token (SHA-256 hashed for storage) |
| 6. Session creation | `lib/auth.ts: createSession()` | JWT issued, `session` cookie set |
| 7. Redirect | `lib/auth.ts: getRoleBasedRedirect("BUYER", true)` | → `/buyer/onboarding` |

### 5.2 Email Verification

| Step | Endpoint / File | Detail |
| ---- | --------------- | ------ |
| 1. Click link | `GET /api/auth/verify-email?token=...` (`app/api/auth/verify-email/route.ts`) | Validates token, marks `is_email_verified: true` |
| 2. Resend | `POST /api/auth/resend-verification` (`app/api/auth/resend-verification/route.ts`) | Rate-limited (3 req/2min), generic response to prevent enumeration |

### 5.3 Sign-In

| Step | Endpoint / File | Detail |
| ---- | --------------- | ------ |
| 1. Form submission | `app/auth/signin/page.tsx` | Client-side `SignInForm` |
| 2. API call | `POST /api/auth/signin` (`app/api/auth/signin/route.ts`) | Rate-limited (`signin` preset: 10/min prod) |
| 3. Credential check | `AuthService.signIn()` | Queries `User`, bcrypt verify, **enforces email verification** (line 269) |
| 4. Session creation | `createSession()` + `setSessionCookie()` | JWT with `workspace_id`/`workspace_mode` claims |
| 5. Redirect | `getRoleBasedRedirect("BUYER")` | → `/buyer/dashboard` |

### 5.4 Protected Navigation

- `app/buyer/layout.tsx`: `getSessionUser()` → role must be `BUYER` → `requireEmailVerification()` → else `redirect("/auth/signin")`.
- All `app/api/buyer/**` routes: `getSessionUser()` → `user.role !== "BUYER"` → 401.
- Ownership: Buyer API routes scope queries by `userId` from session (e.g., `buyerProfile.userId === session.userId`).

### 5.5 Logout

- `POST /api/auth/signout` (`app/api/auth/signout/route.ts`): Clears `session` cookie with domain-aware options.

### 5.6 Password Reset

- `POST /api/auth/forgot-password`: Rate-limited, calls `passwordResetService.requestPasswordReset(email)`, generic response.
- `POST /api/auth/reset-password`: Validates token, resets password (min 8 chars).

---

## 6. Dealer Auth Flow

### 6.1 Signup

| Step | Detail |
| ---- | ------ |
| Registration | `POST /api/auth/signup` with `role: "DEALER"` — creates `User` + `Dealer` (unverified) |
| Profile setup | `POST /api/dealer/register` — completes dealer profile (businessName, licenseNumber, etc.) |
| Verification | `Dealer.verified` field (default `false`) — admin manually verifies |

### 6.2 Dealer Team Members

- `DealerUser` model links a `User` (role may be `DEALER` or logical `DEALER_USER`) to a `Dealer` via `dealerId`.
- `roleLabel` field on `DealerUser` for display purposes.
- No automated invitation system found — dealer team members are created via admin or direct DB.

### 6.3 Sign-In & Session

- Same sign-in flow as Buyer via `POST /api/auth/signin`.
- On sign-in, `AuthService.signIn()` fetches `Dealer` profile data for the response payload.
- Redirect: `getRoleBasedRedirect("DEALER")` → `/dealer/dashboard`.

### 6.4 Protected Navigation

- `app/dealer/layout.tsx`: `getSessionUser()` → role must be `DEALER` or `DEALER_USER` → `requireEmailVerification()` → else `redirect("/auth/signin")`.
- All `app/api/dealer/**` routes: `getSessionUser()` → role check for `DEALER`/`DEALER_USER` → 401.
- Dealer scoping: API routes query with `userId` to find `Dealer` record, then scope by `dealer.id`.

---

## 7. Affiliate Auth Flow

### 7.1 Signup / Enrollment

| Method | Detail |
| ------ | ------ |
| **Standalone signup** | `POST /api/auth/signup` with `role: "AFFILIATE"` → creates `User` + `Affiliate` with generated `referralCode` |
| **Buyer auto-enroll** | `POST /api/affiliate/enroll` → existing BUYER user gets `Affiliate` record + `is_affiliate: true` flag on User |

### 7.2 Referral Binding

| Mechanism | Detail |
| --------- | ------ |
| Click tracking | `POST /api/affiliate/click` → sets `autolenis_ref` and `autolenis_ref_code` cookies (30-day, httpOnly) |
| Attribution | `POST /api/affiliate/process-referral` → reads referral from URL param or cookie, creates multi-level referral chain (3 levels: 15%/3%/2%) |
| Cookie clearing | Cookies cleared after successful referral attribution |

### 7.3 Dashboard Access

- `app/affiliate/portal/layout.tsx`: `getSessionUser()` → must be `AFFILIATE`, `AFFILIATE_ONLY`, or (`BUYER` with `is_affiliate === true`) → `requireEmailVerification()`.
- All `app/api/affiliate/**` routes: use `getSessionUser()` + `isAffiliateRole(user)` or inline role checks → 401/403.
- Data isolation: Affiliate queries scoped by `affiliate.userId === session.userId`.

### 7.4 Payout Visibility

- Affiliate can only see their own commissions, referrals, and payout records.
- Scoped in API routes via `affiliateId` derived from the authenticated user's `Affiliate` record.

---

## 8. Admin Auth Flow

### 8.1 Admin Account Creation

| Step | Detail |
| ---- | ------ |
| **Bootstrap** | `POST /api/admin/auth/signup` — requires either a valid admin session OR the `ADMIN_BOOTSTRAP_SECRET` env var (for first admin creation) |
| **Password policy** | 8+ chars, must contain uppercase + lowercase + number |
| **Email** | Set `is_email_verified: true` by default for admin accounts |
| **Rate limiting** | `strict` preset (10 req/min) |

### 8.2 Admin Sign-In

| Step | Detail |
| ---- | ------ |
| 1. API call | `POST /api/admin/auth/signin` (`app/api/admin/auth/signin/route.ts`) |
| 2. Rate limiting | `strict` preset + CacheAdapter-backed login attempt tracking (5 attempts / 15min lockout via `lib/admin-auth.ts: checkRateLimit()`) |
| 3. Role verification | User must have `ADMIN` or `SUPER_ADMIN` role (`getAdminUser()` filters by role) |
| 4. Session creation | Dual cookies: `session` (JWT, 7d) + `admin_session` (database-backed session ID, 24h, `sameSite: strict`) |
| 5. Audit logging | `logAdminAction("admin_signin", ...)` → writes to `AdminAuditLog` table |
| 6. MFA check | If `mfa_enrolled`, admin session stores `mfaVerified: false` in AdminSession table until TOTP verified |

### 8.3 MFA (TOTP)

| Endpoint | Function |
| -------- | -------- |
| `POST /api/auth/mfa/enroll` | Generates TOTP secret, stores pending on User, returns QR code URL |
| `POST /api/auth/mfa/verify` | Validates 6-digit TOTP code (±1 time window for clock drift), marks `mfa_enrolled: true` |
| `POST /api/auth/mfa/disable` | Requires password + valid TOTP code, clears MFA fields |

- MFA rate limiting: 3 attempts per 15 minutes (`lib/admin-auth.ts: checkMfaRateLimit()`).
- TOTP implementation: Custom Base32-decode + simplified HMAC (not RFC 6238-compliant; see Known Risks §11).

### 8.4 Protected Navigation

- `app/admin/layout.tsx`: Public routes bypass auth (sign-in, signup, MFA pages). All other routes: `getSessionUser()` → role must be `ADMIN` or `SUPER_ADMIN` → `requireEmailVerification()` → else `redirect("/admin/sign-in")`.
- All `app/api/admin/**` routes: `getSessionUser()` + `isAdminRole(user.role)` → 401.

### 8.5 Impersonation

- **UI planned**: `app/admin/support/page.tsx` has a "View As Buyer/Dealer" UI component.
- **No backend endpoint found** — impersonation is not implemented at the API level. This is UI-only and non-functional.

### 8.6 Audit Logging

- `lib/admin-auth.ts: logAdminAction()` → writes to `AdminAuditLog` table.
- Logged actions: `admin_signin`, `admin_signup`, `admin_signout`, MFA events, financial operations.
- `FinancialAuditLog` model tracks admin actions on financial entities (refunds, reconciliation, exports).

---

## 9. Route & API Protection Map

### 9.1 Edge Middleware

**No `middleware.ts` file exists at the project root.** There is no Edge middleware route protection. The `lib/auth-edge.ts` module provides an edge-compatible JWT verifier (`verifySessionEdge()`) but it is not wired to any middleware. A test file exists at `__tests__/middleware.test.ts`.

### 9.2 Layout Gating (Server Components)

| Layout File | Auth Function | Allowed Roles | Redirect Target | Email Verification |
| ----------- | ------------- | ------------- | --------------- | ------------------ |
| `app/buyer/layout.tsx` | `getSessionUser()` | `BUYER` | `/auth/signin` | `requireEmailVerification()` |
| `app/dealer/layout.tsx` | `getSessionUser()` | `DEALER`, `DEALER_USER` | `/auth/signin` | `requireEmailVerification()` |
| `app/admin/layout.tsx` | `getSessionUser()` | `ADMIN`, `SUPER_ADMIN` | `/admin/sign-in` | `requireEmailVerification()` |
| `app/affiliate/portal/layout.tsx` | `getSessionUser()` | `AFFILIATE`, `AFFILIATE_ONLY`, `BUYER` (with `is_affiliate`) | `/affiliate?signin=required` | `requireEmailVerification()` |
| `app/auth/layout.tsx` | None | All | — | — |

### 9.3 API Route Protection

#### Auth Endpoints (`app/api/auth/`)

| Route | Method | Rate Limit | Auth Required | Notes |
| ----- | ------ | ---------- | ------------- | ----- |
| `/api/auth/signup` | POST | `auth` (5/15min) | No | Public signup |
| `/api/auth/signin` | POST | `signin` (10/min) | No | Public signin |
| `/api/auth/signout` | POST, GET | — | Yes (reads cookie) | Clears session |
| `/api/auth/me` | GET | — | Yes | Returns current user |
| `/api/auth/verify-email` | GET | — | No | Token-based |
| `/api/auth/resend-verification` | POST | `resendVerification` (3/2min) | No | Email-based |
| `/api/auth/forgot-password` | POST | Rate-limited | No | Generic response |
| `/api/auth/reset-password` | GET, POST | — | No | Token-based |
| `/api/auth/change-password` | POST | — | Yes | Session required |
| `/api/auth/mfa/enroll` | POST | — | Yes | Session required |
| `/api/auth/mfa/verify` | POST | — | Yes | MFA rate-limited (3/15min) |
| `/api/auth/mfa/disable` | POST | — | Yes | Requires password + TOTP |

#### Admin Auth Endpoints (`app/api/admin/auth/`)

| Route | Method | Rate Limit | Auth Required | Notes |
| ----- | ------ | ---------- | ------------- | ----- |
| `/api/admin/auth/signup` | POST | `strict` (10/min) | Admin session OR bootstrap secret | First admin bootstrapping |
| `/api/admin/auth/signin` | POST | `strict` (10/min) | No | Admin-only credentials |
| `/api/admin/auth/signout` | POST | — | Yes | Clears both cookies |

#### Buyer API Routes (`app/api/buyer/**`)

- **Guard pattern:** `getSessionUser()` → `user.role !== "BUYER"` → `{ error: "Unauthorized", status: 401 }`
- **Ownership scoping:** Queries filtered by `userId` from session to find buyer's `BuyerProfile`, deals, etc.
- **Key routes:** `/prequal`, `/shortlist`, `/deals`, `/contracts`, `/documents`, `/insurance`, `/auction`

#### Dealer API Routes (`app/api/dealer/**`)

- **Guard pattern:** `getSessionUser()` → `!["DEALER", "DEALER_USER"].includes(user.role)` → `{ error: "Unauthorized", status: 401 }`
- **Ownership scoping:** Queries filtered by `userId` → `Dealer.userId` to find dealer entity, then scope by `dealerId`.
- **Key routes:** `/register`, `/settings`, `/auctions`, `/inventory`, `/offers`, `/contracts`, `/pickups`

#### Affiliate API Routes (`app/api/affiliate/**`)

- **Guard pattern:** `getSessionUser()` + `isAffiliateRole(user)` or `getAffiliateAccess(user)` → `{ error: "Unauthorized"/"Forbidden", status: 401/403 }`
- **Ownership scoping:** Queries scoped by `affiliate.userId` from session.
- **Key routes:** `/analytics`, `/settings`, `/documents`, `/enroll`, `/click`, `/process-referral`, `/payouts`

#### Admin API Routes (`app/api/admin/**`)

- **Guard pattern:** `getSessionUser()` + `isAdminRole(user.role)` → `{ error: "Unauthorized", status: 401 }`
- **Key routes:** `/users`, `/dealers`, `/buyers`, `/affiliates`, `/financial`, `/compliance`, `/reports`, `/contracts`, `/ai`

#### Webhook Routes (`app/api/webhooks/`)

- **Stripe:** `app/api/webhooks/stripe/route.ts` — signature verification via `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`.
- **eSign:** `app/api/esign/webhook/` — signature verification via `ESIGN_WEBHOOK_SECRET`.
- **Cron:** `lib/middleware/cron-security.ts: validateCronRequest()` — `Authorization: Bearer {CRON_SECRET}` + IP whitelist (Vercel Cron IPs).

### 9.4 Guard Functions Reference

| Function | File | Purpose |
| -------- | ---- | ------- |
| `getSession()` | `lib/auth-server.ts` | Reads `session` cookie, verifies JWT, returns `SessionUser \| null` |
| `getSessionUser()` | `lib/auth-server.ts` | Calls `getSession()`, handles TEST workspace mocks |
| `requireAuth(allowedRoles?)` | `lib/auth-server.ts` | Throws 401 (no session) or 403 (wrong role) |
| `getCurrentUser()` | `lib/auth-server.ts` | Returns user object from session |
| `isAdminRole(role)` | `lib/auth-server.ts` | Returns `true` for `ADMIN` or `SUPER_ADMIN` |
| `isAffiliateRole(user)` | `lib/auth-server.ts` | Returns `true` for `AFFILIATE`, `AFFILIATE_ONLY`, or `BUYER` with `is_affiliate` |
| `verifySession(token)` | `lib/auth.ts` | JWT verification via `jose.jwtVerify()` |
| `verifySessionEdge(token)` | `lib/auth-edge.ts` | Edge-compatible JWT verification via Web Crypto API |
| `createSession(user)` | `lib/auth.ts` | JWT signing via `jose.SignJWT` |
| `setSessionCookie(token)` | `lib/auth-server.ts` | Sets `session` cookie with domain-aware options |
| `clearSession()` | `lib/auth-server.ts` | Clears `session` cookie |
| `requireEmailVerification(userId, context)` | `lib/auth-utils.ts` | Redirects to verification page if email not verified |
| `checkRateLimit(id)` | `lib/admin-auth.ts` | CacheAdapter-backed login attempt tracking (admin) |
| `rateLimit(req, config)` | `lib/middleware/rate-limit.ts` | IP-based rate limiting for API routes |
| `validateCronRequest(req)` | `lib/middleware/cron-security.ts` | Cron webhook auth + IP whitelist |
| `getAdminSession()` | `lib/admin-auth.ts` | Reads `admin_session` cookie, looks up database-backed session (AdminSession table) |
| `logAdminAction(action, details)` | `lib/admin-auth.ts` | Writes to `AdminAuditLog` table |

---

## 10. Authorization Rules (RBAC/ABAC)

### 10.1 Model

AutoLenis uses a **hybrid RBAC + ownership-based (ABAC) authorization model**:

- **RBAC**: Role checked at every API route handler (`user.role === "BUYER"`, `isAdminRole()`, etc.).
- **ABAC/Ownership**: After role check, queries are scoped by the user's identity (e.g., `buyerProfile.userId`, `dealer.userId`, `affiliate.userId`).

### 10.2 Authorization Rules Matrix

| Actor | Action | Ownership Rule | Enforcement Location |
| ----- | ------ | -------------- | -------------------- |
| **Buyer** | View/edit own prequal | `buyerProfile.userId === session.userId` | `app/api/buyer/prequal/route.ts` |
| **Buyer** | View/manage own shortlist | `shortlist.buyerProfileId` → buyer's profile | `app/api/buyer/shortlist/route.ts` |
| **Buyer** | View/manage own deals | `selectedDeal.buyerProfileId` → buyer's profile | `app/api/buyer/deals/route.ts` |
| **Buyer** | View own contracts | Scoped by buyer's deal | `app/api/buyer/contracts/route.ts` |
| **Buyer** | Access affiliate portal | `user.is_affiliate === true` + Affiliate record exists | `isAffiliateRole()` check |
| **Dealer** | View/manage own inventory | `inventory.dealerId` → dealer's entity | `app/api/dealer/inventory/route.ts` |
| **Dealer** | Participate in auctions | `auctionParticipant.dealerId` → dealer's entity | `app/api/dealer/auctions/route.ts` |
| **Dealer** | Submit offers | `offer.dealerId` → dealer's entity | `app/api/dealer/offers/route.ts` |
| **Dealer** | View assigned deals | `deal.dealerId` → dealer's entity | `app/api/dealer/deals/route.ts` + `DealVisibilityGuard` |
| **Affiliate** | View own referrals | `referral.affiliateId` → affiliate's entity | `app/api/affiliate/analytics/route.ts` |
| **Affiliate** | View own commissions | `commission.affiliateId` → affiliate's entity | `app/api/affiliate/analytics/route.ts` |
| **Affiliate** | View own payouts | `payout.affiliateId` → affiliate's entity | `app/api/affiliate/payouts/route.ts` |
| **Admin** | View all users | Global access — `isAdminRole()` check only | `app/api/admin/users/route.ts` |
| **Admin** | Manage financial data | Global access + `FinancialAuditLog` written | `app/api/admin/financial/route.ts` |
| **Admin** | Override contracts | `isAdminRole()` + `ContractShieldOverride` record | `app/api/admin/contracts/route.ts` |
| **Admin** | Manage compliance | Global access | `app/api/admin/compliance/route.ts` |

### 10.3 Admin Segmentation

- Two admin sub-roles exist in code: `ADMIN` and `SUPER_ADMIN`.
- Both are treated identically by `isAdminRole()` — no privilege differentiation found between them.
- `AdminUser.role` field defaults to `"ADMIN"` but can be set to `"SUPER_ADMIN"`.

---

## 11. Edge Cases & Known Risks

### 11.1 No Edge Middleware — All Route Protection at Application Layer

- **File:** No `middleware.ts` at project root
- **Risk:** Without Edge middleware, every API route handler must independently perform auth checks. A single missing check creates an unauthenticated endpoint. The `lib/auth-edge.ts` module is implemented but not wired to any middleware.
- **Impact:** Medium — requires discipline in every new route; no centralized enforcement.

### 11.2 TOTP Implementation Is Not RFC 6238-Compliant

- **File:** `lib/admin-auth.ts` lines 299–339
- **Risk:** The `generateTotpCode()` function uses a simplified HMAC implementation (`hash = ((hash << 5) - hash + byte) | 0`) instead of proper HMAC-SHA1. This produces deterministic codes but may not interoperate with standard authenticator apps (Google Authenticator, Authy, 1Password).
- **Impact:** High — MFA may not work correctly with standard TOTP apps, reducing actual security posture.

### 11.3 No CSRF Protection

- **Search:** `rg "csrf"` — no results.
- **Risk:** Session cookies use `sameSite: lax` which provides partial CSRF protection for state-changing requests (POST/PUT/DELETE from cross-origin are blocked). However, GET-based state changes and same-site POST attacks are not mitigated.
- **Impact:** Low-Medium — `sameSite: lax` mitigates most vectors; remaining risk is limited to same-site attacks.

### 11.4 In-Memory Rate Limiting

- **File:** `lib/admin-auth.ts` (login attempts, MFA attempts — rate limiting via CacheAdapter)
- **File:** `lib/middleware/rate-limit.ts` (API rate limit store)
- **Risk:** Without Redis (REDIS_URL), rate limiting falls back to in-memory `Map` stores. In multi-instance/serverless deployments (Vercel), each instance has its own store. Rate limits are not shared across instances.
- **Impact:** Medium — rate limits can be bypassed by hitting different instances. (Admin sessions are unaffected; they are database-backed via the AdminSession table.)

### 11.5 No Token Refresh or Rotation

- **File:** `lib/auth.ts: createSession()` — 7-day expiry, no refresh mechanism.
- **Risk:** Compromised JWT remains valid for the full 7-day lifetime with no ability to revoke (stateless). No refresh token pattern to limit exposure window.
- **Impact:** Medium — extended exposure window for stolen tokens.

### 11.6 `DEALER_USER` / `SUPER_ADMIN` / `AFFILIATE_ONLY` Not in Prisma Enum

- **File:** `prisma/schema.prisma` UserRole enum vs. `lib/auth.ts: getRoleBasedRedirect()`, layout checks.
- **Risk:** Code references `DEALER_USER`, `SUPER_ADMIN`, and `AFFILIATE_ONLY` roles that do not exist in the database enum. Users with these roles cannot be created via Prisma — they exist only as conventions in application logic.
- **Impact:** Low — but may cause confusion; `DealerUser` table provides the `DEALER_USER` context, `AdminUser.role` field provides `SUPER_ADMIN`.

### 11.7 Missing Rate Limits on Some Sensitive Endpoints

- **Endpoints without rate limiting:**
  - `POST /api/auth/change-password` (authenticated, but no rate limit)
  - `POST /api/auth/mfa/enroll` (no API-level rate limit; MFA attempts rate-limited separately)
  - `POST /api/auth/reset-password` (token-based, but no rate limit on token attempts)
- **Impact:** Low — these require auth or tokens, but brute-force protection is still advisable.

### 11.8 Inconsistent 401 vs 403 Response Codes

- **Files:** Various API routes.
- **Risk:** Most routes return `401` for both "not authenticated" and "wrong role" scenarios. Some affiliate routes correctly use `403` for authorization failures (`isAffiliateRole()` check). The `requireAuth()` function in `lib/auth-server.ts` correctly differentiates (401 for no session, 403 for wrong role), but most route handlers use inline checks that always return 401.
- **Impact:** Low — incorrect status codes affect client error handling but not security.

### 11.9 Admin Impersonation UI Without Backend

- **File:** `app/admin/support/page.tsx`
- **Risk:** UI component for "View As Buyer/Dealer" exists but no backend API endpoint enforces permissions or creates impersonation sessions. If a backend is added later without proper controls, it could be a privilege escalation vector.
- **Impact:** Low (currently non-functional) — document for when implementation proceeds.

### 11.10 Orphaned Profiles

- **Risk:** If `User` creation succeeds but profile creation fails (e.g., `BuyerProfile` insert error in `AuthService.signUp()`), a `User` record exists without a profile. The signup throws an error, but the `User` row is not rolled back (no transaction).
- **File:** `lib/services/auth.service.ts` lines 64–113.
- **Impact:** Medium — orphaned users cannot sign in properly; admin cleanup required.

### 11.11 Supabase RLS Coverage Is Partial

- **Files:** `migrations/94-add-admin-mfa-fields.sql`
- **Risk:** RLS policies exist only for `AdminAuditLog` and `AdminLoginAttempt`. All other tables rely on application-layer authorization. Direct Supabase client access (if exposed) could bypass application checks.
- **Impact:** Low — Supabase admin client uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS; server-side Supabase client uses anon key, but all sensitive operations go through Prisma or admin client.

---

## 12. Security Hardening Checklist

| # | Item | Current State | Where to Apply |
| - | ---- | ------------- | -------------- |
| 1 | **Add Edge middleware** for centralized route protection | Missing | Create `middleware.ts` at project root; wire `verifySessionEdge()` from `lib/auth-edge.ts` |
| 2 | **Replace custom TOTP implementation** with RFC 6238-compliant library | Simplified HMAC in `lib/admin-auth.ts:299-339` | Use `otpauth` or `@simplewebauthn/server` TOTP utilities |
| 3 | **Migrate rate limiting to Redis** for serverless compatibility | CacheAdapter in `lib/middleware/rate-limit.ts`, `lib/admin-auth.ts`; requires REDIS_URL in production | Ensure REDIS_URL is configured in production; adapter already supports Redis |
| 4 | **Add JWT refresh/rotation** mechanism | No refresh; 7-day static JWT | `lib/auth.ts` — add refresh endpoint and short-lived access token + refresh token pattern |
| 5 | **Implement CSRF tokens** for state-changing forms | None beyond `sameSite: lax` | Add CSRF middleware or use `next-csrf` package for form submissions |
| 6 | **Add rate limiting** to password change and reset endpoints | Missing on `/api/auth/change-password`, `/api/auth/reset-password` | Apply `rateLimits.auth` or `rateLimits.strict` preset |
| 7 | **Standardize 401 vs 403 responses** across all API routes | Inconsistent; most return 401 for both | Refactor inline auth checks to use `requireAuth(allowedRoles)` which correctly returns 401/403 |
| 8 | **Add transactions for signup** to prevent orphaned users | No transaction wrapping in `AuthService.signUp()` | Wrap user + profile creation in Prisma `$transaction()` or Supabase RPC |
| 9 | **Expand Supabase RLS** to cover all user-facing tables | Only `AdminAuditLog`, `AdminLoginAttempt` covered | Add RLS policies for `BuyerProfile`, `Dealer`, `Affiliate`, `SelectedDeal`, etc. |
| 10 | **Differentiate `ADMIN` vs `SUPER_ADMIN` privileges** | Both treated identically by `isAdminRole()` | Define privilege matrix and add `SUPER_ADMIN`-only guards where needed |
| 11 | **Add audit logging for buyer/dealer auth events** | Only admin actions logged to `AdminAuditLog` | Extend `logAdminAction()` or create general `AuthEventLog` for all user types |
| 12 | **Implement open redirect defense** in callback URLs | No validation found on redirect targets in auth flows | Validate redirect URLs against allowed origins in signin/signout handlers |

---

## Appendix A: Auth-Related Environment Variable Keys

Source: `.env.example`

| Key | Purpose |
| --- | ------- |
| `JWT_SECRET` | HMAC signing key for session JWTs |
| `ADMIN_BOOTSTRAP_SECRET` | One-time secret for first admin account creation |
| `NEXTAUTH_URL` | NextAuth base URL (legacy/unused in active flows) |
| `NEXTAUTH_SECRET` | NextAuth secret (legacy/unused in active flows) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public, RLS-bound) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS — server only) |
| `SUPABASE_URL` | Supabase URL (server-side) |
| `POSTGRES_PRISMA_URL` | Direct PostgreSQL connection for Prisma |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `ESIGN_WEBHOOK_SECRET` | E-sign provider webhook verification |
| `CRON_SECRET` | Vercel Cron job authorization bearer token |
| `INTERNAL_API_KEY` | Internal service-to-service API key |
| `RESEND_API_KEY` | Resend email service API key |

## Appendix B: Auth Packages from `package.json`

| Package | Version | Purpose |
| ------- | ------- | ------- |
| `next-auth` | `4.24.13` | Listed but not actively used for session management |
| `@auth/core` | `0.34.3` | Auth.js core (listed, minimal use) |
| `@supabase/supabase-js` | `2.49.8` | Supabase client for DB access and auth |
| `@supabase/ssr` | `0.6.1` | Supabase SSR helpers for cookie-based auth |
| `jose` | (transitive) | JWT signing and verification (HS256) |
| `bcryptjs` | (dep) | Password hashing (10 salt rounds) |
| `@simplewebauthn/browser` | (dep) | WebAuthn/passkey support (client-side) |
| `@simplewebauthn/server` | (dep) | WebAuthn/passkey support (server-side) |
| `stripe` | (dep) | Payment processing + webhook verification |
| `resend` | `6.5.2` | Email delivery (verification, notifications) |
