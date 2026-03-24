-- Add dealer_users table for dealer staff
CREATE TABLE IF NOT EXISTS "DealerUser" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL,
  "dealerId" TEXT NOT NULL,
  "roleLabel" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "DealerUser_userId_idx" ON "DealerUser"("userId");
CREATE INDEX IF NOT EXISTS "DealerUser_dealerId_idx" ON "DealerUser"("dealerId");
