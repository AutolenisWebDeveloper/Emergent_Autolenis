# Supabase Integration Map — AutoLenis Platform

> Generated: 2026-02-19 | Full-stack validation audit.

---

## 1. Client Initialization

### Browser client — `lib/supabase/client.ts`

- **Package:** `@supabase/ssr` → `createBrowserClient()`
- **Pattern:** Singleton with caching
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Usage:** Client-side components, hooks, client fetchers

### Server client — `lib/supabase/server.ts`

- **Package:** `@supabase/ssr` → `createServerClient()`
- **Pattern:** New instance per request; integrates with Next.js `cookies()`
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Usage:** Server components, API route handlers, server actions

### Admin / Service-role client — `lib/supabase/admin.ts`

- **Package:** `@supabase/supabase-js` → `createClient()`
- **Pattern:** Server-only; bypasses RLS; `autoRefreshToken: false`, `persistSession: false`
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`), `SUPABASE_SERVICE_ROLE_KEY`
- **Usage:** Admin operations, webhooks, cron jobs, system-level DB access

### Fallback client — `lib/db.ts`

- **Risk:** Falls back to `https://placeholder.supabase.co` + `placeholder-key` if env vars missing
- **Impact:** Silent failure instead of hard crash — DB operations quietly return errors
- **Recommendation:** Throw on missing config instead of falling back

---

## 2. Auth Flows

Auth is NOT done via raw `supabase.auth.*` calls. It is abstracted through:

| Flow | Implementation | Files |
|------|---------------|-------|
| Sign-up | `AuthService.signUp()` → creates User + BuyerProfile via admin client | `lib/services/auth.service.ts`, `app/api/auth/signup/route.ts` |
| Sign-in | `AuthService.signIn()` → validates credentials, returns JWT | `lib/services/auth.service.ts`, `app/api/auth/signin/route.ts` |
| Sign-out | Client-side cookie clear + redirect | `app/auth/signout/page.tsx`, `components/layout/logout-button.tsx` |
| Password reset | `AuthService.resetPassword()` → Supabase email reset | `app/api/auth/reset-password/route.ts` |
| Email verification | Supabase verify email link callback | `app/api/auth/verify-email/route.ts` |
| MFA enroll | `supabase.auth.mfa.enroll()` via admin client | `app/api/auth/mfa/enroll/route.ts` |
| MFA verify | `supabase.auth.mfa.verify()` | `app/api/auth/mfa/verify/route.ts` |
| Session check | `getSessionUser()` → JWT decode from cookie | `lib/session.ts`, used in 120+ route handlers |
| NextAuth | `app/api/auth/[...nextauth]/route.ts` | NextAuth provider config |

---

## 3. Database Access Patterns

### Tables referenced via `supabase.from("TableName")`

| Table | Operations | Key files |
|-------|-----------|-----------|
| `User` | SELECT, INSERT, UPDATE | `lib/services/auth.service.ts`, `app/api/admin/users/*`, `app/api/auth/*` |
| `BuyerProfile` | SELECT, INSERT, UPDATE | `lib/services/buyer.service.ts`, `app/api/buyer/*` |
| `Dealer` | SELECT, INSERT, UPDATE, DELETE | `lib/services/dealer.service.ts`, `app/api/dealer/*`, `app/api/admin/dealers/*` |
| `DealerUser` | SELECT, INSERT | `app/api/dealer/*` |
| `Affiliate` | SELECT, INSERT, UPDATE | `app/api/affiliate/*`, `app/api/admin/affiliates/*` |
| `Referral` | SELECT, INSERT, UPDATE | `app/api/affiliate/referral/*`, `app/api/affiliate/process-referral/*` |
| `Click` | INSERT | `app/api/affiliate/click/*` |
| `Commission` | SELECT, INSERT, UPDATE | `app/api/affiliate/commissions/*` |
| `Payout` | SELECT, INSERT, UPDATE | `app/api/affiliate/payouts/*`, `app/api/admin/payouts/*` |
| `AffiliatePayment` | SELECT, INSERT | `app/api/admin/payments/affiliate-payments/*` |
| `AffiliateDocument` | SELECT, INSERT | `app/api/affiliate/documents/*` |
| `InventoryItem` | SELECT, INSERT, UPDATE, DELETE | `app/api/dealer/inventory/*` |
| `Vehicle` | SELECT, INSERT, UPDATE | `app/api/dealer/inventory/*` |
| `Auction` | SELECT, INSERT, UPDATE | `app/api/buyer/auction/*`, `app/api/admin/auctions/*` |
| `AuctionParticipant` | SELECT, INSERT | `app/api/dealer/auctions/*` |
| `AuctionOffer` | SELECT, INSERT, UPDATE, DELETE | `app/api/dealer/offers/*`, `app/api/buyer/offers/*` |
| `AuctionOfferFinancingOption` | SELECT, INSERT | `app/api/dealer/offers/*` |
| `SelectedDeal` | SELECT, INSERT, UPDATE | `app/api/buyer/deal/*`, `app/api/admin/deals/*` |
| `FinancingOffer` | SELECT, INSERT, UPDATE | `app/api/buyer/deal/financing/*` |
| `ServiceFeePayment` | SELECT, INSERT, UPDATE | `app/api/buyer/deal/fee/*`, `app/api/payments/*` |
| `DepositPayment` | SELECT, INSERT, UPDATE | `app/api/payments/deposit/*` |
| `InsuranceQuote` | SELECT, INSERT | `app/api/buyer/deal/insurance/*` |
| `InsurancePolicy` | SELECT, INSERT, UPDATE | `app/api/buyer/deal/insurance/*` |
| `ContractDocument` | SELECT, INSERT, UPDATE | `app/api/contract/*`, `app/api/dealer/contracts/*` |
| `ContractShieldScan` | SELECT, INSERT, UPDATE | `app/api/contract/scan/*` |
| `FixListItem` | SELECT, INSERT | `app/api/contract/scan/*` |
| `ContractShieldOverride` | SELECT, INSERT | `app/api/admin/contract-shield/*` |
| `ESignEnvelope` | SELECT, INSERT, UPDATE | `app/api/buyer/deal/esign/*`, `app/api/esign/*` |
| `PickupAppointment` | SELECT, INSERT, UPDATE | `app/api/buyer/deal/pickup/*`, `app/api/dealer/pickups/*` |
| `PaymentMethod` | SELECT, INSERT | `app/api/payments/*` |
| `Transaction` | SELECT, INSERT | `lib/services/payment.service.ts` |
| `Chargeback` | SELECT, INSERT | `app/api/admin/payments/*` |
| `ComplianceEvent` | SELECT, INSERT | `app/api/admin/compliance/*` |
| `AdminAuditLog` | SELECT, INSERT | `app/api/admin/audit-logs/*` |
| `AdminLoginAttempt` | INSERT | `app/api/auth/signin/*` (admin path) |
| `AdminUser` | SELECT, INSERT, UPDATE | `app/api/admin/*` |
| `Notification` | SELECT, INSERT, UPDATE | `app/api/admin/notifications/*` |
| `RefinanceLead` | SELECT, INSERT, UPDATE | `app/api/refinance/*`, `app/api/admin/refinance/*` |
| `FundedLoan` | SELECT, INSERT | `app/api/admin/refinance/funded/*` |
| `TradeIn` | SELECT, INSERT | `app/api/buyer/trade-in/*` |
| `DocumentRequest` | SELECT, INSERT, UPDATE | `app/api/document-requests/*` |
| `AiConversation` | SELECT, INSERT, UPDATE | `lib/ai/persistence.ts` |
| `AiMessage` | SELECT, INSERT | `lib/ai/persistence.ts` |
| `AiAdminAction` | INSERT | `lib/ai/persistence.ts` |
| `AiToolCall` | INSERT | `lib/ai/persistence.ts` |
| `AiLead` | INSERT | `lib/ai/persistence.ts` |
| `AiSeoDraft` | SELECT, INSERT | `app/api/admin/seo/*` |
| `AiContractExtraction` | INSERT | `app/api/contract/scan/*` |
| `_connection_canary` | SELECT | `app/api/health/db/route.ts` |
| `contact_messages` | INSERT | `app/api/contact/route.ts` |

**Total distinct tables: ~45**

### Query patterns used

| Pattern | Example |
|---------|---------|
| Basic select | `.from("User").select("*").eq("id", userId)` |
| Select with count | `.from("User").select("*", { count: "exact" })` |
| Filtered select | `.eq()`, `.gt()`, `.gte()`, `.lt()`, `.ilike()` |
| Ordering & pagination | `.order("createdAt", { ascending: false }).limit(50)` |
| Insert | `.from("BuyerProfile").insert({ userId, ... })` |
| Update | `.from("User").update({ role: "DEALER" }).eq("id", userId)` |
| Delete | `.from("InventoryItem").delete().eq("dealerId", dealerId)` |
| Single row | `.single()` |

**No `.rpc()` calls found in the codebase.**

---

## 4. Storage Usage

### Deal documents — `app/api/documents/route.ts`

```
supabase.storage.from(bucket).upload(storagePath, file, { ... })
supabase.storage.from(bucket).getPublicUrl(storagePath)
supabase.storage.from(bucket).createSignedUrl(storagePath, 3600)
```

### Affiliate documents — `app/api/affiliate/documents/route.ts`

- Document types: `W9`, `ID`, `BANK`, `VOIDED_CHECK`, `OTHER`
- Same storage operations as deal documents

**Buckets referenced:** Determined at runtime from config/env (not hardcoded bucket names in code).

---

## 5. RLS Policies & Migrations

### Migration files with RLS definitions

| File | Location | Purpose |
|------|----------|---------|
| `02-add-rls-policies.sql` | `scripts/migrations/` | Core RLS setup for main tables |
| `03-add-insurance-rls-policies.sql` | `scripts/migrations/` | Insurance-specific RLS |
| `04-add-workspace-isolation.sql` | `scripts/migrations/` | Workspace scoping for multi-tenancy |
| `05-add-workspace-to-domain-models.sql` | `scripts/migrations/` | Adds workspaceId FK to domain models |
| `94-add-admin-mfa-fields.sql` | `migrations/` | RLS on AdminAuditLog & AdminLoginAttempt |
| `96-schema-alignment-fixes.sql` | `migrations/` | Idempotent schema & RLS validation |

### RLS expectations (best effort from code)

| Table | RLS likely enabled | Notes |
|-------|-------------------|-------|
| `User` | ✅ Yes | Workspace-scoped; migration 04 |
| `BuyerProfile` | ✅ Yes | Workspace-scoped |
| `Dealer` | ✅ Yes | Workspace-scoped |
| `Affiliate` | ✅ Yes | Workspace-scoped |
| `Auction` | ✅ Yes | Workspace-scoped |
| `AuctionOffer` | ✅ Yes | Workspace-scoped |
| `SelectedDeal` | ✅ Yes | Workspace-scoped |
| `InsuranceQuote` | ✅ Yes | Migration 03 |
| `InsurancePolicy` | ✅ Yes | Migration 03 |
| `AdminAuditLog` | ✅ Yes | Migration 94 |
| `AdminLoginAttempt` | ✅ Yes | Migration 94 |
| `AiConversation` | ✅ Yes | Migration 98 |
| `AiMessage` | ✅ Yes | Migration 98 |
| `_connection_canary` | ❓ Unknown | Health check table |

**Note:** Most API routes use the **admin/service-role client** which bypasses RLS. This means RLS policies are primarily a defense-in-depth layer, not the primary access control mechanism. Primary access control is via `getSessionUser()` + role checks in route handlers.

---

## 6. Environment Variables Required

| Variable | Where referenced | Purpose |
|----------|-----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `server.ts`, `admin.ts`, `lib/env.ts` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts`, `server.ts`, `lib/env.ts` | Public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts`, `lib/env.ts` | Admin key (bypasses RLS) |
| `SUPABASE_URL` | `lib/db.ts` | Fallback URL (if NEXT_PUBLIC version missing) |
| `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` | `.env.example` | Dev-only redirect URL |
| `POSTGRES_PRISMA_URL` | `prisma/schema.prisma`, `lib/env.ts` | Direct Postgres connection for Prisma |

---

## Summary

| Metric | Count |
|--------|-------|
| Supabase client types | 3 (browser, server, admin) |
| Tables accessed via `.from()` | ~45 |
| Storage endpoints | 2 (documents, affiliate docs) |
| RLS migration files | 6 |
| Auth flow files | 8+ |
| Env vars (Supabase-related) | 6 |
| API routes using Supabase | ~150+ |
