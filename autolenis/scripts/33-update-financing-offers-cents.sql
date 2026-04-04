-- Convert FinancingOffer to cents
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "down_payment_cents" INTEGER;
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "est_monthly_payment_cents" INTEGER;
ALTER TABLE "FinancingOffer" ADD COLUMN IF NOT EXISTS "lender_name_v2" TEXT;

UPDATE "FinancingOffer" SET "down_payment_cents" = ROUND("downPayment" * 100)::INTEGER WHERE "downPayment" IS NOT NULL;
UPDATE "FinancingOffer" SET "est_monthly_payment_cents" = ROUND("monthlyPayment" * 100)::INTEGER WHERE "monthlyPayment" IS NOT NULL;
UPDATE "FinancingOffer" SET "lender_name_v2" = "lenderName" WHERE "lender_name_v2" IS NULL;

-- Rename table to match spec naming
ALTER INDEX IF EXISTS "FinancingOffer_dealId_idx" RENAME TO "financing_offers_deal_id_idx";
