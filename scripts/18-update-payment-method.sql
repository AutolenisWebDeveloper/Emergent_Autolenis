-- Update PaymentMethod table fields
-- Fixed: Use snake_case column names that match actual database schema

-- Add columns if they don't exist (using snake_case as per actual schema)
ALTER TABLE "PaymentMethod"
ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS "provider_ref" TEXT,
ADD COLUMN IF NOT EXISTS "expires_month" INTEGER,
ADD COLUMN IF NOT EXISTS "expires_year" INTEGER;

-- No data migration needed since columns already use correct names
