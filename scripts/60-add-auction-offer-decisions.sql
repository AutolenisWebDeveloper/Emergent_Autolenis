-- Migration: Add AuctionOfferDecision table for tracking buyer decisions
-- This enables the decline/replace logic for the Best Price Engine

-- Add respondedAt to AuctionParticipant if not exists
ALTER TABLE "AuctionParticipant" 
ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP;

-- Use correct table name (lowercase with underscores)
-- Add lenderName to auction_offer_financing_options if not exists
ALTER TABLE "auction_offer_financing_options"
ADD COLUMN IF NOT EXISTS "lenderName" TEXT DEFAULT 'Dealer Finance';

-- Create AuctionOfferDecision table
CREATE TABLE IF NOT EXISTS "AuctionOfferDecision" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "auctionId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "decision" TEXT NOT NULL, -- 'ACCEPTED' or 'DECLINED'
  "acceptedAt" TIMESTAMP,
  "declinedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT "AuctionOfferDecision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuctionOfferDecision_auctionId_fkey" FOREIGN KEY ("auctionId") REFERENCES "Auction"("id") ON DELETE CASCADE,
  CONSTRAINT "AuctionOfferDecision_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "AuctionOffer"("id") ON DELETE CASCADE,
  CONSTRAINT "AuctionOfferDecision_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "BuyerProfile"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "AuctionOfferDecision_auctionId_idx" ON "AuctionOfferDecision"("auctionId");
CREATE INDEX IF NOT EXISTS "AuctionOfferDecision_offerId_idx" ON "AuctionOfferDecision"("offerId");
CREATE INDEX IF NOT EXISTS "AuctionOfferDecision_buyerId_idx" ON "AuctionOfferDecision"("buyerId");

-- Add rank and financingOptionId to BestPriceOption if not exists
ALTER TABLE "BestPriceOption"
ADD COLUMN IF NOT EXISTS "rank" INTEGER DEFAULT 1;

ALTER TABLE "BestPriceOption"
ADD COLUMN IF NOT EXISTS "financingOptionId" TEXT;

-- Update participant relation if needed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'AuctionOffer_participantId_fkey'
  ) THEN
    ALTER TABLE "AuctionOffer"
    ADD CONSTRAINT "AuctionOffer_participantId_fkey" 
    FOREIGN KEY ("participantId") REFERENCES "AuctionParticipant"("id") ON DELETE CASCADE;
  END IF;
END $$;
