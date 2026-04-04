-- System 4 – Shortlist Builder Enhancements
-- Add missing columns to ShortlistItem table

-- Add removed_at for soft delete
ALTER TABLE "ShortlistItem" ADD COLUMN IF NOT EXISTS "removed_at" TIMESTAMP;

-- Add notes field for buyer notes
ALTER TABLE "ShortlistItem" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Add is_primary_choice flag
ALTER TABLE "ShortlistItem" ADD COLUMN IF NOT EXISTS "is_primary_choice" BOOLEAN DEFAULT false;

-- Add updated_at field
ALTER TABLE "ShortlistItem" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT now();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shortlist_item_shortlist_inventory 
  ON "ShortlistItem" ("shortlistId", "inventoryItemId");

-- Create index for active shortlists per user
CREATE INDEX IF NOT EXISTS idx_shortlist_buyer_active 
  ON "Shortlist" ("buyerId", "active");

-- Add unique constraint to prevent duplicates (soft constraint - enforced in app)
-- Only one active shortlist per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_shortlist_unique_active_per_buyer 
  ON "Shortlist" ("buyerId") WHERE "active" = true;
