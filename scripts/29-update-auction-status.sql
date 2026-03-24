-- Update Auction status enum to match specification
-- Add new enum values only, don't try to update non-existent values
DO $$ BEGIN
  ALTER TYPE "AuctionStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
  ALTER TYPE "AuctionStatus" ADD VALUE IF NOT EXISTS 'OPEN';
  ALTER TYPE "AuctionStatus" ADD VALUE IF NOT EXISTS 'NO_OFFERS';
EXCEPTION
  WHEN others THEN null;
END $$;

-- Add active field to shortlists (skip the UPDATE that references non-existent status)
ALTER TABLE "Shortlist" ADD COLUMN IF NOT EXISTS "active" BOOLEAN DEFAULT true;
