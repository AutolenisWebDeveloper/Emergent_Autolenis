-- Trade-In Information Table
-- Stores buyer-provided, unverified trade-in information
-- AutoLenis does NOT appraise, value, or participate in trade-in transactions

CREATE TABLE IF NOT EXISTS "TradeIn" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "buyerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "auctionId" TEXT REFERENCES "Auction"("id") ON DELETE SET NULL,
  "shortlistId" TEXT REFERENCES "Shortlist"("id") ON DELETE SET NULL,
  
  -- Whether buyer has a trade-in
  "hasTrade" BOOLEAN NOT NULL DEFAULT false,
  
  -- Vehicle details (all optional, buyer-provided)
  "vin" TEXT,
  "mileage" INTEGER,
  "condition" TEXT CHECK ("condition" IN ('excellent', 'good', 'fair', 'poor')),
  
  -- Photos (optional array of URLs)
  "photoUrls" JSONB DEFAULT '[]'::jsonb,
  
  -- Loan/Payoff info (optional, buyer-provided estimate)
  "hasLoan" BOOLEAN,
  "estimatedPayoffCents" INTEGER,
  
  -- Step completion tracking
  "stepCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP,
  
  -- Timestamps
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS "idx_tradein_buyerid" ON "TradeIn"("buyerId");
CREATE INDEX IF NOT EXISTS "idx_tradein_auctionid" ON "TradeIn"("auctionId");
CREATE INDEX IF NOT EXISTS "idx_tradein_shortlistid" ON "TradeIn"("shortlistId");

-- Add comment for documentation
COMMENT ON TABLE "TradeIn" IS 'Buyer-provided, unverified trade-in information. AutoLenis does not appraise or verify this data.';
