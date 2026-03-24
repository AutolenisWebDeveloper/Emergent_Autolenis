-- System 6: Dealer Offer Submission & Management Schema

-- Add missing columns to AuctionOffer
ALTER TABLE "AuctionOffer" ADD COLUMN IF NOT EXISTS "offer_notes" TEXT;
ALTER TABLE "AuctionOffer" ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP;
ALTER TABLE "AuctionOffer" ADD COLUMN IF NOT EXISTS "is_valid" BOOLEAN DEFAULT TRUE;
ALTER TABLE "AuctionOffer" ADD COLUMN IF NOT EXISTS "validation_errors_json" JSONB;

-- Update existing records
UPDATE "AuctionOffer" SET "submitted_at" = "createdAt" WHERE "submitted_at" IS NULL;
UPDATE "AuctionOffer" SET "is_valid" = TRUE WHERE "is_valid" IS NULL;

-- Add is_promoted_option to financing options
ALTER TABLE "auction_offer_financing_options" ADD COLUMN IF NOT EXISTS "is_promoted_option" BOOLEAN DEFAULT FALSE;
ALTER TABLE "auction_offer_financing_options" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Create unique index for one offer per dealer per auction
CREATE UNIQUE INDEX IF NOT EXISTS "AuctionOffer_auctionId_dealer_id_unique" 
ON "AuctionOffer"("auctionId", "dealer_id") 
WHERE "dealer_id" IS NOT NULL;

-- Create offer_audit_logs table
CREATE TABLE IF NOT EXISTS "offer_audit_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  "auction_offer_id" TEXT NOT NULL REFERENCES "AuctionOffer"("id") ON DELETE CASCADE,
  "changed_by_role" TEXT NOT NULL CHECK ("changed_by_role" IN ('DEALER', 'ADMIN', 'SYSTEM')),
  "changed_by_user_id" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
  "action_type" TEXT NOT NULL,
  "previous_value_json" JSONB,
  "new_value_json" JSONB,
  "notes" TEXT,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "offer_audit_logs_auction_offer_id_idx" ON "offer_audit_logs"("auction_offer_id");
CREATE INDEX IF NOT EXISTS "offer_audit_logs_action_type_idx" ON "offer_audit_logs"("action_type");
CREATE INDEX IF NOT EXISTS "offer_audit_logs_changed_by_user_id_idx" ON "offer_audit_logs"("changed_by_user_id");

-- Enable RLS
ALTER TABLE "offer_audit_logs" ENABLE ROW LEVEL SECURITY;
