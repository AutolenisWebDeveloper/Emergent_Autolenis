# Feature Matrix — AutoLenis Platform

> Generated: 2026-02-19 | Full-stack validation audit.

---

## Legend

- ✅ Verified present in code
- ⚠️ Present but with noted issues
- ❌ Missing or broken
- 🔒 Requires authentication
- N/A Not applicable for this role

---

## 1. Public Marketing Features

| Feature | Buyer | Dealer | Affiliate | Admin | Status | Notes |
|---------|-------|--------|-----------|-------|--------|-------|
| Landing page | ✅ | ✅ | ✅ | ✅ | ✅ | `/` renders with hero CTA |
| How It Works | ✅ | ✅ | ✅ | ✅ | ✅ | `/how-it-works` |
| Pricing | ✅ | ✅ | ✅ | ✅ | ✅ | `/pricing` |
| About | ✅ | ✅ | ✅ | ✅ | ✅ | `/about` |
| Contact | ✅ | ✅ | ✅ | ✅ | ✅ | `/contact` — form present |
| FAQ | ✅ | ✅ | ✅ | ✅ | ✅ | `/faq` |
| Insurance info | ✅ | ✅ | ✅ | ✅ | ✅ | `/insurance` |
| For Dealers | ✅ | ✅ | ✅ | ✅ | ✅ | `/for-dealers` |
| Contract Shield info | ✅ | ✅ | ✅ | ✅ | ✅ | `/contract-shield` |
| Refinance | ✅ | ✅ | ✅ | ✅ | ✅ | `/refinance` |
| Dealer Application | ✅ | ✅ | ✅ | ✅ | ✅ | `/dealer-application` |
| Affiliate Program | ✅ | ✅ | ✅ | ✅ | ✅ | `/affiliate` |
| Privacy Policy | ✅ | ✅ | ✅ | ✅ | ✅ | `/privacy` + `/legal/privacy` |
| Terms of Service | ✅ | ✅ | ✅ | ✅ | ✅ | `/terms` + `/legal/terms` |
| Dealer Terms | ✅ | ✅ | ✅ | ✅ | ✅ | `/legal/dealer-terms` |
| Feedback | ✅ | ✅ | ✅ | ✅ | ✅ | `/feedback` |

---

## 2. Authentication Features

| Feature | Buyer | Dealer | Affiliate | Admin | Status | Notes |
|---------|-------|--------|-----------|-------|--------|-------|
| Sign up | ✅ | N/A | N/A | ✅ | ✅ | `/auth/signup`, `/admin/signup` |
| Sign in | ✅ | ✅ | 🔒 | ✅ | ✅ | `/auth/signin`, `/dealer/sign-in`, `/admin/sign-in` |
| Sign out | ✅ | ✅ | ✅ | ✅ | ✅ | Cookie clear + redirect |
| Password reset | ✅ | ✅ | ✅ | ✅ | ✅ | `/auth/reset-password` + `/auth/forgot-password` |
| Email verification | ✅ | ✅ | ✅ | ✅ | ✅ | `/auth/verify-email` |
| MFA (TOTP) | ✅ | N/A | N/A | ✅ | ✅ | Admin: `/admin/mfa/enroll`, `/admin/mfa/challenge` |
| Protected route redirect | ✅ | ✅ | ✅ | ✅ | ✅ | Middleware redirects to sign-in |
| Session persistence | ✅ | ✅ | ✅ | ✅ | ✅ | JWT cookie-based |

---

## 3. Buyer Features

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Dashboard | `/buyer/dashboard` | ✅ | Stats cards, activity feed |
| Profile | `/buyer/profile` | ✅ | User info management |
| Settings | `/buyer/settings` | ✅ | Password change + MFA sections |
| Pre-Qualification | `/buyer/prequal` | ✅ | Form with draft save |
| Vehicle Search | `/buyer/search` | ✅ | Search results display |
| Shortlist | `/buyer/shortlist` | ✅ | Saved vehicles |
| Trade-In | `/buyer/trade-in` | ✅ | Trade-in submission |
| Request creation | `/buyer/requests` | ✅ | List + detail views |
| Auction view | `/buyer/auction` | ✅ | Active auctions list |
| Auction detail | `/buyer/auction/[id]` | ✅ | Auction details + offers |
| Offers list | `/buyer/offers` | ✅ | Received offers |
| Offer detail | `/buyer/offers/[offerId]` | ✅ | Offer comparison |
| Deal summary | `/buyer/deal/summary` | ✅ | Deal overview |
| Deal financing | `/buyer/deal/financing` | ✅ | Financing options |
| Concierge fee | `/buyer/deal/fee` | ✅ | Fee payment flow |
| Insurance flow | `/buyer/deal/insurance` | ✅ | Quote → bind → confirmed → proof |
| Contract review | `/buyer/deal/contract` | ✅ | Contract document |
| E-Sign | `/buyer/deal/esign` | ✅ | Electronic signature |
| Pickup scheduling | `/buyer/deal/pickup` | ✅ | Pickup appointment |
| Documents | `/buyer/documents` | ✅ | Document upload/view |
| Contracts | `/buyer/contracts` | ✅ | Contract list |
| Payments | `/buyer/payments` | ✅ | Payment history |
| Billing | `/buyer/billing` | ✅ | Billing info |
| Messages | `/buyer/messages` | ✅ | Messaging interface |
| Referrals | `/buyer/affiliate` | ✅ | Referral sharing |
| Onboarding | `/buyer/onboarding` | ✅ | Multi-step onboarding wizard |
| Delivery | `/buyer/delivery` | ✅ | Delivery tracking |
| Deposit | `/buyer/deposit` | ✅ | Deposit payment |
| Contract Shield | `/buyer/contract-shield` | ✅ | Contract protection |

---

## 4. Dealer Features

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Dashboard | `/dealer/dashboard` | ✅ | KPI tiles with links |
| Profile | `/dealer/profile` | ✅ | Dealer info |
| Settings | `/dealer/settings` | ✅ | Dealer settings |
| Onboarding | `/dealer/onboarding` | ✅ | Dealer setup flow |
| Leads | `/dealer/leads` | ✅ | Lead management |
| Lead detail | `/dealer/leads/[leadId]` | ✅ | Individual lead |
| Buyer requests | `/dealer/requests` | ✅ | Request list |
| Request detail | `/dealer/requests/[requestId]` | ✅ | Request details |
| Inventory | `/dealer/inventory` | ✅ | Vehicle inventory list |
| Add vehicle | `/dealer/inventory/add` | ✅ | Manual add form |
| Bulk upload | `/dealer/inventory/bulk-upload` | ✅ | CSV/file upload |
| Column mapping | `/dealer/inventory/column-mapping` | ✅ | Import field mapping |
| Import history | `/dealer/inventory/import-history` | ✅ | Past imports |
| Auctions | `/dealer/auctions` | ✅ | Active auctions |
| Auction detail | `/dealer/auctions/[id]` | ✅ | Auction info |
| Invited auctions | `/dealer/auctions/invited` | ✅ | Auction invitations |
| Auction offers | `/dealer/auctions/offers` | ✅ | Submitted offers |
| Offers list | `/dealer/offers` | ✅ | All offers |
| Offer detail | `/dealer/offers/[offerId]` | ✅ | Offer details |
| New offer | `/dealer/offers/new` | ✅ | Create offer |
| Deals | `/dealer/deals` | ✅ | Deal list |
| Deal detail | `/dealer/deals/[dealId]` | ✅ | Deal management |
| Deal insurance | `/dealer/deals/[dealId]/insurance` | ✅ | Insurance for deal |
| Contracts | `/dealer/contracts` | ✅ | Contract list |
| Contract detail | `/dealer/contracts/[id]` | ✅ | Contract view |
| Documents | `/dealer/documents` | ✅ | Document management |
| Document detail | `/dealer/documents/[documentId]` | ✅ | Document view |
| Payments | `/dealer/payments` | ✅ | Payment history |
| Payment success | `/dealer/payments/success` | ✅ | Stripe success callback |
| Payment cancel | `/dealer/payments/cancel` | ✅ | Stripe cancel callback |
| Messages | `/dealer/messages` | ✅ | Messaging |
| Message thread | `/dealer/messages/[threadId]` | ✅ | Thread view |
| Pickups | `/dealer/pickups` | ✅ | Pickup scheduling |

---

## 5. Affiliate Features

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Program landing | `/affiliate` | ✅ | Public info page |
| Portal dashboard | `/affiliate/portal/dashboard` | ✅ | Affiliate dashboard |
| Referral link | `/affiliate/portal/link` | ✅ | Unique link management |
| Income calculator | `/affiliate/portal/income-calculator` | ✅ | Earnings estimator |
| Analytics | `/affiliate/portal/analytics` | ✅ | Performance metrics |
| All referrals | `/affiliate/portal/referrals` | ✅ | Referral list |
| Referred buyers | `/affiliate/portal/referrals/buyers` | ✅ | Buyer referrals |
| Referred affiliates | `/affiliate/portal/referrals/affiliates` | ✅ | Sub-affiliate referrals |
| Commissions | `/affiliate/portal/commissions` | ✅ | Commission tracking |
| Payouts | `/affiliate/portal/payouts` | ✅ | Payout history |
| Documents | `/affiliate/portal/documents` | ✅ | W9, ID, bank docs |
| Promo assets | `/affiliate/portal/assets` | ✅ | Marketing materials |
| Settings | `/affiliate/portal/settings` | ✅ | Account settings |
| Onboarding | `/affiliate/portal/onboarding` | ✅ | Setup flow |

---

## 6. Admin Features

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Dashboard | `/admin/dashboard` | ✅ | Overview stats |
| Buyers list | `/admin/buyers` | ✅ | Buyer management |
| Buyer detail | `/admin/buyers/[buyerId]` | ✅ | Buyer info |
| Create buyer | `/admin/buyers/create` | ✅ | Manual buyer creation |
| Requests | `/admin/requests` | ✅ | All buyer requests |
| Request detail | `/admin/requests/[requestId]` | ✅ | Request info |
| Dealers list | `/admin/dealers` | ✅ | Dealer management |
| Dealer detail | `/admin/dealers/[dealerId]` | ✅ | Dealer info |
| Dealer applications | `/admin/dealers/applications` | ✅ | Pending applications |
| Auctions | `/admin/auctions` | ✅ | All auctions |
| Auction detail | `/admin/auctions/[auctionId]` | ✅ | Auction management |
| Offers | `/admin/offers` | ✅ | All offers |
| Deals | `/admin/deals` | ✅ | All deals |
| Deal detail | `/admin/deals/[dealId]` | ✅ | Deal management |
| Deal insurance | `/admin/deals/[dealId]/insurance` | ✅ | Insurance management |
| Deal refunds | `/admin/deals/[dealId]/refunds` | ✅ | Refund processing |
| Deal billing | `/admin/deals/[dealId]/billing` | ✅ | Billing info |
| Trade-ins | `/admin/trade-ins` | ✅ | Trade-in management |
| Refinance | `/admin/refinance` | ✅ | Refinance dashboard |
| Refinance leads | `/admin/refinance/leads` | ✅ | Lead pipeline |
| Refinance qualified | `/admin/refinance/qualified` | ✅ | Qualified leads |
| Refinance redirected | `/admin/refinance/redirected` | ✅ | Redirected leads |
| Refinance funded | `/admin/refinance/funded` | ✅ | Funded loans |
| Refinance revenue | `/admin/refinance/revenue` | ✅ | Revenue tracking |
| Refinance analytics | `/admin/refinance/analytics` | ✅ | Analytics dashboard |
| Payments | `/admin/payments` | ✅ | Payment management |
| Payment send link | `/admin/payments/send-link` | ✅ | Send payment link |
| Concierge fees | `/admin/payments/concierge-fees` | ✅ | Fee tracking |
| Deposits | `/admin/payments/deposits` | ✅ | Deposit management |
| Refunds | `/admin/payments/refunds` | ✅ | Refund management |
| Affiliate payments | `/admin/payments/affiliate-payments` | ✅ | Affiliate payouts |
| Financial reporting | `/admin/financial-reporting` | ✅ | Finance dashboard |
| Affiliates list | `/admin/affiliates` | ✅ | Affiliate management |
| Affiliate detail | `/admin/affiliates/[affiliateId]` | ✅ | Affiliate info |
| Affiliate payouts | `/admin/affiliates/[affiliateId]/payouts` | ✅ | Payout details |
| Create affiliate | `/admin/affiliates/create` | ✅ | Manual creation |
| Admin payouts | `/admin/payouts` | ✅ | Payout queue |
| Payout detail | `/admin/payouts/[payoutId]` | ✅ | Payout info |
| New payout | `/admin/payouts/new` | ✅ | Create payout |
| Payout payments | `/admin/payouts/payments` | ✅ | Payment records |
| Documents | `/admin/documents` | ✅ | All documents |
| Buyer docs | `/admin/documents/buyers` | ✅ | Buyer documents |
| Dealer docs | `/admin/documents/dealers` | ✅ | Dealer documents |
| Affiliate docs | `/admin/documents/affiliates` | ✅ | Affiliate documents |
| Document detail | `/admin/documents/[documentId]` | ✅ | Document viewer |
| Insurance | `/admin/insurance` | ✅ | Insurance management |
| Contract Shield rules | `/admin/contract-shield/rules` | ✅ | Shield rules config |
| Contract Shield overrides | `/admin/contract-shield/overrides` | ✅ | Override management |
| Contracts | `/admin/contracts` | ✅ | Contract list |
| Contract detail | `/admin/contracts/[id]` | ✅ | Contract viewer |
| Compliance | `/admin/compliance` | ✅ | Compliance events |
| Reports | `/admin/reports` | ✅ | Reports dashboard |
| Finance reports | `/admin/reports/finance` | ✅ | Financial reports |
| Funnel reports | `/admin/reports/funnel` | ✅ | Funnel analytics |
| Operations reports | `/admin/reports/operations` | ✅ | Operations data |
| SEO | `/admin/seo` | ✅ | SEO management |
| SEO pages | `/admin/seo/pages` | ✅ | Page SEO |
| SEO schema | `/admin/seo/schema` | ✅ | Schema markup |
| SEO health | `/admin/seo/health` | ✅ | SEO health check |
| SEO keywords | `/admin/seo/keywords` | ✅ | Keyword tracking |
| AI management | `/admin/ai` | ✅ | AI config |
| Users | `/admin/users` | ✅ | User management |
| User detail | `/admin/users/[userId]` | ✅ | User info |
| New user | `/admin/users/new` | ✅ | Create user |
| QA tools | `/admin/qa` | ✅ | QA dashboard |
| Support tools | `/admin/support` | ✅ | Support tooling |
| Audit logs | `/admin/audit-logs` | ✅ | Admin audit trail |
| Notifications | `/admin/notifications` | ✅ | Notification center |
| Settings | `/admin/settings` | ✅ | Admin settings |
| Roles | `/admin/settings/roles` | ✅ | Role management |
| Integrations | `/admin/settings/integrations` | ✅ | Integration config |
| Branding | `/admin/settings/branding` | ✅ | Brand customization |
| Refunds admin | `/admin/refunds` | ✅ | Refund management |

---

## 7. Test Workspace Features

| Feature | Route | Status | Notes |
|---------|-------|--------|-------|
| Test buyer | `/test/buyer` | ✅ | Test workspace buyer |
| Test dealer | `/test/dealer` | ✅ | Test workspace dealer |
| Test admin | `/test/admin` | ✅ | Test workspace admin |
| Test affiliate | `/test/affiliate` | ✅ | Test workspace affiliate |
| Test dashboard | `/test/dashboard` | ✅ | Test workspace overview |

---

## 8. Cross-Cutting Features

| Feature | Status | Notes |
|---------|--------|-------|
| Workspace isolation (multi-tenant) | ✅ | LIVE/TEST workspace separation via `workspaceId` |
| Role-based access control | ✅ | Middleware + `getSessionUser()` role checks |
| JWT session management | ✅ | Custom JWT in cookies |
| Stripe payment integration | ✅ | Checkout, intents, webhooks |
| Email notifications (Resend) | ✅ | 15+ email templates |
| AI chat (Gemini) | ✅ | Orchestrator + agents per domain |
| E-signature integration | ✅ | External provider via webhooks |
| QR code generation | ✅ | For admin MFA enrollment |
| File upload/storage | ✅ | Supabase Storage buckets |
| Contract Shield scanning | ✅ | AI-powered contract analysis |
| Referral tracking | ✅ | `/ref/[code]` redirect + click tracking |
| SEO management | ✅ | Sitemap, robots.txt, metadata, schema |
| Mobile responsive | ✅ | Tailwind responsive classes |
| Dark/Light theme | ✅ | `next-themes` provider |

---

## Summary

| Domain | Total Features | Verified |
|--------|---------------|----------|
| Public Marketing | 16 | 16 |
| Authentication | 8 | 8 |
| Buyer | 29 | 29 |
| Dealer | 33 | 33 |
| Affiliate | 14 | 14 |
| Admin | 68 | 68 |
| Test Workspace | 5 | 5 |
| Cross-Cutting | 14 | 14 |
| **Total** | **187** | **187** |
