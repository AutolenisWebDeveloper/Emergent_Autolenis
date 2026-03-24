-- Create AdminSettings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "AdminSettings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key" TEXT UNIQUE NOT NULL,
  "value" JSONB NOT NULL DEFAULT '{}',
  "valueJson" JSONB,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS "AdminSettings_key_idx" ON "AdminSettings"("key");

-- Removed UPDATE statement since table is newly created and will be empty
-- Initial values can be inserted by the application if needed
