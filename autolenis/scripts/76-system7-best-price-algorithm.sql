-- System 7: Best-Price Algorithm Schema Extensions
-- Adds snapshot_json and decline tracking to BestPriceOption
-- Creates best_price_run_logs for audit trail

-- Add missing columns to BestPriceOption
ALTER TABLE "BestPriceOption" 
ADD COLUMN IF NOT EXISTS snapshot_json jsonb,
ADD COLUMN IF NOT EXISTS is_declined boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS declined_at timestamp,
ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now();

-- Create best_price_run_logs table
CREATE TABLE IF NOT EXISTS best_price_run_logs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  auction_id text NOT NULL REFERENCES "Auction"(id) ON DELETE CASCADE,
  run_type text NOT NULL DEFAULT 'INITIAL', -- INITIAL, RECOMPUTE
  run_at timestamp NOT NULL DEFAULT now(),
  offer_count integer NOT NULL DEFAULT 0,
  valid_offer_count integer NOT NULL DEFAULT 0,
  notes text,
  weights_used jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Indexes for best_price_run_logs
CREATE INDEX IF NOT EXISTS idx_best_price_run_logs_auction ON best_price_run_logs(auction_id);
CREATE INDEX IF NOT EXISTS idx_best_price_run_logs_run_at ON best_price_run_logs(run_at DESC);

-- Composite indexes for BestPriceOption queries
CREATE INDEX IF NOT EXISTS idx_best_price_option_auction_type_rank ON "BestPriceOption"("auctionId", "type", "rank");
CREATE INDEX IF NOT EXISTS idx_best_price_option_auction_type_declined ON "BestPriceOption"("auctionId", "type", is_declined);
