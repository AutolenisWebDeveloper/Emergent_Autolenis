# Insurance Implementation Fix Plan

## Acceptance Criteria Checklist

### Buyer Journey (PASS/FAIL)
- [x] PASS: Buyer can navigate to /buyer/deal/insurance and see overview
- [x] PASS: Buyer can request quotes via /buyer/deal/insurance/quote
- [x] PASS: Buyer can view quote results at /buyer/deal/insurance/quotes
- [x] PASS: Buyer can view quote detail at /buyer/deal/insurance/quotes/[quoteId]
- [x] PASS: Buyer can bind policy at /buyer/deal/insurance/bind
- [x] PASS: Buyer can upload proof at /buyer/deal/insurance/proof
- [x] PASS: Buyer sees confirmation at /buyer/deal/insurance/confirmed
- [x] PASS: Full flow: overview → quote → quotes → select → bind → confirmed

### Deal Integration
- [x] PASS: Policy automatically associated to deal on bind
- [x] PASS: Policy automatically associated to deal on proof upload
- [x] PASS: ensurePolicyAttachedToDeal is idempotent (tested)
- [x] PASS: Deal insurance_status updated throughout flow

### Admin Visibility
- [x] PASS: Admin can view quotes, policies, events for any deal
- [x] PASS: Admin can verify/revoke external policy verification
- [x] PASS: Admin can request documents from buyer

### Dealer Visibility
- [x] PASS: Dealer can view insurance status for their deals
- [x] PASS: Dealer can request documents from buyer

### Document Request Workflow
- [x] PASS: Admin can create document requests
- [x] PASS: Dealer can create document requests
- [x] PASS: Buyer can view outstanding requests
- [x] PASS: Buyer can fulfill requests with document upload
- [x] PASS: Status transitions: REQUESTED → UPLOADED

### Security & Auth
- [x] PASS: Buyer pages require BUYER role
- [x] PASS: Admin pages require ADMIN/SUPER_ADMIN
- [x] PASS: Dealer pages require DEALER/DEALER_USER
- [x] PASS: Dealer can only access deals they're assigned to
- [x] PASS: No cross-role data exposure

### Build & Deploy
- [x] PASS: All new schema fields are optional (no data migration needed)
- [x] PASS: No build-time DB failures (runtime-safe)
- [x] PASS: No dynamic route slug conflicts
- [x] PASS: Vitest tests pass (55 total, 12 new)

### Responsive UI
- [x] PASS: Tables wrapped with overflow-x-auto
- [x] PASS: Grids use grid-cols-1 md:grid-cols-2 pattern
- [x] PASS: No fixed widths, uses max-w-* and w-full

## Routes Created/Updated

### New Buyer Pages
| Route | File | Type |
|-------|------|------|
| /buyer/deal/insurance | app/buyer/deal/insurance/page.tsx | Replaced redirect with overview |
| /buyer/deal/insurance/quote | app/buyer/deal/insurance/quote/page.tsx | New |
| /buyer/deal/insurance/quotes | app/buyer/deal/insurance/quotes/page.tsx | New |
| /buyer/deal/insurance/quotes/[quoteId] | app/buyer/deal/insurance/quotes/[quoteId]/page.tsx | New |
| /buyer/deal/insurance/bind | app/buyer/deal/insurance/bind/page.tsx | New |
| /buyer/deal/insurance/proof | app/buyer/deal/insurance/proof/page.tsx | New |
| /buyer/deal/insurance/confirmed | app/buyer/deal/insurance/confirmed/page.tsx | New |

### New Admin/Dealer Pages
| Route | File | Type |
|-------|------|------|
| /admin/deals/[dealId]/insurance | app/admin/deals/[dealId]/insurance/page.tsx | New |
| /dealer/deals/[dealId]/insurance | app/dealer/deals/[dealId]/insurance/page.tsx | New |

### New/Updated API Routes
| Route | File | Type |
|-------|------|------|
| /api/admin/deals/[dealId]/insurance/request-docs | app/api/admin/deals/[dealId]/insurance/request-docs/route.ts | New |
| /api/dealer/deals/[dealId]/insurance/request-docs | app/api/dealer/deals/[dealId]/insurance/request-docs/route.ts | New |
| /api/buyer/deals/[dealId]/insurance/doc-requests | app/api/buyer/deals/[dealId]/insurance/doc-requests/route.ts | New |
| /api/insurance/quotes/[dealId] | app/api/insurance/quotes/[dealId]/route.ts | Fixed stub |

## DB Changes
- SelectedDeal: +2 optional fields (insurance_status, user_id)
- InsuranceQuote: +17 optional fields
- InsurancePolicy: +15 optional fields
- InsuranceDocRequest: New model
- AuctionOffer: Added relations (inventoryItem, selectedDeals)
- InventoryItem: Added back-relation (auctionOffers)

## Security/RLS Changes
- None (using application-level auth via requireAuth and ProtectedRoute)
