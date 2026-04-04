-- PaymentMethod table doesn't exist, create it first
CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "provider" TEXT DEFAULT 'stripe',
  "provider_ref" TEXT,
  "type" TEXT NOT NULL,
  "last4" TEXT,
  "brand" TEXT,
  "expires_month" INTEGER,
  "expires_year" INTEGER,
  "is_default" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PaymentMethod_userId_idx" ON "PaymentMethod"("userId");
