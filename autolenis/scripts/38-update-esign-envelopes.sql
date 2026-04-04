-- Update ESignEnvelope fields
ALTER TABLE "ESignEnvelope" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE "ESignEnvelope" ADD COLUMN IF NOT EXISTS "provider_envelope_id" TEXT;
ALTER TABLE "ESignEnvelope" ADD COLUMN IF NOT EXISTS "signing_url" TEXT;
ALTER TABLE "ESignEnvelope" ADD COLUMN IF NOT EXISTS "completed_timestamp" TIMESTAMP(3);

UPDATE "ESignEnvelope" SET "provider_envelope_id" = "providerEnvelopeId" WHERE "provider_envelope_id" IS NULL;
UPDATE "ESignEnvelope" SET "signing_url" = "signUrl" WHERE "signing_url" IS NULL;
UPDATE "ESignEnvelope" SET "completed_timestamp" = "completedAt" WHERE "completedAt" IS NOT NULL;
