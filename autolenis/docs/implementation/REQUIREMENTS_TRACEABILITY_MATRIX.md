# AutoLenis — Requirements Traceability Matrix

> Maps every requirement across the 13 core systems to source files, API routes, Prisma models, UI pages, tests, and verification commands.

---

## 1. Authentication & User Management

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| User signup (buyer) | `lib/services/auth.service.ts` | `POST /api/auth/signup` | `User`, `BuyerProfile`, `Workspace` | `app/auth/signup/page.tsx` | `__tests__/auth.test.ts` | `pnpm test:unit -- auth` |
| User signin (buyer) | `lib/auth.ts`, `lib/auth-server.ts` | `POST /api/auth/signin` | `User` | `app/auth/signin/page.tsx` | `__tests__/auth.test.ts`, `__tests__/signin-resilience.test.ts` | `pnpm test:unit -- signin` |
| Admin signup | `lib/admin-auth.ts` | `POST /api/admin/auth/signup` | `AdminUser` | `app/admin/signup/page.tsx` | `__tests__/admin-auth.test.ts` | `pnpm test:unit -- admin-auth` |
| Admin signin + MFA | `lib/admin-auth.ts` | `POST /api/admin/auth/signin`, `POST /api/admin/auth/mfa/verify` | `AdminUser`, `AdminLoginAttempt` | `app/admin/sign-in/page.tsx`, `app/admin/mfa/challenge/page.tsx` | `__tests__/admin-auth.test.ts` | `pnpm test:unit -- admin-auth` |
| MFA enrollment | `lib/admin-auth.ts` | `POST /api/admin/auth/mfa/enroll`, `POST /api/auth/mfa/enroll` | `AdminUser`, `User` | `app/admin/mfa/enroll/page.tsx` | `__tests__/admin-auth.test.ts` | `pnpm test:unit -- admin-auth` |
| Password reset | `lib/services/password-reset.service.ts` | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | `User` | `app/auth/forgot-password/page.tsx`, `app/auth/reset-password/page.tsx` | `__tests__/auth.test.ts` | `pnpm test:unit -- auth` |
| Email verification | `lib/services/email-verification.service.ts` | `POST /api/auth/verify-email`, `POST /api/auth/resend-verification` | `User` | `app/auth/verify-email/page.tsx` | `__tests__/email-verification.test.ts`, `__tests__/resend-verification.test.ts` | `pnpm test:unit -- email-verification` |
| Change password | `lib/auth.ts` | `POST /api/auth/change-password` | `User` | — | `__tests__/auth.test.ts` | `pnpm test:unit -- auth` |
| Sign out | `lib/auth.ts` | `POST /api/auth/signout`, `POST /api/admin/auth/signout` | — | `app/auth/signout/page.tsx` | `__tests__/auth.test.ts` | `pnpm test:unit -- auth` |
| Role-based access (RBAC) | `lib/utils/role-detection.ts`, `lib/auth-server.ts`, `lib/auth-edge.ts` | All protected routes | `User` (role field) | — | `__tests__/middleware.test.ts`, `__tests__/rls-visibility.test.ts` | `pnpm test:unit -- middleware` |
| Workspace isolation | `lib/auth.ts` | All data queries | `Workspace` | — | `__tests__/workspace-isolation.test.ts`, `__tests__/workspace-scope.test.ts` | `pnpm test:unit -- workspace` |
| Rate limiting | `lib/middleware/rate-limit.ts` | Auth endpoints | — | — | `__tests__/middleware.test.ts` | `pnpm test:unit -- middleware` |
| Test route guard | `app/api/test/` | `POST /api/test/create-user`, `POST /api/test/seed` | — | — | `__tests__/test-route-guard.test.ts` | `pnpm test:unit -- test-route-guard` |

---

## 2. Buyer Portal

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Buyer dashboard | `lib/services/buyer.service.ts` | `GET /api/buyer/dashboard` | `BuyerProfile`, `PreQualification`, `Auction`, `SelectedDeal` | `app/buyer/dashboard/page.tsx` | `__tests__/deal-context.test.ts` | `pnpm test:unit -- deal-context` |
| Buyer profile | `lib/services/buyer.service.ts` | `GET/PUT /api/buyer/profile` | `BuyerProfile`, `BuyerPreferences` | `app/buyer/profile/page.tsx` | — | Manual |
| Inventory search | `lib/services/inventory.service.ts` | `GET /api/buyer/inventory/search`, `GET /api/buyer/inventory/filters` | `InventoryItem` | `app/buyer/search/page.tsx` | — | Manual |
| Shortlist management | `lib/services/shortlist.service.ts` | `GET/POST /api/buyer/shortlist`, `DELETE /api/buyer/shortlist/items/[id]` | `Shortlist`, `ShortlistItem` | `app/buyer/shortlist/page.tsx` | — | Manual |
| Vehicle request (sourcing) | `lib/services/sourcing.service.ts` | `POST /api/buyer/requests`, `GET /api/buyer/requests/[caseId]` | `VehicleRequestCase`, `VehicleRequestItem` | `app/buyer/requests/page.tsx`, `app/buyer/requests/new/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Trade-in submission | — | `POST /api/buyer/trade-in` | `TradeIn` | `app/buyer/trade-in/page.tsx` | — | Manual |
| Deal management | `lib/services/deal.service.ts` | `GET /api/buyer/deal`, `POST /api/buyer/deal/select` | `SelectedDeal` | `app/buyer/deal/page.tsx` | `__tests__/deal-status.test.ts`, `__tests__/deal-context.test.ts` | `pnpm test:unit -- deal` |
| Coverage gap detection | — | `GET /api/buyer/coverage-gap` | `DealerCoverageGapSignal` | — | — | Manual |
| Buyer documents | — | `GET /api/buyer/contracts` | `ContractDocument`, `DealDocument` | `app/buyer/documents/page.tsx`, `app/buyer/contracts/page.tsx` | `e2e/buyer-documents.spec.ts` | `pnpm test:e2e -- buyer-documents` |
| Buyer payments | `lib/services/payment.service.ts` | `GET /api/buyer/billing` | `DepositPayment`, `ServiceFeePayment` | `app/buyer/payments/page.tsx`, `app/buyer/billing/page.tsx` | — | Manual |
| Buyer demo flow | — | `GET /api/buyer/demo` | — | `app/buyer/demo/page.tsx` | — | Manual |

---

## 3. Dealer Portal

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Dealer dashboard | `lib/services/dealer.service.ts` | `GET /api/dealer/dashboard` | `Dealer`, `DealerUser` | `app/dealer/dashboard/page.tsx` | `e2e/dealer-smoke.spec.ts` | `pnpm test:e2e -- dealer-smoke` |
| Dealer application | `lib/services/dealer.service.ts` | `POST /api/dealer/register`, `POST /api/dealer/onboarding` | `Dealer` | `app/dealer-application/page.tsx`, `app/dealer/onboarding/page.tsx` | `e2e/api-dealers-e2e.spec.ts` | `pnpm test:e2e -- api-dealers` |
| Inventory management | `lib/services/inventory.service.ts`, `lib/services/dealer.service.ts` | `GET/POST /api/dealer/inventory`, `PUT/DELETE /api/dealer/inventory/[id]` | `InventoryItem` | `app/dealer/inventory/page.tsx`, `app/dealer/inventory/add/page.tsx` | — | Manual |
| Bulk inventory upload | — | `POST /api/dealer/inventory/bulk-upload`, `POST /api/dealer/inventory/import` | `InventoryItem` | `app/dealer/inventory/bulk-upload/page.tsx` | — | Manual |
| Auction participation | `lib/services/auction.service.ts`, `lib/services/dealer.service.ts` | `GET /api/dealer/auctions`, `POST /api/dealer/auctions/[id]/offers` | `AuctionParticipant`, `AuctionOffer` | `app/dealer/auctions/page.tsx` | — | Manual |
| Deal management | `lib/services/dealer.service.ts` | `GET /api/dealer/deals`, `GET /api/dealer/deals/[dealId]` | `SelectedDeal` | `app/dealer/deals/page.tsx` | — | Manual |
| Contract upload | `lib/services/dealer.service.ts` | `POST /api/dealer/contracts`, `POST /api/dealer/documents/upload` | `ContractDocument`, `DealDocument` | `app/dealer/contracts/page.tsx` | — | Manual |
| Pickup management | `lib/services/dealer.service.ts` | `GET /api/dealer/pickups`, `POST /api/dealer/pickups/[id]/complete` | `PickupAppointment` | `app/dealer/pickups/page.tsx` | — | Manual |
| Dealer settings | `lib/services/dealer.service.ts` | `GET/PUT /api/dealer/settings` | `Dealer` | `app/dealer/settings/page.tsx` | — | Manual |
| Sourcing opportunities | `lib/services/sourcing.service.ts` | `GET /api/dealer/opportunities`, `POST /api/dealer/opportunities/[caseId]/offers` | `SourcedOffer`, `DealerInvite` | `app/dealer/opportunities/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Dealer invite claim | `lib/services/sourcing.service.ts` | `POST /api/dealer/invite/claim`, `POST /api/dealer/invite/complete` | `DealerInvite` | `app/dealer/invite/claim/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Dealer payments | — | `GET /api/dealer/payments`, `POST /api/dealer/payments/checkout` | — | `app/dealer/payments/page.tsx` | — | Manual |

---

## 4. Admin Portal

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Admin dashboard | `lib/services/admin.service.ts` | `GET /api/admin/dashboard` | All aggregate models | `app/admin/dashboard/page.tsx` | `e2e/admin-smoke.spec.ts` | `pnpm test:e2e -- admin-smoke` |
| User management | `lib/services/admin.service.ts` | `GET /api/admin/users/list`, `POST /api/admin/users` | `User`, `AdminUser` | `app/admin/users/page.tsx`, `app/admin/users/new/page.tsx` | `__tests__/admin-create-user-audit.test.ts` | `pnpm test:unit -- admin-create-user` |
| Buyer management | `lib/services/admin.service.ts` | `GET /api/admin/buyers`, `GET /api/admin/buyers/[buyerId]` | `BuyerProfile`, `User` | `app/admin/buyers/page.tsx`, `app/admin/buyers/[buyerId]/page.tsx` | `__tests__/admin-buyer-detail.test.ts`, `e2e/admin-buyer-detail.spec.ts` | `pnpm test:unit -- admin-buyer` |
| Dealer management | `lib/services/admin.service.ts`, `lib/services/dealer-approval.service.ts` | `GET /api/admin/dealers`, `POST /api/admin/dealers/[id]/approve` | `Dealer` | `app/admin/dealers/page.tsx`, `app/admin/dealers/applications/page.tsx` | `__tests__/admin-dealer-detail.test.ts`, `__tests__/api-admin-dealers-auth.test.ts` | `pnpm test:unit -- admin-dealer` |
| Deal management | `lib/services/deal.service.ts` | `GET /api/admin/deals`, `PUT /api/admin/deals/[dealId]/status` | `SelectedDeal` | `app/admin/deals/page.tsx`, `app/admin/deals/[dealId]/page.tsx` | `__tests__/deal-status.test.ts` | `pnpm test:unit -- deal-status` |
| Payment management | `lib/services/payment.service.ts` | `GET /api/admin/payments/*` | `DepositPayment`, `ServiceFeePayment`, `Refund` | `app/admin/payments/page.tsx` and sub-pages | `__tests__/admin-payments-pages.test.ts`, `e2e/admin-payments-pages.spec.ts` | `pnpm test:unit -- admin-payments` |
| Refund processing | `lib/services/payment.service.ts` | `POST /api/admin/payments/refund`, `POST /api/admin/payments/refunds/initiate` | `Refund`, `FinancialAuditLog` | `app/admin/payments/refunds/page.tsx`, `app/admin/deals/[dealId]/refunds/page.tsx` | `__tests__/admin-payments-pages.test.ts` | `pnpm test:unit -- admin-payments` |
| Financial reporting | `lib/services/admin.service.ts` | `GET /api/admin/financial`, `GET /api/admin/reports/finance` | `Transaction`, `FinancialAuditLog` | `app/admin/financial-reporting/page.tsx`, `app/admin/reports/finance/page.tsx` | `__tests__/financial-reporting.test.ts`, `e2e/financial-reporting.spec.ts` | `pnpm test:unit -- financial` |
| Affiliate management | `lib/services/affiliate.service.ts` | `GET /api/admin/affiliates`, `POST /api/admin/affiliates/[id]/status` | `Affiliate`, `Commission`, `Payout` | `app/admin/affiliates/page.tsx` | `__tests__/admin-dealers-affiliates.test.ts`, `__tests__/affiliate-detail.test.ts` | `pnpm test:unit -- affiliate-detail` |
| Notifications | — | `GET /api/admin/notifications`, `POST /api/admin/notifications/[id]/read` | `AdminNotification` | `app/admin/notifications/page.tsx` | `__tests__/admin-notifications.test.ts` | `pnpm test:unit -- admin-notifications` |
| Audit logs | — | — | `AdminAuditLog`, `ComplianceEvent` | `app/admin/audit-logs/page.tsx`, `app/admin/compliance/page.tsx` | `e2e/audit-validation.spec.ts` | `pnpm test:e2e -- audit-validation` |
| Admin settings | — | `GET/PUT /api/admin/settings` | `AdminSetting` | `app/admin/settings/page.tsx` | — | Manual |
| Admin search | — | `GET /api/admin/search` | — | — | `__tests__/admin-search-signup-refinance.test.ts` | `pnpm test:unit -- admin-search` |
| Sourcing management | `lib/services/sourcing.service.ts` | `GET /api/admin/sourcing/cases`, `PUT /api/admin/sourcing/cases/[caseId]/status` | `VehicleRequestCase`, `SourcedOffer` | `app/admin/sourcing/page.tsx`, `app/admin/sourcing/[caseId]/page.tsx` | `__tests__/sourcing.test.ts`, `e2e/sourcing.spec.ts` | `pnpm test:unit -- sourcing` |
| Preapproval management | — | `GET /api/admin/preapprovals`, `POST /api/admin/preapprovals/[id]/review` | `ExternalPreApprovalSubmission` | `app/admin/preapprovals/page.tsx` | `__tests__/external-preapproval.test.ts` | `pnpm test:unit -- external-preapproval` |
| External preapproval review | `lib/services/external-preapproval.service.ts` | `GET /api/admin/external-preapprovals`, `POST /api/admin/external-preapprovals/[id]/review` | `ExternalPreApproval`, `ExternalPreApprovalSubmission` | `app/admin/external-preapprovals/page.tsx` | `__tests__/external-preapproval.test.ts` | `pnpm test:unit -- external-preapproval` |

---

## 5. Vehicle Sourcing System

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Create sourcing case | `lib/services/sourcing.service.ts` | `POST /api/buyer/requests` | `VehicleRequestCase`, `VehicleRequestItem`, `CaseEventLog` | `app/buyer/requests/new/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Submit case for sourcing | `lib/services/sourcing.service.ts` | `POST /api/buyer/requests/[caseId]/submit` | `VehicleRequestCase` | `app/buyer/requests/[caseId]/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Admin case assignment | `lib/services/sourcing.service.ts` | `POST /api/admin/sourcing/cases/[caseId]/assign` | `VehicleRequestCase` | `app/admin/sourcing/[caseId]/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Dealer outreach & invite | `lib/services/sourcing.service.ts` | `POST /api/admin/sourcing/cases/[caseId]/invite-dealer`, `POST /api/admin/sourcing/cases/[caseId]/outreach` | `DealerInvite`, `SourcingOutreachLog` | `app/admin/sourcing/[caseId]/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Dealer offer submission | `lib/services/sourcing.service.ts` | `POST /api/dealer/opportunities/[caseId]/offers` | `SourcedOffer` | `app/dealer/opportunities/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Present/withdraw offer | `lib/services/sourcing.service.ts` | `POST /api/admin/sourcing/cases/[caseId]/offers/[offerId]/present`, `.../withdraw` | `SourcedOffer` | `app/admin/sourcing/[caseId]/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Buyer accept offer | `lib/services/sourcing.service.ts` | `POST /api/buyer/requests/[caseId]/offers/[offerId]/accept` | `SourcedOffer` | `app/buyer/requests/[caseId]/page.tsx` | `__tests__/sourcing.test.ts`, `__tests__/downstream-sourced-deals.test.ts` | `pnpm test:unit -- sourcing` |
| Status flow (DRAFT→COMPLETED) | `lib/services/sourcing.service.ts` | Multiple status transitions | `VehicleRequestCase` | — | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Dealer invite claim flow | `lib/services/sourcing.service.ts` | `POST /api/dealer/invite/claim`, `POST /api/dealer/invite/complete` | `DealerInvite` | `app/dealer/invite/claim/page.tsx` | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| Coverage gap signals | — | `GET /api/buyer/coverage-gap` | `DealerCoverageGapSignal` | — | — | Manual |
| Event logging | `lib/services/sourcing.service.ts` | Internal | `CaseEventLog` | — | `__tests__/sourcing.test.ts` | `pnpm test:unit -- sourcing` |
| E2E sourcing flow | — | — | — | — | `e2e/sourcing.spec.ts` | `pnpm test:e2e -- sourcing` |

---

## 6. Auction & Best-Price System

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Create auction | `lib/services/auction.service.ts` | `POST /api/buyer/auction` | `Auction`, `AuctionParticipant` | `app/buyer/auction/page.tsx` | — | Manual |
| Auction validation | `lib/services/auction.service.ts` | `POST /api/buyer/auction/validate` | `Auction`, `PreQualification`, `Shortlist` | — | — | Manual |
| Dealer offer submission | `lib/services/auction.service.ts` | `POST /api/dealer/auctions/[auctionId]/offers` | `AuctionOffer`, `AuctionOfferFinancingOption` | `app/dealer/auctions/[id]/page.tsx` | — | Manual |
| Best-price computation | `lib/services/best-price.service.ts` | `GET /api/auction/[id]/best-price`, `GET /api/buyer/auctions/[auctionId]/best-price` | `BestPriceOption` | — | `__tests__/calculator-parity.test.ts` | `pnpm test:unit -- calculator-parity` |
| Best-price admin recompute | `lib/services/best-price.service.ts` | `POST /api/admin/auctions/[id]/best-price/recompute` | `BestPriceOption` | — | — | Manual |
| Deal selection from best-price | `lib/services/deal.service.ts` | `POST /api/buyer/auctions/[auctionId]/deals/select` | `SelectedDeal`, `BestPriceOption` | — | `__tests__/deal-context.test.ts` | `pnpm test:unit -- deal-context` |
| Close expired auctions (cron) | `lib/services/auction.service.ts` | `POST /api/auction/close-expired` | `Auction` | — | — | Manual |
| Admin auction management | `lib/services/auction.service.ts` | `GET /api/admin/auctions`, `GET /api/admin/auctions/[auctionId]` | `Auction`, `AuctionOffer` | `app/admin/auctions/page.tsx`, `app/admin/auctions/[auctionId]/page.tsx` | `__tests__/admin-auction-detail.test.ts` | `pnpm test:unit -- admin-auction` |
| Offer validity management | — | `PUT /api/admin/offers/[offerId]/validity` | `AuctionOffer` | `app/admin/offers/page.tsx` | — | Manual |

---

## 7. Payment System (Stripe)

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Deposit payment creation | `lib/services/payment.service.ts`, `lib/stripe.ts` | `POST /api/buyer/deposit`, `POST /api/payments/deposit` | `DepositPayment`, `DepositRequest` | `app/buyer/deposit/page.tsx` | — | Manual |
| Deposit confirmation | `lib/services/payment.service.ts` | `POST /api/payments/confirm` | `DepositPayment`, `Transaction` | — | — | Manual |
| Concierge fee options | `lib/services/payment.service.ts` | `GET /api/payments/fee/options/[dealId]` | `ServiceFeePayment`, `ConciergeFeeRequest` | `app/buyer/deal/fee/page.tsx` | — | Manual |
| Pay concierge fee by card | `lib/services/deal.service.ts`, `lib/services/payment.service.ts` | `POST /api/buyer/deals/[dealId]/concierge-fee/pay-card`, `POST /api/payments/fee/pay-card` | `ServiceFeePayment`, `Transaction` | `app/buyer/deal/fee/page.tsx` | — | Manual |
| Include fee in loan | `lib/services/deal.service.ts`, `lib/services/payment.service.ts` | `POST /api/buyer/deals/[dealId]/concierge-fee/include-in-loan`, `POST /api/payments/fee/loan-agree` | `ServiceFeePayment`, `FeeFinancingDisclosure` | `app/buyer/deal/fee/page.tsx` | — | Manual |
| Loan impact calculation | `lib/services/payment.service.ts` | `GET /api/payments/fee/loan-impact/[dealId]` | — | — | — | Manual |
| Stripe webhook handler | `app/api/webhooks/stripe/route.ts` | `POST /api/webhooks/stripe` | `DepositPayment`, `ServiceFeePayment`, `Transaction`, `Refund`, `Chargeback` | — | — | Manual |
| Webhook idempotency | `app/api/webhooks/stripe/route.ts` | `POST /api/webhooks/stripe` | Duplicate detection via `stripePaymentIntentId` | — | — | Manual |
| Refund processing | `lib/services/payment.service.ts` | `POST /api/admin/payments/refund`, `POST /api/admin/payments/refunds/initiate` | `Refund`, `FinancialAuditLog`, `ComplianceEvent` | `app/admin/payments/refunds/page.tsx` | `__tests__/admin-payments-pages.test.ts` | `pnpm test:unit -- admin-payments` |
| Chargeback handling | `app/api/webhooks/stripe/route.ts` | `POST /api/webhooks/stripe` (event: `charge.dispute.created`) | `Chargeback`, `AdminNotification` | — | — | Manual |
| Commission trigger | `app/api/webhooks/stripe/commission-trigger/route.ts` | `POST /api/webhooks/stripe/commission-trigger` | `Commission` | — | — | Manual |
| Financial audit log | `lib/services/payment.service.ts` | Internal | `FinancialAuditLog`, `Transaction` | `app/admin/financial-reporting/page.tsx` | `__tests__/financial-reporting.test.ts` | `pnpm test:unit -- financial` |
| Lender fee disbursement | `lib/services/payment.service.ts` | Internal | `LenderFeeDisbursement` | — | — | Manual |
| Admin payment links | — | `POST /api/admin/payments/send-link` | — | `app/admin/payments/send-link/page.tsx` | — | Manual |
| Admin deposit/fee requests | — | `POST /api/admin/payments/deposits/request`, `POST /api/admin/payments/concierge-fees/request` | `DepositRequest`, `ConciergeFeeRequest` | — | — | Manual |
| Payment checkout (dealer) | — | `POST /api/dealer/payments/checkout` | — | `app/dealer/payments/page.tsx` | — | Manual |

---

## 8. Contract Shield System

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Document upload | `lib/services/contract-shield.service.ts` | `POST /api/contract/upload` | `ContractDocument` | `app/buyer/contract-shield/page.tsx` | — | Manual |
| Contract scan | `lib/services/contract-shield.service.ts` | `POST /api/contract/scan` | `ContractShieldScan`, `FixListItem` | `app/buyer/contract-shield/page.tsx` | — | Manual |
| Scan results | `lib/services/contract-shield.service.ts` | `GET /api/contract/scan/[id]` | `ContractShieldScan` | `app/buyer/contract-shield/page.tsx` | — | Manual |
| Fix item resolution | `lib/services/contract-shield.service.ts` | `POST /api/contract/fix` | `FixListItem` | — | — | Manual |
| Admin override (with consent) | `lib/services/contract-shield.service.ts` | `POST /api/admin/contracts/[id]/override` | `ContractShieldOverride`, `ContractShieldNotification` | `app/admin/contracts/[id]/page.tsx` | — | Manual |
| Buyer acknowledge override | `lib/services/contract-shield.service.ts` | `POST /api/buyer/contracts/acknowledge-override` | `ContractShieldOverride` | — | — | Manual |
| Contract Shield rules | `lib/services/contract-shield.service.ts` | `GET/PUT /api/admin/contract-shield/rules`, `PUT /api/admin/contract-shield/rules/[id]` | `ContractShieldRule` | `app/admin/contract-shield/rules/page.tsx` | — | Manual |
| Overrides ledger | `lib/services/contract-shield.service.ts` | `GET /api/admin/contract-shield/overrides` | `ContractShieldOverride` | `app/admin/contract-shield/overrides/page.tsx` | — | Manual |
| Reconciliation cron | `lib/services/contract-shield.service.ts` | `POST /api/cron/contract-shield-reconciliation` | `ContractShieldReconciliation` | — | — | Manual |
| Status notifications | `lib/services/contract-shield.service.ts` | Internal | `ContractShieldNotification` | — | — | Manual |
| Deal progression gating | `lib/services/contract-shield.service.ts` | Contract Shield scan gates deal via `CONTRACT_REVIEW` status | `ContractShieldScan`, `SelectedDeal` | — | `__tests__/deal-status.test.ts` | `pnpm test:unit -- deal-status` |
| Disclaimers (informational only) | UI components | — | — | `app/contract-shield/page.tsx` | — | Manual |

---

## 9. Insurance System

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Insurance overview | `lib/services/insurance.service.ts` | `GET /api/buyer/deals/[dealId]/insurance` | `InsuranceQuote`, `InsurancePolicy` | `app/buyer/deal/insurance/page.tsx` | `__tests__/insurance.test.ts` | `pnpm test:unit -- insurance` |
| Request quotes | `lib/services/insurance.service.ts` | `POST /api/buyer/deals/[dealId]/insurance/request-quotes` | `InsuranceQuote` | `app/buyer/deal/insurance/quotes/page.tsx` | `__tests__/insurance.test.ts` | `pnpm test:unit -- insurance` |
| Select quote | `lib/services/insurance.service.ts` | `POST /api/buyer/deals/[dealId]/insurance/select-quote` | `InsuranceQuote` | — | `__tests__/insurance.test.ts` | `pnpm test:unit -- insurance` |
| Bind policy | `lib/services/insurance.service.ts` | `POST /api/buyer/deals/[dealId]/insurance/bind-policy` | `InsurancePolicy` | `app/buyer/deal/insurance/bind/page.tsx` | `__tests__/insurance.test.ts` | `pnpm test:unit -- insurance` |
| Upload external proof | `lib/services/insurance.service.ts` | `POST /api/buyer/deals/[dealId]/insurance/external-proof` | `InsurancePolicy` | `app/buyer/deal/insurance/proof/page.tsx` | `__tests__/insurance.test.ts` | `pnpm test:unit -- insurance` |
| Verify external policy (admin) | `lib/services/insurance.service.ts` | `POST /api/admin/deals/[dealId]/insurance/verify-external` | `InsurancePolicy`, `InsuranceEvent` | — | `__tests__/insurance.test.ts` | `pnpm test:unit -- insurance` |
| Document requests | `lib/services/insurance.service.ts` | `POST /api/admin/deals/[dealId]/insurance/request-docs`, `GET /api/buyer/deals/[dealId]/insurance/doc-requests` | `InsuranceDocRequest` | — | — | Manual |
| Dealer insurance view | `lib/services/insurance.service.ts` | `GET /api/dealer/deals/[dealId]/insurance` | — | `app/dealer/deals/[dealId]/insurance/page.tsx` | — | Manual |
| Admin insurance overview | `lib/services/insurance.service.ts` | `GET /api/admin/insurance` | — | `app/admin/insurance/page.tsx` | — | Manual |
| Policy attached to deal | `lib/services/insurance.service.ts` | Internal | `InsurancePolicy`, `SelectedDeal` | — | `__tests__/insurance.test.ts` | `pnpm test:unit -- insurance` |

---

## 10. E-Sign System

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Create envelope | `lib/services/esign.service.ts` | `POST /api/esign/create`, `POST /api/dealer/deals/[dealId]/esign/create-envelope` | `ESignEnvelope` | `app/buyer/deal/esign/page.tsx` | — | Manual |
| Envelope status | `lib/services/esign.service.ts` | `GET /api/esign/status/[envelopeId]` | `ESignEnvelope` | — | — | Manual |
| Buyer view envelope | `lib/services/esign.service.ts` | `GET /api/buyer/deals/[dealId]/esign` | `ESignEnvelope` | `app/buyer/deal/esign/page.tsx`, `app/buyer/esign/page.tsx` | — | Manual |
| Admin view / void | `lib/services/esign.service.ts` | `GET /api/admin/deals/[dealId]/esign`, `POST /api/admin/deals/[dealId]/esign/void-envelope` | `ESignEnvelope` | — | — | Manual |
| E-Sign webhook | `lib/services/esign.service.ts` | `POST /api/esign/webhook`, `POST /api/esign/provider-webhook` | `ESignEnvelope` | — | — | Manual |
| Webhook signature verification | `lib/services/esign.service.ts` | Internal | — | — | — | Manual |

---

## 11. Affiliate Engine

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Affiliate enrollment | `lib/services/affiliate.service.ts` | `POST /api/affiliate/enroll` | `Affiliate`, `Referral` | `app/affiliate/onboarding/page.tsx` | `__tests__/affiliate-dashboard-audit.test.ts` | `pnpm test:unit -- affiliate-dashboard` |
| Auto-enroll buyer | `lib/services/affiliate.service.ts` | Internal (on signup) | `Affiliate` | — | — | Manual |
| Click tracking | `lib/services/affiliate.service.ts` | `POST /api/affiliate/click` | `Click` | — | — | Manual |
| Referral code generation | `lib/services/affiliate.service.ts` | Internal | `Referral` | — | — | Manual |
| Share link generation | `lib/services/affiliate.service.ts` | `GET /api/affiliate/share-link` | — | `app/affiliate/links/page.tsx` | `__tests__/affiliate-share-link.test.ts` | `pnpm test:unit -- affiliate-share` |
| Referral chain building | `lib/services/affiliate.service.ts` | Internal | `Referral` | — | `__tests__/affiliate-referrals-visibility.test.ts` | `pnpm test:unit -- affiliate-referrals` |
| No self-referrals | `lib/services/affiliate.service.ts` | Internal guard | — | — | `__tests__/affiliate-referrals-visibility.test.ts` | `pnpm test:unit -- affiliate-referrals` |
| Max depth 5 | `lib/services/affiliate.service.ts` | Internal guard | — | — | `__tests__/affiliate-referrals-visibility.test.ts` | `pnpm test:unit -- affiliate-referrals` |
| Commission creation | `lib/services/affiliate.service.ts` | `POST /api/webhooks/stripe/commission-trigger` | `Commission` | — | `__tests__/affiliate-payments.test.ts` | `pnpm test:unit -- affiliate-payments` |
| Commission reversal (refund) | `lib/services/affiliate.service.ts` | `POST /api/webhooks/stripe/commission-trigger` (action: REFUND) | `Commission` | — | `__tests__/affiliate-payments.test.ts` | `pnpm test:unit -- affiliate-payments` |
| Affiliate dashboard | `lib/services/affiliate.service.ts` | `GET /api/affiliate/dashboard` | `Affiliate`, `Commission`, `Referral` | `app/affiliate/dashboard/page.tsx`, `app/affiliate/portal/dashboard/page.tsx` | `__tests__/affiliate-dashboard-audit.test.ts`, `e2e/affiliate-portal.spec.ts` | `pnpm test:unit -- affiliate-dashboard` |
| Affiliate analytics | `lib/services/affiliate.service.ts` | `GET /api/affiliate/analytics` | `Click`, `Referral`, `Commission` | `app/affiliate/portal/analytics/page.tsx` | — | Manual |
| Payout management | `lib/services/affiliate.service.ts` | `GET /api/affiliate/payouts`, `POST /api/admin/affiliates/payouts` | `Payout`, `AffiliatePayment` | `app/affiliate/payouts/page.tsx`, `app/admin/payouts/page.tsx` | `__tests__/affiliate-payments.test.ts`, `e2e/affiliate-payments.spec.ts` | `pnpm test:unit -- affiliate-payments` |
| Data isolation | `lib/services/affiliate.service.ts` | All affiliate endpoints | — | — | `__tests__/affiliate-referrals-visibility.test.ts` | `pnpm test:unit -- affiliate-referrals` |
| Affiliate documents | — | `GET /api/affiliate/documents` | `AffiliateDocument` | `app/affiliate/portal/documents/page.tsx` | — | Manual |
| Affiliate settings | — | `GET/PUT /api/affiliate/settings` | `Affiliate` | `app/affiliate/settings/page.tsx` | — | Manual |
| Reconciliation cron | `lib/services/affiliate.service.ts` | `POST /api/cron/affiliate-reconciliation` | `Commission`, `Payout` | — | — | Manual |
| Referral landing page | — | `GET /ref/[code]` | — | `app/ref/[code]/page.tsx` | — | Manual |

---

## 12. AI Assistant System

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| AI chat endpoint | `lib/ai/orchestrator.ts`, `lib/ai/router.ts` | `POST /api/ai/chat` | `AiConversation`, `AiMessage`, `AiToolCall` | `app/admin/ai/page.tsx` | `__tests__/ai-orchestrator.test.ts` | `pnpm test:unit -- ai-orchestrator` |
| Gemini integration | `lib/ai/gemini-client.ts` | Internal | — | — | `__tests__/ai-gemini-security.test.ts` | `pnpm test:unit -- ai-gemini` |
| Role-specific tools | `lib/ai/tools/admin-tools.ts`, `lib/ai/tools/buyer-tools.ts`, `lib/ai/tools/dealer-tools.ts`, `lib/ai/tools/affiliate-tools.ts`, `lib/ai/tools/contract-tools.ts` | Internal | — | — | `__tests__/ai-gemini-security.test.ts` | `pnpm test:unit -- ai-gemini` |
| Context loading | `lib/ai/context-loader.ts`, `lib/ai/context-builder.ts` | Internal | — | — | `__tests__/context-loader.test.ts` | `pnpm test:unit -- context-loader` |
| AI admin actions | — | Internal | `AiAdminAction` | — | — | Manual |
| AI kill switch | `lib/env.ts` (`AI_ACTIONS_DISABLED`) | Internal | — | — | `__tests__/ai-gemini-security.test.ts` | `pnpm test:unit -- ai-gemini` |
| AI leads capture | — | Internal | `AiLead` | — | — | Manual |
| AI SEO drafts | — | Internal | `AiSeoDraft` | — | — | Manual |
| AI contract extraction | — | Internal | `AiContractExtraction` | — | — | Manual |
| Knowledge retrieval | `lib/ai/` | Internal | — | — | `__tests__/knowledge-retrieval.test.ts` | `pnpm test:unit -- knowledge-retrieval` |
| System agent prompts | `lib/ai/` | Internal | — | — | `__tests__/system-agent.test.ts`, `__tests__/lenis-concierge-prompt.test.ts` | `pnpm test:unit -- system-agent` |

---

## 13. Financing & Pre-Qualification System

| Requirement | Files / Paths | API Routes | Prisma Models | UI Pages | Tests | Verification |
|---|---|---|---|---|---|---|
| Internal pre-qualification | `lib/services/prequal.service.ts` | `POST /api/buyer/prequal/start`, `GET /api/buyer/prequal` | `PreQualification` | `app/buyer/prequal/page.tsx` | — | Manual |
| Draft prequal | `lib/services/prequal.service.ts` | `POST /api/buyer/prequal/draft` | `PreQualification` | `app/buyer/prequal/page.tsx` | — | Manual |
| Refresh prequal | `lib/services/prequal.service.ts` | `POST /api/buyer/prequal/refresh` | `PreQualification` | — | — | Manual |
| External preapproval submission | `lib/services/external-preapproval.service.ts` | `POST /api/buyer/prequal/external` | `ExternalPreApproval`, `ExternalPreApprovalSubmission` | `app/buyer/prequal/manual-preapproval/page.tsx` | `__tests__/external-preapproval.test.ts` | `pnpm test:unit -- external-preapproval` |
| Admin prequal revoke | — | `POST /api/admin/buyers/[buyerId]/prequal/revoke` | `PreQualification` | — | — | Manual |
| Financing choice in deal | `lib/services/deal.service.ts` | `PUT /api/buyer/deals/[dealId]/financing` | `SelectedDeal`, `FinancingOffer` | `app/buyer/deal/financing/page.tsx` | `__tests__/deal-context.test.ts` | `pnpm test:unit -- deal-context` |
| Refinance leads | — | `POST /api/refinance/check-eligibility`, `POST /api/refinance/record-redirect` | `RefinanceLead` | `app/refinance/page.tsx` | `__tests__/admin-search-signup-refinance.test.ts` | `pnpm test:unit -- admin-search` |
| Funded loans (admin) | — | `GET /api/admin/refinance/funded-loans`, `POST /api/admin/refinance/leads/[id]/fund` | `FundedLoan` | `app/admin/refinance/funded/page.tsx` | — | Manual |
| Lender fee disbursement | `lib/services/payment.service.ts` | Internal | `LenderFeeDisbursement` | — | — | Manual |

---

## Cross-Cutting Concerns

| Requirement | Files / Paths | Tests | Verification |
|---|---|---|---|
| Email (Resend only) | `lib/services/email.service.tsx` | `__tests__/email-service.test.ts` | `pnpm test:unit -- email-service` |
| Zod input validation | `lib/validators/*.ts` | Various tests | `pnpm typecheck` |
| Error handling middleware | `lib/middleware/error-handler.ts` | `__tests__/middleware.test.ts` | `pnpm test:unit -- middleware` |
| Rate limiting | `lib/middleware/rate-limit.ts` | `__tests__/middleware.test.ts` | `pnpm test:unit -- middleware` |
| Cron security | `lib/middleware/cron-security.ts` | `__tests__/middleware.test.ts` | `pnpm test:unit -- middleware` |
| Logger (no secrets) | `lib/logger.ts` | — | Manual |
| Environment validation | `lib/env.ts` | `__tests__/mock-mode.test.ts` | `pnpm test:unit -- mock-mode` |
| SEO management | `lib/services/seo.service.ts` | `__tests__/seo.test.ts` | `pnpm test:unit -- seo` |
| Production readiness | — | `__tests__/production-readiness.test.ts` | `pnpm test:unit -- production-readiness` |
| Navigation config | — | `__tests__/nav-config.test.ts` | `pnpm test:unit -- nav-config` |
| Next step resolver | — | `__tests__/next-step-resolver.test.ts` | `pnpm test:unit -- next-step-resolver` |
| Link integrity | — | `__tests__/link-checker.test.ts`, `e2e/link-checker.spec.ts` | `pnpm test:links` |
| Mobile responsiveness | — | `e2e/mobile-responsive.spec.ts` | `pnpm test:e2e -- mobile-responsive` |
| Header navigation | — | `e2e/header-navigation.spec.ts` | `pnpm test:e2e -- header-navigation` |
