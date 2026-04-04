-- Add missing fields to BuyerProfile table
ALTER TABLE "BuyerProfile" 
ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE,
ADD COLUMN IF NOT EXISTS "addressLine2" TEXT,
ADD COLUMN IF NOT EXISTS "postalCode" TEXT,
ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS "employmentStatus" TEXT,
ADD COLUMN IF NOT EXISTS "employerName" TEXT,
ADD COLUMN IF NOT EXISTS "monthlyIncomeCents" INTEGER,
ADD COLUMN IF NOT EXISTS "monthlyHousingCents" INTEGER;

-- Update existing money columns to be in cents (multiply by 100)
-- Note: In production, you'd migrate data carefully
UPDATE "BuyerProfile" SET "monthlyIncomeCents" = CAST("annualIncome" * 100 / 12 AS INTEGER) WHERE "annualIncome" IS NOT NULL;
UPDATE "BuyerProfile" SET "monthlyHousingCents" = CAST("monthlyHousing" * 100 AS INTEGER) WHERE "monthlyHousing" IS NOT NULL;
