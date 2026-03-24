# Route Map — AutoLenis Platform

> Generated: 2026-02-19 | Full-stack validation audit.

---

## Middleware / Edge Auth (proxy.ts)

| Concern | Detail |
|---------|--------|
| File | `proxy.ts` (root) |
| Runtime | Edge |
| Session | JWT cookie (`session`) |
| Role redirect | `getRoleRedirect()` maps role → portal home |
| Public paths | `/`, `/auth/*`, `/legal/*`, `/affiliate`, `/pricing`, `/contact`, `/dealer-application`, `/refinance`, `/about`, `/privacy`, `/terms`, `/faq`, `/contract-shield`, `/insurance`, `/for-dealers`, `/ref/*`, `/how-it-works` |
| Protected redirect | Unauthenticated → `/auth/signin?redirect=<path>` |
| Admin subdomain | Production rewrites to `admin.autolenis.com` when `ADMIN_SUBDOMAIN_ENABLED=true` |
| Test workspace | `/test/*` requires `workspace_mode === "TEST"`; sets `mock_role` cookie |
| Cookies set | `affiliate_ref` (30 d), `session`, `mock_role`, `admin_session`, `x-pathname` header |

---

## 1. Public / Marketing Pages (no auth)

| Path | File | Dynamic | Notes |
|------|------|---------|-------|
| `/` | `app/page.tsx` | — | Landing page, Hero, CTAs |
| `/about` | `app/about/page.tsx` | — | Company info |
| `/pricing` | `app/pricing/page.tsx` | — | Pricing tiers |
| `/how-it-works` | `app/how-it-works/page.tsx` | — | Process explanation |
| `/contact` | `app/contact/page.tsx` | — | Contact form |
| `/faq` | `app/faq/page.tsx` | — | FAQ section |
| `/feedback` | `app/feedback/page.tsx` | — | Feedback form |
| `/insurance` | `app/insurance/page.tsx` | — | Insurance info |
| `/for-dealers` | `app/for-dealers/page.tsx` | — | Dealer marketing |
| `/contract-shield` | `app/contract-shield/page.tsx` | — | Contract Shield feature |
| `/refinance` | `app/refinance/page.tsx` | — | Refinance product |
| `/legal/privacy` | `app/legal/privacy/page.tsx` | — | Privacy policy |
| `/legal/terms` | `app/legal/terms/page.tsx` | — | Terms of service |
| `/legal/dealer-terms` | `app/legal/dealer-terms/page.tsx` | — | Dealer terms |
| `/privacy` | `app/privacy/page.tsx` | — | Privacy (duplicate of `/legal/privacy`) |
| `/terms` | `app/terms/page.tsx` | — | Terms (duplicate of `/legal/terms`) |
| `/dealer-application` | `app/dealer-application/page.tsx` | — | Dealer signup form |
| `/ref/[code]` | `app/ref/[code]/page.tsx` | `[code]` | Affiliate referral handler |
| `/affiliate` | `app/affiliate/page.tsx` | — | Affiliate program overview |

---

## 2. Auth Routes (public)

| Path | File | Dynamic | Notes |
|------|------|---------|-------|
| `/auth/signin` | `app/auth/signin/page.tsx` | — | SignInForm |
| `/auth/signup` | `app/auth/signup/page.tsx` | — | SignUpForm |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | — | Password recovery |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | — | Reset form + loading |
| `/auth/verify-email` | `app/auth/verify-email/page.tsx` | — | Email verification |
| `/auth/signout` | `app/auth/signout/page.tsx` | — | Logout handler |
| `/auth/access-denied` | `app/auth/access-denied/page.tsx` | — | 403 page |

Layout: `app/auth/layout.tsx` (passthrough, no auth)

---

## 3. Buyer Routes (protected — role: BUYER)

**Auth:** `app/buyer/layout.tsx` → `getSessionUser()` + `role === "BUYER"` + email verification required.
Redirect on fail → `/auth/signin`.

| Path | File | Dynamic | Notes |
|------|------|---------|-------|
| `/buyer/dashboard` | `app/buyer/dashboard/page.tsx` | — | Dashboard + loading |
| `/buyer/prequal` | `app/buyer/prequal/page.tsx` | — | Pre-qualification form |
| `/buyer/search` | `app/buyer/search/page.tsx` | — | Vehicle search |
| `/buyer/shortlist` | `app/buyer/shortlist/page.tsx` | — | Saved vehicles |
| `/buyer/trade-in` | `app/buyer/trade-in/page.tsx` | — | Trade-in valuation |
| `/buyer/auction` | `app/buyer/auction/page.tsx` | — | Auction listing |
| `/buyer/auction/[id]` | `app/buyer/auction/[id]/page.tsx` | `[id]` | Auction detail |
| `/buyer/auction/[id]/offers` | `app/buyer/auction/[id]/offers/page.tsx` | `[id]` | Offers for auction |
| `/buyer/requests` | `app/buyer/requests/page.tsx` | — | Buyer requests list |
| `/buyer/requests/[requestId]` | `app/buyer/requests/[requestId]/page.tsx` | `[requestId]` | Request detail |
| `/buyer/offers` | `app/buyer/offers/page.tsx` | — | All offers |
| `/buyer/offers/[offerId]` | `app/buyer/offers/[offerId]/page.tsx` | `[offerId]` | Offer detail |
| `/buyer/deal` | `app/buyer/deal/page.tsx` | — | Deal summary |
| `/buyer/deal/insurance` | `app/buyer/deal/insurance/page.tsx` | — | Insurance selection |
| `/buyer/deal/insurance/quote` | `app/buyer/deal/insurance/quote/page.tsx` | — | Quote request |
| `/buyer/deal/insurance/quotes` | `app/buyer/deal/insurance/quotes/page.tsx` | — | All quotes |
| `/buyer/deal/insurance/quotes/[quoteId]` | `app/buyer/deal/insurance/quotes/[quoteId]/page.tsx` | `[quoteId]` | Quote detail |
| `/buyer/deal/insurance/bind` | `app/buyer/deal/insurance/bind/page.tsx` | — | Bind insurance |
| `/buyer/deal/insurance/confirmed` | `app/buyer/deal/insurance/confirmed/page.tsx` | — | Confirmation |
| `/buyer/deal/insurance/proof` | `app/buyer/deal/insurance/proof/page.tsx` | — | Insurance proof |
| `/buyer/deal/financing` | `app/buyer/deal/financing/page.tsx` | — | Financing details |
| `/buyer/deal/contract` | `app/buyer/deal/contract/page.tsx` | — | Contract review |
| `/buyer/deal/fee` | `app/buyer/deal/fee/page.tsx` | — | Concierge fee |
| `/buyer/deal/esign` | `app/buyer/deal/esign/page.tsx` | — | E-signature |
| `/buyer/deal/pickup` | `app/buyer/deal/pickup/page.tsx` | — | Pickup scheduling |
| `/buyer/deal/summary` | `app/buyer/deal/summary/page.tsx` | — | Deal summary |
| `/buyer/contracts` | `app/buyer/contracts/page.tsx` | — | Contract list |
| `/buyer/documents` | `app/buyer/documents/page.tsx` | — | Document management |
| `/buyer/profile` | `app/buyer/profile/page.tsx` | — | User profile |
| `/buyer/settings` | `app/buyer/settings/page.tsx` | — | Account settings |
| `/buyer/deposit` | `app/buyer/deposit/page.tsx` | — | Deposit payment |
| `/buyer/request` | `app/buyer/request/page.tsx` | — | New request |
| `/buyer/billing` | `app/buyer/billing/page.tsx` | — | Billing info |
| `/buyer/payments` | `app/buyer/payments/page.tsx` | — | Payment list |
| `/buyer/payments/[paymentId]` | `app/buyer/payments/[paymentId]/page.tsx` | `[paymentId]` | Payment detail |
| `/buyer/funding` | `app/buyer/funding/page.tsx` | — | Funding options |
| `/buyer/affiliate` | `app/buyer/affiliate/page.tsx` | — | Referral/affiliate |
| `/buyer/demo` | `app/buyer/demo/page.tsx` | — | Demo/test page |
| `/buyer/sign/[dealId]` | `app/buyer/sign/[dealId]/page.tsx` | `[dealId]` | E-sign document |
| `/buyer/pickup/[dealId]` | `app/buyer/pickup/[dealId]/page.tsx` | `[dealId]` | Pickup detail |
| `/buyer/esign` | `app/buyer/esign/page.tsx` | — | E-signature flow |
| `/buyer/contract-shield` | `app/buyer/contract-shield/page.tsx` | — | Contract Shield |
| `/buyer/messages` | `app/buyer/messages/page.tsx` | — | Messages |

---

## 4. Dealer Routes (protected — role: DEALER | DEALER_USER)

**Auth:** `app/dealer/layout.tsx` → `getSessionUser()` + `role in ["DEALER","DEALER_USER"]` + email verification.
Redirect on fail → `/auth/signin`.

| Path | File | Dynamic | Notes |
|------|------|---------|-------|
| `/dealer/dashboard` | `app/dealer/dashboard/page.tsx` | — | Dashboard |
| `/dealer/requests` | `app/dealer/requests/page.tsx` | — | Buyer requests |
| `/dealer/requests/[requestId]` | `app/dealer/requests/[requestId]/page.tsx` | `[requestId]` | Request detail |
| `/dealer/inventory` | `app/dealer/inventory/page.tsx` | — | Inventory list |
| `/dealer/inventory/add` | `app/dealer/inventory/add/page.tsx` | — | Add vehicle |
| `/dealer/inventory/bulk-upload` | `app/dealer/inventory/bulk-upload/page.tsx` | — | CSV/bulk upload |
| `/dealer/inventory/column-mapping` | `app/dealer/inventory/column-mapping/page.tsx` | — | Map CSV columns |
| `/dealer/inventory/import-history` | `app/dealer/inventory/import-history/page.tsx` | — | Upload history |
| `/dealer/auctions` | `app/dealer/auctions/page.tsx` | — | Auction list |
| `/dealer/auctions/[id]` | `app/dealer/auctions/[id]/page.tsx` | `[id]` | Auction detail |
| `/dealer/auctions/invited` | `app/dealer/auctions/invited/page.tsx` | — | Invited auctions |
| `/dealer/auctions/offers` | `app/dealer/auctions/offers/page.tsx` | — | Submitted offers |
| `/dealer/deals` | `app/dealer/deals/page.tsx` | — | Active deals |
| `/dealer/deals/[dealId]` | `app/dealer/deals/[dealId]/page.tsx` | `[dealId]` | Deal detail |
| `/dealer/deals/[dealId]/insurance` | `app/dealer/deals/[dealId]/insurance/page.tsx` | `[dealId]` | Insurance review |
| `/dealer/offers` | `app/dealer/offers/page.tsx` | — | Offers list |
| `/dealer/offers/new` | `app/dealer/offers/new/page.tsx` | — | Create offer |
| `/dealer/offers/[offerId]` | `app/dealer/offers/[offerId]/page.tsx` | `[offerId]` | Edit offer |
| `/dealer/contracts` | `app/dealer/contracts/page.tsx` | — | Contracts |
| `/dealer/contracts/[id]` | `app/dealer/contracts/[id]/page.tsx` | `[id]` | Contract detail |
| `/dealer/documents` | `app/dealer/documents/page.tsx` | — | Documents |
| `/dealer/documents/[documentId]` | `app/dealer/documents/[documentId]/page.tsx` | `[documentId]` | Document detail |
| `/dealer/payments` | `app/dealer/payments/page.tsx` | — | Payments/fees |
| `/dealer/payments/success` | `app/dealer/payments/success/page.tsx` | — | Payment success |
| `/dealer/payments/cancel` | `app/dealer/payments/cancel/page.tsx` | — | Payment cancelled |
| `/dealer/pickups` | `app/dealer/pickups/page.tsx` | — | Scheduled pickups |
| `/dealer/messages` | `app/dealer/messages/page.tsx` | — | Messages |
| `/dealer/messages/[threadId]` | `app/dealer/messages/[threadId]/page.tsx` | `[threadId]` | Message thread |
| `/dealer/profile` | `app/dealer/profile/page.tsx` | — | Dealer profile |
| `/dealer/settings` | `app/dealer/settings/page.tsx` | — | Settings |
| `/dealer/onboarding` | `app/dealer/onboarding/page.tsx` | — | Onboarding flow |
| `/dealer/sign-in` | `app/dealer/sign-in/page.tsx` | — | Dealer sign-in |

---

## 5. Affiliate Routes (mixed public + protected portal)

### Public affiliate pages (no auth):

| Path | File | Dynamic | Notes |
|------|------|---------|-------|
| `/affiliate` | `app/affiliate/page.tsx` | — | Program overview |
| `/affiliate/onboarding` | `app/affiliate/onboarding/page.tsx` | — | Signup flow |
| `/affiliate/profile` | `app/affiliate/profile/page.tsx` | — | Profile management |
| `/affiliate/settings` | `app/affiliate/settings/page.tsx` | — | Settings |
| `/affiliate/dashboard` | `app/affiliate/dashboard/page.tsx` | — | Old dashboard |
| `/affiliate/links` | `app/affiliate/links/page.tsx` | — | Referral links |
| `/affiliate/earnings` | `app/affiliate/earnings/page.tsx` | — | Earnings summary |
| `/affiliate/commissions` | `app/affiliate/commissions/page.tsx` | — | Commission details |
| `/affiliate/income` | `app/affiliate/income/page.tsx` | — | Income tracking |
| `/affiliate/payouts` | `app/affiliate/payouts/page.tsx` | — | Payout history |
| `/affiliate/payouts/[payoutId]` | `app/affiliate/payouts/[payoutId]/page.tsx` | `[payoutId]` | Payout detail |
| `/affiliate/referrals` | `app/affiliate/referrals/page.tsx` | — | Referral list |
| `/affiliate/referrals/[referralId]` | `app/affiliate/referrals/[referralId]/page.tsx` | `[referralId]` | Referral detail |
| `/affiliate/support` | `app/affiliate/support/page.tsx` | — | Support page |

### Protected portal (role: AFFILIATE | AFFILIATE_ONLY | BUYER+is_affiliate):

Layout: `app/affiliate/portal/layout.tsx` — auth check via `getSessionUser()`.

| Path | File | Dynamic | Notes |
|------|------|---------|-------|
| `/affiliate/portal/dashboard` | `app/affiliate/portal/dashboard/page.tsx` | — | Main dashboard |
| `/affiliate/portal/link` | `app/affiliate/portal/link/page.tsx` | — | Referral link mgmt |
| `/affiliate/portal/income-calculator` | `app/affiliate/portal/income-calculator/page.tsx` | — | Calculator |
| `/affiliate/portal/analytics` | `app/affiliate/portal/analytics/page.tsx` | — | Analytics |
| `/affiliate/portal/referrals` | `app/affiliate/portal/referrals/page.tsx` | — | All referrals |
| `/affiliate/portal/referrals/buyers` | `app/affiliate/portal/referrals/buyers/page.tsx` | — | Buyer referrals |
| `/affiliate/portal/referrals/affiliates` | `app/affiliate/portal/referrals/affiliates/page.tsx` | — | Affiliate referrals |
| `/affiliate/portal/commissions` | `app/affiliate/portal/commissions/page.tsx` | — | Commissions |
| `/affiliate/portal/payouts` | `app/affiliate/portal/payouts/page.tsx` | — | Payout settings |
| `/affiliate/portal/documents` | `app/affiliate/portal/documents/page.tsx` | — | Documents |
| `/affiliate/portal/assets` | `app/affiliate/portal/assets/page.tsx` | — | Promo materials |
| `/affiliate/portal/settings` | `app/affiliate/portal/settings/page.tsx` | — | Account settings |
| `/affiliate/portal/onboarding` | `app/affiliate/portal/onboarding/page.tsx` | — | Onboarding |

---

## 6. Admin Routes (protected — role: ADMIN | SUPER_ADMIN)

**Auth:** `app/admin/layout.tsx` → `getSessionUser()` + `role in ["ADMIN","SUPER_ADMIN"]` + email verification.
Public sub-routes: `/admin/sign-in`, `/admin/signup`, `/admin/mfa/*`.
Redirect on fail → `/auth/access-denied`.

| Path | File | Dynamic | Notes |
|------|------|---------|-------|
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | — | Dashboard |
| `/admin/sign-in` | `app/admin/sign-in/page.tsx` | — | Admin login (public) |
| `/admin/signup` | `app/admin/signup/page.tsx` | — | Admin registration (public) |
| `/admin/mfa/enroll` | `app/admin/mfa/enroll/page.tsx` | — | MFA setup (public) |
| `/admin/mfa/challenge` | `app/admin/mfa/challenge/page.tsx` | — | MFA verify (public) |
| `/admin/users` | `app/admin/users/page.tsx` | — | User list |
| `/admin/users/new` | `app/admin/users/new/page.tsx` | — | Create user |
| `/admin/users/[userId]` | `app/admin/users/[userId]/page.tsx` | `[userId]` | User detail |
| `/admin/buyers` | `app/admin/buyers/page.tsx` | — | Buyer list |
| `/admin/buyers/create` | `app/admin/buyers/create/page.tsx` | — | Create buyer |
| `/admin/buyers/[buyerId]` | `app/admin/buyers/[buyerId]/page.tsx` | `[buyerId]` | Buyer detail |
| `/admin/dealers` | `app/admin/dealers/page.tsx` | — | Dealer list |
| `/admin/dealers/[dealerId]` | `app/admin/dealers/[dealerId]/page.tsx` | `[dealerId]` | Dealer detail |
| `/admin/dealers/applications` | `app/admin/dealers/applications/page.tsx` | — | Dealer applications |
| `/admin/requests` | `app/admin/requests/page.tsx` | — | All requests |
| `/admin/requests/[requestId]` | `app/admin/requests/[requestId]/page.tsx` | `[requestId]` | Request detail |
| `/admin/auctions` | `app/admin/auctions/page.tsx` | — | Auction list |
| `/admin/auctions/[auctionId]` | `app/admin/auctions/[auctionId]/page.tsx` | `[auctionId]` | Auction detail |
| `/admin/offers` | `app/admin/offers/page.tsx` | — | All offers |
| `/admin/deals` | `app/admin/deals/page.tsx` | — | Deal list |
| `/admin/deals/[dealId]` | `app/admin/deals/[dealId]/page.tsx` | `[dealId]` | Deal detail |
| `/admin/deals/[dealId]/insurance` | `app/admin/deals/[dealId]/insurance/page.tsx` | `[dealId]` | Insurance review |
| `/admin/deals/[dealId]/billing` | `app/admin/deals/[dealId]/billing/page.tsx` | `[dealId]` | Billing info |
| `/admin/deals/[dealId]/refunds` | `app/admin/deals/[dealId]/refunds/page.tsx` | `[dealId]` | Refunds |
| `/admin/payments` | `app/admin/payments/page.tsx` | — | Payment list |
| `/admin/payments/deposits` | `app/admin/payments/deposits/page.tsx` | — | Deposits |
| `/admin/payments/refunds` | `app/admin/payments/refunds/page.tsx` | — | Refunds |
| `/admin/payments/concierge-fees` | `app/admin/payments/concierge-fees/page.tsx` | — | Concierge fees |
| `/admin/payments/affiliate-payments` | `app/admin/payments/affiliate-payments/page.tsx` | — | Affiliate payouts |
| `/admin/payments/send-link` | `app/admin/payments/send-link/page.tsx` | — | Send payment link |
| `/admin/payouts` | `app/admin/payouts/page.tsx` | — | Payout list |
| `/admin/payouts/new` | `app/admin/payouts/new/page.tsx` | — | Create payout |
| `/admin/payouts/[payoutId]` | `app/admin/payouts/[payoutId]/page.tsx` | `[payoutId]` | Payout detail |
| `/admin/payouts/payments` | `app/admin/payouts/payments/page.tsx` | — | Payment list |
| `/admin/affiliates` | `app/admin/affiliates/page.tsx` | — | Affiliate list |
| `/admin/affiliates/create` | `app/admin/affiliates/create/page.tsx` | — | Create affiliate |
| `/admin/affiliates/[affiliateId]` | `app/admin/affiliates/[affiliateId]/page.tsx` | `[affiliateId]` | Affiliate detail |
| `/admin/affiliates/[affiliateId]/payouts` | `app/admin/affiliates/[affiliateId]/payouts/page.tsx` | `[affiliateId]` | Affiliate payouts |
| `/admin/affiliates/payouts` | `app/admin/affiliates/payouts/page.tsx` | — | All payouts |
| `/admin/trade-ins` | `app/admin/trade-ins/page.tsx` | — | Trade-in list |
| `/admin/documents` | `app/admin/documents/page.tsx` | — | Document list |
| `/admin/documents/[documentId]` | `app/admin/documents/[documentId]/page.tsx` | `[documentId]` | Document detail |
| `/admin/documents/buyers` | `app/admin/documents/buyers/page.tsx` | — | Buyer docs |
| `/admin/documents/dealers` | `app/admin/documents/dealers/page.tsx` | — | Dealer docs |
| `/admin/documents/affiliates` | `app/admin/documents/affiliates/page.tsx` | — | Affiliate docs |
| `/admin/insurance` | `app/admin/insurance/page.tsx` | — | Insurance mgmt |
| `/admin/contract-shield/rules` | `app/admin/contract-shield/rules/page.tsx` | — | CS rules |
| `/admin/contract-shield/overrides` | `app/admin/contract-shield/overrides/page.tsx` | — | CS overrides |
| `/admin/contracts` | `app/admin/contracts/page.tsx` | — | Contract list |
| `/admin/contracts/[id]` | `app/admin/contracts/[id]/page.tsx` | `[id]` | Contract detail |
| `/admin/refinance` | `app/admin/refinance/page.tsx` | — | Refinance overview |
| `/admin/refinance/leads` | `app/admin/refinance/leads/page.tsx` | — | Refi leads |
| `/admin/refinance/qualified` | `app/admin/refinance/qualified/page.tsx` | — | Qualified leads |
| `/admin/refinance/redirected` | `app/admin/refinance/redirected/page.tsx` | — | Redirected |
| `/admin/refinance/funded` | `app/admin/refinance/funded/page.tsx` | — | Funded |
| `/admin/refinance/revenue` | `app/admin/refinance/revenue/page.tsx` | — | Revenue tracking |
| `/admin/refinance/analytics` | `app/admin/refinance/analytics/page.tsx` | — | Analytics |
| `/admin/reports` | `app/admin/reports/page.tsx` | — | Reports index |
| `/admin/reports/finance` | `app/admin/reports/finance/page.tsx` | — | Financial reports |
| `/admin/reports/operations` | `app/admin/reports/operations/page.tsx` | — | Operations |
| `/admin/reports/funnel` | `app/admin/reports/funnel/page.tsx` | — | Funnel analysis |
| `/admin/seo` | `app/admin/seo/page.tsx` | — | SEO dashboard |
| `/admin/seo/pages` | `app/admin/seo/pages/page.tsx` | — | Page SEO |
| `/admin/seo/schema` | `app/admin/seo/schema/page.tsx` | — | Schema markup |
| `/admin/seo/health` | `app/admin/seo/health/page.tsx` | — | Health check |
| `/admin/seo/keywords` | `app/admin/seo/keywords/page.tsx` | — | Keyword tracking |
| `/admin/compliance` | `app/admin/compliance/page.tsx` | — | Compliance tools |
| `/admin/audit-logs` | `app/admin/audit-logs/page.tsx` | — | Audit logs |
| `/admin/notifications` | `app/admin/notifications/page.tsx` | — | Notifications |
| `/admin/settings` | `app/admin/settings/page.tsx` | — | General settings |
| `/admin/settings/roles` | `app/admin/settings/roles/page.tsx` | — | Role management |
| `/admin/settings/integrations` | `app/admin/settings/integrations/page.tsx` | — | 3rd-party integrations |
| `/admin/settings/branding` | `app/admin/settings/branding/page.tsx` | — | Branding config |
| `/admin/ai` | `app/admin/ai/page.tsx` | — | AI management |
| `/admin/support` | `app/admin/support/page.tsx` | — | Support tools |
| `/admin/qa` | `app/admin/qa/page.tsx` | — | QA testing |
| `/admin/financial-reporting` | `app/admin/financial-reporting/page.tsx` | — | Financial reports |
| `/admin/refunds` | `app/admin/refunds/page.tsx` | — | Refund list |

---

## 7. Test Workspace Routes (protected — workspace_mode: TEST)

Layout: `app/test/layout.tsx` — shows test banner; requires `workspace_mode === "TEST"`.

| Path | File | Dynamic | Notes |
|------|------|---------|-------|
| `/test/admin` | `app/test/admin/page.tsx` | — | Admin mockup (mock_role=ADMIN) |
| `/test/dealer` | `app/test/dealer/page.tsx` | — | Dealer mockup (mock_role=DEALER) |
| `/test/affiliate` | `app/test/affiliate/page.tsx` | — | Affiliate mockup (mock_role=AFFILIATE) |
| `/test/buyer` | `app/test/buyer/page.tsx` | — | Buyer mockup (mock_role=BUYER) |
| `/test/dashboard` | `app/test/dashboard/page.tsx` | — | Dashboard mockup |

---

## Summary

| Category | Route count | Auth model |
|----------|-------------|------------|
| Public / marketing | 19 | None |
| Auth | 7 | None (public forms) |
| Buyer | 43 | BUYER role + email verified |
| Dealer | 32 | DEALER / DEALER_USER + email verified |
| Affiliate (public) | 14 | None |
| Affiliate portal | 13 | AFFILIATE / AFFILIATE_ONLY / BUYER+is_affiliate |
| Admin | 76 | ADMIN / SUPER_ADMIN + email verified |
| Test workspace | 5 | TEST workspace_mode |
| **Total** | **~209** | |
