# Running RLS (Row Level Security) Policies

## Overview

RLS policies are **critical** for database security. They prevent unauthorized access to data by enforcing row-level permissions.

**Status**: RLS policies are created but NOT yet executed on the database.

---

## Why RLS is Critical

Without RLS policies:
- ❌ Any authenticated user could access any data
- ❌ Buyers could see other buyers' deals
- ❌ Dealers could access competitors' offers
- ❌ Affiliates could view other affiliates' commissions
- ❌ Users could modify admin-only data

With RLS policies:
- ✅ Users can only access their own data
- ✅ Role-based access control enforced at database level
- ✅ Service role operations still work (bypasses RLS)
- ✅ Defense in depth security

---

## Method 1: Via Supabase Dashboard (Recommended)

### Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your AutoLenis project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy RLS Policies**
   - Open `scripts/02-add-rls-policies.sql` in your code
   - Copy the entire contents

4. **Execute SQL**
   - Paste into SQL Editor
   - Click "Run" button
   - Wait for confirmation

5. **Apply Admin RLS Fixes**
   - Open `scripts/99-admin-rls-audit-fixes.sql`
   - Run it after the base policies to cover admin-only tables

6. **Verify Execution**
   - Check for success message
   - No errors should appear

### Verification:

\`\`\`sql
-- Check RLS is enabled on User table
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'User';

-- Should return: rowsecurity = true

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public';

-- Should return 60+ policies
\`\`\`

---

## Method 2: Via TypeScript Migration Script

### Requirements:
- Node.js installed
- Environment variables configured
- Database connection available

### Steps:

1. **Ensure Environment Variables**
   \`\`\`bash
   # Check these are set:
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   \`\`\`

2. **Run Migration**
   \`\`\`bash
   npm run db:migrate
   \`\`\`

3. **Follow Console Output**
   - Script will log progress
   - Each policy execution is logged
   - Errors will be reported clearly

### What the Script Does:
- Connects to Supabase using service role key
- Enables RLS on all tables
- Creates policies for each table and role
- Logs success/failure for each step
- Provides detailed error messages

---

## Method 3: Via psql Command Line

### Requirements:
- PostgreSQL client (`psql`) installed
- Database connection string

### Steps:

1. **Get Database Connection String**
   - From Supabase Dashboard → Project Settings → Database
   - Use "Connection pooling" mode
   - Enable SSL

2. **Connect to Database**
   \`\`\`bash
   psql "postgresql://postgres:[YOUR_PASSWORD]@[YOUR_HOST]:5432/postgres?sslmode=require"
   \`\`\`

3. **Execute SQL Files**
   \`\`\`sql
   \i scripts/02-add-rls-policies.sql
   \i scripts/99-admin-rls-audit-fixes.sql
   \`\`\`

4. **Exit**
   \`\`\`sql
   \q
   \`\`\`

---

## Troubleshooting

### Error: "SSL connection is required"

**Solution**: Ensure you're using SSL connection mode.

For psql:
\`\`\`bash
psql "postgresql://...?sslmode=require"
\`\`\`

For Supabase client, SSL is automatic.

### Error: "Permission denied"

**Solution**: You need superuser or service_role permissions.

- Use `SUPABASE_SERVICE_ROLE_KEY`, not `SUPABASE_ANON_KEY`
- Check key is correct in environment variables

### Error: "Relation does not exist"

**Solution**: Run database initialization first.

\`\`\`bash
# Make sure tables exist
npm run db:setup
# Or
prisma db push
\`\`\`

### Error: "Policy already exists"

**Solution**: Policies were already created. This is safe to ignore.

To drop existing policies first:
\`\`\`sql
-- Drop all policies on a table
DROP POLICY IF EXISTS "Users can read own data" ON "User";
-- Repeat for each policy
\`\`\`

Or use the script which has `CREATE POLICY IF NOT EXISTS`.

---

## Verification Checklist

After running RLS policies, verify:

- [ ] RLS is enabled on all tables (check `pg_tables.rowsecurity`)
- [ ] Policies exist for each role (check `pg_policies`)
- [ ] Test user can access their own data
- [ ] Test user CANNOT access other users' data
- [ ] Admin can access all data (when using admin account)
- [ ] Service role bypasses RLS (for system operations)

### Test Queries:

\`\`\`sql
-- Test as authenticated user
SET request.jwt.claim.sub TO 'user-id-here';
SELECT * FROM "User" WHERE id = 'user-id-here'; -- Should work
SELECT * FROM "User" WHERE id != 'user-id-here'; -- Should return nothing

-- Test as admin
SET request.jwt.claim.role TO 'ADMIN';
SELECT * FROM "User"; -- Should return all users
\`\`\`

---

## Post-Deployment Monitoring

After enabling RLS:

1. **Monitor Error Logs**
   - Check for "permission denied" errors
   - Verify they're expected (unauthorized access attempts)

2. **Test Critical Flows**
   - User signup and login
   - Buyer viewing their auctions
   - Dealer viewing assigned auctions
   - Admin accessing dashboard

3. **Performance Check**
   - RLS policies add slight overhead
   - Monitor query performance
   - Add indexes if needed

---

## Rollback Procedure

If RLS causes issues:

\`\`\`sql
-- EMERGENCY: Temporarily disable RLS on a table
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;

-- Re-enable when ready
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
\`\`\`

**Warning**: Only disable RLS in emergency. Investigate and fix the policy instead.

---

## Next Steps

After RLS is deployed:

1. Run penetration testing
2. Verify security audit passes
3. Document policy exceptions
4. Set up monitoring for policy violations
5. Regular policy review (quarterly)

---

## Support

If you encounter issues:

1. Check Supabase logs in dashboard
2. Review this troubleshooting guide
3. Check `docs/DEPLOYMENT_CHECKLIST.md`
4. Contact database administrator
