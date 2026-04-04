-- FeeFinancingDisclosure table doesn't exist, create it first
CREATE TABLE IF NOT EXISTS "FeeFinancingDisclosure" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT,
  "selected_deal_id" TEXT,
  "fee_amount_cents" INTEGER,
  "base_loan_amount_cents" INTEGER,
  "base_monthly_cents" INTEGER,
  "new_monthly_cents" INTEGER,
  "delta_monthly_cents" INTEGER,
  "total_extra_cost_cents" INTEGER,
  "consent_at" TIMESTAMP(3),
  "auth_ip" TEXT,
  "auth_user_agent" TEXT,
  "snapshot_json" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FeeFinancingDisclosure_user_id_idx" ON "FeeFinancingDisclosure"("user_id");
CREATE INDEX IF NOT EXISTS "FeeFinancingDisclosure_selected_deal_id_idx" ON "FeeFinancingDisclosure"("selected_deal_id");
