# Row Level Security (RLS) Setup Guide

## Overview

This project uses Supabase Row Level Security (RLS) to protect data at the database level. RLS ensures that users can only access data they're authorized to see, regardless of how they connect to the database.

## Applying RLS Policies

There are **three methods** to apply the RLS policies:

### Method 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `scripts/02-add-rls-policies.sql`
5. Paste into the SQL Editor
6. Click **Run** to execute

**Advantages:**
- No SSL configuration needed
- Visual feedback of execution
- Can review policies in the Policies tab after execution

### Method 2: v0 Script Execution

If you're working in v0, the platform can execute SQL scripts directly with proper SSL handling:

1. The script `scripts/02-add-rls-policies.sql` is already in your project
2. v0 will automatically handle SSL connections
3. Just click "Run" when prompted

### Method 3: TypeScript Migration (For CI/CD)

For programmatic execution or CI/CD pipelines:

\`\`\`bash
# Ensure environment variables are set
export SUPABASE_URL="your-project-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run the TypeScript migration
bun run scripts/migrations/02-add-rls-policies.ts
\`\`\`

### Method 4: psql Command Line (Advanced)

If you prefer command-line tools:

\`\`\`bash
# Get your connection string from Supabase Dashboard > Settings > Database
# It should look like: postgresql://postgres:[YOUR-PASSWORD]@[HOST]:5432/postgres

psql "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?sslmode=require" \
  -f scripts/02-add-rls-policies.sql
\`\`\`

**Important:** Always include `?sslmode=require` in the connection string for Supabase.

## Verifying RLS Policies

After applying policies, verify them in the Supabase Dashboard:

1. Go to **Database** > **Policies**
2. You should see policies for each table
3. Check that each table shows "RLS enabled"

## RLS Policy Structure

### User Access Patterns

1. **Users**: Can view/update their own data only
2. **Buyers**: Can view/update their own profile and deals
3. **Dealers**: Can view/manage their inventory and related deals
4. **Affiliates**: Can view their referrals, commissions, and payouts
5. **Admins**: Have full access to all data

### Helper Functions

Two helper functions are created:

- `auth.user_id()`: Returns the current user's ID from JWT
- `auth.is_admin()`: Returns true if user has ADMIN or SUPER_ADMIN role

### Policy Examples

**User table:**
- Users can SELECT their own row
- Users can UPDATE their own row
- Admins can do anything

**BuyerProfile table:**
- Buyers can SELECT/UPDATE their own profile
- Admins can do anything

**InventoryItem table:**
- Everyone can SELECT items with status = 'AVAILABLE'
- Dealers can manage their own inventory
- Admins can do anything

## Troubleshooting

### SSL Connection Errors

If you see "SSL connection is required":

- Use Method 1 (Supabase Dashboard) - no SSL config needed
- For psql, always add `?sslmode=require` to connection string
- For TypeScript, use the provided migration script

### Policy Errors After Applying

If users can't access data after RLS is enabled:

1. Check that JWT contains correct `sub` and `role` claims
2. Verify user roles in the User table match policy expectations
3. Test with admin account first (should have full access)
4. Review Supabase logs for policy violations

### Testing RLS Policies

Test policies by trying to access data as different user types:

\`\`\`typescript
// Test as regular user
const { data, error } = await supabase
  .from('User')
  .select('*')
  .eq('id', userId)

// Should only return the current user's data

// Test as admin
const { data, error } = await supabase
  .from('User')
  .select('*')

// Should return all users
\`\`\`

## Security Best Practices

1. **Always enable RLS** on tables containing user data
2. **Test policies** before deploying to production
3. **Use service role key** sparingly (bypasses RLS)
4. **Monitor policy violations** in Supabase logs
5. **Review policies** when adding new features or user types

## Next Steps

After applying RLS policies:

1. ✅ Test authentication flows
2. ✅ Verify users can only see their own data
3. ✅ Test admin access to all data
4. ✅ Monitor application logs for RLS errors
5. ✅ Update application code if any queries fail due to RLS
\`\`\`

\`\`\`json file="" isHidden
