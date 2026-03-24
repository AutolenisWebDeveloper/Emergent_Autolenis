# Affiliate Dashboard Inventory

## Routes

| Route | File Path | Purpose | Status |
|-------|-----------|---------|--------|
| `/affiliate` | `app/affiliate/page.tsx` | Public landing page for the affiliate program | Working |
| `/affiliate/dashboard` | `app/affiliate/dashboard/page.tsx` | Redirect to portal dashboard | Working |
| `/affiliate/onboarding` | `app/affiliate/onboarding/page.tsx` | Affiliate onboarding flow | Working |
| `/affiliate/profile` | `app/affiliate/profile/page.tsx` | Profile management page | Working |
| `/affiliate/settings` | `app/affiliate/settings/page.tsx` | Redirect to portal settings | Working |
| `/affiliate/referrals` | `app/affiliate/referrals/page.tsx` | Redirect to portal referrals | Working |
| `/affiliate/referrals/[referralId]` | `app/affiliate/referrals/[referralId]/page.tsx` | Individual referral detail | Working |
| `/affiliate/income` | `app/affiliate/income/page.tsx` | Income calculator redirect | Working |
| `/affiliate/commissions` | `app/affiliate/commissions/page.tsx` | Commissions redirect | Working |
| `/affiliate/links` | `app/affiliate/links/page.tsx` | Link generator redirect | Working |
| `/affiliate/earnings` | `app/affiliate/earnings/page.tsx` | Earnings redirect | Working |
| `/affiliate/support` | `app/affiliate/support/page.tsx` | Support and help page | Working |
| `/affiliate/payouts` | `app/affiliate/payouts/page.tsx` | Payouts redirect | Working |
| `/affiliate/payouts/[payoutId]` | `app/affiliate/payouts/[payoutId]/page.tsx` | Individual payout detail | Working |
| `/affiliate/portal/dashboard` | `app/affiliate/portal/dashboard/page.tsx` | Main dashboard with earnings metrics | Working |
| `/affiliate/portal/analytics` | `app/affiliate/portal/analytics/page.tsx` | Referral analytics and trends | Working |
| `/affiliate/portal/referrals` | `app/affiliate/portal/referrals/page.tsx` | All referrals list | Working |
| `/affiliate/portal/referrals/buyers` | `app/affiliate/portal/referrals/buyers/page.tsx` | Referred buyers view | Working |
| `/affiliate/portal/referrals/affiliates` | `app/affiliate/portal/referrals/affiliates/page.tsx` | Sub-affiliate tracking | Working |
| `/affiliate/portal/commissions` | `app/affiliate/portal/commissions/page.tsx` | Commission breakdown | Working |
| `/affiliate/portal/payouts` | `app/affiliate/portal/payouts/page.tsx` | Payout history and status | Working |
| `/affiliate/portal/link` | `app/affiliate/portal/link/page.tsx` | Referral link generator | Working |
| `/affiliate/portal/documents` | `app/affiliate/portal/documents/page.tsx` | Marketing documents | Working |
| `/affiliate/portal/income-calculator` | `app/affiliate/portal/income-calculator/page.tsx` | Income projection tool | Working |
| `/affiliate/portal/assets` | `app/affiliate/portal/assets/page.tsx` | Promotional materials | Working |
| `/affiliate/portal/settings` | `app/affiliate/portal/settings/page.tsx` | Dashboard settings | Working |
| `/affiliate/portal/onboarding` | `app/affiliate/portal/onboarding/page.tsx` | Onboarding wizard | Working |
| `/ref/[code]` | `app/ref/[code]/page.tsx` | Referral landing page | Working |

## API Endpoints

| Endpoint | File Path | Method | Purpose | Status |
|----------|-----------|--------|---------|--------|
| `/api/affiliate/dashboard` | `app/api/affiliate/dashboard/route.ts` | GET | Dashboard metrics (earnings, stats, referral levels) | Working |
| `/api/affiliate/analytics` | `app/api/affiliate/analytics/route.ts` | GET | Analytics and trend data | Working |
| `/api/affiliate/referrals` | `app/api/affiliate/referrals/route.ts` | GET | Paginated referral list | Working |
| `/api/affiliate/referrals/buyers` | `app/api/affiliate/referrals/buyers/route.ts` | GET | Referred buyer data with funnel stage | Working |
| `/api/affiliate/referrals/affiliates` | `app/api/affiliate/referrals/affiliates/route.ts` | GET | Sub-affiliate data | Working |
| `/api/affiliate/commissions` | `app/api/affiliate/commissions/route.ts` | GET | Commission calculations and history | Working |
| `/api/affiliate/payouts` | `app/api/affiliate/payouts/route.ts` | GET, POST | Payout history and request creation | Working |
| `/api/affiliate/click` | `app/api/affiliate/click/route.ts` | GET, POST | Click tracking for referral links | Working |
| `/api/affiliate/referral` | `app/api/affiliate/referral/route.ts` | GET | Individual referral data | Working |
| `/api/affiliate/enroll` | `app/api/affiliate/enroll/route.ts` | POST | Affiliate enrollment | Working |
| `/api/affiliate/process-referral` | `app/api/affiliate/process-referral/route.ts` | POST | Referral attribution and processing | Working |
| `/api/affiliate/settings` | `app/api/affiliate/settings/route.ts` | GET, PATCH | Affiliate settings CRUD | Working |
| `/api/affiliate/documents` | `app/api/affiliate/documents/route.ts` | GET, POST | Document management and upload | Working |
| `/api/affiliate/share-link` | `app/api/affiliate/share-link/route.ts` | POST | Referral link email sharing | Working |

## Components

| Component | File Path | Purpose | Status |
|-----------|-----------|---------|--------|
| Income Planner | `components/affiliate/income-planner.tsx` | Income projection calculator with tier rate display | Working |
| Referral Capture | `components/affiliate/referral-capture.tsx` | Lead capture component for referral tracking | Working |
| Commission Email | `components/email/affiliate-commission-email.tsx` | Commission notification email template | Working |
| Referral Email | `components/email/referral-commission-email.tsx` | Referral bonus notification email template | Working |
| Portal Layout | `app/affiliate/portal/layout.tsx` | Server-side portal wrapper with navigation | Working |
| Portal Layout Client | `app/affiliate/portal/layout-client.tsx` | Client-side portal layout with sidebar navigation | Working |

## Services

| Service | File Path | Purpose | Status |
|---------|-----------|---------|--------|
| Affiliate Service | `lib/services/affiliate.service.ts` | Core affiliate logic: commission rates, referral codes, chain building | Working |
| Referral Code Utils | `lib/utils/referral-code.ts` | Referral code and link builders | Working |
| AI Growth Agent | `lib/ai/agents/affiliate-growth.agent.ts` | AI growth assistant for affiliates | Working |
| AI Affiliate Tools | `lib/ai/tools/affiliate.tools.ts` | Agent tools for referral links and stats | Working |

## Database Models

| Model | Purpose | Status |
|-------|---------|--------|
| Affiliate | User affiliate profile with referral code, earnings, balance | Working |
| Referral | Referral records linking affiliates to referred users | Working |
| Click | Click tracking for referral links | Working |
| Commission | Commission records with level, rate, and amount | Working |
| Payout | Payout requests and processing records | Working |
| AffiliatePayment | Payment records for affiliate payouts | Working |
| AffiliateShareEvent | Share tracking events for email sharing | Working |
| AffiliateDocument | Marketing and compliance documents | Working |

## Tests

| Test File | Purpose | Status |
|-----------|---------|--------|
| `__tests__/affiliate-dashboard-audit.test.ts` | Commission rate consistency, calculation math, API auth, error handling, response shape | Working |
| `__tests__/affiliate-referrals-visibility.test.ts` | Referral visibility, API contracts, navigation, attribution idempotency | Working |
| `__tests__/affiliate-payments.test.ts` | Payment flow validation, RBAC, workspace isolation | Working |
| `__tests__/affiliate-detail.test.ts` | Admin affiliate detail page contracts | Working |
| `__tests__/affiliate-share-link.test.ts` | Share link API logic, HTML escaping, email templates | Working |
| `__tests__/admin-dealers-affiliates.test.ts` | Admin affiliate management | Working |
| `e2e/affiliate-portal.spec.ts` | Playwright smoke tests for all portal pages | Working |
| `e2e/affiliate-detail.spec.ts` | Playwright detail page tests | Working |
| `e2e/affiliate-payments.spec.ts` | Playwright payment flow tests | Working |

## Commission Structure

| Level | Rate | Description |
|-------|------|-------------|
| Level 1 | 15% | Direct referral commission |
| Level 2 | 3% | Second-level referral commission |
| Level 3 | 2% | Third-level referral commission |

Total commission across all levels: 20% of concierge fee.

## Security Controls

| Control | Implementation | Status |
|---------|---------------|--------|
| RBAC checks | `isAffiliateRole()` on dashboard, commissions, analytics, settings, documents, share-link | Working |
| Authentication | `getSessionUser()` / `getCurrentUser()` on all API routes | Working |
| Data isolation | Affiliate queries scoped by `userId` / `affiliateId` | Working |
| Service-role prevention | `service-role-scanner.test.ts` blocks `createAdminClient()` in portal APIs | Working |
| Error message safety | Static error messages in all catch blocks (no `error.message` leaks) | Working |
| Input validation | Zod schemas on click, process-referral, share-link; pagination clamping | Working |
| Cookie security | `httpOnly`, `secure`, `sameSite: lax` on attribution cookies | Working |
| XSS prevention | `escapeHtml()` on share-link email content | Working |
