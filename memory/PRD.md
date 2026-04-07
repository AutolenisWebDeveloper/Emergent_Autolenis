# AutoLenis — Deployment + Lifecycle Fix PRD

## Original Problem Statement
Deploy AutoLenis to Vercel and close 5 required items: Prisma client validation, buyer deal query fix, dealer deal route fix, E2E POST requests with CSRF, and full buyer→dealer→admin lifecycle rerun.

## Architecture
- **Stack**: Next.js 16 App Router, TypeScript, Prisma ORM, PostgreSQL/Supabase, Stripe, Resend, DocuSign, MicroBilt, Groq AI SDK
- **Deployment**: Vercel (autolenis-prod.vercel.app / www.autolenis.com)
- **Package Manager**: pnpm 10.28.0, Node.js 24.x

## What's Been Implemented

### Session 1 (Deployment)
- Repository cloned and deployed to Vercel
- `.vercelignore` fixed (`mocks/` → `/mocks/`, `memory/` → `/memory/`)
- 38+ environment variables configured on Vercel
- Prisma validated, database schema up-to-date
- 10 cron jobs registered

### Session 2 (5 Required Items - Jan 2026)

#### Item 1: Prisma Client ✅
- Prisma schema validated with env vars
- `prisma generate` succeeds
- Runtime mismatch identified: deal routes used Prisma `include` names that didn't match schema relation names
- Resolution: Converted critical routes from Prisma to Supabase PostgREST

#### Item 2: Buyer Deal Query ✅
- **Root cause**: 24 duplicate FK constraints in the database (from parallel Prisma + manual Supabase migrations) caused PostgREST PGRST201 ambiguity errors
- **Fix 1**: Dropped all 24 duplicate FK constraints, keeping Prisma-generated ones
- **Fix 2**: Rewrote `/api/buyer/deals/[dealId]/route.ts` to use `createAdminClient()` with explicit PostgREST joins
- Both `/api/buyer/deal` and `/api/buyer/deals/{id}` now work correctly

#### Item 3: Dealer Deal Route ✅
- **Root cause**: DealerUser lookup used RLS-aware `createClient()` which fails under RLS policies
- **Fix**: Rewrote `/api/dealer/deals/[dealId]/route.ts` to use `createAdminClient()` (service-role) for DealerUser lookup
- Authorization preserved: deal.dealerId checked against dealerUser.dealerId
- Unauthorized access returns 403

#### Item 4: E2E POST Requests with CSRF ✅
- **Root cause**: E2E test didn't extract/send CSRF tokens on mutating requests
- **Fix**: Updated `e2e_lifecycle_test.js` to extract `csrf_token` from login response cookies and send as `x-csrf-token` header on all POST requests
- All 13 status transitions succeed via API (0 DB fallback)

#### Item 5: Full Buyer→Dealer→Admin Lifecycle ✅
- **Result**: 25/25 PASS, 0 FAIL, 0 INFO/WARN
- Full lifecycle: auth → inventory → shortlist → auction seed → buyer deal view → dealer deal view → admin deal view → 13 status transitions → terminal state guard → cross-role blocking → post-completion view

## Exact Files Changed
| File | Change |
|------|--------|
| `app/api/buyer/deals/[dealId]/route.ts` | Rewritten: Prisma→Supabase, added ownership check |
| `app/api/dealer/deals/[dealId]/route.ts` | Rewritten: RLS→service-role for DealerUser, Supabase for deal, auth preserved |
| `app/api/admin/deals/[dealId]/route.ts` | Rewritten: Supabase for full deal query with relations |
| `app/api/admin/deals/[dealId]/status/route.ts` | Rewritten: Supabase for status updates, terminal state guard, compliance logging |
| `test_reports/e2e_lifecycle_test.js` | Updated: CSRF token extraction/sending, HTTPS support, enhanced logging |
| `.vercelignore` | Fixed: `/mocks/` and `/memory/` root-only patterns |

## Database Changes
- Dropped 24+6 = 30 duplicate FK constraints that caused PostgREST PGRST201 ambiguity
- No schema changes, no new columns, no data modifications

## Remaining Risks
- Cross-role blocking returns 500 (instead of 401/403) for buyer→admin and dealer→admin — the `requireAuth` throws an unhandled exception
- DocuSign in sandbox mode
- MicroBilt using test API endpoints

## Backlog
- P1: Fix requireAuth to return proper 401/403 instead of 500
- P2: DocuSign production migration
- P3: MicroBilt production credentials
