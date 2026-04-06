# AutoLenis - Product Requirements Document

## Original Problem Statement
Build a Fortune 500 fintech-grade auto-buying concierge platform where buyers get pre-qualified, request specific vehicles, and receive competing dealer offers through a guided digital workflow. The platform includes buyer, dealer, admin, and affiliate portals.

## Current Objective (Phase 3-4)
Inspect the entire feature ecosystem and ensure all secondary pages, supporting screens, operational states, and connected subflows are fully created, correctly wired, production-ready, and consistent with Fortune 500 fintech standard. Zero dead ends, zero placeholder gaps.

## Tech Stack
- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth
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
- [x] Supabase Auth integration
- [x] DMS JSON and XML feed ingestion framework
- [x] 27 canonical inventory records seeded and rendering

### Inventory Pipeline (Complete)
- [x] `/api/inventory/search` - Canonical search API
- [x] `/api/dealer/inventory` - Dealer inventory API
- [x] `/api/admin/inventory/search` - Admin inventory API
- [x] `/api/internal/test-feed` - DMS feed testing

### Page Ecosystem Audit & Upgrade (Complete - April 6, 2026)
**Rewritten from redirect stubs to production-grade standalone pages:**
- [x] `buyer/deal/summary` - Full deal summary with progress stepper, vehicle/dealer/financial cards, loading/empty/error states
- [x] `buyer/deal/contract` - Contract Shield page with AI scan results, checks grid, flags summary, loading/empty/error states

**Upgraded from thin implementations to production quality:**
- [x] `dealer/deals/[dealId]` - Full deal detail with vehicle/buyer/financial/timeline cards, breadcrumbs, action buttons
- [x] `admin/deals/[dealId]` - Admin deal detail with 3-column grid, buyer/dealer cross-links, admin actions
- [x] `admin/payouts/[payoutId]` - Payout detail with amount display, affiliate info, commissions list, timeline
- [x] `dealer/requests/[requestId]` - Request detail with vehicle preferences, trade-in info, buyer profile, CTA actions

**data-testid attributes added to all specified detail pages:**
- [x] dealer/leads/[leadId], dealer/offers/[offerId]
- [x] admin/requests/[requestId], admin/users/[userId]
- [x] admin/auctions/[auctionId], admin/buyers/[buyerId], admin/dealers/[dealerId]

**Loading.tsx files added:**
- [x] buyer/referral, buyer/auctions, buyer/contracts/[contractId]
- [x] buyer/prequal/external, buyer/deal/payment, buyer/vehicle-requests
- [x] ref/[code]

## Testing Status
- Testing agent iteration 7: 100% pass rate (all frontend tests)
- TypeScript: 0 compilation errors
- All auth-protected pages properly redirect
- All detail pages have loading, empty, and error states

## Backlog

### P0 (Next Up)
- Validate role-based access for admin and dealer portals
- End-to-end deal workflow testing (buyer -> dealer -> admin)

### P1
- Add data-testid to remaining dynamic route pages not explicitly specified
- Error boundary components at portal level

### P2
- Setup Prisma schema drift detection CI
- Setup MicroBilt/DocuSign production keys
- Configure Sentry for error monitoring
