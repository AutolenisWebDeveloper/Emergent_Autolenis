... existing code ...

## Notes

- All existing data is preserved
- Monetary conversions multiply by 100 (dollars → cents)
- Original columns kept for compatibility during transition
- Indexes added for performance optimization

## Manual Migrations (Run in Supabase Dashboard SQL Editor)

Some tables need to be created manually in the **Supabase Dashboard → SQL Editor** due to SSL requirements:

### RefinanceLead Table

\`\`\`sql
-- Create RefinanceLead table
CREATE TABLE IF NOT EXISTS "RefinanceLead" (
  "id" TEXT PRIMARY KEY,
  "leadType" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "vehicleYear" INTEGER NOT NULL,
  "vehicleMake" TEXT NOT NULL,
  "vehicleModel" TEXT NOT NULL,
  "vehicleMileage" INTEGER NOT NULL,
  "currentLender" TEXT,
  "currentLoanBalance" INTEGER,
  "currentMonthlyPayment" INTEGER,
  "remainingMonths" INTEGER,
  "desiredMonthlyPayment" INTEGER,
  "qualified" BOOLEAN NOT NULL,
  "qualificationNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE "RefinanceLead" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view refinance leads"
  ON "RefinanceLead"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User"."id" = auth.uid()
      AND "User"."role" = 'ADMIN'
    )
  );
\`\`\`

### Admin MFA and Audit Tables

\`\`\`sql
-- Add MFA fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "mfaEnabled" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT,
ADD COLUMN IF NOT EXISTS "lastPasswordChange" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "forcePasswordReset" BOOLEAN DEFAULT FALSE;

-- Create AdminAuditLog table
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create AdminLoginAttempt table
CREATE TABLE IF NOT EXISTS "AdminLoginAttempt" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT NOT NULL,
  "success" BOOLEAN NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes
CREATE INDEX IF NOT EXISTS "AdminAuditLog_userId_idx" ON "AdminAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");
CREATE INDEX IF NOT EXISTS "AdminLoginAttempt_email_idx" ON "AdminLoginAttempt"("email");
CREATE INDEX IF NOT EXISTS "AdminLoginAttempt_createdAt_idx" ON "AdminLoginAttempt"("createdAt");

-- Add RLS policies
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminLoginAttempt" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON "AdminAuditLog"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User"."id" = auth.uid()
      AND "User"."role" IN ('ADMIN', 'SUPER_ADMIN')
    )
  );
