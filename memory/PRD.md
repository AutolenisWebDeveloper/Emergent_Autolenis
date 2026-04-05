# AutoLenis - Product Requirements Document

## Original Problem Statement
Deploy the AutoLenis repository and make the prequalification system fully implemented and working end-to-end.

## Architecture
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL via Supabase
- **ORM**: Prisma (schema) + Supabase client (runtime)
- **Auth**: JWT + Supabase Auth
- **Payments**: Stripe
- **Email**: Resend

## What's Been Implemented (2026-04-05)

### Deployment Fixes
1. ✅ Repository cloned and deployed to Vercel
2. ✅ TypeScript compilation fixed (excluded stale `autolenis/` folder)
3. ✅ Build succeeds (334 pages)

### Database Trigger Fix
4. ✅ Fixed `prequal_block_float_money_writes` trigger
   - Original: Blocked INSERT/UPDATE when dollar fields were non-null
   - Fix: Auto-computes dollar values from cents values
   - Migration: `supabase/migrations/20260405070000_fix_prequal_money_trigger.sql`

### Prequalification System
5. ✅ Full E2E prequal flow working:
   - Authentication
   - Profile update
   - Consent capture (PrequalConsentArtifact)
   - Session tracking (PrequalSession)
   - Scoring computation
   - **Canonical PreQualification persistence**
   - Result rendering
   - Retry behavior (replaces old prequal)
   - GET endpoint (resume state)

### Email System
6. ✅ Audited and verified:
   - Resend integration configured
   - Email templates in `lib/email/triggers.ts`
   - Cron job: `/api/cron/prequal/message-delivery` (every 5 min)
   - EmailSendLog tracking

## Files Changed
| Date | File | Change |
|------|------|--------|
| 2026-04-05 | tsconfig.json | Added `"autolenis"` to exclude array |
| 2026-04-05 | app/api/buyer/prequal/route.ts | Full canonical persistence implementation |
| 2026-04-05 | supabase/migrations/20260405070000_fix_prequal_money_trigger.sql | DB trigger fix |

## Database Changes Applied
- Modified `public.prequal_block_float_money_writes()` function
- Now auto-computes: maxOtd, estimatedMonthlyMin, estimatedMonthlyMax from cents values

## Test Account
- Email: autolenis01@gmail.com
- Password: Louis101$

## Production URL
https://www.autolenis.com

## Verified Database Writes
- PreQualification: ✅
- PrequalSession: ✅
- PrequalConsentArtifact: ✅
- BuyerProfile: ✅

## Remaining Backlog
### P1 (Next)
- Prisma runtime initialization in Vercel (currently using Supabase client)
- MicroBilt production endpoints

### P2 (Future)
- Sentry monitoring
- DocuSign production integration
