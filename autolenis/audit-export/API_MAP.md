# API Map — AutoLenis Platform

> Generated: 2026-02-19 | Full-stack validation audit.

---

## Overview

| Metric | Value |
|--------|-------|
| Total API route files | ~254 |
| Total HTTP methods exported | ~540+ |
| Routes using Supabase | ~150+ |
| Routes with `getSessionUser()` or `isAdminRole()` auth | ~120+ |
| Routes with Zod validation | ~50+ |
| Server action files | 1 (`app/actions/stripe.ts`) |

---

## 1. Auth API (`app/api/auth/`)

| Endpoint | Method(s) | Auth | Validation | DB ops | Response |
|----------|-----------|------|------------|--------|----------|
| `/api/auth/signin` | POST, OPTIONS | Rate limit | `signInSchema` (Zod) | Supabase AuthService | `{ success, user, token }` or `{ error }` |
| `/api/auth/signup` | POST, OPTIONS | Rate limit | `signUpSchema` (Zod) | Supabase AuthService → User + BuyerProfile | `{ success, user }` or `{ error }` |
| `/api/auth/me` | GET | `getSessionUser()` | — | Supabase User lookup | `{ user }` |
| `/api/auth/reset-password` | GET, POST | Rate limit | `passwordResetSchema` | Supabase auth reset | `{ success }` or `{ error }` |
| `/api/auth/verify-email` | GET | — | — | Supabase email verification | Redirect or `{ error }` |
| `/api/auth/mfa/enroll` | POST | `getSessionUser()` | — | Supabase MFA enroll | `{ qrCode, factorId }` |
| `/api/auth/mfa/verify` | POST | — | `mfaSchema` (Zod) | Supabase MFA verify | `{ success, session }` |
| `/api/auth/[...nextauth]` | GET, POST | NextAuth | — | NextAuth providers | Session / callbacks |

---

## 2. Buyer API (`app/api/buyer/`)

| Endpoint | Method(s) | Auth | Validation | DB ops | Response |
|----------|-----------|------|------------|--------|----------|
| `/api/buyer/prequal` | GET, POST, PUT | `getSessionUser(BUYER)` | Zod schema | CRUD BuyerProfile / PreQual | `{ data }` |
| `/api/buyer/prequal/draft` | GET, POST, PUT | `getSessionUser()` | — | Save draft applications | `{ data }` |
| `/api/buyer/prequal/start` | POST | `getSessionUser()` | — | Start new pre-qual | `{ data }` |
| `/api/buyer/auction` | GET, POST, DELETE | `getSessionUser()` | — | Auction selection | `{ data }` |
| `/api/buyer/deal` | GET, POST | `getSessionUser()` | — | Deal management | `{ data }` |
| `/api/buyer/deals/[dealId]/insurance/*` | Multiple | `getSessionUser()` | — | Insurance selection/binding | `{ data }` |
| `/api/buyer/deals/[dealId]/pickup/*` | POST | `getSessionUser()` | — | Schedule/manage pickups | `{ data }` |
| `/api/buyer/shortlist` | GET, POST, PUT, DELETE | `getSessionUser()` | — | Inventory shortlist CRUD | `{ data }` |
| `/api/buyer/profile` | GET, PUT | `getSessionUser()` | — | BuyerProfile R/U | `{ data }` |
| `/api/buyer/contracts` | GET | `getSessionUser()` | — | Contract list | `{ data }` |
| `/api/buyer/deal/insurance/quote` | POST | `getSessionUser()` | — | InsuranceQuote insert | `{ data }` |
| `/api/buyer/deal/insurance/bind` | POST | `getSessionUser()` | — | InsurancePolicy insert | `{ data }` |
| `/api/buyer/deal/esign` | GET, POST | `getSessionUser()` | — | ESignEnvelope CRUD | `{ data }` |
| `/api/buyer/deal/contract` | GET, POST | `getSessionUser()` | — | ContractDocument | `{ data }` |
| `/api/buyer/deal/fee` | POST | `getSessionUser()` | — | ServiceFeePayment | `{ data }` |
| `/api/buyer/deal/pickup` | GET, POST | `getSessionUser()` | — | PickupAppointment | `{ data }` |

---

## 3. Dealer API (`app/api/dealer/`)

| Endpoint | Method(s) | Auth | Validation | DB ops | Response |
|----------|-----------|------|------------|--------|----------|
| `/api/dealer/inventory` | GET, POST | `getSessionUser(DEALER)` | — | InventoryItem CRUD | `{ data, count }` |
| `/api/dealer/inventory/[id]` | GET, PUT, DELETE | `getSessionUser()` | — | Single InventoryItem | `{ data }` |
| `/api/dealer/inventory/bulk-upload` | POST | `getSessionUser()` | — | CSV import → InventoryItem | `{ imported, errors }` |
| `/api/dealer/inventory/import` | POST | `getSessionUser()` | — | VIN import | `{ data }` |
| `/api/dealer/auctions/[auctionId]/offers` | GET | `getSessionUser()` | — | AuctionOffer list | `{ data }` |
| `/api/dealer/deals/[dealId]` | GET, PUT | `getSessionUser()` | — | SelectedDeal R/U | `{ data }` |
| `/api/dealer/pickups/[appointmentId]/*` | POST | `getSessionUser()` | — | PickupAppointment update | `{ data }` |
| `/api/dealer/documents/upload` | POST | `getSessionUser()` | — | Supabase storage upload | `{ url }` |
| `/api/dealer/payments/checkout` | POST | `getSessionUser()` | — | Stripe checkout session | `{ url }` |
| `/api/dealer/register` | POST | — (public) | — | Dealer onboarding | `{ data }` |
| `/api/dealer/offers` | GET, POST | `getSessionUser()` | — | AuctionOffer CRUD | `{ data }` |
| `/api/dealer/contracts/[id]` | GET, PUT | `getSessionUser()` | — | ContractDocument | `{ data }` |
| `/api/dealer/messages` | GET, POST | `getSessionUser()` | — | Messages | `{ data }` |

---

## 4. Admin API (`app/api/admin/`)

| Endpoint | Method(s) | Auth | Validation | DB ops | Response |
|----------|-----------|------|------------|--------|----------|
| `/api/admin/users` | POST | `isAdminRole()` | — | User create | `{ data }` |
| `/api/admin/users/list` | GET | `isAdminRole()` | — | User listing + count | `{ data, count }` |
| `/api/admin/dealers/[dealerId]` | GET, PUT, DELETE | `isAdminRole()` | — | Dealer CRUD | `{ data }` |
| `/api/admin/dealers/applications` | GET, POST | `isAdminRole()` | — | Dealer app approve/reject | `{ data }` |
| `/api/admin/payments/*` | Multiple | `isAdminRole()` | — | Payment processing | `{ data }` |
| `/api/admin/deals/[dealId]/*` | Multiple | `isAdminRole()` | — | Deal oversight | `{ data }` |
| `/api/admin/affiliates/*` | Multiple | `isAdminRole()` | — | Affiliate management | `{ data }` |
| `/api/admin/buyers/[buyerId]/*` | Multiple | `isAdminRole()` | — | Buyer management | `{ data }` |
| `/api/admin/financial/*` | Multiple | `isAdminRole()` | — | Financial reports | `{ data }` |
| `/api/admin/dashboard` | GET | `isAdminRole()` | — | Analytics aggregations | `{ stats }` |
| `/api/admin/notifications/*` | Multiple | `isAdminRole()` | — | System notifications | `{ data }` |
| `/api/admin/refinance/*` | Multiple | `isAdminRole()` | — | Refinance lead mgmt | `{ data }` |
| `/api/admin/seo/*` | Multiple | `isAdminRole()` | — | SEO management | `{ data }` |
| `/api/admin/compliance` | GET | `isAdminRole()` | — | ComplianceEvent list | `{ data }` |
| `/api/admin/audit-logs` | GET | `isAdminRole()` | — | AdminAuditLog list | `{ data }` |
| `/api/admin/payouts/*` | Multiple | `isAdminRole()` | — | Payout management | `{ data }` |
| `/api/admin/contract-shield/*` | Multiple | `isAdminRole()` | — | CS rules/overrides | `{ data }` |
| `/api/admin/trade-ins` | GET | `isAdminRole()` | — | TradeIn list | `{ data }` |
| `/api/admin/documents/*` | Multiple | `isAdminRole()` | — | Document management | `{ data }` |
| `/api/admin/insurance/*` | Multiple | `isAdminRole()` | — | Insurance management | `{ data }` |

---

## 5. Affiliate API (`app/api/affiliate/`)

| Endpoint | Method(s) | Auth | Validation | DB ops | Response |
|----------|-----------|------|------------|--------|----------|
| `/api/affiliate/referral` | GET, POST | — (public) | — | Referral create | `{ data }` |
| `/api/affiliate/enroll` | POST | — (public) | — | Affiliate sign-up | `{ data }` |
| `/api/affiliate/process-referral` | POST | — | — | Referral event handling | `{ data }` |
| `/api/affiliate/click` | GET, POST | — | — | Click tracking | `{ data }` |
| `/api/affiliate/dashboard` | GET | `getSessionUser()` | — | Analytics queries | `{ data }` |
| `/api/affiliate/payouts` | GET, POST | `getSessionUser()` | — | Payout management | `{ data }` |
| `/api/affiliate/commissions` | GET | `getSessionUser()` | — | Commission list | `{ data }` |
| `/api/affiliate/documents` | GET, POST | `getSessionUser()` | — | Supabase storage CRUD | `{ data }` |
| `/api/affiliate/settings` | GET, PUT | `getSessionUser()` | — | Affiliate settings | `{ data }` |

---

## 6. Payment API (`app/api/payments/`)

| Endpoint | Method(s) | Auth | Validation | DB ops | Response |
|----------|-----------|------|------------|--------|----------|
| `/api/payments/deposit` | POST | `getSessionUser()` | — | DepositPayment + Stripe | `{ clientSecret }` |
| `/api/payments/create-checkout` | POST | `getSessionUser()` | — | Stripe Checkout Session | `{ url }` |
| `/api/payments/confirm` | POST | `getSessionUser()` | — | Payment confirmation | `{ success }` |
| `/api/payments/fee/*` | Multiple | `getSessionUser()` | — | Fee calculations | `{ data }` |

---

## 7. Document & Contract API

| Endpoint | Method(s) | Auth | Validation | DB ops | Response |
|----------|-----------|------|------------|--------|----------|
| `/api/documents/[documentId]` | GET, PUT, DELETE | `getSessionUser()` | — | Document CRUD | `{ data }` |
| `/api/documents` | GET, POST | `getSessionUser()` | — | Document list/upload (Supabase storage) | `{ data, url }` |
| `/api/contract/upload` | POST | `getSessionUser()` | — | ContractDocument create | `{ data }` |
| `/api/contract/scan` | POST | `getSessionUser()` | — | ContractShieldScan | `{ data }` |
| `/api/document-requests/*` | Multiple | `getSessionUser()` | — | DocumentRequest CRUD | `{ data }` |

---

## 8. Webhook Routes

| Endpoint | Method(s) | Verification | Notes |
|----------|-----------|--------------|-------|
| `/api/webhooks/stripe` | POST | Stripe signature verification | Payment event handler |
| `/api/webhooks/stripe/commission-trigger` | POST | — | Commission webhook |
| `/api/esign/webhook` | POST | — | E-signature provider webhook |
| `/api/esign/provider-webhook` | POST | — | External e-sign webhook |

---

## 9. Utility / Health Routes

| Endpoint | Method(s) | Auth | Notes |
|----------|-----------|------|-------|
| `/api/health` | GET | — | System health check |
| `/api/health/db` | GET | — | Database connectivity (checks `_connection_canary`) |
| `/api/test/seed` | POST | — | Test data seeding |
| `/api/test/create-user` | POST | — | Test user creation |
| `/api/contact` | POST | — | Contact form submission |

---

## 10. Specialized API Groups

| Category | Approx. Routes | Purpose |
|----------|---------------|---------|
| Insurance | 5+ | Quote requests, selection, binding |
| Auction | 8+ | Auction management, best-price calculation |
| SEO | 8+ | Page metadata, schema markup, audits |
| Pickup | 8+ | Schedule, check-in, QR validation |
| Refinance | 6+ | Eligibility checks, lead management |
| Cron | 2 | Background job endpoints |
| AI | 3+ | AI conversation, chat, admin actions |

---

## Server Actions

| File | Directive | Purpose |
|------|-----------|---------|
| `app/actions/stripe.ts` | `"use server"` | Stripe-related backend operations |

---

## Auth Patterns Summary

| Pattern | Used by | Mechanism |
|---------|---------|-----------|
| `getSessionUser()` | Buyer, Dealer, Affiliate portal routes | JWT session validation |
| `isAdminRole()` | All admin routes | Role check (ADMIN / SUPER_ADMIN) |
| Rate limiting | `/auth/signin`, `/auth/signup` | `rateLimit()` middleware |
| Stripe signature | Webhook routes | `stripe.webhooks.constructEvent()` |
| CRON_SECRET | Cron routes | Header token comparison |
| CORS OPTIONS | Most API routes | Manual OPTIONS handler with headers |

---

## Validation Schemas (Zod)

| Schema | Used in | Fields validated |
|--------|---------|-----------------|
| `signInSchema` | `/api/auth/signin` | email, password |
| `signUpSchema` | `/api/auth/signup` | email, password, firstName, lastName |
| `passwordResetSchema` | `/api/auth/reset-password` | email or token+password |
| `mfaSchema` | `/api/auth/mfa/verify` | factorId, code |
| `buyerProfileSchema` | `/api/buyer/profile` | Profile fields |
| `softPullConsentSchema` | `/api/buyer/prequal` | Consent fields |
| `dealSchema` | `/api/buyer/deal` | Deal fields |
| `auctionSchema` | `/api/buyer/auction` | Auction fields |
| Misc validators | `lib/validators/` | Entity-specific validation |

---

## Database Access Pattern

All API routes use **Supabase** directly (no Prisma at runtime):

```
supabase.from("TableName").select("*").eq("field", value)
supabase.from("TableName").insert({ ... })
supabase.from("TableName").update({ ... }).eq("id", id)
supabase.from("TableName").delete().eq("id", id)
```

No `.rpc()` calls found in the codebase.
