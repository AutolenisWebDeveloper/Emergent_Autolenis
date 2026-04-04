-- LenderFeeDisbursement table doesn't exist, create it first
CREATE TABLE IF NOT EXISTS "LenderFeeDisbursement" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealId" TEXT,
  "lender_deal_ref" TEXT,
  "amount_cents" INTEGER,
  "status" TEXT DEFAULT 'REQUESTED',
  "raw_payload" JSONB,
  "requested_at_v2" TIMESTAMP(3),
  "disbursed_timestamp" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LenderFeeDisbursement_dealId_idx" ON "LenderFeeDisbursement"("dealId");
CREATE INDEX IF NOT EXISTS "LenderFeeDisbursement_status_idx" ON "LenderFeeDisbursement"("status");
