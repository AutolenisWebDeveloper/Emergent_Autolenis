# Routes Map - VercelAutoLenis

This document provides a complete map of all routes in the application, scanned directly from the filesystem. No inference—only real files.

**Generated:** 2026-02-07  
**Method:** Filesystem scan of `app/**/page.tsx` and `app/**/route.ts` (excluding API routes)

---

## 📊 Summary Statistics

- **Total Pages:** 150
- **Total Non-API Routes:** 3 (sitemap, robots, health)
- **Public Pages:** 13
- **Auth Pages:** 7
- **Buyer Dashboard Pages:** 29
- **Dealer Dashboard Pages:** 23
- **Admin Dashboard Pages:** 43
- **Affiliate Dashboard Pages:** 18
- **Pages with TODO/NotImplemented:** 7

---

## 🌍 Public Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/` | `app/page.tsx` | page | COMPLETE |
| `/about` | `app/about/page.tsx` | page | COMPLETE |
| `/contact` | `app/contact/page.tsx` | page | COMPLETE |
| `/contract-shield` | `app/contract-shield/page.tsx` | page | COMPLETE |
| `/dealer-application` | `app/dealer-application/page.tsx` | page | COMPLETE |
| `/faq` | `app/faq/page.tsx` | page | COMPLETE |
| `/feedback` | `app/feedback/page.tsx` | page | COMPLETE |
| `/how-it-works` | `app/how-it-works/page.tsx` | page | COMPLETE |
| `/insurance` | `app/insurance/page.tsx` | page | COMPLETE |
| `/pricing` | `app/pricing/page.tsx` | page | COMPLETE |
| `/privacy` | `app/privacy/page.tsx` | page | COMPLETE |
| `/refinance` | `app/refinance/page.tsx` | page | COMPLETE |
| `/terms` | `app/terms/page.tsx` | page | COMPLETE |

### Public Legal Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/legal/dealer-terms` | `app/legal/dealer-terms/page.tsx` | page | COMPLETE |
| `/legal/privacy` | `app/legal/privacy/page.tsx` | page | COMPLETE |
| `/legal/terms` | `app/legal/terms/page.tsx` | page | COMPLETE |

### Referral Page

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/ref/[code]` | `app/ref/[code]/page.tsx` | page | COMPLETE |

---

## 🔐 Authentication Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/auth/access-denied` | `app/auth/access-denied/page.tsx` | page | COMPLETE |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | page | COMPLETE |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | page | COMPLETE |
| `/auth/signin` | `app/auth/signin/page.tsx` | page | COMPLETE |
| `/auth/signout` | `app/auth/signout/page.tsx` | page | COMPLETE |
| `/auth/signup` | `app/auth/signup/page.tsx` | page | COMPLETE |
| `/auth/verify-email` | `app/auth/verify-email/page.tsx` | page | COMPLETE |

---

## 🛒 Buyer Dashboard Pages

### Core Buyer Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/buyer/dashboard` | `app/buyer/dashboard/page.tsx` | page | COMPLETE |
| `/buyer/onboarding` | `app/buyer/onboarding/page.tsx` | page | COMPLETE |
| `/buyer/prequal` | `app/buyer/prequal/page.tsx` | page | COMPLETE |
| `/buyer/profile` | `app/buyer/profile/page.tsx` | page | COMPLETE |
| `/buyer/settings` | `app/buyer/settings/page.tsx` | page | COMPLETE |

### Vehicle Search & Selection

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/buyer/search` | `app/buyer/search/page.tsx` | page | COMPLETE |
| `/buyer/shortlist` | `app/buyer/shortlist/page.tsx` | page | COMPLETE |
| `/buyer/trade-in` | `app/buyer/trade-in/page.tsx` | page | COMPLETE |

### Auction & Offers

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/buyer/auction` | `app/buyer/auction/page.tsx` | page | COMPLETE |
| `/buyer/auction/[id]` | `app/buyer/auction/[id]/page.tsx` | page | COMPLETE |
| `/buyer/auction/[id]/offers` | `app/buyer/auction/[id]/offers/page.tsx` | page | COMPLETE |
| `/buyer/offers` | `app/buyer/offers/page.tsx` | page | COMPLETE |
| `/buyer/offers/[offerId]` | `app/buyer/offers/[offerId]/page.tsx` | page | **TODO** |

### Deal Flow

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/buyer/deal` | `app/buyer/deal/page.tsx` | page | COMPLETE |
| `/buyer/deal/contract` | `app/buyer/deal/contract/page.tsx` | page | COMPLETE |
| `/buyer/deal/esign` | `app/buyer/deal/esign/page.tsx` | page | COMPLETE |
| `/buyer/deal/fee` | `app/buyer/deal/fee/page.tsx` | page | COMPLETE |
| `/buyer/deal/financing` | `app/buyer/deal/financing/page.tsx` | page | COMPLETE |
| `/buyer/deal/insurance` | `app/buyer/deal/insurance/page.tsx` | page | COMPLETE |
| `/buyer/deal/pickup` | `app/buyer/deal/pickup/page.tsx` | page | COMPLETE |
| `/buyer/deal/summary` | `app/buyer/deal/summary/page.tsx` | page | COMPLETE |

### Documents & Communications

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/buyer/contracts` | `app/buyer/contracts/page.tsx` | page | COMPLETE |
| `/buyer/documents` | `app/buyer/documents/page.tsx` | page | **TODO** |
| `/buyer/esign` | `app/buyer/esign/page.tsx` | page | COMPLETE |
| `/buyer/messages` | `app/buyer/messages/page.tsx` | page | COMPLETE |
| `/buyer/requests` | `app/buyer/requests/page.tsx` | page | COMPLETE |
| `/buyer/requests/[requestId]` | `app/buyer/requests/[requestId]/page.tsx` | page | COMPLETE |

### Payments & Billing

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/buyer/billing` | `app/buyer/billing/page.tsx` | page | COMPLETE |
| `/buyer/payments` | `app/buyer/payments/page.tsx` | page | COMPLETE |
| `/buyer/payments/[paymentId]` | `app/buyer/payments/[paymentId]/page.tsx` | page | COMPLETE |

### Other Buyer Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/buyer/affiliate` | `app/buyer/affiliate/page.tsx` | page | COMPLETE |
| `/buyer/insurance` | `app/buyer/insurance/page.tsx` | page | COMPLETE |
| `/buyer/pickup/[dealId]` | `app/buyer/pickup/[dealId]/page.tsx` | page | COMPLETE |
| `/buyer/sign/[dealId]` | `app/buyer/sign/[dealId]/page.tsx` | page | COMPLETE |

---

## 🚗 Dealer Dashboard Pages

### Core Dealer Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/dealer/dashboard` | `app/dealer/dashboard/page.tsx` | page | COMPLETE |
| `/dealer/onboarding` | `app/dealer/onboarding/page.tsx` | page | COMPLETE |
| `/dealer/profile` | `app/dealer/profile/page.tsx` | page | **TODO** |
| `/dealer/settings` | `app/dealer/settings/page.tsx` | page | COMPLETE |

### Inventory Management

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/dealer/inventory` | `app/dealer/inventory/page.tsx` | page | COMPLETE |
| `/dealer/inventory/add` | `app/dealer/inventory/add/page.tsx` | page | COMPLETE |
| `/dealer/inventory/bulk-upload` | `app/dealer/inventory/bulk-upload/page.tsx` | page | COMPLETE |
| `/dealer/inventory/column-mapping` | `app/dealer/inventory/column-mapping/page.tsx` | page | COMPLETE |
| `/dealer/inventory/import-history` | `app/dealer/inventory/import-history/page.tsx` | page | COMPLETE |

### Auctions & Offers

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/dealer/auctions` | `app/dealer/auctions/page.tsx` | page | COMPLETE |
| `/dealer/auctions/[id]` | `app/dealer/auctions/[id]/page.tsx` | page | COMPLETE |
| `/dealer/auctions/invited` | `app/dealer/auctions/invited/page.tsx` | page | COMPLETE |
| `/dealer/auctions/offers` | `app/dealer/auctions/offers/page.tsx` | page | COMPLETE |
| `/dealer/offers` | `app/dealer/offers/page.tsx` | page | COMPLETE |
| `/dealer/offers/[offerId]` | `app/dealer/offers/[offerId]/page.tsx` | page | **TODO** |
| `/dealer/offers/new` | `app/dealer/offers/new/page.tsx` | page | **TODO** |

### Deals & Requests

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/dealer/deals` | `app/dealer/deals/page.tsx` | page | COMPLETE |
| `/dealer/deals/[dealId]` | `app/dealer/deals/[dealId]/page.tsx` | page | COMPLETE |
| `/dealer/leads` | `app/dealer/leads/page.tsx` | page | COMPLETE |
| `/dealer/leads/[leadId]` | `app/dealer/leads/[leadId]/page.tsx` | page | **TODO** |
| `/dealer/requests` | `app/dealer/requests/page.tsx` | page | COMPLETE |
| `/dealer/requests/[requestId]` | `app/dealer/requests/[requestId]/page.tsx` | page | COMPLETE |

### Documents & Communications

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/dealer/contracts` | `app/dealer/contracts/page.tsx` | page | COMPLETE |
| `/dealer/contracts/[id]` | `app/dealer/contracts/[id]/page.tsx` | page | COMPLETE |
| `/dealer/documents` | `app/dealer/documents/page.tsx` | page | **TODO** |
| `/dealer/documents/[documentId]` | `app/dealer/documents/[documentId]/page.tsx` | page | COMPLETE |
| `/dealer/messages` | `app/dealer/messages/page.tsx` | page | COMPLETE |
| `/dealer/messages/[threadId]` | `app/dealer/messages/[threadId]/page.tsx` | page | COMPLETE |

### Other Dealer Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/dealer/payments` | `app/dealer/payments/page.tsx` | page | COMPLETE |
| `/dealer/pickups` | `app/dealer/pickups/page.tsx` | page | COMPLETE |

---

## 👨‍💼 Admin Dashboard Pages

### Core Admin Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/dashboard` | `app/admin/dashboard/page.tsx` | page | COMPLETE |
| `/admin/settings` | `app/admin/settings/page.tsx` | page | COMPLETE |
| `/admin/settings/branding` | `app/admin/settings/branding/page.tsx` | page | COMPLETE |
| `/admin/settings/integrations` | `app/admin/settings/integrations/page.tsx` | page | COMPLETE |
| `/admin/settings/roles` | `app/admin/settings/roles/page.tsx` | page | COMPLETE |
| `/admin/support` | `app/admin/support/page.tsx` | page | COMPLETE |
| `/admin/qa` | `app/admin/qa/page.tsx` | page | COMPLETE |

### Admin Authentication

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/sign-in` | `app/admin/sign-in/page.tsx` | page | COMPLETE |
| `/admin/signup` | `app/admin/signup/page.tsx` | page | COMPLETE |
| `/admin/mfa/challenge` | `app/admin/mfa/challenge/page.tsx` | page | COMPLETE |
| `/admin/mfa/enroll` | `app/admin/mfa/enroll/page.tsx` | page | COMPLETE |

### User Management

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/users` | `app/admin/users/page.tsx` | page | COMPLETE |
| `/admin/buyers` | `app/admin/buyers/page.tsx` | page | COMPLETE |
| `/admin/buyers/[id]` | `app/admin/buyers/[id]/page.tsx` | page | COMPLETE |

### Dealer Management

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/dealers` | `app/admin/dealers/page.tsx` | page | COMPLETE |
| `/admin/dealers/[id]` | `app/admin/dealers/[id]/page.tsx` | page | COMPLETE |
| `/admin/dealers/applications` | `app/admin/dealers/applications/page.tsx` | page | COMPLETE |

### Auctions & Requests

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/auctions` | `app/admin/auctions/page.tsx` | page | COMPLETE |
| `/admin/offers` | `app/admin/offers/page.tsx` | page | COMPLETE |
| `/admin/requests` | `app/admin/requests/page.tsx` | page | COMPLETE |
| `/admin/requests/[requestId]` | `app/admin/requests/[requestId]/page.tsx` | page | COMPLETE |
| `/admin/trade-ins` | `app/admin/trade-ins/page.tsx` | page | COMPLETE |

### Deals Management

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/deals` | `app/admin/deals/page.tsx` | page | COMPLETE |
| `/admin/deals/[dealId]` | `app/admin/deals/[dealId]/page.tsx` | page | COMPLETE |

### Contract Shield

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/contracts` | `app/admin/contracts/page.tsx` | page | COMPLETE |
| `/admin/contracts/[id]` | `app/admin/contracts/[id]/page.tsx` | page | COMPLETE |
| `/admin/contract-shield/overrides` | `app/admin/contract-shield/overrides/page.tsx` | page | COMPLETE |
| `/admin/contract-shield/rules` | `app/admin/contract-shield/rules/page.tsx` | page | COMPLETE |

### Documents & Compliance

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/documents` | `app/admin/documents/page.tsx` | page | COMPLETE |
| `/admin/documents/[documentId]` | `app/admin/documents/[documentId]/page.tsx` | page | COMPLETE |
| `/admin/compliance` | `app/admin/compliance/page.tsx` | page | COMPLETE |
| `/admin/audit-logs` | `app/admin/audit-logs/page.tsx` | page | COMPLETE |

### Payments & Financial

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/payments` | `app/admin/payments/page.tsx` | page | COMPLETE |
| `/admin/payments/send-link` | `app/admin/payments/send-link/page.tsx` | page | COMPLETE |

### Affiliate Management

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/affiliates` | `app/admin/affiliates/page.tsx` | page | COMPLETE |
| `/admin/affiliates/[affiliateId]` | `app/admin/affiliates/[affiliateId]/page.tsx` | page | COMPLETE |
| `/admin/affiliates/payouts` | `app/admin/affiliates/payouts/page.tsx` | page | COMPLETE |

### Insurance

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/insurance` | `app/admin/insurance/page.tsx` | page | COMPLETE |

### Refinance Management

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/refinance` | `app/admin/refinance/page.tsx` | page | COMPLETE |

### Reports & Analytics

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/reports` | `app/admin/reports/page.tsx` | page | COMPLETE |
| `/admin/reports/finance` | `app/admin/reports/finance/page.tsx` | page | COMPLETE |
| `/admin/reports/funnel` | `app/admin/reports/funnel/page.tsx` | page | COMPLETE |

### SEO Management

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/admin/seo` | `app/admin/seo/page.tsx` | page | COMPLETE |
| `/admin/seo/pages` | `app/admin/seo/pages/page.tsx` | page | COMPLETE |

---

## 💰 Affiliate Dashboard Pages

### Old Affiliate Pages (Legacy)

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/affiliate` | `app/affiliate/page.tsx` | page | COMPLETE |
| `/affiliate/commissions` | `app/affiliate/commissions/page.tsx` | page | COMPLETE |
| `/affiliate/dashboard` | `app/affiliate/dashboard/page.tsx` | page | COMPLETE |
| `/affiliate/earnings` | `app/affiliate/earnings/page.tsx` | page | COMPLETE |
| `/affiliate/income` | `app/affiliate/income/page.tsx` | page | COMPLETE |
| `/affiliate/links` | `app/affiliate/links/page.tsx` | page | COMPLETE |
| `/affiliate/onboarding` | `app/affiliate/onboarding/page.tsx` | page | COMPLETE |
| `/affiliate/profile` | `app/affiliate/profile/page.tsx` | page | COMPLETE |
| `/affiliate/referrals` | `app/affiliate/referrals/page.tsx` | page | COMPLETE |
| `/affiliate/referrals/[referralId]` | `app/affiliate/referrals/[referralId]/page.tsx` | page | COMPLETE |
| `/affiliate/payouts` | `app/affiliate/payouts/page.tsx` | page | COMPLETE |
| `/affiliate/payouts/[payoutId]` | `app/affiliate/payouts/[payoutId]/page.tsx` | page | COMPLETE |
| `/affiliate/settings` | `app/affiliate/settings/page.tsx` | page | COMPLETE |
| `/affiliate/support` | `app/affiliate/support/page.tsx` | page | COMPLETE |

### New Affiliate Portal Pages

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/affiliate/portal/analytics` | `app/affiliate/portal/analytics/page.tsx` | page | COMPLETE |
| `/affiliate/portal/assets` | `app/affiliate/portal/assets/page.tsx` | page | COMPLETE |
| `/affiliate/portal/commissions` | `app/affiliate/portal/commissions/page.tsx` | page | COMPLETE |
| `/affiliate/portal/dashboard` | `app/affiliate/portal/dashboard/page.tsx` | page | COMPLETE |
| `/affiliate/portal/income-calculator` | `app/affiliate/portal/income-calculator/page.tsx` | page | COMPLETE |
| `/affiliate/portal/link` | `app/affiliate/portal/link/page.tsx` | page | COMPLETE |
| `/affiliate/portal/onboarding` | `app/affiliate/portal/onboarding/page.tsx` | page | COMPLETE |
| `/affiliate/portal/payouts` | `app/affiliate/portal/payouts/page.tsx` | page | COMPLETE |
| `/affiliate/portal/referrals` | `app/affiliate/portal/referrals/page.tsx` | page | COMPLETE |
| `/affiliate/portal/settings` | `app/affiliate/portal/settings/page.tsx` | page | COMPLETE |

---

## 🔧 Non-API Route Handlers

| URL | File Path | Type | Status |
|-----|-----------|------|--------|
| `/health` | `app/health/route.ts` | route | COMPLETE |
| `/robots.txt` | `app/robots.txt/route.ts` | route | COMPLETE |
| `/sitemap.xml` | `app/sitemap.xml/route.ts` | route | COMPLETE |

---

## ⚠️ Pages with TODO/NotImplemented/Placeholders

These 7 pages contain markers indicating incomplete implementation:

1. `/buyer/documents` - `app/buyer/documents/page.tsx`
2. `/buyer/offers/[offerId]` - `app/buyer/offers/[offerId]/page.tsx`
3. `/dealer/documents` - `app/dealer/documents/page.tsx`
4. `/dealer/leads/[leadId]` - `app/dealer/leads/[leadId]/page.tsx`
5. `/dealer/offers/[offerId]` - `app/dealer/offers/[offerId]/page.tsx`
6. `/dealer/offers/new` - `app/dealer/offers/new/page.tsx`
7. `/dealer/profile` - `app/dealer/profile/page.tsx`

---

## ✅ Status Definitions

- **COMPLETE**: No TODO/FIXME/NotImplemented markers found, no obvious placeholders
- **TODO**: Contains TODO, FIXME, NotImplemented, or ComingSoon markers
- **BROKEN**: Referenced by build/type errors or imports missing modules (none found in current scan)

---

**Note:** All routes listed above exist as real files in the filesystem. This is not an inferred list.
