-- Update ESignEnvelope fields
ALTER TABLE "ESignEnvelope"
ADD COLUMN IF NOT EXISTS "provider" TEXT DEFAULT 'docusign',
ADD COLUMN IF NOT EXISTS "providerEnvelopeIdAlt" TEXT,
ADD COLUMN IF NOT EXISTS "signingUrl" TEXT;

UPDATE "ESignEnvelope" SET "providerEnvelopeIdAlt" = "providerEnvelopeId" WHERE "providerEnvelopeId" IS NOT NULL;
UPDATE "ESignEnvelope" SET "signingUrl" = "signUrl" WHERE "signUrl" IS NOT NULL;
