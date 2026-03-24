-- Add MFA and admin-specific fields to User table
-- Run this migration to enable MFA for admin users

-- Add MFA columns if they don't exist
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "mfaEnrolled" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "mfaFactorId" TEXT,
ADD COLUMN IF NOT EXISTS "mfaSecret" TEXT,
ADD COLUMN IF NOT EXISTS "forcePasswordReset" BOOLEAN DEFAULT FALSE;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS "AdminAuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "userId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit log queries
CREATE INDEX IF NOT EXISTS "idx_admin_audit_log_user" ON "AdminAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "idx_admin_audit_log_action" ON "AdminAuditLog"("action");
CREATE INDEX IF NOT EXISTS "idx_admin_audit_log_created" ON "AdminAuditLog"("createdAt" DESC);

-- Create admin login attempts table for rate limiting persistence
CREATE TABLE IF NOT EXISTS "AdminLoginAttempt" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "identifier" TEXT NOT NULL,
  "attemptCount" INTEGER DEFAULT 1,
  "firstAttempt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "lockedUntil" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_admin_login_attempt_identifier" ON "AdminLoginAttempt"("identifier");

-- Enable RLS on admin tables
ALTER TABLE "AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AdminLoginAttempt" ENABLE ROW LEVEL SECURITY;

-- RLS policy: Only admins can view audit logs
CREATE POLICY IF NOT EXISTS "admin_audit_log_admin_read" ON "AdminAuditLog"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE "User"."id" = auth.uid()::TEXT 
      AND "User"."role" IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- RLS policy: System can insert audit logs (via service role)
CREATE POLICY IF NOT EXISTS "admin_audit_log_service_insert" ON "AdminAuditLog"
  FOR INSERT
  WITH CHECK (TRUE);

-- Grant necessary permissions
GRANT SELECT ON "AdminAuditLog" TO authenticated;
GRANT INSERT ON "AdminAuditLog" TO service_role;
GRANT ALL ON "AdminLoginAttempt" TO service_role;

-- Comment on tables
COMMENT ON TABLE "AdminAuditLog" IS 'Audit log for all admin actions for compliance and security monitoring';
COMMENT ON TABLE "AdminLoginAttempt" IS 'Tracks login attempts for rate limiting and security';
