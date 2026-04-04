# Buyer Dashboard Inventory

## Routes & Pages

| Route | File Path | Purpose | Dependencies (API/Tables) | Status |
|-------|-----------|---------|---------------------------|--------|
| `/buyer/dashboard` | `app/buyer/dashboard/page.tsx` | Main dashboard with journey progress, stats, quick actions | `GET /api/buyer/dashboard` | OK |
| `/buyer/prequal` | `app/buyer/prequal/page.tsx` | Pre-qualification flow (soft credit check) | `GET/POST /api/buyer/prequal` | OK |
| `/buyer/prequal/manual-preapproval` | `app/buyer/prequal/manual-preapproval/page.tsx` | External pre-approval upload | `POST /api/buyer/prequal/external` | OK |
| `/buyer/prequal/manual-preapproval/status` | `app/buyer/prequal/manual-preapproval/status/page.tsx` | Pre-approval review status | `GET /api/buyer/prequal/external` | OK |
| `/buyer/search` | `app/buyer/search/page.tsx` | Vehicle inventory search | `GET /api/buyer/inventory/search`, `GET /api/buyer/inventory/filters`, `POST /api/buyer/shortlist` | OK |
| `/buyer/shortlist` | `app/buyer/shortlist/page.tsx` | Shortlisted vehicles, auction start | `GET /api/buyer/shortlist`, `DELETE /api/buyer/shortlist`, `POST /api/buyer/auction` | OK |
| `/buyer/auction` | `app/buyer/auction/page.tsx` | Auctions list with offers | `GET /api/buyer/auctions`, `POST /api/buyer/auction/select` | OK |
| `/buyer/auction/[id]` | `app/buyer/auction/[id]/page.tsx` | Individual auction detail | `GET /api/buyer/auctions/[auctionId]` | OK |
| `/buyer/auction/[id]/offers` | `app/buyer/auction/[id]/offers/page.tsx` | Best price comparison | `GET /api/auction/[id]`, `POST /api/auction/[id]/best-price`, `POST /api/buyer/auction/decline`, `POST /api/buyer/deal/select` | OK |
| `/buyer/offers` | `app/buyer/offers/page.tsx` | All offers across auctions | `GET /api/buyer/auctions` | OK |
| `/buyer/offers/[offerId]` | `app/buyer/offers/[offerId]/page.tsx` | Individual offer detail | `GET /api/buyer/auctions` | OK |
| `/buyer/requests` | `app/buyer/requests/page.tsx` | Vehicle request cases list | `GET /api/buyer/requests` | OK |
| `/buyer/requests/new` | `app/buyer/requests/new/page.tsx` | Create new vehicle request | `POST /api/buyer/requests` | OK |
| `/buyer/requests/[caseId]` | `app/buyer/requests/[caseId]/page.tsx` | Request detail, submit/cancel | `GET /api/buyer/requests/[caseId]`, `POST /api/buyer/requests/[caseId]/submit`, `POST /api/buyer/requests/[caseId]/cancel` | OK |
| `/buyer/request` | `app/buyer/request/page.tsx` | Redirect alias → `/buyer/requests` | N/A | OK |
| `/buyer/deal` | `app/buyer/deal/page.tsx` | Deal summary redirect | `GET /api/buyer/deal` | OK |
| `/buyer/deal/summary` | `app/buyer/deal/summary/page.tsx` | Deal summary overview | `GET /api/buyer/deal` | OK |
| `/buyer/deal/financing` | `app/buyer/deal/financing/page.tsx` | Financing details | `GET/POST /api/buyer/deals/[dealId]/financing` | OK |
| `/buyer/deal/fee` | `app/buyer/deal/fee/page.tsx` | Concierge fee payment | `GET /api/buyer/deals/[dealId]/concierge-fee`, `POST /api/buyer/deals/[dealId]/concierge-fee/pay-card` | OK |
| `/buyer/deal/insurance` | `app/buyer/deal/insurance/page.tsx` | Insurance overview | `GET /api/buyer/deals/[dealId]/insurance` | OK |
| `/buyer/deal/insurance/quotes` | `app/buyer/deal/insurance/quotes/page.tsx` | Request insurance quotes | `POST /api/buyer/deals/[dealId]/insurance/request-quotes` | OK |
| `/buyer/deal/insurance/quotes/[quoteId]` | `app/buyer/deal/insurance/quotes/[quoteId]/page.tsx` | Quote detail | `GET /api/buyer/deals/[dealId]/insurance` | OK |
| `/buyer/deal/insurance/quote` | `app/buyer/deal/insurance/quote/page.tsx` | Select a quote | `POST /api/buyer/deals/[dealId]/insurance/select-quote` | OK |
| `/buyer/deal/insurance/bind` | `app/buyer/deal/insurance/bind/page.tsx` | Bind insurance policy | `POST /api/buyer/deals/[dealId]/insurance/bind-policy` | OK |
| `/buyer/deal/insurance/confirmed` | `app/buyer/deal/insurance/confirmed/page.tsx` | Insurance confirmation | Static content | OK |
| `/buyer/deal/insurance/proof` | `app/buyer/deal/insurance/proof/page.tsx` | Upload insurance proof | `POST /api/buyer/deals/[dealId]/insurance/external-proof` | OK |
| `/buyer/deal/contract` | `app/buyer/deal/contract/page.tsx` | Contract Shield review | `GET /api/buyer/contracts` | OK |
| `/buyer/deal/esign` | `app/buyer/deal/esign/page.tsx` | E-signature flow | `GET/POST /api/buyer/deals/[dealId]/esign` | OK |
| `/buyer/deal/pickup` | `app/buyer/deal/pickup/page.tsx` | Pickup scheduling | `GET /api/buyer/deals/[dealId]/pickup`, `POST /api/buyer/deals/[dealId]/pickup/schedule` | OK |
| `/buyer/contracts` | `app/buyer/contracts/page.tsx` | Contract Shield results | `GET /api/buyer/contracts` | OK |
| `/buyer/contract-shield` | `app/buyer/contract-shield/page.tsx` | Contract Shield upload | `POST /api/buyer/contract-shield` | OK |
| `/buyer/documents` | `app/buyer/documents/page.tsx` | Document management (upload/view) | `GET/POST/PUT/PATCH/DELETE /api/buyer/prequal/external` | OK |
| `/buyer/profile` | `app/buyer/profile/page.tsx` | Profile management | `GET/POST /api/buyer/profile` | OK |
| `/buyer/settings` | `app/buyer/settings/page.tsx` | Account settings, password, MFA | `PATCH /api/buyer/profile`, `POST /api/auth/change-password`, MFA endpoints | OK |
| `/buyer/referrals` | `app/buyer/referrals/page.tsx` | Referral activation | `POST /api/buyer/referrals/activate` | OK |
| `/buyer/billing` | `app/buyer/billing/page.tsx` | Payment history | `GET /api/buyer/billing` | OK |
| `/buyer/payments` | `app/buyer/payments/page.tsx` | Payment details | `GET /api/buyer/billing` | OK |
| `/buyer/payments/[paymentId]` | `app/buyer/payments/[paymentId]/page.tsx` | Single payment detail | `GET /api/buyer/billing` | OK |
| `/buyer/insurance` | `app/buyer/insurance/page.tsx` | Standalone insurance page | `POST /api/buyer/coverage-gap` | OK |
| `/buyer/trade-in` | `app/buyer/trade-in/page.tsx` | Trade-in valuation | `GET/POST /api/buyer/trade-in` | OK |
| `/buyer/delivery` | `app/buyer/delivery/page.tsx` | Delivery tracking | `GET /api/buyer/delivery` | OK |
| `/buyer/funding` | `app/buyer/funding/page.tsx` | Funding status | `GET /api/buyer/funding` | OK |
| `/buyer/deposit` | `app/buyer/deposit/page.tsx` | Deposit management | `GET /api/buyer/deposit` | OK |
| `/buyer/onboarding` | `app/buyer/onboarding/page.tsx` | New buyer onboarding | `POST /api/buyer/profile` | OK |
| `/buyer/messages` | `app/buyer/messages/page.tsx` | Messages (stub/empty state) | None (static UI) | OK |
| `/buyer/esign` | `app/buyer/esign/page.tsx` | E-sign redirect | `GET /api/buyer/deal` | OK |
| `/buyer/affiliate` | `app/buyer/affiliate/page.tsx` | Affiliate info | `GET /api/buyer/referrals` | OK |
| `/buyer/demo` | `app/buyer/demo/page.tsx` | Golden deal walkthrough (TEST mode) | `POST /api/buyer/demo` | OK |
| `/buyer/sign/[dealId]` | `app/buyer/sign/[dealId]/page.tsx` | DocuSign integration | `POST /api/buyer/deals/[dealId]/esign` | OK |
| `/buyer/pickup/[dealId]` | `app/buyer/pickup/[dealId]/page.tsx` | Pickup QR verification | `POST /api/buyer/deals/[dealId]/pickup` | OK |

## Layout & Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| Buyer Layout (Server) | `app/buyer/layout.tsx` | Auth guard, nav config, role check |
| Buyer Layout (Client) | `app/buyer/layout-client.tsx` | Sidebar, header, mobile menu |
| ContractShieldStatus | `components/buyer/contract-shield-status.tsx` | Contract Shield widget |
| VehicleCard | `components/buyer/vehicle-card.tsx` | Vehicle display card |
| FeePaymentModal | `components/buyer/fee-payment-modal.tsx` | Concierge fee modal |
| ProtectedRoute | `components/layout/protected-route.tsx` | Client-side role guard |
| PageHeader | `components/dashboard/page-header.tsx` | Standard page header |
| EmptyState | `components/dashboard/empty-state.tsx` | Empty state component |
| LoadingSkeleton | `components/dashboard/loading-skeleton.tsx` | Loading skeleton |
| ErrorState | `components/dashboard/error-state.tsx` | Error state component |
| StatusPill | `components/dashboard/status-pill.tsx` | Status badge |
| ChatWidget | `components/ai/chat-widget.tsx` | AI concierge chat |
| SessionStatusBanner | `components/auth/session-status-banner.tsx` | Session status display |

## API Routes (Buyer-scoped)

| Route | File Path | Methods | Purpose |
|-------|-----------|---------|---------|
| `/api/buyer/dashboard` | `app/api/buyer/dashboard/route.ts` | GET | Dashboard data |
| `/api/buyer/profile` | `app/api/buyer/profile/route.ts` | GET, PATCH, POST | Profile CRUD |
| `/api/buyer/prequal` | `app/api/buyer/prequal/route.ts` | GET | Pre-qual status |
| `/api/buyer/prequal/start` | `app/api/buyer/prequal/start/route.ts` | POST | Start pre-qual |
| `/api/buyer/prequal/draft` | `app/api/buyer/prequal/draft/route.ts` | POST | Save draft |
| `/api/buyer/prequal/refresh` | `app/api/buyer/prequal/refresh/route.ts` | POST | Refresh pre-qual |
| `/api/buyer/prequal/external` | `app/api/buyer/prequal/external/route.ts` | GET, POST, PUT, PATCH, DELETE | External pre-approval |
| `/api/buyer/shortlist` | `app/api/buyer/shortlist/route.ts` | GET, POST, DELETE | Shortlist management |
| `/api/buyer/shortlist/eligible` | `app/api/buyer/shortlist/eligible/route.ts` | GET | Check eligibility |
| `/api/buyer/shortlist/items/[id]` | `app/api/buyer/shortlist/items/[shortlistItemId]/route.ts` | DELETE | Remove item |
| `/api/buyer/shortlist/items/[id]/primary` | `app/api/buyer/shortlist/items/[shortlistItemId]/primary/route.ts` | PUT | Set primary |
| `/api/buyer/auctions` | `app/api/buyer/auctions/route.ts` | GET | List auctions |
| `/api/buyer/auctions/[id]/best-price` | `app/api/buyer/auctions/[auctionId]/best-price/route.ts` | GET | Best price report |
| `/api/buyer/auctions/[id]/best-price/decline` | `app/api/buyer/auctions/[auctionId]/best-price/decline/route.ts` | POST | Decline offer |
| `/api/buyer/auctions/[id]/deals/select` | `app/api/buyer/auctions/[auctionId]/deals/select/route.ts` | POST | Select deal |
| `/api/buyer/auction` | `app/api/buyer/auction/route.ts` | POST | Create auction |
| `/api/buyer/auction/select` | `app/api/buyer/auction/select/route.ts` | POST | Select offer |
| `/api/buyer/auction/decline` | `app/api/buyer/auction/decline/route.ts` | POST | Decline offer |
| `/api/buyer/auction/validate` | `app/api/buyer/auction/validate/route.ts` | GET | Validate auction |
| `/api/buyer/deal` | `app/api/buyer/deal/route.ts` | GET | Deal data |
| `/api/buyer/deal/select` | `app/api/buyer/deal/select/route.ts` | POST | Select deal |
| `/api/buyer/deal/complete` | `app/api/buyer/deal/complete/route.ts` | POST | Complete deal |
| `/api/buyer/deals/[id]` | `app/api/buyer/deals/[dealId]/route.ts` | GET | Deal detail |
| `/api/buyer/deals/[id]/financing` | `app/api/buyer/deals/[dealId]/financing/route.ts` | GET, POST | Financing |
| `/api/buyer/deals/[id]/concierge-fee` | `app/api/buyer/deals/[dealId]/concierge-fee/route.ts` | GET | Fee status |
| `/api/buyer/deals/[id]/concierge-fee/pay-card` | `app/api/buyer/deals/[dealId]/concierge-fee/pay-card/route.ts` | POST | Pay by card |
| `/api/buyer/deals/[id]/concierge-fee/include-in-loan` | `app/api/buyer/deals/[dealId]/concierge-fee/include-in-loan/route.ts` | POST | Include in loan |
| `/api/buyer/deals/[id]/insurance` | `app/api/buyer/deals/[dealId]/insurance/route.ts` | GET | Insurance data |
| `/api/buyer/deals/[id]/insurance/request-quotes` | `app/api/buyer/deals/[dealId]/insurance/request-quotes/route.ts` | POST | Request quotes |
| `/api/buyer/deals/[id]/insurance/select-quote` | `app/api/buyer/deals/[dealId]/insurance/select-quote/route.ts` | POST | Select quote |
| `/api/buyer/deals/[id]/insurance/bind-policy` | `app/api/buyer/deals/[dealId]/insurance/bind-policy/route.ts` | POST | Bind policy |
| `/api/buyer/deals/[id]/insurance/external-proof` | `app/api/buyer/deals/[dealId]/insurance/external-proof/route.ts` | POST | Upload proof |
| `/api/buyer/deals/[id]/insurance/select` | `app/api/buyer/deals/[dealId]/insurance/select/route.ts` | POST | Select option |
| `/api/buyer/deals/[id]/insurance/doc-requests` | `app/api/buyer/deals/[dealId]/insurance/doc-requests/route.ts` | GET | Doc requests |
| `/api/buyer/deals/[id]/esign` | `app/api/buyer/deals/[dealId]/esign/route.ts` | GET, POST | E-sign |
| `/api/buyer/deals/[id]/pickup` | `app/api/buyer/deals/[dealId]/pickup/route.ts` | GET | Pickup data |
| `/api/buyer/deals/[id]/pickup/schedule` | `app/api/buyer/deals/[dealId]/pickup/schedule/route.ts` | POST | Schedule pickup |
| `/api/buyer/contracts` | `app/api/buyer/contracts/route.ts` | GET | Contracts list |
| `/api/buyer/contracts/acknowledge-override` | `app/api/buyer/contracts/acknowledge-override/route.ts` | POST | Acknowledge |
| `/api/buyer/contract-shield` | `app/api/buyer/contract-shield/route.ts` | POST | Upload contract |
| `/api/buyer/billing` | `app/api/buyer/billing/route.ts` | GET | Billing history |
| `/api/buyer/delivery` | `app/api/buyer/delivery/route.ts` | GET | Delivery data |
| `/api/buyer/funding` | `app/api/buyer/funding/route.ts` | GET | Funding status |
| `/api/buyer/deposit` | `app/api/buyer/deposit/route.ts` | GET | Deposit data |
| `/api/buyer/trade-in` | `app/api/buyer/trade-in/route.ts` | GET, POST | Trade-in |
| `/api/buyer/inventory/search` | `app/api/buyer/inventory/search/route.ts` | GET | Search inventory |
| `/api/buyer/inventory/filters` | `app/api/buyer/inventory/filters/route.ts` | GET | Filter options |
| `/api/buyer/inventory/[id]` | `app/api/buyer/inventory/[inventoryItemId]/route.ts` | GET | Item detail |
| `/api/buyer/requests` | `app/api/buyer/requests/route.ts` | GET, POST | Request cases |
| `/api/buyer/requests/[id]` | `app/api/buyer/requests/[caseId]/route.ts` | GET | Case detail |
| `/api/buyer/requests/[id]/submit` | `app/api/buyer/requests/[caseId]/submit/route.ts` | POST | Submit case |
| `/api/buyer/requests/[id]/cancel` | `app/api/buyer/requests/[caseId]/cancel/route.ts` | POST | Cancel case |
| `/api/buyer/requests/[id]/offers` | `app/api/buyer/requests/[caseId]/offers/route.ts` | GET | Case offers |
| `/api/buyer/requests/[id]/offers/[offerId]/accept` | `app/api/buyer/requests/[caseId]/offers/[offerId]/accept/route.ts` | POST | Accept offer |
| `/api/buyer/referrals/activate` | `app/api/buyer/referrals/activate/route.ts` | POST | Activate affiliate |
| `/api/buyer/coverage-gap` | `app/api/buyer/coverage-gap/route.ts` | POST | Coverage gap analysis |
| `/api/buyer/demo` | `app/api/buyer/demo/route.ts` | POST | Demo mode actions |
