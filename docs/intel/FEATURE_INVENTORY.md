# FEATURE_INVENTORY.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## Onboarding / Pre-Qualification

### Buyer Registration & Onboarding
- **Personas:** Buyer
- **UI:** `/auth/signup`, `/buyer/onboarding`
- **API:** `POST /api/auth/signup`, `GET/POST /api/buyer/profile`
- **Services:** `auth.service.ts`, `buyer.service.ts`, `email-verification.service.ts`
- **Models:** `User`, `BuyerProfile`
- **Statuses:** Email verification (verified/unverified)

### Pre-Qualification
- **Personas:** Buyer
- **UI:** `/buyer/prequal`
- **API:** `GET/POST /api/buyer/prequal`, `POST /api/buyer/prequal/start`, `POST /api/buyer/prequal/draft`, `POST /api/buyer/prequal/refresh`
- **Services:** `prequal.service.ts`
- **Models:** `PreQualification`
- **Statuses/Enums:** `CreditTier` (EXCELLENT/GOOD/FAIR/POOR/DECLINED), `PreQualSource` (INTERNAL/EXTERNAL_MANUAL)
- **Key Logic:** Soft pull simulation, DTI calculation, max OTD ceiling, 30-day expiry, consent capture with timestamp

### External Pre-Approval (Manual Bank Pre-Approval)
- **Personas:** Buyer (submit), Admin (review/approve/reject)
- **UI:** `/buyer/prequal/manual-preapproval` (wizard), `/buyer/prequal/manual-preapproval/status`, `/admin/external-preapprovals` (queue), `/admin/external-preapprovals/[submissionId]` (detail)
- **API:** `GET/POST /api/buyer/prequal/external`, `GET /api/admin/external-preapprovals`, `POST /api/admin/external-preapprovals/[id]/review`, `GET /api/admin/external-preapprovals/[id]/document`
- **Services:** `external-preapproval.service.ts` (uses Prompt 4 canonical Supabase backend)
- **Canonical Backend (Prompt 4):** `external_preapproval_submissions` (table), `external_preapproval_status_history` (table), `external_preapproval_documents` (table), `buyer_qualification_active` (view), `external_preapproval_set_status()` / `external_preapproval_approve()` (functions)
- **Storage:** `buyer-docs` bucket, path: `{userId}/preapproval/{uuid}.{ext}`
- **Legacy Models (backward compat only):** `ExternalPreApprovalSubmission`, `ExternalPreApproval`
- **Statuses/Enums:** `ExternalPreApprovalStatus` (SUBMITTED/IN_REVIEW/APPROVED/REJECTED/EXPIRED/SUPERSEDED)
- **Key Logic:** Buyer uploads bank pre-approval document + metadata → Admin reviews → On approval, calls `external_preapproval_approve()` which creates `PreQualification` with `source=EXTERNAL_MANUAL` granting full gating equivalence with internal prequal. OWASP-aligned file security (allowlist MIME, 10MB limit, random filenames, SHA256, private storage with signed URLs). Idempotent approve/reject. Resend email notifications. Audit events: `MANUAL_PREAPPROVAL_APPROVED`, `PREQUALIFICATION_UPSERTED_FROM_MANUAL`, `EXTERNAL_PREAPPROVAL_REJECTED`.

### Dealer Onboarding
- **Personas:** Dealer
- **UI:** `/dealer-application`, `/dealer/onboarding`, `/dealer/sign-in`
- **API:** `POST /api/dealer/register`, `GET/POST /api/dealer/onboarding`, `GET /api/dealer/application-status`
- **Services:** `dealer.service.ts`, `dealer-approval.service.ts`
- **Models:** `Dealer`, `DealerUser`, `User`
- **Statuses:** Application (pending/approved/rejected), Dealer (verified/unverified, active/inactive)

### Affiliate Onboarding
- **Personas:** Affiliate, Buyer (auto-enroll)
- **UI:** `/affiliate/onboarding`, `/affiliate/portal/onboarding`, `/buyer/affiliate`
- **API:** `POST /api/affiliate/enroll`
- **Services:** `affiliate.service.ts`
- **Models:** `Affiliate`, `User`
- **Key Logic:** Referral code generation, landing slug generation, auto-enroll buyers as affiliates

## Inventory

### Vehicle Search & Discovery
- **Personas:** Buyer (public also available)
- **UI:** `/buyer/search`
- **API:** `GET /api/buyer/inventory/search`, `GET /api/buyer/inventory/filters`, `GET /api/buyer/inventory/[inventoryItemId]`, `GET /api/inventory/search`, `GET /api/inventory/filters`
- **Services:** `inventory.service.ts`
- **Models:** `Vehicle`, `InventoryItem`

### Dealer Inventory Management
- **Personas:** Dealer
- **UI:** `/dealer/inventory`, `/dealer/inventory/add`, `/dealer/inventory/bulk-upload`, `/dealer/inventory/column-mapping`, `/dealer/inventory/import-history`
- **API:** `GET/POST /api/dealer/inventory`, `GET/PUT/DELETE /api/dealer/inventory/[id]`, `PUT /api/dealer/inventory/[id]/status`, `POST /api/dealer/inventory/bulk-upload`, `POST /api/dealer/inventory/import`, `POST /api/dealer/inventory/url-import`, `GET /api/dealer/inventory/import-history`
- **Services:** `inventory.service.ts`, `dealer.service.ts`
- **Models:** `Vehicle`, `InventoryItem`

## Shortlist

### Vehicle Shortlisting
- **Personas:** Buyer
- **UI:** `/buyer/shortlist`
- **API:** `GET/POST/DELETE /api/buyer/shortlist`, `GET /api/buyer/shortlist/eligible`, `PUT /api/buyer/shortlist/items/[id]`, `POST /api/buyer/shortlist/items/[id]/primary`
- **Services:** `shortlist.service.ts`
- **Models:** `Shortlist`, `ShortlistItem`
- **Key Logic:** Max 5 items, primary item selection, eligibility check for auction

## Auctions

### Silent Reverse Auction
- **Personas:** Buyer, Dealer, Admin
- **UI:** `/buyer/auction`, `/buyer/auction/[id]`, `/buyer/auction/[id]/offers`, `/dealer/auctions`, `/dealer/auctions/[id]`, `/dealer/auctions/invited`, `/admin/auctions`, `/admin/auctions/[auctionId]`
- **API:** Buyer: `/api/buyer/auction`, `/api/buyer/auctions`, `/api/buyer/auction/select`, `/api/buyer/auction/decline`, `/api/buyer/auction/validate`. Dealer: `/api/dealer/auctions`, `/api/dealer/auctions/[auctionId]/offers`, `/api/dealer/auction/[id]/offer`. Admin: `/api/admin/auctions/*`. Cron: `/api/auction/close-expired`
- **Services:** `auction.service.ts`, `offer.service.ts`
- **Models:** `Auction`, `AuctionParticipant`, `AuctionOffer`, `AuctionOfferFinancingOption`
- **Statuses/Enums:** `AuctionStatus` (PENDING_DEPOSIT → ACTIVE → CLOSED → COMPLETED → CANCELLED)

## Best-Price

### Best Price Engine
- **Personas:** Buyer, Admin
- **UI:** Part of auction detail views
- **API:** `GET /api/buyer/auctions/[auctionId]/best-price`, `POST /api/buyer/auctions/[auctionId]/best-price/decline`, `GET /api/admin/auctions/[auctionId]/best-price`, `POST /api/admin/auctions/[auctionId]/best-price/recompute`, `GET /api/auction/[id]/best-price`
- **Services:** `best-price.service.ts`
- **Models:** `BestPriceOption`
- **Statuses/Enums:** `BestPriceType` (BEST_CASH, BEST_MONTHLY, BALANCED)
- **Key Logic:** Score-based ranking; three recommendation types always computed

## Deals / Financing

### Deal Selection & Management
- **Personas:** Buyer, Admin
- **UI:** `/buyer/deal`, `/buyer/deal/financing`, `/buyer/deal/summary`, `/admin/deals`, `/admin/deals/[dealId]`
- **API:** `GET/POST /api/buyer/deal`, `POST /api/buyer/deal/select`, `POST /api/buyer/deal/complete`, `GET /api/buyer/deals/[dealId]`, `GET/POST /api/buyer/deals/[dealId]/financing`, `POST /api/buyer/auctions/[auctionId]/deals/select`
- **Services:** `deal.service.ts`
- **Models:** `SelectedDeal`, `FinancingOffer`, `ExternalPreApproval`
- **Statuses/Enums:** `DealStatus` (15 states — see DATA_MODEL_ATLAS.md)
- **Key Logic:** State machine progression; financing offer linking; deal visibility rules (`lib/constants/deal-visibility.ts`)

### Concierge Fee Payment
- **Personas:** Buyer
- **UI:** `/buyer/deal/fee`
- **API:** `GET /api/buyer/deals/[dealId]/concierge-fee`, `POST /api/buyer/deals/[dealId]/concierge-fee/pay-card`, `POST /api/buyer/deals/[dealId]/concierge-fee/include-in-loan`, `GET /api/payments/fee/options/[dealId]`, `GET /api/payments/fee/loan-impact/[dealId]`, `POST /api/payments/fee/pay-card`, `POST /api/payments/fee/loan-agree`
- **Services:** `payment.service.ts`
- **Models:** `ServiceFeePayment`, `FeeFinancingDisclosure`, `LenderFeeDisbursement`
- **Key Logic:** Flat fee ($499 Premium); deposit credit; card or loan inclusion with TILA-style disclosure

## Insurance

### Insurance Flow
- **Personas:** Buyer, Dealer, Admin
- **UI:** `/buyer/deal/insurance/*` (7 sub-pages), `/buyer/insurance`, `/dealer/deals/[dealId]/insurance`, `/admin/deals/[dealId]/insurance`, `/admin/insurance`
- **API:** Buyer: `/api/buyer/deals/[dealId]/insurance/*` (8 endpoints). Dealer: `/api/dealer/deals/[dealId]/insurance/*`. Admin: `/api/admin/deals/[dealId]/insurance/*`, `/api/admin/insurance`. Public: `/api/insurance/*`
- **Services:** `insurance.service.ts`
- **Models:** `InsuranceQuote`, `InsurancePolicy`, `InsuranceDocRequest`, `InsuranceEvent`
- **Statuses/Enums:** `InsuranceStatus` (QUOTE_REQUESTED → QUOTE_RECEIVED → POLICY_SELECTED → POLICY_BOUND / EXTERNAL_UPLOADED)
- **Key Logic:** Multi-carrier quoting; quote selection; policy binding; external proof upload; doc request flow

## Contract Shield

### Automated Contract Review
- **Personas:** Buyer, Dealer, Admin
- **UI:** `/buyer/contract-shield`, `/buyer/deal/contract`, `/buyer/contracts`, `/dealer/contracts`, `/admin/contracts`, `/admin/contract-shield/rules`, `/admin/contract-shield/overrides`
- **API:** `/api/contract/*`, `/api/buyer/contract-shield`, `/api/buyer/contracts/*`, `/api/admin/contracts/*`, `/api/admin/contract-shield/*`, `/api/cron/contract-shield-reconciliation`
- **Services:** `contract-shield.service.ts`
- **Models:** `ContractDocument`, `ContractShieldScan`, `FixListItem`, `ContractShieldOverride`, `ContractShieldRule`, `ContractShieldNotification`, `ContractShieldReconciliation`
- **See:** CONTRACT_SHIELD_SPEC.md for full functional spec

## E-Sign

### E-Signature
- **Personas:** Buyer, Dealer, Admin
- **UI:** `/buyer/deal/esign`, `/buyer/esign`, `/buyer/sign/[dealId]`
- **API:** `/api/esign/create`, `/api/esign/webhook`, `/api/esign/provider-webhook`, `/api/esign/status/[envelopeId]`, `/api/buyer/deals/[dealId]/esign`, `/api/dealer/deals/[dealId]/esign/create-envelope`, `/api/admin/deals/[dealId]/esign/*`
- **Services:** `esign.service.ts`
- **Models:** `ESignEnvelope`
- **Statuses/Enums:** `ESignStatus` (CREATED → SENT → VIEWED → SIGNED → COMPLETED → DECLINED → EXPIRED)

## Pickup

### Pickup Scheduling & Check-in
- **Personas:** Buyer, Dealer, Admin
- **UI:** `/buyer/deal/pickup`, `/buyer/pickup/[dealId]`, `/buyer/delivery`, `/dealer/pickups`, `/admin/pickups` (via payments/deals routes)
- **API:** Buyer: `/api/buyer/deals/[dealId]/pickup/*`. Dealer: `/api/dealer/pickups/*`. Admin: `/api/admin/pickups`. Public: `/api/pickup/*`
- **Services:** `pickup.service.ts`
- **Models:** `PickupAppointment`
- **Statuses/Enums:** `PickupStatus` (SCHEDULED → CONFIRMED → BUYER_ARRIVED → COMPLETED → CANCELLED)
- **Key Logic:** QR code generation; QR-based check-in; dealer confirmation

## Payments / Refunds

### Deposit Payment
- **Personas:** Buyer
- **UI:** `/buyer/deposit`
- **API:** `POST /api/buyer/deposit`, `POST /api/payments/deposit`, `POST /api/payments/confirm`
- **Services:** `payment.service.ts`
- **Models:** `DepositPayment`
- **Key Logic:** $99 refundable deposit; Stripe checkout; idempotent creation

### Refunds
- **Personas:** Admin
- **UI:** `/admin/refunds`, `/admin/payments/refunds`, `/admin/deals/[dealId]/refunds`
- **API:** `/api/admin/payments/refund`, `/api/admin/payments/refunds/*`, `/api/admin/deals/[dealId]/refunds`, `/api/admin/refund/deposit`
- **Services:** `payment.service.ts`, `affiliate.service.ts` (commission reversal)
- **Models:** `Refund`, `DepositPayment`, `ServiceFeePayment`

### Financial Reporting
- **Personas:** Admin
- **UI:** `/admin/financial-reporting`, `/admin/reports/finance`, `/admin/reports/funnel`, `/admin/reports/operations`
- **API:** `/api/admin/financial/*`, `/api/admin/reports/*`
- **Services:** `admin.service.ts`
- **Models:** `Transaction`, `Chargeback`, `FinancialAuditLog`

## Affiliate / Commissions

### Affiliate Program
- **Personas:** Affiliate, Buyer (auto-enroll)
- **UI:** `/affiliate/*` (17 pages), `/affiliate/portal/*` (14 pages)
- **API:** `/api/affiliate/*` (14 endpoints), `/api/admin/affiliates/*` (12 endpoints)
- **Services:** `affiliate.service.ts`
- **Models:** `Affiliate`, `Referral`, `Click`, `Commission`, `Payout`, `AffiliatePayment`, `AffiliateShareEvent`, `AffiliateDocument`
- **Key Logic:** 3-level multi-tier commissions; 30-day cookie attribution; no self-referrals; atomic commission reversal on refunds; share link via email

## Refinance

### Auto Refinance (OpenRoad Partnership)
- **Personas:** Public, Admin
- **UI:** `/refinance`, `/admin/refinance/*` (7 sub-pages)
- **API:** `POST /api/refinance/check-eligibility`, `POST /api/refinance/record-redirect`, `/api/admin/refinance/*`
- **Services:** Admin service (refinance management)
- **Models:** `RefinanceLead`, `FundedLoan`
- **Statuses/Enums:** `RefinanceQualificationStatus` (PENDING/QUALIFIED/DISQUALIFIED), `VehicleCondition`, `MarketingRestriction`
- **Key Logic:** Eligibility check; partner redirect tracking; funded loan tracking; TCPA consent; compliance constraints

## Admin Operations

### User Management
- **Personas:** Admin
- **UI:** `/admin/users`, `/admin/users/[userId]`, `/admin/users/new`, `/admin/buyers/*`, `/admin/dealers/*`
- **API:** `/api/admin/users/*`, `/api/admin/buyers/*`, `/api/admin/dealers/*`
- **Services:** `admin.service.ts`, `dealer-approval.service.ts`
- **Models:** `User`, `AdminUser`, `BuyerProfile`, `Dealer`

### Admin Dashboard & Search
- **Personas:** Admin
- **UI:** `/admin/dashboard`
- **API:** `GET /api/admin/dashboard`, `GET /api/admin/search`
- **Services:** `admin.service.ts`

### Compliance & Audit
- **Personas:** Admin
- **UI:** `/admin/compliance`, `/admin/audit-logs`
- **API:** `GET /api/admin/compliance`
- **Models:** `ComplianceEvent`, `AdminAuditLog`, `FinancialAuditLog`

### Settings
- **Personas:** Admin
- **UI:** `/admin/settings`, `/admin/settings/branding`, `/admin/settings/integrations`, `/admin/settings/roles`
- **API:** `GET/PUT /api/admin/settings`
- **Models:** `AdminSetting`

## Notifications

### Admin Notifications
- **Personas:** Admin
- **UI:** `/admin/notifications`
- **API:** `GET/POST /api/admin/notifications`, `PUT /api/admin/notifications/[id]/read`, `PUT /api/admin/notifications/[id]/archive`, `PUT /api/admin/notifications/mark-all-read`, `GET /api/admin/notifications/unread-count`, `GET /api/admin/notifications/stream` (SSE)
- **Services:** `notification.service.ts`
- **Models:** `AdminNotification`
- **Key Logic:** Priority system (P0/P1/P2); category-based filtering; SSE real-time stream; dedup via `dedupeKey`

### Email Notifications
- **Services:** `email.service.tsx`
- **Models:** `EmailLog`
- **Provider:** Resend only
- **Key Logic:** Template-based rendering; DEV_EMAIL_TO override in non-prod; delivery tracking

## SEO

### SEO Management
- **Personas:** Admin
- **UI:** `/admin/seo`, `/admin/seo/health`, `/admin/seo/keywords`, `/admin/seo/pages`, `/admin/seo/schema`
- **API:** `/api/seo/*` (8 endpoints)
- **Services:** `seo.service.ts`, `lib/seo/*`
- **Models:** `AiSeoDraft`
- **Key Logic:** Page-level SEO health scoring; keyword tracking; JSON-LD schema markup; sitemap generation (`app/sitemap.xml/route.ts`); robots.txt (`app/robots.txt/route.ts`)

## AI

### AI Concierge Chat
- **Personas:** All (role-aware routing)
- **UI:** Chat widget component; `/admin/ai`
- **API:** `POST /api/ai/chat`
- **Services:** `lib/ai/orchestrator.ts`, `lib/ai/router.ts`, 7 agents
- **Models:** `AiConversation`, `AiMessage`, `AiToolCall`, `AiAdminAction`, `AiLead`, `AiSeoDraft`, `AiContractExtraction`
- **Key Logic:** Multi-agent architecture; intent classification; role-aware agent routing; tool calling; knowledge RAG; PII detection; risk assessment; admin takeover capability

## Documents

### Document Management
- **Personas:** Buyer, Dealer, Affiliate, Admin
- **UI:** `/buyer/documents`, `/dealer/documents`, `/affiliate/portal/documents`, `/admin/documents/*`
- **API:** `/api/documents/*`, `/api/document-requests/*`, `/api/buyer/deals/[dealId]/insurance/doc-requests`, `/api/dealer/documents/*`, `/api/affiliate/documents`
- **Services:** Various (deal, insurance, affiliate)
- **Models:** `DealDocument`, `DocumentRequest`, `AffiliateDocument`
- **Statuses/Enums:** `DocumentStatus` (UPLOADED/PENDING_REVIEW/APPROVED/REJECTED), `DocumentRequestStatus` (REQUESTED/UPLOADED/APPROVED/REJECTED)

## Trade-In

### Trade-In Vehicle
- **Personas:** Buyer
- **UI:** `/buyer/trade-in`
- **API:** `GET/POST /api/buyer/trade-in`, `/api/admin/trade-ins`
- **Models:** `TradeIn`
- **Key Logic:** Vehicle details, condition assessment, loan payoff info, KBB valuation, photo uploads

## Reporting

### Admin Reports
- **Personas:** Admin
- **UI:** `/admin/reports`, `/admin/reports/finance`, `/admin/reports/funnel`, `/admin/reports/operations`
- **API:** `/api/admin/reports/finance`, `/api/admin/reports/funnel`, `/api/admin/reports/operations`
- **Services:** `admin.service.ts`
