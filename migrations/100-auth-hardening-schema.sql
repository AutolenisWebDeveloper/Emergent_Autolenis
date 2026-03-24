-- Migration: Auth Hardening — Role Enum Expansion + Supabase Auth Fields
-- This migration is idempotent and safe to re-run.

-- Step 1: Expand UserRole enum with missing values used at runtime
-- These roles are referenced by middleware, auth routes, and admin-auth but were not in the DB enum.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DEALER_USER' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
    ALTER TYPE "UserRole" ADD VALUE 'DEALER_USER';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SUPER_ADMIN' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'AFFILIATE_ONLY' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')) THEN
    ALTER TYPE "UserRole" ADD VALUE 'AFFILIATE_ONLY';
  END IF;
END$$;

-- Step 2: Add auth_user_id (maps to Supabase auth.users.id) and session_version (JWT revocation)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS session_version INT NOT NULL DEFAULT 0;

-- Step 3: Create index for auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_auth_user_id ON "User"(auth_user_id);

-- Step 4: Create password_reset_tokens table if not exists (used by password-reset.service.ts)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Step 5: Create EmailSendLog table for idempotent email delivery
CREATE TABLE IF NOT EXISTS "EmailSendLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT UNIQUE NOT NULL,
  email_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  resend_message_id TEXT,
  user_id TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_send_log_idempotency ON "EmailSendLog"(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_email_send_log_user_id ON "EmailSendLog"(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_type ON "EmailSendLog"(email_type);
