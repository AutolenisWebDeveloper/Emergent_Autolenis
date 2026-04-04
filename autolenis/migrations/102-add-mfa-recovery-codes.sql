-- Migration: Add MFA recovery codes hash column
-- Stores JSON array of SHA-256 hashed recovery codes. Nullable (not all users use MFA).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS mfa_recovery_codes_hash TEXT;
