# AutoLenis - Product Requirements Document

## Original Problem Statement
Build a Fortune 500 fintech-grade auto-buying concierge platform where buyers get pre-qualified, request specific vehicles, and receive competing dealer offers through a guided digital workflow. The platform includes buyer, dealer, admin, and affiliate portals.

## Tech Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth + custom session cookies (bcrypt, JWT)
- **Deployment:** Vercel

## Core Portals
1. **Buyer Portal** (`/buyer/*`) - Vehicle search, pre-qualification, auction, deal workflow, contracts
2. **Dealer Portal** (`/dealer/*`) - Inventory management, requests, auctions, offers, deals, contracts
3. **Admin Portal** (`/admin/*`) - Full platform management, user management, deal oversight, payments
4. **Affiliate Portal** (`/affiliate/*`) - Referral tracking, payouts

## What's Been Implemented

### Infrastructure (Complete)
- [x] Next.js App Router with file-based routing
- [x] Prisma ORM with Supabase PostgreSQL
- [x] Supabase Auth integration with custom session management
- [x] DMS JSON and XML feed ingestion framework
- [x] 27 canonical inventory records seeded and rendering

### Inventory Pipeline (Complete)
- [x] `/api/inventory/search` - Canonical search API
- [x] `/api/dealer/inventory` - Dealer inventory API
- [x] `/api/admin/inventory/search` - Admin inventory API
- [x] `/api/internal/test-feed` - DMS feed testing

### Page Ecosystem Audit & Upgrade (Complete - April 6, 2026)
**Pages rewritten from stubs to production-grade:**
- [x] `buyer/deal/summary` - Deal summary with progress stepper, vehicle/dealer/financial cards
- [x] `buyer/deal/contract` - Contract Shield with AI scan results, checks grid, flags
- [x] `dealer/deals/[dealId]` - Deal detail with breadcrumbs, vehicle/buyer/financial/timeline cards
- [x] `admin/deals/[dealId]` - Admin deal detail with 3-column grid, cross-links
- [x] `admin/payouts/[payoutId]` - Payout detail with amount display, affiliate info
- [x] `dealer/requests/[requestId]` - Request detail with vehicle preferences, buyer profile

**data-testid coverage added to:**
- [x] All 6 upgraded pages above
- [x] dealer/leads/[leadId], dealer/offers/[offerId]
- [x] admin/requests/[requestId], admin/users/[userId]
- [x] admin/auctions/[auctionId], admin/buyers/[buyerId], admin/dealers/[dealerId]

**Loading.tsx files added:** 7 new (buyer/referral, buyer/auctions, buyer/contracts/[contractId], buyer/prequal/external, buyer/deal/payment, buyer/vehicle-requests, ref/[code])

### RBAC Validation (Complete - April 6, 2026)
- [x] Buyer → Dealer/Admin: Blocked with redirect
- [x] Dealer → Buyer/Admin: Blocked with redirect
- [x] Admin → Buyer/Dealer: Blocked with redirect
- [x] Cross-role API calls: Blocked (401/403)
- [x] Invalid ID detail pages: Proper not-found error states
- [x] Empty state handling: buyer/deal/summary, buyer/deal/contract
- [x] Dealer API tenant scoping: `DealService.getDealForDealer(dealerUser.dealerId, dealId)`
- [x] Fixed: dealer deals API returns proper 404 "Deal not found" for missing records

### Testing Status
- Iteration 7: Page ecosystem UI rendering - 100% pass
- Iteration 8: RBAC + detail pages + cross-role blocking - 100% frontend pass
- TypeScript: 0 compilation errors
- Test accounts: Buyer, Dealer, Admin (all verified working)

## Backlog

### P0 (Next Up)
- End-to-end deal workflow testing (buyer creates deal → dealer views → admin manages)

### P1
- Add data-testid to remaining dynamic route pages not explicitly specified
- Error boundary components at portal level

### P2
- Setup Prisma schema drift detection CI
- Setup MicroBilt/DocuSign production keys
- Configure Sentry for error monitoring
