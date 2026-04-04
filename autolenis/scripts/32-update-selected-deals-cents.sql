-- Convert SelectedDeal monetary fields to cents
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "total_otd_amount_cents" INTEGER;
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "base_loan_amount_cents" INTEGER;
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "user_id" TEXT;

UPDATE "SelectedDeal" SET "total_otd_amount_cents" = ROUND("cashOtd" * 100)::INTEGER WHERE "cashOtd" IS NOT NULL;
UPDATE "SelectedDeal" SET "user_id" = "buyerId" WHERE "user_id" IS NULL;

-- Add deal_status field that matches spec
ALTER TABLE "SelectedDeal" ADD COLUMN IF NOT EXISTS "deal_status" "DealStatus";
UPDATE "SelectedDeal" SET "deal_status" = "status" WHERE "deal_status" IS NULL;
