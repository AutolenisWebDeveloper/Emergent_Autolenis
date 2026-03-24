-- Add referral attribution metadata
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS ref_code TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS attributed_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE "Referral" ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Store uploaded document storage paths
ALTER TABLE "DealDocument" ADD COLUMN IF NOT EXISTS "storagePath" TEXT;

-- Affiliate share link audit events
CREATE TABLE IF NOT EXISTS "AffiliateShareEvent" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliateId TEXT REFERENCES "Affiliate"(id) ON DELETE CASCADE,
  recipientEmail TEXT NOT NULL,
  message TEXT,
  referralLink TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error TEXT,
  sentAt TIMESTAMPTZ DEFAULT now(),
  createdAt TIMESTAMPTZ DEFAULT now(),
  updatedAt TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "AffiliateShareEvent_affiliateId_idx" ON "AffiliateShareEvent"(affiliateId);
CREATE INDEX IF NOT EXISTS "AffiliateShareEvent_sentAt_idx" ON "AffiliateShareEvent"(sentAt DESC);

ALTER TABLE "AffiliateShareEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "affiliate_share_event_read"
  ON "AffiliateShareEvent"
  FOR SELECT
  TO authenticated
  USING (affiliateId IN (SELECT id FROM "Affiliate" WHERE "userId" = auth.uid()));

CREATE POLICY IF NOT EXISTS "affiliate_share_event_service_insert"
  ON "AffiliateShareEvent"
  FOR INSERT
  TO service_role
  WITH CHECK (true);
