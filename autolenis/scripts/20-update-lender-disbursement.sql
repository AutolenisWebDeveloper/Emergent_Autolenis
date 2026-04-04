-- Update LenderFeeDisbursement fields
ALTER TABLE "LenderFeeDisbursement"
ADD COLUMN IF NOT EXISTS "lenderDealRef" TEXT,
ADD COLUMN IF NOT EXISTS "rawPayload" JSONB;
