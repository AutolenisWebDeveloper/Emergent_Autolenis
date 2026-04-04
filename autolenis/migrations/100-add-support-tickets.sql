-- Dealer Support Tickets (Dealer ↔ Admin)
-- Safe for Postgres/Supabase.

DO $$ BEGIN
  CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "SupportSenderRole" AS ENUM ('DEALER','ADMIN','SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "SupportTicket" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "dealerId" text NOT NULL REFERENCES "Dealer"("id") ON DELETE CASCADE,
  "workspaceId" text NULL REFERENCES "Workspace"("id") ON DELETE SET NULL,
  "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
  "subject" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SupportTicket_dealerId_idx" ON "SupportTicket"("dealerId");
CREATE INDEX IF NOT EXISTS "SupportTicket_status_idx" ON "SupportTicket"("status");
CREATE INDEX IF NOT EXISTS "SupportTicket_workspaceId_idx" ON "SupportTicket"("workspaceId");

CREATE TABLE IF NOT EXISTS "SupportMessage" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "ticketId" text NOT NULL REFERENCES "SupportTicket"("id") ON DELETE CASCADE,
  "senderUserId" text NULL REFERENCES "User"("id") ON DELETE SET NULL,
  "senderRole" "SupportSenderRole" NOT NULL,
  "body" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");
CREATE INDEX IF NOT EXISTS "SupportMessage_senderRole_idx" ON "SupportMessage"("senderRole");

CREATE OR REPLACE FUNCTION support_ticket_touch_updated_at() RETURNS trigger AS $$
BEGIN
  UPDATE "SupportTicket" SET "updatedAt" = now() WHERE "id" = NEW."ticketId";
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_support_ticket_touch ON "SupportMessage";
CREATE TRIGGER trg_support_ticket_touch
AFTER INSERT ON "SupportMessage"
FOR EACH ROW
EXECUTE FUNCTION support_ticket_touch_updated_at();
