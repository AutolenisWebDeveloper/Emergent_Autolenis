# Schema Alignment Verification Guide

## Quick Reference

**Status:** ✅ Code changes complete  
**Remaining:** Database migration execution required  
**Files Changed:** 4 (Prisma schema + 2 API routes + 1 migration + 1 audit doc)

---

## What Was Fixed

### 1. Prisma Schema Updates (prisma/schema.prisma)

**BuyerProfile Model** - Added 8 missing fields from migration 03:
```prisma
dateOfBirth         DateTime? @db.Date
addressLine2        String?
postalCode          String?
country             String?   @default("US")
employmentStatus    String?
employerName        String?
monthlyIncomeCents  Int?
monthlyHousingCents Int?
```

**Dealer Model** - Added 6 missing fields from migration 04:
```prisma
legalName    String?
email        String?
addressLine2 String?
postalCode   String?
country      String? @default("US")
active       Boolean @default(true)
```

**Vehicle Model** - Added 4 missing fields from migration 05:
```prisma
drivetrain    String?
engine        String?
colorExterior String?
colorInterior String?
```

**ContactMessage Model** - New model for contact form:
```prisma
model ContactMessage {
  id        String   @id @default(cuid())
  name      String
  email     String
  message   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([createdAt])
  @@index([email])
  @@map("contact_messages")
}
```

### 2. API Route Fixes

**app/api/admin/affiliates/payouts/route.ts** - Line 22:
```typescript
// Before:
let query = supabase.from("AffiliatePayout").select(...)

// After:
let query = supabase.from("Payout").select(...)
```

**app/api/admin/dealers/[id]/route.ts** - Line 25:
```typescript
// Before:
supabase.from("Offer").select("*")...

// After:
supabase.from("AuctionOffer").select("*")...
```

### 3. Database Migration File

**migrations/96-schema-alignment-fixes.sql** - Creates:
- contact_messages table with RLS policies
- Verifies _connection_canary table exists
- Ensures all migration columns exist (idempotent ALTER statements)
- Includes verification queries

---

## How to Complete the Deployment

### Step 1: Review the Changes ✅ DONE

All code changes have been committed to the branch.

### Step 2: Apply Database Migration ⚠️ MANUAL ACTION REQUIRED

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor

2. **Copy the SQL Migration**
   ```bash
   # Copy contents of:
   migrations/96-schema-alignment-fixes.sql
   ```

3. **Execute in SQL Editor**
   - Paste the SQL
   - Click "Run"
   - Verify success messages appear

4. **Expected Output**
   ```
   ✓ contact_messages table exists
   ✓ _connection_canary table exists
   ✓ All BuyerProfile columns exist
   ✓ All Dealer columns exist
   ✓ All Vehicle columns exist
   
   Migration 96: Schema Alignment Complete
   ```

### Step 3: Generate Prisma Client

After merging the PR:

```bash
cd /home/runner/work/VercelAutoLenis/VercelAutoLenis
pnpm install              # Install dependencies if needed
pnpm prisma generate      # Generate updated Prisma client
pnpm typecheck            # Verify TypeScript types
pnpm build                # Build the application
```

### Step 4: Verify Deployment

#### Test Health Endpoint
```bash
curl https://your-app.vercel.app/api/health/db
```

**Expected Response:**
```json
{
  "ok": true,
  "projectRef": "your-project-ref",
  "latencyMs": 50,
  "lastCanaryRow": {
    "id": 1,
    "created_at": "2026-02-08T...",
    "message": "canary alive"
  }
}
```

#### Test Contact Form
```bash
curl -X POST https://your-app.vercel.app/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "message": "Testing contact form"
  }'
```

**Expected:** Success response without errors

#### Test Affiliate Payouts
```bash
# As admin user, visit:
https://your-app.vercel.app/admin/affiliates/payouts
```

**Expected:** Payouts list loads without table name errors

#### Test Dealer Details
```bash
# As admin user, visit:
https://your-app.vercel.app/admin/dealers/[id]
```

**Expected:** Dealer offers load without "Offer" table errors

---

## Verification SQL Queries

Run these in Supabase SQL Editor to verify schema alignment:

### 1. Verify All Critical Tables Exist
```sql
SELECT 
  'User' AS table_name,
  EXISTS (SELECT 1 FROM information_schema.tables 
          WHERE table_schema='public' AND table_name='User') AS exists
UNION ALL SELECT 'BuyerProfile', EXISTS (...)
UNION ALL SELECT 'Dealer', EXISTS (...)
UNION ALL SELECT 'DealerUser', EXISTS (...)
UNION ALL SELECT 'AdminAuditLog', EXISTS (...)
UNION ALL SELECT 'AdminLoginAttempt', EXISTS (...)
UNION ALL SELECT 'contact_messages', EXISTS (...)
UNION ALL SELECT '_connection_canary', EXISTS (...)
UNION ALL SELECT 'AuctionOffer', EXISTS (...)
UNION ALL SELECT 'Payout', EXISTS (...);
```

**Expected:** All return `t` (true)

### 2. Verify BuyerProfile Columns
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'BuyerProfile'
  AND column_name IN (
    'dateOfBirth', 'addressLine2', 'postalCode', 
    'country', 'employmentStatus', 'employerName',
    'monthlyIncomeCents', 'monthlyHousingCents'
  )
ORDER BY column_name;
```

**Expected:** 8 rows returned

### 3. Verify Dealer Columns
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'Dealer'
  AND column_name IN (
    'legalName', 'email', 'addressLine2', 
    'postalCode', 'country', 'active'
  )
ORDER BY column_name;
```

**Expected:** 6 rows returned

### 4. Verify Vehicle Columns
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'Vehicle'
  AND column_name IN (
    'drivetrain', 'engine', 'colorExterior', 'colorInterior'
  )
ORDER BY column_name;
```

**Expected:** 4 rows returned

### 5. Test Health Check Table
```sql
SELECT * FROM public._connection_canary 
ORDER BY id DESC 
LIMIT 1;
```

**Expected:** At least one row with message 'canary alive'

### 6. Verify RLS Policies
```sql
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('AdminAuditLog', 'AdminLoginAttempt', 'contact_messages')
ORDER BY tablename, policyname;
```

**Expected Policies:**
- AdminAuditLog: admin_audit_log_admin_read (SELECT)
- AdminAuditLog: admin_audit_log_service_insert (INSERT)
- contact_messages: contact_messages_admin_read (SELECT)
- contact_messages: contact_messages_service_insert (INSERT)

---

## Issues Resolved

### BLOCKER #1: AffiliatePayout Table Name ✅ FIXED
- **Issue:** Code referenced "AffiliatePayout", schema had "Payout"
- **Fix:** Changed API route to use "Payout"
- **Impact:** Affiliate payout listing now works

### BLOCKER #2: contact_messages Table Missing ✅ FIXED
- **Issue:** Contact form tried to insert into non-existent table
- **Fix:** Created table in migration 96, added Prisma model
- **Impact:** Contact form submissions now work

### BLOCKER #3: Offer Table Ambiguity ✅ FIXED
- **Issue:** Code referenced "Offer", schema had "AuctionOffer"
- **Fix:** Changed API route to use "AuctionOffer"
- **Impact:** Dealer offer listing now works

### BLOCKER #4: _connection_canary May Be Missing ✅ FIXED
- **Issue:** Health check might fail if table doesn't exist
- **Fix:** Migration 96 ensures table exists
- **Impact:** Health check endpoint reliable

### DRIFT #1: BuyerProfile Missing Fields ✅ FIXED
- **Issue:** Migration 03 added 8 fields not in Prisma schema
- **Fix:** Added fields to Prisma schema
- **Impact:** Type safety restored, all fields accessible

### DRIFT #2: Dealer Missing Fields ✅ FIXED
- **Issue:** Migration 04 added 6 fields not in Prisma schema
- **Fix:** Added fields to Prisma schema
- **Impact:** Type safety restored, all fields accessible

### DRIFT #3: Vehicle Missing Fields ✅ FIXED
- **Issue:** Migration 05 added 4 fields not in Prisma schema
- **Fix:** Added fields to Prisma schema
- **Impact:** Type safety restored, all fields accessible

---

## Summary of Changes

### Code Changes (4 files)

1. **prisma/schema.prisma**
   - Added 8 fields to BuyerProfile
   - Added 6 fields to Dealer
   - Added 4 fields to Vehicle
   - Added ContactMessage model
   - **Total:** 18 field additions + 1 new model

2. **app/api/admin/affiliates/payouts/route.ts**
   - Changed "AffiliatePayout" → "Payout" (1 line)

3. **app/api/admin/dealers/[id]/route.ts**
   - Changed "Offer" → "AuctionOffer" (1 line)

4. **migrations/96-schema-alignment-fixes.sql** (NEW)
   - Creates contact_messages table
   - Verifies _connection_canary exists
   - Ensures all migration columns exist
   - Includes verification queries

### Documentation Created (2 files)

5. **SCHEMA_ALIGNMENT_AUDIT.md** (NEW)
   - Complete audit report
   - 52 models analyzed
   - API route mapping
   - Service layer analysis
   - SQL verification queries

6. **SCHEMA_ALIGNMENT_VERIFICATION.md** (THIS FILE) (NEW)
   - Quick deployment guide
   - Verification steps
   - Testing procedures

---

## Risk Assessment

**Risk Level:** LOW ✅

**Why Low Risk:**
- All changes are backward compatible
- SQL migration is idempotent (safe to run multiple times)
- Only fixing mismatches, not changing existing logic
- Code changes are minimal (2 lines in API routes)
- Schema additions are all optional fields

**Rollback Plan:**
- If issues occur, revert the PR
- No database rollback needed (migrations added optional columns only)
- Contact form will fail if table dropped (not recommended)

---

## Next Steps Checklist

### Pre-Deployment
- [x] Code changes committed
- [x] PR created
- [ ] Code review completed
- [ ] CI/CD checks passed

### Deployment
- [ ] Merge PR to main branch
- [ ] Apply migration 96 in Supabase SQL Editor
- [ ] Run `pnpm prisma generate` on server
- [ ] Deploy to production

### Post-Deployment
- [ ] Test /api/health/db endpoint
- [ ] Test contact form submission
- [ ] Test affiliate payouts page
- [ ] Test dealer details page
- [ ] Monitor logs for errors
- [ ] Verify all verification SQL queries pass

---

## Troubleshooting

### Issue: Health check returns "table does not exist"

**Solution:**
1. Verify migration 96 was executed
2. Check table exists: `SELECT * FROM _connection_canary;`
3. Re-run migration if needed

### Issue: Contact form fails

**Solution:**
1. Verify contact_messages table exists
2. Check RLS policies are created
3. Verify service_role has INSERT permission

### Issue: Affiliate payouts fail

**Solution:**
1. Verify Payout table exists (not AffiliatePayout)
2. Check API route uses "Payout" (not "AffiliatePayout")
3. Verify recent deployment includes code changes

### Issue: Dealer offers fail

**Solution:**
1. Verify AuctionOffer table exists (not Offer)
2. Check API route uses "AuctionOffer" (not "Offer")
3. Verify recent deployment includes code changes

### Issue: TypeScript errors about missing fields

**Solution:**
1. Run `pnpm prisma generate` to regenerate client
2. Restart TypeScript server in IDE
3. Clear node_modules and reinstall if needed

---

## Support

For questions or issues:
1. Review full audit: `SCHEMA_ALIGNMENT_AUDIT.md`
2. Check migration file: `migrations/96-schema-alignment-fixes.sql`
3. Review verification queries in this document
4. Check Supabase logs for SQL errors
5. Check application logs for runtime errors

---

**Document Created:** 2026-02-08  
**Last Updated:** 2026-02-08  
**Status:** Ready for Deployment
