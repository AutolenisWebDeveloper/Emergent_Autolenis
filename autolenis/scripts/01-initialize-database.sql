-- AutoLenis Database Initialization Script
-- This script sets up the database with all required tables
-- Run this after setting up your Supabase/Neon project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: Prisma will handle table creation via migrations
-- This script is for any additional database setup if needed

-- Create custom types if not using Prisma enums
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('BUYER', 'DEALER', 'ADMIN', 'AFFILIATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuctionStatus" AS ENUM ('PENDING', 'ACTIVE', 'CLOSED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "DealStatus" AS ENUM ('PENDING', 'DOCUMENTS_SIGNED', 'PAYMENT_COMPLETE', 'VEHICLE_READY', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PickupStatus" AS ENUM ('SCHEDULED', 'BUYER_ARRIVED', 'VEHICLE_INSPECTED', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Create indexes for performance (Prisma will also handle this)
-- These are examples of custom indexes you might want

-- Index for user lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email ON "User"(email);

-- Index for auction lookups by status
CREATE INDEX IF NOT EXISTS idx_auctions_status ON "Auction"(status);

-- Fixed: Use SelectedDeal table (not Deal) which exists in the database
-- Index for deal lookups by buyer and status
CREATE INDEX IF NOT EXISTS idx_selected_deals_buyer_status ON "SelectedDeal"("buyerId", status);

-- Index for inventory lookups by dealer
CREATE INDEX IF NOT EXISTS idx_inventory_dealer ON "InventoryItem"("dealerId");

-- Composite index for auction offers
CREATE INDEX IF NOT EXISTS idx_offers_auction_dealer ON "AuctionOffer"("auctionId", "dealer_id");

COMMENT ON SCHEMA public IS 'AutoLenis Platform Database - Initialized';
