# Insurance Implementation Audit

## Current State Inventory (Pre-Implementation)

### Existing Service Layer
- `lib/services/insurance.service.ts` — Full service with MockInsuranceProvider adapter, quote request/select/bind/external-proof/admin-detail/dealer-view methods

### Existing Prisma Models
- `InsuranceQuote` — Basic quote storage (carrier, coverage type, premiums)
- `InsurancePolicy` — Policy record linked to SelectedDeal (1-to-1)
- `SelectedDeal` — Deal model with DealStatus enum including INSURANCE_PENDING/INSURANCE_COMPLETE

### Existing API Routes
- `POST /api/buyer/deals/[dealId]/insurance/request-quotes` — Request quotes
- `POST /api/buyer/deals/[dealId]/insurance/select-quote` — Select a quote
- `POST /api/buyer/deals/[dealId]/insurance/bind-policy` — Bind policy
- `POST /api/buyer/deals/[dealId]/insurance/external-proof` — Upload external proof
- `GET /api/buyer/deals/[dealId]/insurance` — Get insurance overview
- `GET /api/admin/deals/[dealId]/insurance` — Admin full detail view
- `POST /api/admin/deals/[dealId]/insurance/verify-external` — Verify external policy
- `GET /api/dealer/deals/[dealId]/insurance` — Dealer view

### Existing Pages
- `/buyer/insurance` — Monolithic page with quotes display and upload form
- `/buyer/deal/insurance` — Redirect stub to /buyer/insurance
- `/admin/insurance` — Dashboard with stats tables
- `/insurance` — Public marketing page

## Missing Items Found

### Schema Gaps
- SelectedDeal missing `insurance_status` and `user_id` fields
- InsuranceQuote missing fields used by service: `selected_deal_id`, `buyer_id`, `carrier_name`, `product_name`, `premium_monthly_cents`, `premium_semi_annual_cents`, `premium_annual_cents`, `coverage_json`, `quote_ref`, `quote_status`, `valid_until`, `vehicle_vin`, `provider_name`
- InsurancePolicy missing fields: `selected_deal_id`, `user_id`, `type`, `carrier_name`, `policy_number_v2`, `vehicle_vin`, `start_date`, `end_date`, `document_url`, `raw_policy_json`, `coverage_type`, `is_verified`
- No InsuranceDocRequest model for document request workflow
- Missing AuctionOffer → SelectedDeal relation and InventoryItem relation

### Page Gaps
- No multi-step buyer journey pages (quote form, results, detail, bind, proof, confirmation)
- No admin deal-level insurance sub-page
- No dealer deal-level insurance sub-page
- `/buyer/deal/insurance` was just a redirect, not a real page

### API Gaps
- `/api/insurance/quotes/[dealId]` was a stub returning empty array
- No document request APIs for admin/dealer/buyer

### Service Gaps
- No `ensurePolicyAttachedToDeal` idempotent method
- bindPolicy and uploadExternalProof didn't call centralized deal attachment
- No tests for insurance service logic

### Provider Integration
- MockInsuranceProvider exists (3 carriers: Progressive, Geico, State Farm)
- No real provider API integration — marked as stub in code

## What Was Implemented

### Schema Changes (prisma/schema.prisma)
- Added `insurance_status` and `user_id` to SelectedDeal
- Added all missing fields to InsuranceQuote (17 new optional fields)
- Added all missing fields to InsurancePolicy (15 new optional fields)
- Added InsuranceDocRequest model
- Added AuctionOffer ↔ SelectedDeal and AuctionOffer ↔ InventoryItem relations

### Buyer Journey Pages (7 pages)
- `/buyer/deal/insurance` — Overview with status, quotes summary, CTAs
- `/buyer/deal/insurance/quote` — Quote request form with coverage preferences
- `/buyer/deal/insurance/quotes` — Quote results with filter controls
- `/buyer/deal/insurance/quotes/[quoteId]` — Quote detail with coverage breakdown
- `/buyer/deal/insurance/bind` — Bind/checkout flow
- `/buyer/deal/insurance/proof` — External proof upload form
- `/buyer/deal/insurance/confirmed` — Confirmation with next steps

### Admin/Dealer Pages
- `/admin/deals/[dealId]/insurance` — Full detail with quotes/policies/events tables, verify/revoke
- `/dealer/deals/[dealId]/insurance` — Read-only status and policy summary

### New API Routes
- `POST/GET /api/admin/deals/[dealId]/insurance/request-docs` — Admin document requests
- `POST/GET /api/dealer/deals/[dealId]/insurance/request-docs` — Dealer document requests
- `GET/POST /api/buyer/deals/[dealId]/insurance/doc-requests` — Buyer view/fulfill requests
- Fixed `/api/insurance/quotes/[dealId]` — Now returns actual quotes

### Service Layer Updates
- Added `ensurePolicyAttachedToDeal(dealId, policyId)` — Idempotent deal attachment
- Updated `bindPolicy` to use centralized attachment
- Updated `uploadExternalProof` to use centralized attachment

### Tests
- 12 new Vitest tests covering ensurePolicyAttachedToDeal, selectQuote, MockInsuranceProvider, status flow

### Provider Stubs
- MockInsuranceProvider is clearly marked as a stub in code comments
- Returns realistic mock data for 3 carriers
- Full bind simulation with policy numbers
