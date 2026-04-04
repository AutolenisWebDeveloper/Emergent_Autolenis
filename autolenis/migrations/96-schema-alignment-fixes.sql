-- ============================================
-- Migration 96: Schema Alignment Fixes
-- Purpose: Fix code ↔ database schema mismatches
-- Date: 2026-02-08
-- ============================================
-- Run this in Supabase SQL Editor after reviewing SCHEMA_ALIGNMENT_AUDIT.md
-- This migration is idempotent and safe to run multiple times
-- ============================================

-- Fix #1: Create contact_messages table
-- ----------------------------------------
-- Used by /api/contact/route.ts for contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for timestamp-based queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at 
  ON public.contact_messages(created_at DESC);

-- Add index for email lookups (useful for spam detection)
CREATE INDEX IF NOT EXISTS idx_contact_messages_email 
  ON public.contact_messages(email);

-- Enable RLS (service role used in API, so permissive policy)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions to service role
GRANT INSERT ON public.contact_messages TO service_role;
GRANT SELECT ON public.contact_messages TO service_role;

-- Optional: Allow admins to view contact messages
CREATE POLICY IF NOT EXISTS "contact_messages_admin_read" ON public.contact_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public."User" 
      WHERE public."User"."id" = auth.uid()::TEXT 
      AND public."User"."role" IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Optional: Service role can insert (for API route)
CREATE POLICY IF NOT EXISTS "contact_messages_service_insert" ON public.contact_messages
  FOR INSERT
  WITH CHECK (TRUE);

-- Add comment to document table purpose
COMMENT ON TABLE public.contact_messages IS 'Contact form submissions from website';

-- Fix #2: Verify _connection_canary exists (from migration 95)
-- ----------------------------------------
-- This table should already exist from migration 95
-- Add verification and creation if missing
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '_connection_canary'
  ) THEN
    -- Create canary table if it doesn't exist
    CREATE TABLE public._connection_canary (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      message TEXT
    );
    
    -- Insert initial test row
    INSERT INTO public._connection_canary (message) 
    VALUES ('canary alive');
    
    -- Grant SELECT to service role for health checks
    GRANT SELECT ON public._connection_canary TO service_role;
    
    -- Add comment
    COMMENT ON TABLE public._connection_canary IS 'Health check table for /api/health/db';
    
    RAISE NOTICE 'Created _connection_canary table';
  ELSE
    RAISE NOTICE '_connection_canary table already exists';
  END IF;
END $$;

-- Fix #3: Ensure all columns from previous migrations exist
-- ----------------------------------------
-- These columns should exist from migrations 03, 04, 05
-- Adding them here with IF NOT EXISTS for safety

-- BuyerProfile columns (from migration 03)
DO $$
BEGIN
  ALTER TABLE public."BuyerProfile" 
    ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;
  RAISE NOTICE 'Added dateOfBirth to BuyerProfile (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column dateOfBirth already exists in BuyerProfile';
END $$;

DO $$
BEGIN
  ALTER TABLE public."BuyerProfile" 
    ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
  RAISE NOTICE 'Added addressLine2 to BuyerProfile (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column addressLine2 already exists in BuyerProfile';
END $$;

DO $$
BEGIN
  ALTER TABLE public."BuyerProfile" 
    ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
  RAISE NOTICE 'Added postalCode to BuyerProfile (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column postalCode already exists in BuyerProfile';
END $$;

DO $$
BEGIN
  ALTER TABLE public."BuyerProfile" 
    ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';
  RAISE NOTICE 'Added country to BuyerProfile (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column country already exists in BuyerProfile';
END $$;

DO $$
BEGIN
  ALTER TABLE public."BuyerProfile" 
    ADD COLUMN IF NOT EXISTS "employmentStatus" TEXT;
  RAISE NOTICE 'Added employmentStatus to BuyerProfile (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column employmentStatus already exists in BuyerProfile';
END $$;

DO $$
BEGIN
  ALTER TABLE public."BuyerProfile" 
    ADD COLUMN IF NOT EXISTS "employerName" TEXT;
  RAISE NOTICE 'Added employerName to BuyerProfile (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column employerName already exists in BuyerProfile';
END $$;

DO $$
BEGIN
  ALTER TABLE public."BuyerProfile" 
    ADD COLUMN IF NOT EXISTS "monthlyIncomeCents" INTEGER;
  RAISE NOTICE 'Added monthlyIncomeCents to BuyerProfile (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column monthlyIncomeCents already exists in BuyerProfile';
END $$;

DO $$
BEGIN
  ALTER TABLE public."BuyerProfile" 
    ADD COLUMN IF NOT EXISTS "monthlyHousingCents" INTEGER;
  RAISE NOTICE 'Added monthlyHousingCents to BuyerProfile (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column monthlyHousingCents already exists in BuyerProfile';
END $$;

-- Dealer columns (from migration 04)
DO $$
BEGIN
  ALTER TABLE public."Dealer"
    ADD COLUMN IF NOT EXISTS "legalName" TEXT;
  RAISE NOTICE 'Added legalName to Dealer (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column legalName already exists in Dealer';
END $$;

DO $$
BEGIN
  ALTER TABLE public."Dealer"
    ADD COLUMN IF NOT EXISTS "email" TEXT;
  RAISE NOTICE 'Added email to Dealer (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column email already exists in Dealer';
END $$;

DO $$
BEGIN
  ALTER TABLE public."Dealer"
    ADD COLUMN IF NOT EXISTS "addressLine2" TEXT;
  RAISE NOTICE 'Added addressLine2 to Dealer (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column addressLine2 already exists in Dealer';
END $$;

DO $$
BEGIN
  ALTER TABLE public."Dealer"
    ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
  RAISE NOTICE 'Added postalCode to Dealer (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column postalCode already exists in Dealer';
END $$;

DO $$
BEGIN
  ALTER TABLE public."Dealer"
    ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US';
  RAISE NOTICE 'Added country to Dealer (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column country already exists in Dealer';
END $$;

DO $$
BEGIN
  ALTER TABLE public."Dealer"
    ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
  RAISE NOTICE 'Added active to Dealer (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column active already exists in Dealer';
END $$;

-- Vehicle columns (from migration 05)
DO $$
BEGIN
  ALTER TABLE public."Vehicle"
    ADD COLUMN IF NOT EXISTS "drivetrain" TEXT;
  RAISE NOTICE 'Added drivetrain to Vehicle (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column drivetrain already exists in Vehicle';
END $$;

DO $$
BEGIN
  ALTER TABLE public."Vehicle"
    ADD COLUMN IF NOT EXISTS "engine" TEXT;
  RAISE NOTICE 'Added engine to Vehicle (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column engine already exists in Vehicle';
END $$;

DO $$
BEGIN
  ALTER TABLE public."Vehicle"
    ADD COLUMN IF NOT EXISTS "colorExterior" TEXT;
  RAISE NOTICE 'Added colorExterior to Vehicle (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column colorExterior already exists in Vehicle';
END $$;

DO $$
BEGIN
  ALTER TABLE public."Vehicle"
    ADD COLUMN IF NOT EXISTS "colorInterior" TEXT;
  RAISE NOTICE 'Added colorInterior to Vehicle (if not exists)';
EXCEPTION
  WHEN duplicate_column THEN
    RAISE NOTICE 'Column colorInterior already exists in Vehicle';
END $$;

-- ============================================
-- Verification Queries
-- ============================================

-- Verify contact_messages table exists
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'contact_messages'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✓ contact_messages table exists';
  ELSE
    RAISE EXCEPTION '✗ contact_messages table missing';
  END IF;
END $$;

-- Verify _connection_canary table exists
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = '_connection_canary'
  ) INTO table_exists;
  
  IF table_exists THEN
    RAISE NOTICE '✓ _connection_canary table exists';
  ELSE
    RAISE EXCEPTION '✗ _connection_canary table missing';
  END IF;
END $$;

-- Verify BuyerProfile columns
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(col) INTO missing_columns
  FROM (
    SELECT unnest(ARRAY[
      'dateOfBirth', 'addressLine2', 'postalCode', 
      'country', 'employmentStatus', 'employerName',
      'monthlyIncomeCents', 'monthlyHousingCents'
    ]) AS col
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'BuyerProfile'
      AND column_name = expected.col
  );
  
  IF missing_columns IS NULL OR array_length(missing_columns, 1) IS NULL THEN
    RAISE NOTICE '✓ All BuyerProfile columns exist';
  ELSE
    RAISE EXCEPTION '✗ Missing BuyerProfile columns: %', array_to_string(missing_columns, ', ');
  END IF;
END $$;

-- Verify Dealer columns
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(col) INTO missing_columns
  FROM (
    SELECT unnest(ARRAY[
      'legalName', 'email', 'addressLine2', 
      'postalCode', 'country', 'active'
    ]) AS col
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'Dealer'
      AND column_name = expected.col
  );
  
  IF missing_columns IS NULL OR array_length(missing_columns, 1) IS NULL THEN
    RAISE NOTICE '✓ All Dealer columns exist';
  ELSE
    RAISE EXCEPTION '✗ Missing Dealer columns: %', array_to_string(missing_columns, ', ');
  END IF;
END $$;

-- Verify Vehicle columns
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(col) INTO missing_columns
  FROM (
    SELECT unnest(ARRAY[
      'drivetrain', 'engine', 'colorExterior', 'colorInterior'
    ]) AS col
  ) expected
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'Vehicle'
      AND column_name = expected.col
  );
  
  IF missing_columns IS NULL OR array_length(missing_columns, 1) IS NULL THEN
    RAISE NOTICE '✓ All Vehicle columns exist';
  ELSE
    RAISE EXCEPTION '✗ Missing Vehicle columns: %', array_to_string(missing_columns, ', ');
  END IF;
END $$;

-- ============================================
-- Final Success Message
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration 96: Schema Alignment Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update Prisma schema with missing fields';
  RAISE NOTICE '2. Run: pnpm prisma generate';
  RAISE NOTICE '3. Update API routes (AffiliatePayout → Payout, Offer → AuctionOffer)';
  RAISE NOTICE '4. Test: curl /api/health/db';
  RAISE NOTICE '5. Deploy to production';
  RAISE NOTICE '';
END $$;
