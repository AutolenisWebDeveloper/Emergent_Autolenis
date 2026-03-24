-- FIX 18: Add applicationApproved boolean to Dealer model
-- This tracks the dealer application state machine explicitly,
-- distinct from the general `verified` / `active` flags.

ALTER TABLE "Dealer"
  ADD COLUMN IF NOT EXISTS "applicationApproved" BOOLEAN NOT NULL DEFAULT FALSE;

-- Set applicationApproved=true for dealers that are already verified and active
-- (backfill from existing data)
UPDATE "Dealer"
SET "applicationApproved" = TRUE
WHERE "verified" = TRUE AND "active" = TRUE;

COMMENT ON COLUMN "Dealer"."applicationApproved"
  IS 'FIX 18: Set to TRUE by dealer-approval.service.ts approveApplication(). Distinguishes approved from merely active dealers.';
