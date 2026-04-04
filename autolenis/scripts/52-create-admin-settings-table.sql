-- Create admin_settings table with snake_case naming
CREATE TABLE IF NOT EXISTS "admin_settings" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "key" TEXT UNIQUE NOT NULL,
  "value_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS "admin_settings_key_idx" ON "admin_settings"("key");

-- Migrate data from AdminSettings (PascalCase) to admin_settings (snake_case) if AdminSettings exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'AdminSettings') THEN
    INSERT INTO "admin_settings" ("id", "key", "value_json", "updated_at", "created_at")
    SELECT "id", "key", COALESCE("valueJson", "value"), "updatedAt", COALESCE("createdAt", NOW())
    FROM "AdminSettings"
    ON CONFLICT ("key") DO NOTHING;
  END IF;
END $$;
