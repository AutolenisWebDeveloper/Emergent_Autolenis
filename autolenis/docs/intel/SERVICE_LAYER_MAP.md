# SERVICE_LAYER_MAP.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## Service Inventory

All services live under `lib/services/`. Additional domain libraries are under `lib/`.

### lib/services/auth.service.ts (437 LOC)
**Responsibilities:** User registration, email/password authentication, password hashing, email verification token generation, role assignment.
**Exported Methods:** Registration, sign-in, password change, email verification flows.
**Models Read/Written:** `User`
**Called By:** `/api/auth/signup`, `/api/auth/signin`, `/api/auth/verify-email`, `/api/auth/change-password`
**External Dependencies:** `bcryptjs` for password hashing
**Invariants:** Email uniqueness enforced at DB level; passwords hashed before storage.

### lib/services/prequal.service.ts (544 LOC)
**Responsibilities:** Pre-qualification submission, credit tier calculation, affordability estimation, soft pull simulation, consent capture, expiry management.
**Models Read/Written:** `PreQualification`, `BuyerProfile`
**Called By:** `/api/buyer/prequal`, `/api/buyer/prequal/start`, `/api/buyer/prequal/draft`, `/api/buyer/prequal/refresh`, `/api/admin/buyers/[buyerId]/prequal`
**Invariants:** Consent must be given before processing; prequal expires after `PREQUAL_EXPIRY_DAYS` (30 days); credit tiers mapped from score ranges in `lib/constants.ts`.

### lib/services/buyer.service.ts (372 LOC)
**Responsibilities:** Buyer profile CRUD, onboarding, preferences management.
**Models Read/Written:** `BuyerProfile`, `BuyerPreferences`, `User`
**Called By:** `/api/buyer/profile`, `/api/buyer/dashboard`, buyer onboarding routes
**Invariants:** One `BuyerProfile` per `User` (unique constraint on `userId`).

### lib/services/inventory.service.ts (567 LOC)
**Responsibilities:** Vehicle inventory search with filters (make, model, year, mileage, price, body style), pagination, dealer inventory management, bulk import.
**Models Read/Written:** `Vehicle`, `InventoryItem`
**Called By:** `/api/buyer/inventory/search`, `/api/buyer/inventory/filters`, `/api/inventory/search`, `/api/dealer/inventory`, `/api/admin/inventory`
**Invariants:** Search scoped by workspace; dealer can only manage own inventory.

### lib/services/shortlist.service.ts (495 LOC)
**Responsibilities:** Shortlist CRUD, add/remove items, set primary item, eligibility check for auction.
**Models Read/Written:** `Shortlist`, `ShortlistItem`, `InventoryItem`
**Called By:** `/api/buyer/shortlist`, `/api/buyer/shortlist/items/[id]`, `/api/buyer/shortlist/eligible`, `/api/admin/shortlists`
**Invariants:** Max 5 items per shortlist (`MAX_SHORTLIST_ITEMS`); unique constraint on `[shortlistId, inventoryItemId]`.

### lib/services/auction.service.ts (525 LOC)
**Responsibilities:** Auction creation from shortlist, dealer invitation, status transitions (PENDING_DEPOSIT → ACTIVE → CLOSED → COMPLETED), expiry management.
**Models Read/Written:** `Auction`, `AuctionParticipant`, `AuctionOffer`, `AuctionOfferFinancingOption`
**Called By:** `/api/buyer/auction`, `/api/dealer/auctions`, `/api/admin/auctions`, `/api/auction/close-expired`
**Invariants:** Auction duration is `AUCTION_DURATION_HOURS` (48h); deposit required before activation; auction must be ACTIVE for offers.

### lib/services/offer.service.ts (846 LOC)
**Responsibilities:** Offer submission by dealers, offer validation, offer retrieval, offer ranking.
**Models Read/Written:** `AuctionOffer`, `AuctionOfferFinancingOption`, `InventoryItem`
**Called By:** `/api/dealer/auctions/[auctionId]/offers`, `/api/dealer/auction/[id]/offer`, `/api/admin/auctions/[auctionId]/offers`
**Invariants:** Dealer must be a participant in auction; one offer per dealer per auction per inventory item.

### lib/services/best-price.service.ts (903 LOC)
**Responsibilities:** Best-price computation (BEST_CASH, BEST_MONTHLY, BALANCED), score calculation, recommendation ranking, recompute triggers.
**Models Read/Written:** `BestPriceOption`, `AuctionOffer`, `AuctionOfferFinancingOption`
**Called By:** `/api/buyer/auctions/[auctionId]/best-price`, `/api/admin/auctions/[auctionId]/best-price`, `/api/auction/[id]/best-price`
**Invariants:** Scores normalized; three types always computed; only closed/completed auctions get best-price options.

### lib/services/deal.service.ts (1,086 LOC)
**Responsibilities:** Deal selection from best-price options, status machine transitions (15 states), financing integration, insurance status tracking, completion flow.
**Models Read/Written:** `SelectedDeal`, `FinancingOffer`, `Auction`, `AuctionOffer`
**Called By:** `/api/buyer/deal`, `/api/buyer/deals/[dealId]`, `/api/admin/deals`, buyer deal sub-routes
**Invariants:** Status transitions must follow defined order; deal linked to auction offer; one active deal per buyer recommended.
**State Machine:** SELECTED → FINANCING_PENDING → FINANCING_APPROVED → FEE_PENDING → FEE_PAID → INSURANCE_PENDING → INSURANCE_COMPLETE → CONTRACT_PENDING → CONTRACT_REVIEW → CONTRACT_APPROVED → SIGNING_PENDING → SIGNED → PICKUP_SCHEDULED → COMPLETED (or CANCELLED at any point).

### lib/services/insurance.service.ts (776 LOC)
**Responsibilities:** Quote request, quote storage, quote selection, policy binding, external proof upload, insurance document requests, insurance event logging.
**Models Read/Written:** `InsuranceQuote`, `InsurancePolicy`, `InsuranceDocRequest`, `InsuranceEvent`, `SelectedDeal`
**Called By:** `/api/buyer/deals/[dealId]/insurance/*`, `/api/dealer/deals/[dealId]/insurance/*`, `/api/admin/deals/[dealId]/insurance/*`, `/api/insurance/*`
**Invariants:** Status flow: QUOTE_REQUESTED → QUOTE_RECEIVED → POLICY_SELECTED → POLICY_BOUND (or EXTERNAL_UPLOADED); deal status updated to INSURANCE_COMPLETE.

### lib/services/contract-shield.service.ts (1,199 LOC)
**Responsibilities:** Document upload, automated contract scanning, issue detection (APR match, payment match, OTD match, junk fees, missing addendums), fix list generation, scoring (PASS ≥85, WARNING ≥70, FAIL <70), override workflow, reconciliation, notifications.
**Models Read/Written:** `ContractDocument`, `ContractShieldScan`, `FixListItem`, `ContractShieldOverride`, `ContractShieldRule`, `ContractShieldNotification`, `ContractShieldReconciliation`
**Called By:** `/api/contract/*`, `/api/buyer/contract-shield`, `/api/buyer/contracts/*`, `/api/admin/contracts/*`, `/api/admin/contract-shield/*`, `/api/cron/contract-shield-reconciliation`
**Invariants:** Scan score determines PASS/FAIL; overrides require admin action + buyer acknowledgment; reconciliation cron syncs stale scans.

### lib/services/esign.service.ts (457 LOC)
**Responsibilities:** E-signature envelope creation, status tracking, webhook handling, completion flow.
**Models Read/Written:** `ESignEnvelope`, `SelectedDeal`
**Called By:** `/api/esign/*`, `/api/buyer/deals/[dealId]/esign`, `/api/dealer/deals/[dealId]/esign/create-envelope`, `/api/admin/deals/[dealId]/esign`
**Invariants:** One envelope per deal; status flow: CREATED → SENT → VIEWED → SIGNED → COMPLETED.
**Note:** Contains `TODO`/placeholder references — e-sign provider integration may not be fully wired.

### lib/services/pickup.service.ts (549 LOC)
**Responsibilities:** Pickup scheduling, QR code generation, buyer check-in, dealer confirmation, completion.
**Models Read/Written:** `PickupAppointment`, `SelectedDeal`
**Called By:** `/api/pickup/*`, `/api/buyer/deals/[dealId]/pickup/*`, `/api/dealer/pickups/*`, `/api/admin/pickups`
**Invariants:** One pickup per deal; QR code is unique; status flow: SCHEDULED → CONFIRMED → BUYER_ARRIVED → COMPLETED.

### lib/services/payment.service.ts (983 LOC)
**Responsibilities:** Deposit creation (Stripe PaymentIntent), deposit confirmation, concierge fee calculation (flat: $499 Premium), fee payment options (card or loan inclusion), fee financing disclosure, refund processing, payment retrieval.
**Models Read/Written:** `DepositPayment`, `ServiceFeePayment`, `FeeFinancingDisclosure`, `LenderFeeDisbursement`, `SelectedDeal`, `ComplianceEvent`
**Called By:** `/api/buyer/deposit`, `/api/payments/*`, `/api/buyer/deals/[dealId]/concierge-fee/*`, `/api/admin/payments/*`, Stripe webhook handler
**External Dependencies:** Stripe SDK (`lib/stripe.ts`)
**Idempotency:** `stripePaymentIntentId` has unique constraint; duplicate deposit check before creation.
**Fee:** Flat $499 Premium concierge fee. $99 Serious Buyer Deposit credited toward fee ($400 remaining).

### lib/services/affiliate.service.ts (923 LOC)
**Responsibilities:** Affiliate creation, referral code generation, click tracking, referral attribution (30-day cookie window), multi-level commission calculation (3 levels: 15%/3%/2%), commission processing, commission reversal, payout management, share link emails, reconciliation.
**Models Read/Written:** `Affiliate`, `Referral`, `Click`, `Commission`, `Payout`, `AffiliatePayment`, `AffiliateShareEvent`, `AffiliateDocument`
**Called By:** `/api/affiliate/*`, `/api/admin/affiliates/*`, `/api/cron/affiliate-reconciliation`, Stripe webhook (commission trigger on fee payment)
**Invariants:** No self-referrals; max depth 3 levels; commissions accrue only on successful revenue events; refunds reverse commissions atomically.

### lib/services/dealer.service.ts (751 LOC)
**Responsibilities:** Dealer profile management, onboarding, inventory management, offer management, deal management from dealer perspective.
**Models Read/Written:** `Dealer`, `DealerUser`, `InventoryItem`
**Called By:** `/api/dealer/*`
**Invariants:** License number is unique; dealer must be verified for full access.

### lib/services/dealer-approval.service.ts (168 LOC)
**Responsibilities:** Dealer application review, approval/rejection flow.
**Models Read/Written:** `Dealer`, `User`
**Called By:** `/api/admin/dealers/[dealerId]/approve`, `/api/admin/dealers/[dealerId]/suspend`, `/api/admin/dealers/applications/[id]/approve`, `/api/admin/dealers/applications/[id]/reject`

### lib/services/admin.service.ts (1,094 LOC)
**Responsibilities:** Dashboard aggregation, buyer/dealer/affiliate management, deal oversight, payment management, notification management, settings, search, compliance data retrieval.
**Models Read/Written:** Nearly all models (read); `AdminUser`, `AdminSetting`, `AdminNotification`, `AdminAuditLog` (write)
**Called By:** `/api/admin/*` (90+ endpoints)

### lib/services/email.service.tsx (875 LOC)
**Responsibilities:** Email sending via Resend, template rendering (React Email), delivery tracking, error handling.
**Models Read/Written:** `EmailLog`
**Called By:** Various services (contract-shield notifications, verification emails, affiliate share links, payment confirmations)
**External Dependencies:** Resend API (`lib/resend.ts`)
**Invariants:** ALL emails sent LIVE through Resend; `DEV_EMAIL_TO` overrides recipients in non-production.

### lib/services/email-verification.service.ts (142 LOC)
**Responsibilities:** Email verification token generation, token validation, email verification status update.
**Models Read/Written:** `User`
**Called By:** `/api/auth/verify-email`, `/api/auth/resend-verification`

### lib/services/password-reset.service.ts (132 LOC)
**Responsibilities:** Password reset token generation, token validation, password update.
**Models Read/Written:** `User`
**Called By:** `/api/auth/forgot-password`, `/api/auth/reset-password`

### lib/services/seo.service.ts (522 LOC)
**Responsibilities:** SEO page management, meta tag management, keyword tracking, schema markup, health scoring, audit.
**Models Read/Written:** `AiSeoDraft`
**Called By:** `/api/seo/*`, `/api/admin/seo/*`

### lib/services/index.ts (42 LOC)
**Responsibilities:** Service re-exports for convenient importing.

## Other Domain Libraries

### lib/ai/ (AI Orchestration)
| File | LOC Est. | Purpose |
|------|----------|---------|
| `orchestrator.ts` | ~200 | Multi-agent orchestration; routes queries to appropriate agent |
| `router.ts` | ~150 | Intent classification and agent routing |
| `gemini-client.ts` | ~200 | Google Gemini API client wrapper |
| `security.ts` | ~100 | Input sanitization, PII detection, risk assessment |
| `persistence.ts` | ~100 | Conversation persistence to DB |
| `context-builder.ts` | ~150 | Builds context from user session + knowledge base |
| `agents/sales.agent.ts` | ~150 | Public-facing sales chat |
| `agents/buyer-concierge.agent.ts` | ~150 | Buyer-specific assistance |
| `agents/dealer-liaison.agent.ts` | ~150 | Dealer support |
| `agents/affiliate-growth.agent.ts` | ~150 | Affiliate support |
| `agents/admin-ops.agent.ts` | ~150 | Admin operations |
| `agents/contract.agent.ts` | ~150 | Contract review assistance |
| `agents/seo.agent.ts` | ~100 | SEO content generation |
| `tools/*.tools.ts` | ~500 | Tool definitions for each agent |
| `knowledge/` | ~300 | RAG knowledge base (corpus, retrieval, types) |
| `memory/session-store.ts` | ~100 | Session-scoped memory |
| `prompts/system-prompt.ts` | ~100 | System prompt template |
| `providers/gemini.ts` | ~100 | Gemini provider adapter |

### lib/middleware/
| File | Purpose |
|------|---------|
| `cron-security.ts` | Cron request validation (secret + IP) |
| `rate-limit.ts` | In-memory rate limiter |
| `error-handler.ts` | Centralized error handling |

### lib/validators/
| File | Purpose |
|------|---------|
| `api.ts` | Zod schemas for API input validation |
| `auth.ts` | Auth-specific Zod schemas |
| `prequal.ts` | Pre-qualification form Zod schemas |

### lib/seo/
| File | Purpose |
|------|---------|
| `metadata.ts` | Page metadata generation |
| `registry.ts` | SEO page registry |
| `schema.ts` | JSON-LD schema markup |
| `site-url.ts` | Canonical URL generation |

### lib/notifications/
| File | Purpose |
|------|---------|
| `notification.service.ts` | `notifyAdmin()` helper — creates `AdminNotification` records with dedup |
| `types.ts` | Notification type definitions |

### lib/calculators/
| File | Purpose |
|------|---------|
| `affordability.ts` | Monthly payment affordability calculator |

### lib/email/
| File | Purpose |
|------|---------|
| `triggers.ts` | Email trigger definitions |

### Other lib files
| File | Purpose |
|------|---------|
| `lib/auth.ts` | JWT session creation/verification |
| `lib/auth-edge.ts` | Edge-compatible JWT verification |
| `lib/auth-server.ts` | Server-side session helpers |
| `lib/auth-utils.ts` | Auth utility functions |
| `lib/admin-auth.ts` | Admin authentication + MFA + session management |
| `lib/stripe.ts` | Stripe SDK initialization + webhook helpers |
| `lib/resend.ts` | Resend email client initialization |
| `lib/db.ts` | Database client (Supabase) |
| `lib/prisma.ts` | Prisma client initialization |
| `lib/supabase.ts` | Supabase client |
| `lib/supabase/admin.ts` | Supabase admin/service-role client |
| `lib/supabase/client.ts` | Supabase browser client |
| `lib/supabase/server.ts` | Supabase server client |
| `lib/workspace-scope.ts` | Workspace isolation helpers |
| `lib/app-mode.ts` | Test/live mode detection |
| `lib/cache.ts` | Caching utilities |
| `lib/cache/simple-cache.ts` | Simple in-memory cache |
| `lib/constants.ts` | Platform constants (fees, tiers, limits) |
| `lib/constants/deal-visibility.ts` | Deal field visibility rules |
| `lib/logger.ts` | Structured logger |
| `lib/monitoring/sentry.ts` | Sentry integration |
| `lib/monitoring/index.ts` | Monitoring exports |
| `lib/env.ts` | Environment variable validation |
| `lib/utils.ts` | General utilities |
| `lib/utils/cookies.ts` | Cookie option helpers |
| `lib/utils/documents.ts` | Document utility functions |
| `lib/utils/format.ts` | Formatting utilities |
| `lib/utils/referral-code.ts` | Referral code generation/parsing |
| `lib/utils/role-detection.ts` | Role detection from session |
| `lib/types/index.ts` | Shared TypeScript types |
| `lib/mocks/mockStore.ts` | Mock data for TEST workspace |
| `lib/progress/dealProgress.ts` | Deal progress calculation |
| `lib/lenis/quickPrompts.ts` | AI quick prompt templates |
| `lib/workspace-bootstrap.ts` | Workspace initialization |
| `lib/auth-runtime-validation.ts` | Runtime auth validation |
