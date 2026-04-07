# AutoLenis — Product Requirements Document

## Original Problem Statement
Upload, validate, configure, and deploy the complete AutoLenis Next.js repository to Vercel. Fix 5 core items (Prisma client, Buyer deal query, Dealer deal route, E2E POST requests with CSRF, Full buyer → dealer → admin lifecycle rerun). Inspect and repair the complete signup and account-setup system for Buyer, Dealer, and Affiliate roles to Fortune 500 fintech quality. Finally, ensure Dealer onboarding persists real business/license fields, and fix `requireAuth` to return proper 401/403 instead of 500 for cross-role access. Implement admin-managed prequalification.

## Architecture
- **Stack**: Next.js 16 App Router, TypeScript, Supabase Auth, Prisma ORM
- **Auth**: Custom JWT-based auth via `lib/services/auth.service.ts`
- **Deployment**: Vercel
- **DB**: PostgreSQL via Supabase + Prisma ORM

## Completed Work

### Session 1–2 (Deployment, Core Fixes, Signup Repair)
- Deployed to Vercel, fixed FK constraints, E2E passing
- All 3 signup flows validated

### Session 3 (requireAuth & Dealer Onboarding)
- `handleRouteError()` in 66 route files for proper 401/403
- `activateDealer()` fixed for existing Dealer update

### Session 4 (Admin-Managed Prequalification)
- Route contract: GET+POST `/prequal`, PATCH `/prequal/status`
- Admin UI: `AdminPrequalManager.tsx` in buyer detail tab
- Bug fix: inventory search `prequalStatus` → `status`, `"APPROVED"` → `"ACTIVE"`

### Session 5 (P1 FK Fix)

#### Problem
`PreQualification.buyerId` stores `User.id` (convention in `prequal.service.ts`, 7 write sites). But the Prisma schema FK declared `references: [BuyerProfile.id]`. This caused:
- `prisma.buyerProfile.findUnique({ include: { preQualification: true } })` to generate `WHERE buyerId = <BuyerProfile.id>` — which NEVER matched since `BuyerProfile.id != User.id`
- Auction validation (`auction.service.ts` lines 16, 390) always returned null for prequal, blocking all prequalified buyers from auctions

#### Fix Applied
1. **Prisma schema**: Changed `PreQualification.buyer` relation from `references: [id]` to `references: [userId]`
2. **Migration**: Created `0002_fix_prequal_buyer_fk/migration.sql` — drops incorrect FK, creates correct FK referencing `BuyerProfile.userId`
3. **Prisma client**: Regenerated successfully
4. **Build**: `tsc --noEmit` 0 errors, `pnpm build` clean
5. **Tests**: 16278 passed, 65 failed (identical to pre-change — zero regressions)

#### Scope Verification
Only `PreQualification` had the wrong convention. All other buyer-FK models (Shortlist, Auction, SelectedDeal, ExternalPreApproval) correctly store `BuyerProfile.id` and their FK `references: [id]` is correct:
- `Shortlist.buyerId` ← from `buyer.id` (BuyerProfile.id) in shortlist API routes
- `Auction.buyerId` ← from `buyer.id` (BuyerProfile.id) in auction API route
- `SelectedDeal.buyerId` ← from `buyer.id` (BuyerProfile.id) in deal creation service

#### Consumers Now Correct
| Consumer | Query Type | Status |
|----------|-----------|--------|
| `auction.service.ts:16` | Prisma include | Fixed (now joins on userId) |
| `auction.service.ts:390` | Prisma include | Fixed (now joins on userId) |
| `inventory/search` | Supabase `.eq("buyerId", userId)` | Was already correct |
| `prequal.service.ts` | Prisma findFirst/findUnique | Was already correct |
| Admin prequal routes | Prisma findUnique | Was already correct |

#### Files Changed
| File | Change |
|------|--------|
| `prisma/schema.prisma` line 539 | `references: [id]` → `references: [userId]` |
| `prisma/migrations/0002_fix_prequal_buyer_fk/migration.sql` | NEW: drop + recreate FK |

### Build Health
- `tsc --noEmit`: 0 errors
- `pnpm build`: 0 errors
- Tests: 16278/16343 pass (65 pre-existing failures, 0 new)

## Backlog
- P2: Dealer licenseNumber placeholder flow
- P2: Run migration 0002 on Supabase DB (requires Vercel deploy or direct DB access)
- P3: Affiliate auto-enrollment cookie flow validation
- P3: Full E2E regression of dealer onboarding lifecycle
