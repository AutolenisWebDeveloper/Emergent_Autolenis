# Navigation & Link Check — AutoLenis Platform

> Generated: 2026-02-19 | Full-stack validation audit.

---

## 1. Public Navigation (`components/layout/public-nav.tsx`)

| Label | Target path | Status | Notes |
|-------|-------------|--------|-------|
| How It Works | `/how-it-works` | ✅ Page exists | — |
| Pricing | `/pricing` | ✅ Page exists | — |
| Refinance | `/refinance` | ✅ Page exists | — |
| About | `/about` | ✅ Page exists | — |
| Contract Shield | `/contract-shield` | ✅ Page exists | — |
| Contact | `/contact` | ✅ Page exists | — |
| Partner Program | `/affiliate` | ✅ Page exists | — |
| For Dealers | `/dealer-application` | ✅ Page exists | — |
| Sign In | `/auth/signin` | ✅ Page exists | — |
| Get Started | `/auth/signup` | ✅ Page exists | — |

---

## 2. Auth Navigation (`components/layout/auth-nav.tsx`)

| Label | Target path | Status | Notes |
|-------|-------------|--------|-------|
| How It Works | `/how-it-works` | ✅ Page exists | — |
| Pricing | `/pricing` | ✅ Page exists | — |
| For Dealers | `/dealer-application` | ✅ Page exists | — |
| Contact | `/contact` | ✅ Page exists | — |
| Sign In | `/auth/signin` | ✅ Page exists | — |
| Get Started | `/auth/signup` | ✅ Page exists | — |

---

## 3. Public Footer (`components/layout/public-footer.tsx`)

| Section | Label | Target path | Status | Notes |
|---------|-------|-------------|--------|-------|
| Product | How It Works | `/how-it-works` | ✅ Page exists | — |
| Product | Insurance | `/insurance` | ✅ Page exists | — |
| Product | Pricing | `/pricing` | ✅ Page exists | — |
| Product | Get Started | `/buyer/onboarding` | ✅ Page exists | `app/buyer/onboarding/page.tsx` verified |
| Product | For Dealers | `/dealer-application` | ✅ Page exists | — |
| Company | About | `/about` | ✅ Page exists | — |
| Company | FAQ | `/faq` | ✅ Page exists | — |
| Company | Contact | `/contact` | ✅ Page exists | — |
| Company | Partner Program | `/affiliate` | ✅ Page exists | — |
| Legal | Privacy Policy | `/privacy` | ✅ Page exists | Duplicate of `/legal/privacy` |
| Legal | Terms of Service | `/terms` | ✅ Page exists | Duplicate of `/legal/terms` |
| Legal | Dealer Terms | `/legal/dealer-terms` | ✅ Page exists | — |
| Admin | Admin Sign In | `/admin/sign-in` | ✅ Page exists | Publicly visible in footer |
| Admin | Admin Sign Up | `/admin/signup` | ✅ Page exists | Publicly visible in footer |

---

## 4. Auth Footer (`components/layout/auth-footer.tsx`)

| Label | Target path | Status | Notes |
|-------|-------------|--------|-------|
| FAQ | `/faq` | ✅ Page exists | — |
| Privacy | `/legal/privacy` | ✅ Page exists | — |
| Terms | `/legal/terms` | ✅ Page exists | — |
| Contact | `/contact` | ✅ Page exists | — |
| How It Works | `/how-it-works` | ✅ Page exists | — |
| Pricing | `/pricing` | ✅ Page exists | — |
| Admin | `/admin/sign-in` | ✅ Page exists | — |

---

## 5. Buyer Sidebar Navigation (`app/buyer/layout.tsx`, lines 18–43)

| Label | Target path | Status | Notes |
|-------|-------------|--------|-------|
| Dashboard | `/buyer/dashboard` | ✅ Page exists | — |
| Pre-Qualification | `/buyer/prequal` | ✅ Page exists | — |
| Search Vehicles | `/buyer/search` | ✅ Page exists | — |
| Shortlist | `/buyer/shortlist` | ✅ Page exists | — |
| Trade-In | `/buyer/trade-in` | ✅ Page exists | — |
| Auctions | `/buyer/auction` | ✅ Page exists | — |
| My Deal (parent) | `/buyer/deal` | ✅ Page exists | Collapsible submenu |
| → Deal Summary | `/buyer/deal/summary` | ✅ Page exists | Sub-item |
| → Financing | `/buyer/deal/financing` | ✅ Page exists | Sub-item |
| → Concierge Fee | `/buyer/deal/fee` | ✅ Page exists | Sub-item |
| → Insurance | `/buyer/deal/insurance` | ✅ Page exists | Sub-item |
| → Contract | `/buyer/deal/contract` | ✅ Page exists | Sub-item |
| → E-Sign | `/buyer/deal/esign` | ✅ Page exists | Sub-item |
| → Pickup | `/buyer/deal/pickup` | ✅ Page exists | Sub-item |
| Contracts | `/buyer/contracts` | ✅ Page exists | — |
| Documents | `/buyer/documents` | ✅ Page exists | — |
| Referrals | `/buyer/affiliate` | ✅ Page exists | — |
| Settings | `/buyer/settings` | ✅ Page exists | — |

---

## 6. Dealer Sidebar Navigation (`app/dealer/layout.tsx`, lines 22–36)

| Label | Target path | Status | Notes |
|-------|-------------|--------|-------|
| Dashboard | `/dealer/dashboard` | ✅ Page exists | — |
| Buyer Requests | `/dealer/requests` | ✅ Page exists | — |
| Inventory | `/dealer/inventory` | ✅ Page exists | — |
| Auctions | `/dealer/auctions` | ✅ Page exists | — |
| → Invited | `/dealer/auctions/invited` | ✅ Page exists | Sub-item |
| → My Offers | `/dealer/auctions/offers` | ✅ Page exists | Sub-item |
| Deals | `/dealer/deals` | ✅ Page exists | — |
| Contracts | `/dealer/contracts` | ✅ Page exists | — |
| Documents | `/dealer/documents` | ✅ Page exists | — |
| Payments | `/dealer/payments` | ✅ Page exists | — |
| Messages | `/dealer/messages` | ✅ Page exists | — |
| Pickups | `/dealer/pickups` | ✅ Page exists | — |
| Settings | `/dealer/settings` | ✅ Page exists | — |

---

## 7. Admin Sidebar Navigation (`app/admin/layout.tsx`, lines 41–62)

| Label | Target path | Status | Notes |
|-------|-------------|--------|-------|
| Dashboard | `/admin/dashboard` | ✅ Page exists | — |
| Buyers | `/admin/buyers` | ✅ Page exists | — |
| Requests | `/admin/requests` | ✅ Page exists | — |
| Dealers | `/admin/dealers` | ✅ Page exists | — |
| Auctions & Offers | `/admin/auctions` | ✅ Page exists | — |
| Trade-Ins | `/admin/trade-ins` | ✅ Page exists | — |
| Deals | `/admin/deals` | ✅ Page exists | — |
| Refinance | `/admin/refinance` | ✅ Page exists | — |
| Payments | `/admin/payments` | ✅ Page exists | — |
| Financial Reporting | `/admin/financial-reporting` | ✅ Page exists | — |
| Affiliates | `/admin/affiliates` | ✅ Page exists | — |
| Documents | `/admin/documents` | ✅ Page exists | — |
| Insurance | `/admin/insurance` | ✅ Page exists | — |
| Contract Shield | `/admin/contract-shield/rules` | ✅ Page exists | Routes to rules sub-page |
| Compliance | `/admin/compliance` | ✅ Page exists | — |
| Reports | `/admin/reports` | ✅ Page exists | — |
| SEO | `/admin/seo` | ✅ Page exists | — |
| AI Management | `/admin/ai` | ✅ Page exists | — |
| Settings | `/admin/settings` | ✅ Page exists | — |
| Support Tools | `/admin/support` | ✅ Page exists | — |

---

## 8. Affiliate Portal Navigation (`app/affiliate/portal/layout.tsx`, lines 27–40)

| Label | Target path | Status | Notes |
|-------|-------------|--------|-------|
| Dashboard | `/affiliate/portal/dashboard` | ✅ Page exists | — |
| Referral Link | `/affiliate/portal/link` | ✅ Page exists | — |
| Income Calculator | `/affiliate/portal/income-calculator` | ✅ Page exists | — |
| Analytics | `/affiliate/portal/analytics` | ✅ Page exists | — |
| All Referrals | `/affiliate/portal/referrals` | ✅ Page exists | — |
| Referred Buyers | `/affiliate/portal/referrals/buyers` | ✅ Page exists | — |
| Referred Affiliates | `/affiliate/portal/referrals/affiliates` | ✅ Page exists | — |
| Commissions | `/affiliate/portal/commissions` | ✅ Page exists | — |
| Payouts | `/affiliate/portal/payouts` | ✅ Page exists | — |
| Documents | `/affiliate/portal/documents` | ✅ Page exists | — |
| Promo Assets | `/affiliate/portal/assets` | ✅ Page exists | — |
| Settings | `/affiliate/portal/settings` | ✅ Page exists | — |

---

## Broken / Missing Links

No broken links found. All 101 navigation items point to existing pages.

---

## Potential Concerns

| Concern | Details |
|---------|---------|
| Admin links in public footer | `/admin/sign-in` and `/admin/signup` visible to all visitors in the footer |
| Duplicate routes for legal pages | `/privacy` ↔ `/legal/privacy`, `/terms` ↔ `/legal/terms` — duplicate content |
| 150+ `router.push()` calls | Scattered across buyer, dealer, admin, and affiliate flows — dynamic navigation is hard to audit statically |

---

## Summary

| Category | Nav items checked | Broken links |
|----------|-------------------|--------------|
| Public nav | 10 | 0 |
| Auth nav | 6 | 0 |
| Public footer | 14 | 0 |
| Auth footer | 7 | 0 |
| Buyer sidebar | 19 | 0 |
| Dealer sidebar | 13 | 0 |
| Admin sidebar | 20 | 0 |
| Affiliate portal | 12 | 0 |
| **Total** | **101** | **0** |
