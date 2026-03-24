-- Add dealer_users table for dealer staff management
CREATE TABLE IF NOT EXISTS "dealer_users" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT UNIQUE NOT NULL,
  "dealer_id" TEXT NOT NULL,
  "role_label" TEXT,
  "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("dealer_id") REFERENCES "Dealer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "dealer_users_user_id_idx" ON "dealer_users"("user_id");
CREATE INDEX IF NOT EXISTS "dealer_users_dealer_id_idx" ON "dealer_users"("dealer_id");
