# Admin Dashboard Inventory

## Routes

| Route | File Path | Purpose | Dependencies | Status |
|-------|-----------|---------|--------------|--------|
| /admin/dashboard | app/admin/dashboard/page.tsx | Overview with KPIs, recent activity | /api/admin/dashboard | Working |
| /admin/users | app/admin/users/page.tsx | User management, search, filter | /api/admin/users/list | Working |
| /admin/users/[userId] | app/admin/users/[userId]/page.tsx | User detail / profile view | /api/admin/users/[userId] | Working |
| /admin/users/new | app/admin/users/new/page.tsx | Create new user | /api/admin/users | Working |
| /admin/buyers | app/admin/buyers/page.tsx | Buyer listing with search/filter | /api/admin/buyers | Working |
| /admin/buyers/[buyerId] | app/admin/buyers/[buyerId]/page.tsx | Buyer detail / case view | /api/admin/buyers/[buyerId] | Working |
| /admin/buyers/create | app/admin/buyers/create/page.tsx | Create buyer profile | /api/admin/buyers | Working |
| /admin/dealers | app/admin/dealers/page.tsx | Dealer listing / management | /api/admin/dealers | Working |
| /admin/dealers/[dealerId] | app/admin/dealers/[dealerId]/page.tsx | Dealer detail / approval | /api/admin/dealers/[dealerId] | Working |
| /admin/dealers/applications | app/admin/dealers/applications/page.tsx | Dealer application queue | /api/admin/dealers/applications | Working |
| /admin/affiliates | app/admin/affiliates/page.tsx | Affiliate management, payouts | /api/admin/affiliates, /api/admin/affiliates/payouts | Working |
| /admin/affiliates/[affiliateId] | app/admin/affiliates/[affiliateId]/page.tsx | Affiliate detail view | /api/admin/affiliates/[affiliateId] | Working |
| /admin/affiliates/create | app/admin/affiliates/create/page.tsx | Create new affiliate | /api/admin/affiliates | Working |
| /admin/affiliates/payouts | app/admin/affiliates/payouts/page.tsx | All payout history | /api/admin/affiliates/payouts | Working |
| /admin/auctions | app/admin/auctions/page.tsx | Auction monitoring with auto-refresh | /api/admin/auctions | Working |
| /admin/auctions/[auctionId] | app/admin/auctions/[auctionId]/page.tsx | Auction detail / offers | /api/admin/auctions/[auctionId] | Working |
| /admin/offers | app/admin/offers/page.tsx | All offers across auctions | /api/admin/auctions (offers data) | Working |
| /admin/deals | app/admin/deals/page.tsx | Deal management | /api/admin/deals | Working |
| /admin/deals/[dealId] | app/admin/deals/[dealId]/page.tsx | Deal detail | /api/admin/deals/[dealId] | Working |
| /admin/deals/[dealId]/insurance | app/admin/deals/[dealId]/insurance/page.tsx | Deal insurance management | /api/admin/deals/[dealId]/insurance | Working |
| /admin/deals/[dealId]/refunds | app/admin/deals/[dealId]/refunds/page.tsx | Deal refund processing | /api/admin/deals/[dealId]/refunds | Working |
| /admin/deals/[dealId]/billing | app/admin/deals/[dealId]/billing/page.tsx | Deal billing detail | /api/admin/deals/[dealId]/billing | Working |
| /admin/payments | app/admin/payments/page.tsx | Payment overview | /api/admin/payments | Working |
| /admin/payments/send-link | app/admin/payments/send-link/page.tsx | Send payment links | /api/admin/payments/send-link | Working |
| /admin/payments/concierge-fees | app/admin/payments/concierge-fees/page.tsx | Concierge fee management | /api/admin/payments/concierge-fees | Working |
| /admin/payments/deposits | app/admin/payments/deposits/page.tsx | Deposit tracking | /api/admin/payments/deposits | Working |
| /admin/payments/refunds | app/admin/payments/refunds/page.tsx | Refund management | /api/admin/payments/refunds | Working |
| /admin/payments/affiliate-payments | app/admin/payments/affiliate-payments/page.tsx | Affiliate payment processing | /api/admin/affiliates/payments | Working |
| /admin/payouts | app/admin/payouts/page.tsx | Payout queue / processing | /api/admin/payouts | Working |
| /admin/payouts/[payoutId] | app/admin/payouts/[payoutId]/page.tsx | Payout detail | /api/admin/payouts | Working |
| /admin/payouts/payments | app/admin/payouts/payments/page.tsx | Completed payments list | /api/admin/affiliates/payments | Working |
| /admin/payouts/new | app/admin/payouts/new/page.tsx | Create new payout | /api/admin/payouts | Working |
| /admin/documents | app/admin/documents/page.tsx | Document management | /api/admin/documents | Working |
| /admin/documents/[documentId] | app/admin/documents/[documentId]/page.tsx | Document review | /api/admin/documents/[documentId] | Working |
| /admin/documents/affiliates | app/admin/documents/affiliates/page.tsx | Affiliate documents | /api/admin/affiliate-documents | Working |
| /admin/documents/dealers | app/admin/documents/dealers/page.tsx | Dealer documents | /api/admin/documents | Working |
| /admin/documents/buyers | app/admin/documents/buyers/page.tsx | Buyer documents | /api/admin/documents | Working |
| /admin/insurance | app/admin/insurance/page.tsx | Insurance policy overview | /api/admin/insurance | Working |
| /admin/contracts | app/admin/contracts/page.tsx | Contract listing | /api/admin/contracts | Working |
| /admin/contracts/[id] | app/admin/contracts/[id]/page.tsx | Contract detail | /api/admin/contracts/[id] | Working |
| /admin/contract-shield/rules | app/admin/contract-shield/rules/page.tsx | Shield rule config | /api/admin/contract-shield/rules | Working |
| /admin/contract-shield/overrides | app/admin/contract-shield/overrides/page.tsx | Shield overrides | /api/admin/contract-shield/overrides | Working |
| /admin/compliance | app/admin/compliance/page.tsx | Compliance events view | /api/admin/compliance | Working |
| /admin/reports | app/admin/reports/page.tsx | Reports hub | None (static links) | Working |
| /admin/reports/finance | app/admin/reports/finance/page.tsx | Financial reports | /api/admin/reports/finance | Working |
| /admin/reports/funnel | app/admin/reports/funnel/page.tsx | Funnel analytics | /api/admin/reports/funnel | Working |
| /admin/reports/operations | app/admin/reports/operations/page.tsx | Operations reports | /api/admin/reports/operations | Working |
| /admin/financial-reporting | app/admin/financial-reporting/page.tsx | Financial dashboard | /api/admin/financial | Working |
| /admin/refinance | app/admin/refinance/page.tsx | Refinance overview | /api/admin/refinance/stats | Working |
| /admin/refinance/leads | app/admin/refinance/leads/page.tsx | Refinance leads | /api/admin/refinance/leads | Working |
| /admin/refinance/qualified | app/admin/refinance/qualified/page.tsx | Qualified leads | /api/admin/refinance/leads | Working |
| /admin/refinance/redirected | app/admin/refinance/redirected/page.tsx | Redirected leads | /api/admin/refinance/leads | Working |
| /admin/refinance/revenue | app/admin/refinance/revenue/page.tsx | Revenue tracking | /api/admin/refinance/stats | Working |
| /admin/refinance/analytics | app/admin/refinance/analytics/page.tsx | Analytics view | /api/admin/refinance/stats | Working |
| /admin/refinance/funded | app/admin/refinance/funded/page.tsx | Funded loans | /api/admin/refinance/funded-loans | Working |
| /admin/notifications | app/admin/notifications/page.tsx | Notification center | /api/admin/notifications | Working |
| /admin/settings | app/admin/settings/page.tsx | System settings | /api/admin/settings | Working |
| /admin/settings/roles | app/admin/settings/roles/page.tsx | Role management | /api/admin/settings | Working |
| /admin/settings/integrations | app/admin/settings/integrations/page.tsx | Integration config | /api/admin/settings | Working |
| /admin/settings/branding | app/admin/settings/branding/page.tsx | Branding settings | /api/admin/settings | Working |
| /admin/audit-logs | app/admin/audit-logs/page.tsx | Audit log viewer | /api/admin/audit-logs | Working |
| /admin/trade-ins | app/admin/trade-ins/page.tsx | Trade-in management | /api/admin/trade-ins | Working |
| /admin/sourcing | app/admin/sourcing/page.tsx | Vehicle sourcing queue | /api/admin/sourcing/cases | Working |
| /admin/sourcing/[caseId] | app/admin/sourcing/[caseId]/page.tsx | Case detail | /api/admin/sourcing/cases/[caseId] | Working |
| /admin/preapprovals | app/admin/preapprovals/page.tsx | Pre-approval review | /api/admin/preapprovals | Working |
| /admin/external-preapprovals | app/admin/external-preapprovals/page.tsx | External pre-approval submissions | /api/admin/external-preapprovals | Working |
| /admin/external-preapprovals/[submissionId] | app/admin/external-preapprovals/[submissionId]/page.tsx | Submission detail | /api/admin/external-preapprovals/[id] | Working |
| /admin/seo | app/admin/seo/page.tsx | SEO overview | None | Working |
| /admin/seo/pages | app/admin/seo/pages/page.tsx | Page SEO management | None | Working |
| /admin/seo/schema | app/admin/seo/schema/page.tsx | Schema markup | None | Working |
| /admin/seo/health | app/admin/seo/health/page.tsx | SEO health check | None | Working |
| /admin/seo/keywords | app/admin/seo/keywords/page.tsx | Keyword management | None | Working |
| /admin/ai | app/admin/ai/page.tsx | AI management | /api/ai/* | Working |
| /admin/qa | app/admin/qa/page.tsx | QA / health checks | /api/admin/health | Working |
| /admin/support | app/admin/support/page.tsx | Support tools | Various APIs | Working |
| /admin/refunds | app/admin/refunds/page.tsx | Refund processing | /api/admin/refund | Working |
| /admin/requests | app/admin/requests/page.tsx | Vehicle request management | /api/admin/requests | Working |
| /admin/requests/[requestId] | app/admin/requests/[requestId]/page.tsx | Request detail | /api/admin/requests/[requestId] | Working |
| /admin/mfa/challenge | app/admin/mfa/challenge/page.tsx | MFA challenge | /api/admin/auth/mfa/verify | Working |
| /admin/mfa/enroll | app/admin/mfa/enroll/page.tsx | MFA enrollment | /api/admin/auth/mfa/enroll | Working |
| /admin/sign-in | app/admin/sign-in/page.tsx | Admin login | /api/admin/auth/signin | Working |
| /admin/signup | app/admin/signup/page.tsx | Admin bootstrap signup | /api/admin/auth/signup | Working |

## Components

| Component | File Path | Used By |
|-----------|-----------|---------|
| AdminLayoutClient | app/admin/layout-client.tsx | Admin layout (sidebar, header, search) |
| AdminListPageShell | components/admin/admin-list-page-shell.tsx | Buyers, dealers, affiliates listings |
| NotificationBell | components/admin/notification-bell.tsx | Admin header |
| PaymentAnalyticsCharts | components/admin/payment-analytics-charts.tsx | Payments pages |
| PageHeader | components/dashboard/page-header.tsx | Most admin pages |
| ErrorState | components/dashboard/error-state.tsx | Error display |
| ProtectedRoute | components/layout/protected-route.tsx | Documents page |
| AdminAIPanel | components/ai/admin-ai-panel.tsx | AI management |
| ChatWidget | components/ai/chat-widget.tsx | Admin layout |
| SessionStatusBanner | components/auth/session-status-banner.tsx | Admin layout |
| AuthDebugDrawer | components/auth/auth-debug-drawer.tsx | Admin layout |

## API Routes

120+ API endpoints under /api/admin/ covering:
- Authentication (signin, signup, signout, MFA)
- User management (CRUD, role changes)
- Dealer management (CRUD, approve, suspend, applications)
- Buyer management (CRUD, status, prequal)
- Auction management (CRUD, offers, best-price)
- Deal management (CRUD, status, insurance, refunds, billing, esign)
- Payment processing (send-link, mark-received, refund, deposits, concierge-fees)
- Affiliate management (CRUD, status, payouts, payments, reconciliation)
- Document management (CRUD, affiliate-documents)
- Contract Shield (rules, overrides, reconciliation)
- Notifications (CRUD, stream, mark-read)
- Reports (finance, funnel, operations)
- Sourcing (cases, status, assign, offers, outreach)
- Refinance (leads, stats, compliance, funded-loans)
- System (settings, search, health, break-glass, compliance, audit-logs)

## Database Models Used

74 Prisma models including: User, BuyerProfile, Dealer, AdminUser, Affiliate, Auction, AuctionOffer, SelectedDeal, ContractDocument, Commission, Payout, AffiliatePayment, DepositPayment, ServiceFeePayment, Refund, AdminAuditLog, AdminNotification, AdminSetting, and more.
