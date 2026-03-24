-- Update FeeFinancingDisclosure fields
-- Fixed: Use snake_case column names that match actual database schema

-- Add columns if they don't exist (using snake_case as per actual schema)
ALTER TABLE "FeeFinancingDisclosure"
ADD COLUMN IF NOT EXISTS "user_id" TEXT,
ADD COLUMN IF NOT EXISTS "selected_deal_id" TEXT,
ADD COLUMN IF NOT EXISTS "fee_amount_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "base_loan_amount_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "base_monthly_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "new_monthly_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "delta_monthly_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "total_extra_cost_cents" INTEGER,
ADD COLUMN IF NOT EXISTS "consent_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "auth_ip" TEXT,
ADD COLUMN IF NOT EXISTS "auth_user_agent" TEXT,
ADD COLUMN IF NOT EXISTS "snapshot_json" JSONB;

-- No data migration needed since columns already use correct names
