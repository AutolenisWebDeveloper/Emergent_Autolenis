# ROUTE_MAP.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## A) Public Pages

| Route | File Path | Auth | Purpose |
|-------|----------|------|---------|
| `/` | `app/page.tsx` | No | Landing page |
| `/about` | `app/about/page.tsx` | No | About AutoLenis |
| `/how-it-works` | `app/how-it-works/page.tsx` | No | How it works explainer |
| `/pricing` | `app/pricing/page.tsx` | No | Pricing page (fee tiers) |
| `/contact` | `app/contact/page.tsx` | No | Contact form |
| `/faq` | `app/faq/page.tsx` | No | FAQ page |
| `/feedback` | `app/feedback/page.tsx` | No | User feedback |
| `/for-dealers` | `app/for-dealers/page.tsx` | No | Dealer recruitment page |
| `/contract-shield` | `app/contract-shield/page.tsx` | No | Contract Shield marketing |
| `/insurance` | `app/insurance/page.tsx` | No | Insurance info page |
| `/refinance` | `app/refinance/page.tsx` | No | Refinance landing page |
| `/dealer-application` | `app/dealer-application/page.tsx` | No | Dealer application form |
| `/ref/[code]` | `app/ref/[code]/page.tsx` | No | Affiliate referral landing |
| `/privacy` | `app/privacy/page.tsx` | No | Privacy policy |
| `/terms` | `app/terms/page.tsx` | No | Terms of service |
| `/legal/terms` | `app/legal/terms/page.tsx` | No | Legal terms |
| `/legal/privacy` | `app/legal/privacy/page.tsx` | No | Legal privacy |
| `/legal/dealer-terms` | `app/legal/dealer-terms/page.tsx` | No | Dealer terms |
| `/affiliate` | `app/affiliate/page.tsx` | No | Affiliate program info |

## B) Auth Routes

| Route | File Path | Auth | Purpose |
|-------|----------|------|---------|
| `/auth/signin` | `app/auth/signin/page.tsx` | No | User sign-in |
| `/auth/signup` | `app/auth/signup/page.tsx` | No | User registration |
| `/auth/signout` | `app/auth/signout/page.tsx` | No | Sign-out confirmation |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | No | Password reset request |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | No | Password reset form |
| `/auth/verify-email` | `app/auth/verify-email/page.tsx` | No | Email verification |
| `/auth/access-denied` | `app/auth/access-denied/page.tsx` | No | Access denied page |

**Layout:** `app/auth/layout.tsx`

## C) Buyer Portal Routes

| Route | File Path | Auth | Roles | Purpose |
|-------|----------|------|-------|---------|
| `/buyer/dashboard` | `app/buyer/dashboard/page.tsx` | Yes | BUYER | Main dashboard |
| `/buyer/onboarding` | `app/buyer/onboarding/page.tsx` | Yes | BUYER | New buyer onboarding |
| `/buyer/prequal` | `app/buyer/prequal/page.tsx` | Yes | BUYER | Pre-qualification flow |
| `/buyer/prequal/manual-preapproval` | `app/buyer/prequal/manual-preapproval/page.tsx` | Yes | BUYER | Upload bank pre-approval wizard |
| `/buyer/prequal/manual-preapproval/status` | `app/buyer/prequal/manual-preapproval/status/page.tsx` | Yes | BUYER | Manual pre-approval submission status |
| `/buyer/search` | `app/buyer/search/page.tsx` | Yes | BUYER | Vehicle search |
| `/buyer/shortlist` | `app/buyer/shortlist/page.tsx` | Yes | BUYER | Saved vehicles |
| `/buyer/auction` | `app/buyer/auction/page.tsx` | Yes | BUYER | Auction list |
| `/buyer/auction/[id]` | `app/buyer/auction/[id]/page.tsx` | Yes | BUYER | Auction detail |
| `/buyer/auction/[id]/offers` | `app/buyer/auction/[id]/offers/page.tsx` | Yes | BUYER | Auction offers view |
| `/buyer/offers` | `app/buyer/offers/page.tsx` | Yes | BUYER | All offers |
| `/buyer/offers/[offerId]` | `app/buyer/offers/[offerId]/page.tsx` | Yes | BUYER | Offer detail |
| `/buyer/deposit` | `app/buyer/deposit/page.tsx` | Yes | BUYER | Deposit payment |
| `/buyer/deal` | `app/buyer/deal/page.tsx` | Yes | BUYER | Deal overview |
| `/buyer/deal/financing` | `app/buyer/deal/financing/page.tsx` | Yes | BUYER | Financing step |
| `/buyer/deal/fee` | `app/buyer/deal/fee/page.tsx` | Yes | BUYER | Concierge fee payment |
| `/buyer/deal/insurance` | `app/buyer/deal/insurance/page.tsx` | Yes | BUYER | Insurance step |
| `/buyer/deal/insurance/quote` | `app/buyer/deal/insurance/quote/page.tsx` | Yes | BUYER | Insurance quote request |
| `/buyer/deal/insurance/quotes` | `app/buyer/deal/insurance/quotes/page.tsx` | Yes | BUYER | View quotes |
| `/buyer/deal/insurance/quotes/[quoteId]` | `app/buyer/deal/insurance/quotes/[quoteId]/page.tsx` | Yes | BUYER | Quote detail |
| `/buyer/deal/insurance/bind` | `app/buyer/deal/insurance/bind/page.tsx` | Yes | BUYER | Bind policy |
| `/buyer/deal/insurance/proof` | `app/buyer/deal/insurance/proof/page.tsx` | Yes | BUYER | External proof upload |
| `/buyer/deal/insurance/confirmed` | `app/buyer/deal/insurance/confirmed/page.tsx` | Yes | BUYER | Insurance confirmed |
| `/buyer/deal/contract` | `app/buyer/deal/contract/page.tsx` | Yes | BUYER | Contract review |
| `/buyer/deal/esign` | `app/buyer/deal/esign/page.tsx` | Yes | BUYER | E-signature |
| `/buyer/deal/pickup` | `app/buyer/deal/pickup/page.tsx` | Yes | BUYER | Pickup scheduling |
| `/buyer/deal/summary` | `app/buyer/deal/summary/page.tsx` | Yes | BUYER | Deal summary |
| `/buyer/contract-shield` | `app/buyer/contract-shield/page.tsx` | Yes | BUYER | Contract Shield view |
| `/buyer/contracts` | `app/buyer/contracts/page.tsx` | Yes | BUYER | All contracts |
| `/buyer/esign` | `app/buyer/esign/page.tsx` | Yes | BUYER | E-sign page |
| `/buyer/sign/[dealId]` | `app/buyer/sign/[dealId]/page.tsx` | Yes | BUYER | Sign deal |
| `/buyer/pickup/[dealId]` | `app/buyer/pickup/[dealId]/page.tsx` | Yes | BUYER | Pickup detail |
| `/buyer/insurance` | `app/buyer/insurance/page.tsx` | Yes | BUYER | Insurance page |
| `/buyer/funding` | `app/buyer/funding/page.tsx` | Yes | BUYER | Funding status |
| `/buyer/delivery` | `app/buyer/delivery/page.tsx` | Yes | BUYER | Delivery tracking |
| `/buyer/payments` | `app/buyer/payments/page.tsx` | Yes | BUYER | Payment history |
| `/buyer/payments/[paymentId]` | `app/buyer/payments/[paymentId]/page.tsx` | Yes | BUYER | Payment detail |
| `/buyer/billing` | `app/buyer/billing/page.tsx` | Yes | BUYER | Billing info |
| `/buyer/documents` | `app/buyer/documents/page.tsx` | Yes | BUYER | Documents |
| `/buyer/trade-in` | `app/buyer/trade-in/page.tsx` | Yes | BUYER | Trade-in info |
| `/buyer/demo` | `app/buyer/demo/page.tsx` | Yes | BUYER | Demo/test page |
| `/buyer/request` | `app/buyer/request/page.tsx` | Yes | BUYER | Submit request |
| `/buyer/requests` | `app/buyer/requests/page.tsx` | Yes | BUYER | Request list |
| `/buyer/requests/[requestId]` | `app/buyer/requests/[requestId]/page.tsx` | Yes | BUYER | Request detail |
| `/buyer/messages` | `app/buyer/messages/page.tsx` | Yes | BUYER | Messages |
| `/buyer/profile` | `app/buyer/profile/page.tsx` | Yes | BUYER | Profile |
| `/buyer/settings` | `app/buyer/settings/page.tsx` | Yes | BUYER | Settings |
| `/buyer/affiliate` | `app/buyer/affiliate/page.tsx` | Yes | BUYER | Affiliate enrollment |

**Layout:** `app/buyer/layout.tsx`, `app/buyer/layout-client.tsx`

## D) Dealer Portal Routes

| Route | File Path | Auth | Roles | Purpose |
|-------|----------|------|-------|---------|
| `/dealer/sign-in` | `app/dealer/sign-in/page.tsx` | No | — | Dealer sign-in |
| `/dealer/dashboard` | `app/dealer/dashboard/page.tsx` | Yes | DEALER, DEALER_USER | Dashboard |
| `/dealer/onboarding` | `app/dealer/onboarding/page.tsx` | Yes | DEALER | Onboarding flow |
| `/dealer/inventory` | `app/dealer/inventory/page.tsx` | Yes | DEALER | Inventory list |
| `/dealer/inventory/add` | `app/dealer/inventory/add/page.tsx` | Yes | DEALER | Add vehicle |
| `/dealer/inventory/bulk-upload` | `app/dealer/inventory/bulk-upload/page.tsx` | Yes | DEALER | Bulk upload |
| `/dealer/inventory/column-mapping` | `app/dealer/inventory/column-mapping/page.tsx` | Yes | DEALER | CSV column mapping |
| `/dealer/inventory/import-history` | `app/dealer/inventory/import-history/page.tsx` | Yes | DEALER | Import history |
| `/dealer/auctions` | `app/dealer/auctions/page.tsx` | Yes | DEALER | Auction list |
| `/dealer/auctions/[id]` | `app/dealer/auctions/[id]/page.tsx` | Yes | DEALER | Auction detail |
| `/dealer/auctions/invited` | `app/dealer/auctions/invited/page.tsx` | Yes | DEALER | Invited auctions |
| `/dealer/auctions/offers` | `app/dealer/auctions/offers/page.tsx` | Yes | DEALER | Submitted offers |
| `/dealer/offers` | `app/dealer/offers/page.tsx` | Yes | DEALER | Offer management |
| `/dealer/offers/[offerId]` | `app/dealer/offers/[offerId]/page.tsx` | Yes | DEALER | Offer detail |
| `/dealer/offers/new` | `app/dealer/offers/new/page.tsx` | Yes | DEALER | New offer |
| `/dealer/deals` | `app/dealer/deals/page.tsx` | Yes | DEALER | Deals list |
| `/dealer/deals/[dealId]` | `app/dealer/deals/[dealId]/page.tsx` | Yes | DEALER | Deal detail |
| `/dealer/deals/[dealId]/insurance` | `app/dealer/deals/[dealId]/insurance/page.tsx` | Yes | DEALER | Deal insurance |
| `/dealer/contracts` | `app/dealer/contracts/page.tsx` | Yes | DEALER | Contracts |
| `/dealer/contracts/[id]` | `app/dealer/contracts/[id]/page.tsx` | Yes | DEALER | Contract detail |
| `/dealer/documents` | `app/dealer/documents/page.tsx` | Yes | DEALER | Documents |
| `/dealer/documents/[documentId]` | `app/dealer/documents/[documentId]/page.tsx` | Yes | DEALER | Document detail |
| `/dealer/leads` | `app/dealer/leads/page.tsx` | Yes | DEALER | Leads |
| `/dealer/leads/[leadId]` | `app/dealer/leads/[leadId]/page.tsx` | Yes | DEALER | Lead detail |
| `/dealer/messages` | `app/dealer/messages/page.tsx` | Yes | DEALER | Messages |
| `/dealer/messages/[threadId]` | `app/dealer/messages/[threadId]/page.tsx` | Yes | DEALER | Thread detail |
| `/dealer/payments` | `app/dealer/payments/page.tsx` | Yes | DEALER | Payments |
| `/dealer/payments/success` | `app/dealer/payments/success/page.tsx` | Yes | DEALER | Payment success |
| `/dealer/payments/cancel` | `app/dealer/payments/cancel/page.tsx` | Yes | DEALER | Payment cancelled |
| `/dealer/pickups` | `app/dealer/pickups/page.tsx` | Yes | DEALER | Pickup management |
| `/dealer/requests` | `app/dealer/requests/page.tsx` | Yes | DEALER | Requests |
| `/dealer/requests/[requestId]` | `app/dealer/requests/[requestId]/page.tsx` | Yes | DEALER | Request detail |
| `/dealer/profile` | `app/dealer/profile/page.tsx` | Yes | DEALER | Profile |
| `/dealer/settings` | `app/dealer/settings/page.tsx` | Yes | DEALER | Settings |

**Layout:** `app/dealer/layout.tsx`, `app/dealer/layout-client.tsx`

## E) Affiliate Portal Routes

| Route | File Path | Auth | Roles | Purpose |
|-------|----------|------|-------|---------|
| `/affiliate/dashboard` | `app/affiliate/dashboard/page.tsx` | Yes | AFFILIATE | Dashboard |
| `/affiliate/onboarding` | `app/affiliate/onboarding/page.tsx` | Yes | AFFILIATE | Onboarding |
| `/affiliate/commissions` | `app/affiliate/commissions/page.tsx` | Yes | AFFILIATE | Commission history |
| `/affiliate/earnings` | `app/affiliate/earnings/page.tsx` | Yes | AFFILIATE | Earnings summary |
| `/affiliate/income` | `app/affiliate/income/page.tsx` | Yes | AFFILIATE | Income calculator |
| `/affiliate/links` | `app/affiliate/links/page.tsx` | Yes | AFFILIATE | Referral links |
| `/affiliate/payouts` | `app/affiliate/payouts/page.tsx` | Yes | AFFILIATE | Payout list |
| `/affiliate/payouts/[payoutId]` | `app/affiliate/payouts/[payoutId]/page.tsx` | Yes | AFFILIATE | Payout detail |
| `/affiliate/referrals` | `app/affiliate/referrals/page.tsx` | Yes | AFFILIATE | Referral list |
| `/affiliate/referrals/[referralId]` | `app/affiliate/referrals/[referralId]/page.tsx` | Yes | AFFILIATE | Referral detail |
| `/affiliate/profile` | `app/affiliate/profile/page.tsx` | Yes | AFFILIATE | Profile |
| `/affiliate/settings` | `app/affiliate/settings/page.tsx` | Yes | AFFILIATE | Settings |
| `/affiliate/support` | `app/affiliate/support/page.tsx` | Yes | AFFILIATE | Support |
| `/affiliate/portal/dashboard` | `app/affiliate/portal/dashboard/page.tsx` | Yes | AFFILIATE/BUYER+affiliate | Portal dashboard |
| `/affiliate/portal/onboarding` | `app/affiliate/portal/onboarding/page.tsx` | Yes | AFFILIATE/BUYER+affiliate | Portal onboarding |
| `/affiliate/portal/referrals` | `app/affiliate/portal/referrals/page.tsx` | Yes | AFFILIATE | Referrals |
| `/affiliate/portal/referrals/buyers` | `app/affiliate/portal/referrals/buyers/page.tsx` | Yes | AFFILIATE | Buyer referrals |
| `/affiliate/portal/referrals/affiliates` | `app/affiliate/portal/referrals/affiliates/page.tsx` | Yes | AFFILIATE | Affiliate referrals |
| `/affiliate/portal/commissions` | `app/affiliate/portal/commissions/page.tsx` | Yes | AFFILIATE | Commission view |
| `/affiliate/portal/payouts` | `app/affiliate/portal/payouts/page.tsx` | Yes | AFFILIATE | Payouts |
| `/affiliate/portal/link` | `app/affiliate/portal/link/page.tsx` | Yes | AFFILIATE | Share link |
| `/affiliate/portal/analytics` | `app/affiliate/portal/analytics/page.tsx` | Yes | AFFILIATE | Analytics |
| `/affiliate/portal/assets` | `app/affiliate/portal/assets/page.tsx` | Yes | AFFILIATE | Marketing assets |
| `/affiliate/portal/documents` | `app/affiliate/portal/documents/page.tsx` | Yes | AFFILIATE | Documents (KYC) |
| `/affiliate/portal/income-calculator` | `app/affiliate/portal/income-calculator/page.tsx` | Yes | AFFILIATE | Income calculator |
| `/affiliate/portal/settings` | `app/affiliate/portal/settings/page.tsx` | Yes | AFFILIATE | Settings |

**Layout:** `app/affiliate/portal/layout.tsx`, `app/affiliate/portal/layout-client.tsx`

## F) Admin Routes

| Route | File Path | Auth | Roles | Purpose |
|-------|----------|------|-------|---------|
| `/admin/sign-in` | `app/admin/sign-in/page.tsx` | No | — | Admin sign-in |
| `/admin/signup` | `app/admin/signup/page.tsx` | No | — | Admin registration (bootstrap) |
| `/admin/mfa/enroll` | `app/admin/mfa/enroll/page.tsx` | Yes | ADMIN | MFA enrollment |
| `/admin/mfa/challenge` | `app/admin/mfa/challenge/page.tsx` | Yes | ADMIN | MFA challenge |
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | Yes | ADMIN, SUPER_ADMIN | Dashboard |
| `/admin/buyers` | `app/admin/buyers/page.tsx` | Yes | ADMIN | Buyer list |
| `/admin/buyers/[buyerId]` | `app/admin/buyers/[buyerId]/page.tsx` | Yes | ADMIN | Buyer detail |
| `/admin/buyers/create` | `app/admin/buyers/create/page.tsx` | Yes | ADMIN | Create buyer |
| `/admin/dealers` | `app/admin/dealers/page.tsx` | Yes | ADMIN | Dealer list |
| `/admin/dealers/[dealerId]` | `app/admin/dealers/[dealerId]/page.tsx` | Yes | ADMIN | Dealer detail |
| `/admin/dealers/applications` | `app/admin/dealers/applications/page.tsx` | Yes | ADMIN | Dealer applications |
| `/admin/affiliates` | `app/admin/affiliates/page.tsx` | Yes | ADMIN | Affiliate list |
| `/admin/affiliates/[affiliateId]` | `app/admin/affiliates/[affiliateId]/page.tsx` | Yes | ADMIN | Affiliate detail |
| `/admin/affiliates/[affiliateId]/payouts` | `app/admin/affiliates/[affiliateId]/payouts/page.tsx` | Yes | ADMIN | Affiliate payouts |
| `/admin/affiliates/create` | `app/admin/affiliates/create/page.tsx` | Yes | ADMIN | Create affiliate |
| `/admin/affiliates/payouts` | `app/admin/affiliates/payouts/page.tsx` | Yes | ADMIN | All affiliate payouts |
| `/admin/auctions` | `app/admin/auctions/page.tsx` | Yes | ADMIN | Auction list |
| `/admin/auctions/[auctionId]` | `app/admin/auctions/[auctionId]/page.tsx` | Yes | ADMIN | Auction detail |
| `/admin/deals` | `app/admin/deals/page.tsx` | Yes | ADMIN | Deal list |
| `/admin/deals/[dealId]` | `app/admin/deals/[dealId]/page.tsx` | Yes | ADMIN | Deal detail |
| `/admin/deals/[dealId]/billing` | `app/admin/deals/[dealId]/billing/page.tsx` | Yes | ADMIN | Deal billing |
| `/admin/deals/[dealId]/insurance` | `app/admin/deals/[dealId]/insurance/page.tsx` | Yes | ADMIN | Deal insurance |
| `/admin/deals/[dealId]/refunds` | `app/admin/deals/[dealId]/refunds/page.tsx` | Yes | ADMIN | Deal refunds |
| `/admin/contracts` | `app/admin/contracts/page.tsx` | Yes | ADMIN | Contracts |
| `/admin/contracts/[id]` | `app/admin/contracts/[id]/page.tsx` | Yes | ADMIN | Contract detail |
| `/admin/contract-shield/rules` | `app/admin/contract-shield/rules/page.tsx` | Yes | ADMIN | Shield rules config |
| `/admin/contract-shield/overrides` | `app/admin/contract-shield/overrides/page.tsx` | Yes | ADMIN | Override history |
| `/admin/payments` | `app/admin/payments/page.tsx` | Yes | ADMIN | All payments |
| `/admin/payments/deposits` | `app/admin/payments/deposits/page.tsx` | Yes | ADMIN | Deposits |
| `/admin/payments/concierge-fees` | `app/admin/payments/concierge-fees/page.tsx` | Yes | ADMIN | Concierge fees |
| `/admin/payments/refunds` | `app/admin/payments/refunds/page.tsx` | Yes | ADMIN | Refunds |
| `/admin/payments/affiliate-payments` | `app/admin/payments/affiliate-payments/page.tsx` | Yes | ADMIN | Affiliate payments |
| `/admin/payments/send-link` | `app/admin/payments/send-link/page.tsx` | Yes | ADMIN | Send payment link |
| `/admin/payouts` | `app/admin/payouts/page.tsx` | Yes | ADMIN | Payouts |
| `/admin/payouts/[payoutId]` | `app/admin/payouts/[payoutId]/page.tsx` | Yes | ADMIN | Payout detail |
| `/admin/payouts/new` | `app/admin/payouts/new/page.tsx` | Yes | ADMIN | New payout |
| `/admin/payouts/payments` | `app/admin/payouts/payments/page.tsx` | Yes | ADMIN | Payout payments |
| `/admin/refunds` | `app/admin/refunds/page.tsx` | Yes | ADMIN | All refunds |
| `/admin/offers` | `app/admin/offers/page.tsx` | Yes | ADMIN | All offers |
| `/admin/requests` | `app/admin/requests/page.tsx` | Yes | ADMIN | Requests |
| `/admin/requests/[requestId]` | `app/admin/requests/[requestId]/page.tsx` | Yes | ADMIN | Request detail |
| `/admin/documents` | `app/admin/documents/page.tsx` | Yes | ADMIN | All documents |
| `/admin/documents/[documentId]` | `app/admin/documents/[documentId]/page.tsx` | Yes | ADMIN | Document detail |
| `/admin/documents/buyers` | `app/admin/documents/buyers/page.tsx` | Yes | ADMIN | Buyer documents |
| `/admin/documents/dealers` | `app/admin/documents/dealers/page.tsx` | Yes | ADMIN | Dealer documents |
| `/admin/documents/affiliates` | `app/admin/documents/affiliates/page.tsx` | Yes | ADMIN | Affiliate documents |
| `/admin/insurance` | `app/admin/insurance/page.tsx` | Yes | ADMIN | Insurance management |
| `/admin/trade-ins` | `app/admin/trade-ins/page.tsx` | Yes | ADMIN | Trade-ins |
| `/admin/users` | `app/admin/users/page.tsx` | Yes | ADMIN | User management |
| `/admin/users/[userId]` | `app/admin/users/[userId]/page.tsx` | Yes | ADMIN | User detail |
| `/admin/users/new` | `app/admin/users/new/page.tsx` | Yes | ADMIN | Create user |
| `/admin/notifications` | `app/admin/notifications/page.tsx` | Yes | ADMIN | Notifications |
| `/admin/compliance` | `app/admin/compliance/page.tsx` | Yes | ADMIN | Compliance dashboard |
| `/admin/audit-logs` | `app/admin/audit-logs/page.tsx` | Yes | ADMIN | Audit log viewer |
| `/admin/settings` | `app/admin/settings/page.tsx` | Yes | ADMIN | Settings |
| `/admin/settings/branding` | `app/admin/settings/branding/page.tsx` | Yes | ADMIN | Branding |
| `/admin/settings/integrations` | `app/admin/settings/integrations/page.tsx` | Yes | ADMIN | Integrations |
| `/admin/settings/roles` | `app/admin/settings/roles/page.tsx` | Yes | ADMIN | Role management |
| `/admin/refinance` | `app/admin/refinance/page.tsx` | Yes | ADMIN | Refinance dashboard |
| `/admin/refinance/leads` | `app/admin/refinance/leads/page.tsx` | Yes | ADMIN | Leads |
| `/admin/refinance/qualified` | `app/admin/refinance/qualified/page.tsx` | Yes | ADMIN | Qualified leads |
| `/admin/refinance/redirected` | `app/admin/refinance/redirected/page.tsx` | Yes | ADMIN | Redirected leads |
| `/admin/refinance/funded` | `app/admin/refinance/funded/page.tsx` | Yes | ADMIN | Funded loans |
| `/admin/refinance/analytics` | `app/admin/refinance/analytics/page.tsx` | Yes | ADMIN | Analytics |
| `/admin/refinance/revenue` | `app/admin/refinance/revenue/page.tsx` | Yes | ADMIN | Revenue tracking |
| `/admin/reports` | `app/admin/reports/page.tsx` | Yes | ADMIN | Reports hub |
| `/admin/reports/finance` | `app/admin/reports/finance/page.tsx` | Yes | ADMIN | Financial reports |
| `/admin/reports/funnel` | `app/admin/reports/funnel/page.tsx` | Yes | ADMIN | Funnel analytics |
| `/admin/reports/operations` | `app/admin/reports/operations/page.tsx` | Yes | ADMIN | Operations reports |
| `/admin/financial-reporting` | `app/admin/financial-reporting/page.tsx` | Yes | ADMIN | Financial reporting |
| `/admin/seo` | `app/admin/seo/page.tsx` | Yes | ADMIN | SEO dashboard |
| `/admin/seo/health` | `app/admin/seo/health/page.tsx` | Yes | ADMIN | SEO health |
| `/admin/seo/keywords` | `app/admin/seo/keywords/page.tsx` | Yes | ADMIN | Keywords |
| `/admin/seo/pages` | `app/admin/seo/pages/page.tsx` | Yes | ADMIN | Page SEO |
| `/admin/seo/schema` | `app/admin/seo/schema/page.tsx` | Yes | ADMIN | Schema markup |
| `/admin/ai` | `app/admin/ai/page.tsx` | Yes | ADMIN | AI dashboard |
| `/admin/qa` | `app/admin/qa/page.tsx` | Yes | ADMIN | QA page |
| `/admin/support` | `app/admin/support/page.tsx` | Yes | ADMIN | Support tickets |
| `/admin/external-preapprovals` | `app/admin/external-preapprovals/page.tsx` | Yes | ADMIN | External pre-approval review queue |
| `/admin/external-preapprovals/[submissionId]` | `app/admin/external-preapprovals/[submissionId]/page.tsx` | Yes | ADMIN | Submission detail & review |

**Layout:** `app/admin/layout.tsx`, `app/admin/layout-client.tsx`

## G) API Routes

### Auth API
| Method(s) | Route | Auth | Purpose |
|-----------|-------|------|---------|
| POST | `/api/auth/signup` | No | User registration |
| POST | `/api/auth/signin` | No | User sign-in |
| POST | `/api/auth/signout` | Yes | Sign out |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset password |
| POST | `/api/auth/change-password` | Yes | Change password |
| POST | `/api/auth/verify-email` | No | Verify email token |
| POST | `/api/auth/resend-verification` | No | Resend verification |
| GET | `/api/auth/health` | No | Auth health check |
| GET | `/api/auth/diagnostics` | No | Auth diagnostics |
| POST | `/api/auth/mfa/enroll` | Yes | MFA enrollment |
| POST | `/api/auth/mfa/verify` | Yes | MFA verification |
| POST | `/api/auth/mfa/disable` | Yes | Disable MFA |
| * | `/api/auth/[...nextauth]` | — | NextAuth catch-all |

### Buyer API
| Method(s) | Route | Auth | Purpose |
|-----------|-------|------|---------|
| GET | `/api/buyer/dashboard` | Yes | Dashboard data |
| GET/POST | `/api/buyer/profile` | Yes | Profile CRUD |
| GET/POST | `/api/buyer/prequal` | Yes | Pre-qualification |
| POST | `/api/buyer/prequal/start` | Yes | Start prequal |
| POST | `/api/buyer/prequal/draft` | Yes | Save draft |
| POST | `/api/buyer/prequal/refresh` | Yes | Refresh prequal |
| GET/POST | `/api/buyer/prequal/external` | Yes | External pre-approval (GET latest / POST submit) |
| GET | `/api/buyer/inventory/search` | Yes | Vehicle search |
| GET | `/api/buyer/inventory/filters` | Yes | Filter options |
| GET | `/api/buyer/inventory/[inventoryItemId]` | Yes | Vehicle detail |
| GET/POST/DELETE | `/api/buyer/shortlist` | Yes | Shortlist CRUD |
| GET | `/api/buyer/shortlist/eligible` | Yes | Eligible for auction |
| PUT | `/api/buyer/shortlist/items/[id]` | Yes | Update item |
| POST | `/api/buyer/shortlist/items/[id]/primary` | Yes | Set primary |
| GET/POST | `/api/buyer/auction` | Yes | Auction management |
| POST | `/api/buyer/auction/select` | Yes | Select offer |
| POST | `/api/buyer/auction/decline` | Yes | Decline offer |
| POST | `/api/buyer/auction/validate` | Yes | Validate auction |
| GET | `/api/buyer/auctions` | Yes | List auctions |
| GET | `/api/buyer/auctions/[auctionId]/best-price` | Yes | Best price options |
| POST | `/api/buyer/auctions/[auctionId]/best-price/decline` | Yes | Decline best price |
| POST | `/api/buyer/auctions/[auctionId]/deals/select` | Yes | Select deal |
| GET/POST | `/api/buyer/deposit` | Yes | Deposit payment |
| GET/POST | `/api/buyer/deal` | Yes | Deal CRUD |
| POST | `/api/buyer/deal/select` | Yes | Select deal |
| POST | `/api/buyer/deal/complete` | Yes | Complete deal |
| GET | `/api/buyer/deals/[dealId]` | Yes | Deal detail |
| GET | `/api/buyer/deals/[dealId]/concierge-fee` | Yes | Fee options |
| POST | `/api/buyer/deals/[dealId]/concierge-fee/pay-card` | Yes | Pay by card |
| POST | `/api/buyer/deals/[dealId]/concierge-fee/include-in-loan` | Yes | Include in loan |
| GET/POST | `/api/buyer/deals/[dealId]/financing` | Yes | Financing |
| GET | `/api/buyer/deals/[dealId]/insurance` | Yes | Insurance status |
| POST | `/api/buyer/deals/[dealId]/insurance/request-quotes` | Yes | Request quotes |
| POST | `/api/buyer/deals/[dealId]/insurance/select` | Yes | Select insurance |
| POST | `/api/buyer/deals/[dealId]/insurance/select-quote` | Yes | Select quote |
| POST | `/api/buyer/deals/[dealId]/insurance/bind-policy` | Yes | Bind policy |
| POST | `/api/buyer/deals/[dealId]/insurance/external-proof` | Yes | Upload proof |
| GET/POST | `/api/buyer/deals/[dealId]/insurance/doc-requests` | Yes | Insurance doc requests |
| GET/POST | `/api/buyer/deals/[dealId]/esign` | Yes | E-sign |
| GET | `/api/buyer/deals/[dealId]/pickup` | Yes | Pickup info |
| POST | `/api/buyer/deals/[dealId]/pickup/schedule` | Yes | Schedule pickup |
| GET | `/api/buyer/contract-shield` | Yes | Shield results |
| GET | `/api/buyer/contracts` | Yes | Contracts |
| POST | `/api/buyer/contracts/acknowledge-override` | Yes | Acknowledge override |
| GET | `/api/buyer/billing` | Yes | Billing info |
| GET | `/api/buyer/delivery` | Yes | Delivery status |
| GET/POST | `/api/buyer/trade-in` | Yes | Trade-in |
| GET | `/api/buyer/funding` | Yes | Funding status |
| GET | `/api/buyer/demo` | Yes | Demo data |

### Dealer API
| Method(s) | Route | Auth | Purpose |
|-----------|-------|------|---------|
| GET | `/api/dealer/dashboard` | Yes | Dashboard data |
| POST | `/api/dealer/register` | No | Dealer registration |
| GET/POST | `/api/dealer/onboarding` | Yes | Onboarding |
| GET | `/api/dealer/application-status` | Yes | Application status |
| GET/POST | `/api/dealer/inventory` | Yes | Inventory CRUD |
| GET/PUT/DELETE | `/api/dealer/inventory/[id]` | Yes | Item detail |
| PUT | `/api/dealer/inventory/[id]/status` | Yes | Update status |
| POST | `/api/dealer/inventory/bulk-upload` | Yes | Bulk upload |
| POST | `/api/dealer/inventory/import` | Yes | Import |
| POST | `/api/dealer/inventory/url-import` | Yes | URL import |
| GET | `/api/dealer/inventory/import-history` | Yes | History |
| GET | `/api/dealer/auctions` | Yes | Auction list |
| GET | `/api/dealer/auctions/[auctionId]` | Yes | Auction detail |
| GET/POST | `/api/dealer/auctions/[auctionId]/offers` | Yes | Submit offer |
| GET | `/api/dealer/auctions/[auctionId]/offers/me` | Yes | My offer |
| GET | `/api/dealer/auctions/[auctionId]/offer-context` | Yes | Offer context |
| GET | `/api/dealer/auctions/[auctionId]/trade-in` | Yes | Trade-in info |
| POST | `/api/dealer/auction/[id]/offer` | Yes | Submit offer |
| GET/POST | `/api/dealer/offers` | Yes | Offers |
| GET/POST | `/api/dealer/deals` | Yes | Deals |
| GET | `/api/dealer/deals/[dealId]` | Yes | Deal detail |
| GET | `/api/dealer/deals/[dealId]/insurance` | Yes | Insurance info |
| POST | `/api/dealer/deals/[dealId]/insurance/request-docs` | Yes | Request docs |
| GET/POST | `/api/dealer/deals/[dealId]/pickup` | Yes | Pickup |
| POST | `/api/dealer/deals/[dealId]/esign/create-envelope` | Yes | Create e-sign |
| GET | `/api/dealer/contracts` | Yes | Contracts |
| GET | `/api/dealer/documents` | Yes | Documents |
| POST | `/api/dealer/documents/upload` | Yes | Upload doc |
| GET/POST | `/api/dealer/requests` | Yes | Requests |
| GET | `/api/dealer/requests/[requestId]` | Yes | Request detail |
| GET | `/api/dealer/pickups` | Yes | Pickups |
| POST | `/api/dealer/pickups/check-in` | Yes | Check-in |
| POST | `/api/dealer/pickups/[appointmentId]/cancel` | Yes | Cancel pickup |
| POST | `/api/dealer/pickups/[appointmentId]/complete` | Yes | Complete pickup |
| GET | `/api/dealer/payments` | Yes | Payments |
| POST | `/api/dealer/payments/checkout` | Yes | Checkout |
| GET/PUT | `/api/dealer/settings` | Yes | Settings |

### Admin API
(Extensive — 90+ endpoints. All require ADMIN/SUPER_ADMIN role via `getSession()` checks.)

Key groups:
- `/api/admin/auth/*` — Admin authentication (signin, signup, signout, MFA)
- `/api/admin/dashboard` — Dashboard aggregation
- `/api/admin/buyers/*` — Buyer management, prequal, status
- `/api/admin/dealers/*` — Dealer management, applications, approve/suspend
- `/api/admin/affiliates/*` — Affiliate management, payments, payouts, reconciliation
- `/api/admin/auctions/*` — Auction management, best-price, offers
- `/api/admin/deals/*` — Deal management, billing, esign, insurance, refunds, status
- `/api/admin/contracts/*` — Contract management, overrides
- `/api/admin/contract-shield/*` — Rules, overrides, reconciliation
- `/api/admin/payments/*` — Deposits, concierge fees, refunds, send-link, mark-received
- `/api/admin/payouts` — Payout management
- `/api/admin/documents/*` — Document management
- `/api/admin/notifications/*` — CRUD + SSE stream + mark-read/archive
- `/api/admin/refinance/*` — Leads, stats, funded loans, compliance
- `/api/admin/reports/*` — Finance, funnel, operations
- `/api/admin/financial/*` — Reconciliation, export
- `/api/admin/settings` — Platform settings
- `/api/admin/users/*` — User management, referral chain
- `/api/admin/search` — Global search
- `/api/admin/health` — System health
- `/api/admin/insurance` — Insurance management
- `/api/admin/inventory` — Inventory overview
- `/api/admin/pickups` — Pickup management
- `/api/admin/compliance` — Compliance data
- `/api/admin/trade-ins` — Trade-in management
- `/api/admin/shortlists/*` — Shortlist management
- `/api/admin/offers/*` — Offer validity

#### External Pre-Approval Admin API
| Method(s) | Route | Auth | Purpose |
|-----------|-------|------|---------|
| GET | `/api/admin/external-preapprovals` | Yes (ADMIN) | List pending external pre-approval submissions |
| POST | `/api/admin/external-preapprovals/[id]/review` | Yes (ADMIN) | Approve or reject a submission |
| GET | `/api/admin/external-preapprovals/[id]/document` | Yes (ADMIN) | Get signed URL for secure document access |

### Affiliate API
| Method(s) | Route | Auth | Purpose |
|-----------|-------|------|---------|
| GET | `/api/affiliate/dashboard` | Yes | Dashboard data |
| GET | `/api/affiliate/analytics` | Yes | Analytics |
| POST | `/api/affiliate/click` | No | Track click |
| GET | `/api/affiliate/commissions` | Yes | Commissions |
| POST | `/api/affiliate/enroll` | Yes | Enroll as affiliate |
| GET | `/api/affiliate/payouts` | Yes | Payouts |
| POST | `/api/affiliate/process-referral` | Yes | Process referral |
| POST | `/api/affiliate/referral` | Yes | Create referral |
| GET | `/api/affiliate/referrals` | Yes | List referrals |
| GET | `/api/affiliate/referrals/buyers` | Yes | Buyer referrals |
| GET | `/api/affiliate/referrals/affiliates` | Yes | Sub-affiliate referrals |
| GET/PUT | `/api/affiliate/settings` | Yes | Settings |
| POST | `/api/affiliate/share-link` | Yes | Email share link |
| GET/POST | `/api/affiliate/documents` | Yes | KYC documents |

### Other APIs
| Method(s) | Route | Auth | Purpose |
|-----------|-------|------|---------|
| POST | `/api/contact` | No | Contact form submission |
| POST | `/api/contract/upload` | Yes | Upload contract |
| POST | `/api/contract/scan` | Yes | Scan contract |
| GET | `/api/contract/scan/[id]` | Yes | Scan result |
| POST | `/api/contract/fix` | Yes | Request fix |
| GET | `/api/contract/list` | Yes | List contracts |
| POST | `/api/esign/create` | Yes | Create envelope |
| POST | `/api/esign/webhook` | No* | E-sign webhook |
| POST | `/api/esign/provider-webhook` | No* | Provider webhook |
| GET | `/api/esign/status/[envelopeId]` | Yes | Envelope status |
| GET | `/api/inventory/search` | No | Public search |
| GET | `/api/inventory/filters` | No | Public filters |
| POST | `/api/insurance/select` | Yes | Select insurance |
| GET | `/api/insurance/quotes/[dealId]` | Yes | Get quotes |
| POST | `/api/payments/deposit` | Yes | Create deposit |
| POST | `/api/payments/confirm` | Yes | Confirm payment |
| POST | `/api/payments/create-checkout` | Yes | Checkout session |
| GET | `/api/payments/fee/options/[dealId]` | Yes | Fee options |
| GET | `/api/payments/fee/loan-impact/[dealId]` | Yes | Loan impact calc |
| POST | `/api/payments/fee/pay-card` | Yes | Pay fee by card |
| POST | `/api/payments/fee/loan-agree` | Yes | Agree to loan inclusion |
| POST | `/api/pickup/schedule` | Yes | Schedule pickup |
| POST | `/api/pickup/validate` | Yes | Validate pickup |
| POST | `/api/pickup/[id]/checkin` | Yes | QR check-in |
| POST | `/api/pickup/[id]/complete` | Yes | Complete pickup |
| GET | `/api/pickup/[id]/qr` | Yes | Get QR code |
| POST | `/api/refinance/check-eligibility` | No | Check refinance |
| POST | `/api/refinance/record-redirect` | No | Record redirect |
| POST | `/api/email/send` | Yes | Send email |
| GET/POST | `/api/documents` | Yes | Documents CRUD |
| GET/PUT/DELETE | `/api/documents/[documentId]` | Yes | Document operations |
| GET/POST | `/api/document-requests` | Yes | Doc requests |
| GET/PUT | `/api/document-requests/[requestId]` | Yes | Request detail |
| POST | `/api/ai/chat` | Yes | AI chat |
| GET/POST | `/api/seo/pages` | Yes | SEO pages |
| GET/PUT | `/api/seo/pages/[pageKey]` | Yes | Page SEO |
| GET | `/api/seo/health` | Yes | SEO health |
| GET | `/api/seo/health/[pageKey]` | Yes | Page health |
| GET/PUT | `/api/seo/keywords/[pageKey]` | Yes | Keywords |
| GET/PUT | `/api/seo/schema/[pageKey]` | Yes | Schema |
| GET | `/api/seo/audit` | Yes | SEO audit |
| GET | `/api/health` | No | Health check |
| GET | `/api/health/db` | No | DB health |
| GET | `/health` | No | Root health |
| POST | `/api/webhooks/stripe` | No* | Stripe webhook |
| POST | `/api/webhooks/stripe/commission-trigger` | No* | Commission trigger |
| POST | `/api/cron/affiliate-reconciliation` | No* | Cron: affiliate reconciliation |
| POST | `/api/cron/contract-shield-reconciliation` | No* | Cron: contract shield reconciliation |
| GET | `/api/auction/[id]` | Yes | Auction detail |
| GET | `/api/auction/[id]/best-price` | Yes | Best price |
| POST | `/api/auction/close-expired` | No* | Close expired auctions |
| POST | `/api/test/create-user` | No | Test: create user |
| POST | `/api/test/seed` | No | Test: seed data |
| GET | `/robots.txt` | No | Robots.txt |
| GET | `/sitemap.xml` | No | Sitemap |

*No* = Webhook/cron routes use signature/secret verification instead of session auth.

### Test Routes (TEST workspace only)
| Route | File Path | Auth | Purpose |
|-------|----------|------|---------|
| `/test/admin` | `app/test/admin/page.tsx` | Yes (TEST) | Test admin |
| `/test/buyer` | `app/test/buyer/page.tsx` | Yes (TEST) | Test buyer |
| `/test/dealer` | `app/test/dealer/page.tsx` | Yes (TEST) | Test dealer |
| `/test/affiliate` | `app/test/affiliate/page.tsx` | Yes (TEST) | Test affiliate |
| `/test/dashboard` | `app/test/dashboard/page.tsx` | Yes (TEST) | Test dashboard |
