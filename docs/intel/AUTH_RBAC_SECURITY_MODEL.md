# AUTH_RBAC_SECURITY_MODEL.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## Authentication Mechanisms

### Primary: JWT (HS256)
- **Library:** `jose` (for Node.js runtime) + Web Crypto API (for Edge runtime)
- **Token creation:** `lib/auth.ts:createSession()` — signs with `JWT_SECRET`, 7-day expiry, HS256 algorithm
- **Token verification (Node):** `lib/auth.ts:verifySession()` — decodes and validates JWT
- **Token verification (Edge):** `lib/auth-edge.ts:verifySessionEdge()` — uses Web Crypto `HMAC` + `SHA-256` for Edge-compatible verification
- **Session storage:** JWT stored in `session` cookie (HttpOnly, SameSite=Lax, Secure in production)
- **Cookie options:** Defined in `lib/utils/cookies.ts` — domain-aware for admin subdomain support

### Admin-Specific Auth
- **Separate session:** `admin_session` cookie → database-backed via `AdminSession` Prisma table in `lib/admin-auth.ts`
- **MFA (TOTP):** `lib/admin-auth.ts:generateTotpSecret()`, `verifyTotp()`, `saveMfaSecret()` — base32 secret, 30s window, ±1 drift tolerance
- **MFA flow:** Enroll → store secret in `User.mfa_secret` → challenge → verify TOTP code → set `mfaVerified=true` in session
- **Brute-force protection:** `checkRateLimit()` — 5 attempts / 15 min → 15 min lockout. MFA: 3 attempts / 15 min. (`lib/admin-auth.ts:12-20`)
- **Login attempts:** `AdminLoginAttempt` model stores persistent attempt records
- **Bootstrap:** First admin created via `ADMIN_BOOTSTRAP_SECRET` env var + `/api/admin/auth/signup`

### NextAuth (Legacy/Fallback)
- **Route:** `app/api/auth/[...nextauth]/route.ts`
- **Config:** Uses `NEXTAUTH_URL` and `NEXTAUTH_SECRET` env vars
- **Status:** Present but primary auth flow uses custom JWT system

### Supabase Auth (Infrastructure)
- **Server client:** `lib/supabase/server.ts`
- **Admin client:** `lib/supabase/admin.ts` (service-role key)
- **Browser client:** `lib/supabase/client.ts`
- **Usage:** Used as database layer (Supabase as Postgres host); auth primitives are custom JWT-based, not Supabase Auth

## Role Taxonomy

### Roles (from `UserRole` enum + runtime extensions)
| Role | Source | Description |
|------|--------|------------|
| `BUYER` | DB enum | Car buyer |
| `DEALER` | DB enum | Dealer primary account |
| `DEALER_USER` | Runtime | Sub-user of a dealership (via `DealerUser` model) |
| `ADMIN` | DB enum | Platform administrator |
| `SUPER_ADMIN` | Runtime | Elevated admin (checked in middleware) |
| `AFFILIATE` | DB enum | Affiliate partner |
| `AFFILIATE_ONLY` | Runtime | Pure affiliate (not also a buyer) |
| `SYSTEM_AGENT` | DB enum | AI system agent |

### Role Detection
- **Primary:** `User.role` field in database, embedded in JWT at sign-in
- **Affiliate dual-role:** `session.is_affiliate` flag allows buyers to also access affiliate portal
- **Dealer sub-users:** `DealerUser.userId` links to `User`, runtime treats as `DEALER_USER`
- **Role detection utility:** `lib/utils/role-detection.ts`
- **Mock roles:** `mock_role` cookie set for TEST workspace users navigating `/test/*` routes (`proxy.ts:115-125`)

## Middleware Enforcement (Edge)

### File: `proxy.ts` (exported as `proxy()`, used as Next.js middleware)

#### Public Routes (No Auth Required)
```
/, /how-it-works, /pricing, /contact, /dealer-application, /affiliate,
/refinance, /auth/*, /legal/*, /about, /privacy, /terms, /faq,
/contract-shield, /insurance, /for-dealers, /ref/*
```
Plus admin public routes: `/admin/sign-in`, `/admin/signup`, `/admin/mfa/*`

#### Middleware Flow
1. **Affiliate tracking:** If `?ref=` param on `/`, set `affiliate_ref` cookie (30 days) + track click
2. **Admin subdomain rewrite:** `admin.*` hostname → prepend `/admin` to path
3. **Public route check:** Skip auth for public routes, API routes, `_next/*`
4. **Token extraction:** Read `session` cookie (with fallback to raw `Cookie` header parsing)
5. **No token → redirect:** Admin paths → `/admin/sign-in`; others → `/auth/signin?redirect=<path>`
6. **Token verification:** `verifySessionEdge(token)` — validate JWT signature + expiry
7. **TEST workspace guard:** `/test/*` only accessible if `session.workspace_mode === "TEST"`
8. **Role-based access:**
   - `/buyer/*` → must be `BUYER`
   - `/dealer/*` → must be `DEALER` or `DEALER_USER`
   - `/admin/*` → must be `ADMIN` or `SUPER_ADMIN`
   - `/affiliate/portal/*` → must be `AFFILIATE`, `AFFILIATE_ONLY`, or `BUYER` with `is_affiliate=true`
9. **Wrong role → redirect** to role-appropriate dashboard

**Evidence:** `proxy.ts:90-145` (RBAC checks), `proxy.ts:59-82` (public route list)

## API-Level Enforcement

### Pattern: `getSession()` / `getSessionUser()` in Route Handlers

Most API routes follow this pattern:
```typescript
const session = await getSession()
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
```

**Evidence:** 180+ route files reference `getSession` (grep count across `app/api/**/*.ts`)

### Admin API Routes
- Call `getSession()` from `lib/auth-server.ts`
- Check `session.role` against `["ADMIN", "SUPER_ADMIN"]`
- Some use `getAdminSession()` from `lib/admin-auth.ts` for MFA-verified admin sessions

### Buyer/Dealer API Routes
- Call `getSession()` and verify role matches expected persona
- Example: Buyer routes check `session.role === "BUYER"`

### External Pre-Approval API Routes
- **Buyer endpoints** (`/api/buyer/prequal/external`): Call `getSessionUser()`, verify `role === "BUYER"`. Submissions scoped to `user.userId` — buyers can only see/create their own.
- **Admin endpoints** (`/api/admin/external-preapprovals/*`): Call `getSessionUser()` + `isAdminRole(user.role)`. Only ADMIN/SUPER_ADMIN can list, review, and access documents.
- **Document endpoint** (`/api/admin/external-preapprovals/[id]/document`): ADMIN-only. Returns time-limited signed URLs (1-hour TTL) via Supabase private storage. No public URLs exposed.
- **RBAC isolation**: Buyers cannot see other buyers' submissions. Dealers and Affiliates have no access to any external pre-approval endpoint. Admin sees all submissions across workspace.
- **File upload security**: OWASP-aligned — allowlist MIME types (PDF/PNG/JPEG), 10MB size limit, random UUID filenames (not user-provided), SHA-256 integrity hash, extension-MIME validation, private storage bucket only.

### Affiliate API Routes
- Call `getSession()` and verify affiliate status
- Data isolation: Queries filter by `affiliateId` derived from session, never from client input

## Workspace Isolation

### Mechanism: `lib/workspace-scope.ts`

#### Key Functions:
| Function | Purpose | Evidence |
|----------|---------|---------|
| `workspaceScope(session)` | Extracts `workspace_id` from session; throws if missing | `lib/workspace-scope.ts:34-45` |
| `workspaceFilter(session)` | Returns a function that auto-appends `.eq("workspaceId", id)` to queries | `lib/workspace-scope.ts:54-60` |
| `workspaceInsert(session)` | Returns `{ workspaceId }` for spreading into insert payloads | `lib/workspace-scope.ts:69-73` |

#### Enforcement:
- Every domain model has a `workspaceId` field (FK to `Workspace`)
- `Workspace.mode` is `LIVE` or `TEST` — controls test mode behavior
- `lib/app-mode.ts:isTestWorkspace()` checks session for `workspace_mode === "TEST"`
- In TEST workspace, mock data is served via `lib/mocks/mockStore.ts`

#### RLS Note (from `lib/workspace-scope.ts:8-13`):
> When using Supabase with Row-Level Security, the application MUST set `SET LOCAL app.workspace_id = '<workspace_id>'` before every query. When using service-role client (bypasses RLS), application-level filters are the primary guard.

## Rate Limiting

### Implementation: `lib/middleware/rate-limit.ts`

| Preset | Max Requests | Window | Used By |
|--------|-------------|--------|---------|
| `auth` | 5 | 15 min | Auth endpoints |
| `signin` | 10 (prod) / 50 (dev) | 1 min | Sign-in endpoint |
| `api` | 100 | 1 min | General API |
| `strict` | 10 | 1 min | Abuse-prone endpoints |
| `resendVerification` | 3 | 2 min | Resend verification |

**Storage:** CacheAdapter — Redis when `REDIS_URL` is set (required in production); in-memory fallback for dev/test only
**Key:** IP address from `x-forwarded-for` or `request.ip`
**Distributed:** Yes — rate limit state shared across instances via Redis. Auth presets (`auth`, `signin`) fail closed with 503 if Redis is unavailable in production.

### Admin-Specific Rate Limiting
- Login: 5 attempts / 15 min → 15 min lockout (`lib/admin-auth.ts:checkRateLimit()`)
- MFA: 3 attempts / 15 min (`lib/admin-auth.ts:checkMfaRateLimit()`)
- **Storage:** CacheAdapter (Redis in production, in-memory for dev/test). Both `checkRateLimit` and `checkMfaRateLimit` call `ensureSecureCache()` to fail closed without Redis.

## Cron Security

### Implementation: `lib/middleware/cron-security.ts`

1. **Secret verification:** `Authorization: Bearer <CRON_SECRET>` header
2. **IP allowlist (production only):** Vercel Cron IP ranges (`76.76.21.0/24`)
3. **Usage:** Called by cron route handlers before processing

**Evidence:** `lib/middleware/cron-security.ts:38-67`

## Webhook Security

### Stripe Webhook
- **Signature verification:** `lib/stripe.ts:constructWebhookEvent()` — uses `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
- **Evidence:** `app/api/webhooks/stripe/route.ts:13-24`

### E-Sign Webhook
- **Secret:** `ESIGN_WEBHOOK_SECRET` env var
- **Routes:** `/api/esign/webhook`, `/api/esign/provider-webhook`

## Threat Model Summary

| # | Threat | Mitigation | Status | Evidence |
|---|--------|-----------|--------|---------|
| 1 | Brute-force login | Rate limiting (5/15m), account lockout | ✅ Implemented | `lib/admin-auth.ts`, `lib/middleware/rate-limit.ts` |
| 2 | JWT forgery | HS256 signature verification; secret from env | ✅ Implemented | `lib/auth.ts`, `lib/auth-edge.ts` |
| 3 | Token expiry bypass | 7-day expiry enforced in `verifySessionEdge()` | ✅ Implemented | `lib/auth-edge.ts:55-58` |
| 4 | Cross-workspace data leak | `workspaceScope()` extracts workspace_id from session (never client) | ✅ Implemented | `lib/workspace-scope.ts` |
| 5 | Privilege escalation | Middleware enforces role→path mapping; API handlers re-check role | ✅ Implemented | `proxy.ts:90-145` |
| 6 | Stripe webhook replay | `PaymentProviderEvent.eventId` unique index enables dedup | ✅ Implemented | `prisma/schema.prisma` |
| 7 | CSRF on mutations | SameSite cookie policy; API routes use POST for mutations | ⚠️ Partial | Cookie is SameSite=Lax |
| 8 | Rate limit bypass (distributed) | In-memory store; not effective across serverless instances | ⚠️ Gap | `lib/middleware/rate-limit.ts:12` |
| 9 | Admin session hijacking | Database-backed session store (AdminSession table); persistent and durable | ✅ Resolved | `lib/admin-auth.ts` |
| 10 | MFA bypass | TOTP implementation is custom (not battle-tested library) | ⚠️ Risk | `lib/admin-auth.ts:220-280` |
| 11 | Missing CORS policy | No explicit CORS configuration found | ⚠️ Gap | Next.js defaults |
| 12 | API routes unprotected | API routes pass through middleware without auth check (fast-path at line ~88) | ⚠️ Design | `proxy.ts:87-89` — API auth is handler-level only |
