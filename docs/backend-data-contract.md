# AutoLenis Backend Data Contract

> **Status:** Authoritative — All backend code MUST conform to this contract.

## 1. Canonical Field Names

### BuyerProfile (Prisma model)

| Canonical Field | Type | Notes |
|---|---|---|
| `firstName` | String | |
| `lastName` | String | |
| `phone` | String? | |
| `address` | String | Primary street address |
| `city` | String | |
| `state` | String | |
| `zip` | String | Legacy postal code field |
| `dateOfBirth` | DateTime? | |
| `addressLine2` | String? | |
| `postalCode` | String? | Canonical postal code |
| `country` | String? | Default "US" |
| `monthlyIncomeCents` | Int? | Monthly income in cents |
| `monthlyHousingCents` | Int? | Monthly housing cost in cents |

### PreQualification (Prisma model)

| Canonical Field | Type | Notes |
|---|---|---|
| `status` | String? | ACTIVE, EXPIRED, REVOKED, FAILED |
| `creditScore` | Int? | |
| `creditTier` | CreditTier | EXCELLENT, GOOD, FAIR, POOR |
| `maxOtd` | Float | Max out-the-door price |
| `maxOtdAmountCents` | Int? | Cents equivalent |
| `estimatedMonthlyMin` | Float | |
| `estimatedMonthlyMax` | Float | |
| `minMonthlyPaymentCents` | Int? | |
| `maxMonthlyPaymentCents` | Int? | |
| `dti` | Float? | Debt-to-income raw |
| `dtiRatio` | Float? | Normalized DTI ratio |
| `source` | PreQualSource | INTERNAL, EXTERNAL_MANUAL |
| `providerName` | String? | Display name of provider |
| `providerReferenceId` | String? | External reference |
| `rawResponseJson` | Json? | Full provider response |
| `expiresAt` | DateTime | |

## 2. Forbidden Legacy Field Names

These snake_case names MUST NOT appear in `app/` or `lib/services/` code:

- `date_of_birth` → use `dateOfBirth`
- `address_line1` → use `address`
- `address_line_1` → use `address`
- `postal_code` → use `postalCode`
- `monthly_income_cents` → use `monthlyIncomeCents`
- `monthly_housing_cents` → use `monthlyHousingCents`
- `provider_name` → use `providerName` (except in raw SQL for non-Prisma tables)

**Allowed exceptions:**
- `migrations/` directory (SQL scripts)
- `prisma/` directory (`@map` directives)
- `__tests__/` directory (test files checking for these patterns)
- `scripts/` directory (utility scripts)
- Raw SQL strings for non-Prisma tables (e.g., `credit_consent_events`)

## 3. Privileged Data Access

| Access Layer | Function | Usage |
|---|---|---|
| Prisma ORM | `prisma` (from `lib/db.ts`) | Standard data access |
| Supabase (user) | `createClient()` (from `lib/supabase/server.ts`) | RLS-scoped queries |
| Supabase (privileged) | `getSupabasePrivilegedClient()` | **Bypasses RLS** — admin/webhook/job only |

**Rules:**
- Never import the privileged client in buyer/dealer route handlers
- Service-role imports must be greppable and obvious
- Public route files MUST NOT import privileged Supabase access

## 4. Protected Route Standards

### Authentication Requirements

| Route Pattern | Auth Requirement |
|---|---|
| `/api/health/providers` | Admin auth or internal header |
| `/api/health/db` | Admin auth or internal header |
| `/api/auth/diagnostics` | Admin auth or internal header |
| `/api/contract/scan` | Dealer or Admin auth |
| `/api/contract/list` | Session + deal ownership |
| `/api/contract/fix` | Session + fix item ownership |
| `/api/admin/**` | Admin role required |
| `/api/buyer/**` | Buyer role required |
| `/api/dealer/**` | Dealer role required |
| `/api/webhooks/**` | Signature validation |
| `/api/cron/**` | Cron secret + IP validation |

### Guard Usage

All protected routes should use the shared guard from `lib/authz/guard.ts`:

```typescript
import { withAuth, requireInternalRequest } from "@/lib/authz/guard"
import { ADMIN_ROLES } from "@/lib/authz/roles"

export async function GET(request: NextRequest) {
  const ctx = await withAuth(request, { roles: ADMIN_ROLES })
  if (ctx instanceof NextResponse) return ctx
  // ctx.userId, ctx.role, ctx.correlationId available
}
```

## 5. Object Authorization Requirements

Every data-mutation or data-access endpoint MUST validate object ownership:

- **Contract routes:** Use `assertCanAccessDealContract()` / `assertCanModifyContractFix()`
- **Auction routes:** Verify buyer owns the auction
- **Deal routes:** Verify actor is buyer or dealer on the deal
- **Admin routes:** Admin bypass allowed for ADMIN/SUPER_ADMIN roles

## 6. Production Redis Requirement

In production (`NODE_ENV=production`):

- **Redis (REDIS_URL) is required** for distributed rate limiting in production
- Lockout counters, login/MFA rate limiting MUST use Redis
- Admin sessions are database-backed (AdminSession table) and do NOT use Redis
- In-memory fallback is allowed ONLY in test/development
- Use `assertProductionCacheReady()` to enforce at startup
- Use `getSecurityCriticalCacheAdapter()` for security-critical rate limiting access

## 7. Prequalification Policy

- Prequal remains non-production until canonical provider/compliance flow is completed
- Internal heuristic scoring MUST NOT masquerade as provider-backed approval
- All prequal flows (internal, external, manual) MUST return the same `NormalizedPrequal` DTO shape
- Source types: `INTERNAL`, `EXTERNAL_MANUAL`
