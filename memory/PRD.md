# AutoLenis — Product Requirements Document

## Original Problem Statement
Upload, validate, configure, and deploy the complete AutoLenis Next.js repository to Vercel. Fix 5 core items (Prisma client, Buyer deal query, Dealer deal route, E2E POST requests with CSRF, Full buyer → dealer → admin lifecycle rerun). Inspect and repair the complete signup and account-setup system for Buyer, Dealer, and Affiliate roles to Fortune 500 fintech quality. Finally, ensure Dealer onboarding persists real business/license fields, and fix `requireAuth` to return proper 401/403 instead of 500 for cross-role access. Implement admin-managed prequalification. Implement two admin-driven workflows: (1) Admin sends offer to buyer, (2) Admin invites dealer to network.

## Architecture
- **Stack**: Next.js 16 App Router, TypeScript, Supabase Auth, Prisma ORM
- **Deployment**: Vercel
- **DB**: PostgreSQL via Supabase + Prisma ORM

## Completed Work

### Session 1–3 (Deployment, Signup, Auth Fixes)
- Deployed to Vercel, E2E passing, all 3 signup flows validated
- `handleRouteError()` in 66 routes for proper 401/403
- `activateDealer()` fixed for existing Dealer update

### Session 4 (Admin-Managed Prequalification)
- Route contract: GET+POST `/prequal`, PATCH `/prequal/status`
- Admin UI: `AdminPrequalManager.tsx` in buyer detail tab
- Bug fix: inventory search `prequalStatus` → `status`, `"APPROVED"` → `"ACTIVE"`

### Session 5 (P1 FK Fix)
- Prisma schema: `PreQualification.buyer` relation changed from `references: [id]` to `references: [userId]`
- Migration: `0002_fix_prequal_buyer_fk/migration.sql`
- Fixed auction validation Prisma `include` join

### Session 6 (P2: Dealer License Placeholder Flow)
- Dealer signup inserts `licenseNumber: "PENDING-{uuid8}"` — unique placeholder
- `activateDealer()` overwrites placeholder with real license
- Complete lifecycle: Signup → Onboarding Application → Admin Approval → Active Dealer

### Session 7 (Admin Workflows: Offer to Buyer + Dealer Network Invite)

#### Workflow A: Admin Send/Submit Offer to Buyer
**Gap Analysis:**
- A1: Can admin create/send offer? YES — via sourcing case detail page (`/admin/sourcing/[caseId]`)
- A2: Admin UI exists? YES — full offer creation form with vehicle, pricing, financing fields
- A3: Buyer can view? YES — `buyer/requests/[caseId]` shows offers with Accept button
- A4: Status lifecycle? YES — `DRAFT → PENDING_PRESENT → PRESENTED → ACCEPTED/DECLINED/EXPIRED`
- A5: Notifications/audit? YES — `sendSourcedOfferPresentedEmail()` + `CaseEventLog`

**Fixes Applied:**
1. **P0 Bug Fix**: Sourcing case dealer invite form was missing `offerId` — now auto-selects accepted offer
2. **Audit**: Added `AdminAuditLog` entries to offer creation and presentation routes
3. **Validation**: Added input validation for `offerId`, `dealerEmail`, `dealerName` on invite-dealer route

#### Workflow B: Admin Invite Dealer to Network
**Gap Analysis:**
- B1: Can admin invite? NO → Fixed (added POST endpoint)
- B2: Admin UI? PARTIAL → Fixed (added full create form + improved list)
- B3: Status lifecycle? YES — `sent → viewed → responded/expired`
- B4: Dealer-facing path? PARTIAL → Fixed (claim page handles both invite types)
- B5: Notifications/audit? NO → Fixed (email + AdminAuditLog wired)

**Implementation:**
1. **POST `/api/admin/dealer-invites`**: Creates `DealerIntelligenceInvite`, sends email, writes audit log, prevents duplicate active invites
2. **Admin Dealer Invites Page** (`app/admin/dealer-invites/page.tsx`): Full rewrite with invite form, stats cards, filterable table with status badges
3. **Claim Route** (`app/api/dealer/invite/claim/route.ts`): Now supports both `DealerInvite` (sourcing-specific) and `DealerIntelligenceInvite` (general network) tokens
4. **Claim Page** (`app/dealer/invite/claim/page.tsx`): Professional UX for both invite types with loading/error/valid/claimed states, trust indicators
5. **Complete Page** (`app/dealer/invite/complete/page.tsx`): Post-claim confirmation with account creation CTAs
6. **Email**: `sendDealerNetworkInviteEmail()` — professional HTML email for general network invites
7. **Proxy Fix**: Added `/dealer/invite` to public routes and `/api/dealer/invite/claim` + `/api/dealer/invite/complete` to API auth exceptions (dealers clicking invite links have no account yet)

#### Files Changed (Session 7)
| File | Change |
|------|--------|
| `app/api/admin/dealer-invites/route.ts` | Added POST handler for network invite creation |
| `app/admin/dealer-invites/page.tsx` | Full rewrite: create form + stats + filterable table |
| `app/api/dealer/invite/claim/route.ts` | Supports both DealerInvite + DealerIntelligenceInvite |
| `app/dealer/invite/claim/page.tsx` | Professional claim UX for both invite types |
| `app/dealer/invite/complete/page.tsx` | NEW: post-claim completion page |
| `lib/services/email.service.tsx` | Added `sendDealerNetworkInviteEmail()` method |
| `app/api/admin/sourcing/cases/[caseId]/offers/route.ts` | Added AdminAuditLog on offer creation |
| `app/api/admin/sourcing/cases/[caseId]/offers/[offerId]/present/route.ts` | Added AdminAuditLog on offer presentation |
| `app/api/admin/sourcing/cases/[caseId]/invite-dealer/route.ts` | Added AdminAuditLog + input validation |
| `app/admin/sourcing/[caseId]/page.tsx` | Fixed dealer invite form: auto-selects accepted offer |
| `proxy.ts` | Added `/dealer/invite` to public routes + API exceptions |

### Build Health
- `tsc --noEmit`: 0 errors
- `next build`: 0 errors (all 341 pages generated)
- DB lifecycle validation: 9/9 checks pass against production Supabase
- RBAC: Admin routes return 401 for unauthenticated, dealer invite routes accessible to public

## Deployment Note
- Migration `0002_fix_prequal_buyer_fk` must be run on Supabase DB before or during next Vercel deploy
- No new migrations required for Session 7 (no schema changes)

## Backlog
- P3: Affiliate auto-enrollment cookie flow validation
- P3: Full E2E regression of dealer onboarding lifecycle
- P3: Verify-email resend flow
- LOW: `/api/dealer/deals/{dealId}` returns "Dealer not found" instead of "Deal not found" for invalid deal IDs
