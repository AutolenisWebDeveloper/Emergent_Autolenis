-- Convert PreQualification monetary fields to cents
ALTER TABLE "PreQualification" ADD COLUMN IF NOT EXISTS "max_otd_amount_cents" INTEGER;
ALTER TABLE "PreQualification" ADD COLUMN IF NOT EXISTS "min_monthly_payment_cents" INTEGER;
ALTER TABLE "PreQualification" ADD COLUMN IF NOT EXISTS "max_monthly_payment_cents" INTEGER;
ALTER TABLE "PreQualification" ADD COLUMN IF NOT EXISTS "dti_ratio" NUMERIC;

UPDATE "PreQualification" SET "max_otd_amount_cents" = ROUND("maxOtd" * 100)::INTEGER WHERE "maxOtd" IS NOT NULL;
UPDATE "PreQualification" SET "min_monthly_payment_cents" = ROUND("estimatedMonthlyMin" * 100)::INTEGER WHERE "estimatedMonthlyMin" IS NOT NULL;
UPDATE "PreQualification" SET "max_monthly_payment_cents" = ROUND("estimatedMonthlyMax" * 100)::INTEGER WHERE "estimatedMonthlyMax" IS NOT NULL;
UPDATE "PreQualification" SET "dti_ratio" = "dti" WHERE "dti" IS NOT NULL;
