# AutoLenis - Production Readiness Document

## Project Overview
AutoLenis is a multi-role car-buying concierge platform with buyer, dealer, affiliate, and admin portals. Features include prequalification, inventory management, silent reverse auction, best-price engine, financing, insurance, Contract Shield, e-sign, pickup scheduling, affiliate commissions, payments, audit logging, and admin oversight.

## Architecture
- **Framework**: Next.js 16.0.11 (App Router, Turbopack)
- **Language**: TypeScript + React
- **ORM**: Prisma 6.16.0 (schema/types/migrations)
- **Runtime DB**: Supabase as runtime persistence layer
- **Database**: PostgreSQL via Supabase (pooled via PgBouncer)
- **Auth**: Custom JWT + Supabase auth, MFA support
- **Payments**: Stripe (live keys)
- **Email**: Resend
- **E-Sign**: DocuSign (sandbox)
- **Prequalification**: MicroBilt iPredict + IBV
- **AI**: Groq
- **Deployment**: Vercel (Pro plan)
- **Node**: 24.x, pnpm 10.28.0

## Deployment Details
- **Vercel Project**: autolenis-deploy (prj_0nqteNxc8Fmp5PVKOsWC3V8NdhLx)
- **Production URL**: https://www.autolenis.com
- **Vercel URL**: https://autolenis-deploy.vercel.app
- **Branch Deployed**: copilot/fix-vercel-deployment-issues
- **Build Status**: SUCCESS
- **Migration Status**: 0001_initial_baseline applied (214 tables)

## Database Alignment Audit (Session 2 - April 5, 2026)

### Issues Found and Fixed

#### CRITICAL: VehicleRequestCase was a VIEW, not a TABLE
- **Severity**: Critical
- **Root cause**: The `VehicleRequestCase` Prisma model expected a full table with 18 columns, but the DB only had a VIEW on `car_requests` with 5 columns
- **Fix**: Dropped the VIEW and created a proper TABLE with all 18 columns, foreign keys (workspaceId, buyerId), indexes, and RLS policies
- **Impact**: Vehicle sourcing system is now fully functional

#### CRITICAL: Column naming mismatches (snake_case vs camelCase)
- **Severity**: Critical (would cause runtime errors on dealer flows)
- **Affected tables**: 
  - `Dealer` (12 columns)
  - `dealer_agreements` (28 columns)
  - `docusign_connect_events` (7 columns)
- **Root cause**: Tables created by Supabase SQL used snake_case, but Prisma schema uses camelCase without @map annotations
- **Fix**: Renamed all 47 snake_case columns to camelCase to match Prisma schema expectations
- **Data preserved**: Yes (0 rows affected in dealer_agreements and docusign_connect_events; Dealer rows had null values for renamed columns)

#### IMPORTANT: Missing `type` column on Transaction table
- **Severity**: High
- **Fix**: Added `type` column with TransactionType enum (PAYMENT, REFUND, CHARGEBACK, PAYOUT) and index
- **Default**: `PAYMENT` for any existing rows

#### MODERATE: ConsentCaptureMethod enum mismatch
- **Severity**: Moderate
- **Fix**: Added `WRITTEN` to DB enum; added `IN_PERSON` and `ELECTRONIC` to Prisma schema

### Database Structure Verified
- 214 tables (was 213 + VehicleRequestCase upgraded from VIEW to TABLE)
- 69 Prisma enums all match DB
- 257 foreign keys all valid
- 23 triggers verified safe
- RLS enabled on all tables
- All Prisma model columns exist in DB

### Backend Compatibility Verified
- Auth signup/signin (400/401 responses - correct)
- Inventory search (200 with DB query)
- RBAC protection (307 redirects for unauthenticated)
- All public pages (200)
- Static assets (robots.txt, sitemap.xml)
- Dealer, buyer, admin dashboard routes
- 334 compiled routes

### Remaining Risks
- **P0**: Main branch still not deployable (stale autolenis/ dir). Merge copilot branch.
- **P1**: MicroBilt sandbox endpoints in production
- **P1**: DocuSign in sandbox mode
- **P1**: Sentry not configured
- **P2**: Prisma v7.6.0 available
- **P2**: Empty inventory table
