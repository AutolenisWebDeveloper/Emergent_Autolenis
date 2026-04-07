-- FixPreQualificationBuyerFK
-- The PreQualification.buyerId column stores User.id (the auth user's ID),
-- NOT BuyerProfile.id (the profile record's primary key).
-- The original migration created a FK referencing BuyerProfile(id), which is
-- structurally incorrect. This migration corrects it to reference
-- BuyerProfile(userId), which matches the actual data convention used by
-- prequal.service.ts and all read paths (inventory search, buyer prequal API).
--
-- This also fixes the Prisma include({ preQualification: true }) join in
-- auction.service.ts, which previously generated:
--   SELECT * FROM "PreQualification" WHERE "buyerId" = <BuyerProfile.id>
-- and now correctly generates:
--   SELECT * FROM "PreQualification" WHERE "buyerId" = <BuyerProfile.userId>

-- Drop the incorrect FK constraint (if it exists)
ALTER TABLE "public"."PreQualification"
  DROP CONSTRAINT IF EXISTS "PreQualification_buyerId_fkey";

-- Create the correct FK constraint referencing BuyerProfile.userId
ALTER TABLE "public"."PreQualification"
  ADD CONSTRAINT "PreQualification_buyerId_fkey"
  FOREIGN KEY ("buyerId")
  REFERENCES "public"."BuyerProfile"("userId")
  ON DELETE RESTRICT
  ON UPDATE CASCADE;
