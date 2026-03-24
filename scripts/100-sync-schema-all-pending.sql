-- =============================================================================
-- AutoLenis Schema Sync: All Pending Migrations (Idempotent)
-- Run in Supabase SQL Editor. Safe to re-run.
-- =============================================================================

BEGIN;

-- ─── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- 1. EMAIL LOG TABLE (canonical, idempotent)
--    Consolidates scripts/93-create-email-log-table.sql and
--    scripts/create-email-log-table.sql into one authoritative definition.
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id        VARCHAR(255),
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  email_type       VARCHAR(100) NOT NULL,
  recipient_email  VARCHAR(255) NOT NULL,
  recipient_name   VARCHAR(255),
  subject          TEXT NOT NULL,
  status           VARCHAR(50)  NOT NULL DEFAULT 'sent',
  error_message    TEXT,
  metadata         JSONB,
  sent_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  delivered_at     TIMESTAMPTZ,
  opened_at        TIMESTAMPTZ,
  clicked_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Add any missing columns to existing email_log table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_log' AND column_name = 'resend_id') THEN
    ALTER TABLE email_log ADD COLUMN resend_id VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_log' AND column_name = 'recipient_name') THEN
    ALTER TABLE email_log ADD COLUMN recipient_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_log' AND column_name = 'metadata') THEN
    ALTER TABLE email_log ADD COLUMN metadata JSONB;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_log' AND column_name = 'delivered_at') THEN
    ALTER TABLE email_log ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_log' AND column_name = 'opened_at') THEN
    ALTER TABLE email_log ADD COLUMN opened_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_log' AND column_name = 'clicked_at') THEN
    ALTER TABLE email_log ADD COLUMN clicked_at TIMESTAMPTZ;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_log_user_id        ON email_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_log_recipient_email ON email_log(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_log_email_type      ON email_log(email_type);
CREATE INDEX IF NOT EXISTS idx_email_log_status          ON email_log(status);
CREATE INDEX IF NOT EXISTS idx_email_log_resend_id       ON email_log(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_log_sent_at         ON email_log(sent_at DESC);

-- RLS
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_log_admin_all      ON email_log;
DROP POLICY IF EXISTS email_log_user_select    ON email_log;
DROP POLICY IF EXISTS email_log_system_insert  ON email_log;

CREATE POLICY email_log_admin_all ON email_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ADMIN', 'admin')
    )
  );

CREATE POLICY email_log_user_select ON email_log
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY email_log_system_insert ON email_log
  FOR INSERT
  WITH CHECK (true);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_email_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_log_updated_at_trigger ON email_log;
CREATE TRIGGER update_email_log_updated_at_trigger
  BEFORE UPDATE ON email_log
  FOR EACH ROW
  EXECUTE FUNCTION update_email_log_updated_at();

-- =============================================================================
-- 2. AI TABLES (from migrations/99-ai-gemini-max-v2.sql, idempotent)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_seo_drafts (
  id          TEXT PRIMARY KEY,
  draft_type  TEXT NOT NULL,
  route       TEXT NOT NULL,
  content     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_draft_type ON ai_seo_drafts(draft_type);
CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_status     ON ai_seo_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_created_at ON ai_seo_drafts(created_at);

CREATE TABLE IF NOT EXISTS ai_contract_extractions (
  id               TEXT PRIMARY KEY,
  contract_id      TEXT NOT NULL,
  extraction_type  TEXT NOT NULL,
  data             JSONB NOT NULL DEFAULT '{}',
  disclaimer       TEXT NOT NULL DEFAULT 'This analysis is for informational purposes only and does not constitute legal advice.',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_contract_extractions_contract_id ON ai_contract_extractions(contract_id);
CREATE INDEX IF NOT EXISTS idx_ai_contract_extractions_created_at  ON ai_contract_extractions(created_at);

CREATE TABLE IF NOT EXISTS ai_leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  source      TEXT NOT NULL DEFAULT 'chat_widget',
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_leads_email      ON ai_leads(email);
CREATE INDEX IF NOT EXISTS idx_ai_leads_created_at ON ai_leads(created_at);

-- RLS for AI tables (admin only)
ALTER TABLE ai_seo_drafts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_contract_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_leads                ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_seo_drafts_admin           ON ai_seo_drafts;
DROP POLICY IF EXISTS ai_contract_extractions_admin ON ai_contract_extractions;
DROP POLICY IF EXISTS ai_leads_admin                ON ai_leads;
DROP POLICY IF EXISTS ai_leads_insert               ON ai_leads;

CREATE POLICY ai_seo_drafts_admin ON ai_seo_drafts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN','admin'))
  );

CREATE POLICY ai_contract_extractions_admin ON ai_contract_extractions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN','admin'))
  );

CREATE POLICY ai_leads_admin ON ai_leads
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('ADMIN','admin'))
  );

-- Allow chat widget to insert leads without auth
CREATE POLICY ai_leads_insert ON ai_leads
  FOR INSERT WITH CHECK (true);

-- =============================================================================
-- 3. SCHEMA MIGRATION TRACKING TABLE
--    Tracks which scripts have been applied, preventing duplicate runs.
-- =============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  id           SERIAL PRIMARY KEY,
  version      VARCHAR(255) NOT NULL UNIQUE,
  applied_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  description  TEXT
);

-- Mark all previously applied migrations as complete
INSERT INTO schema_migrations (version, description) VALUES
  ('001', 'initialize-database'),
  ('002', 'rls-policies'),
  ('006', 'inventory-fields'),
  ('007', 'auction-fields'),
  ('008', 'deal-fields'),
  ('009', 'payment-fields'),
  ('010', 'prequal-fields'),
  ('011', 'preference-fields'),
  ('012', 'insurance-fields'),
  ('013', 'contract-fields'),
  ('014', 'esign-fields'),
  ('015', 'pickup-fields'),
  ('016', 'affiliate-fields'),
  ('017', 'commission-fields'),
  ('018', 'payment-method'),
  ('019', 'fee-disclosure-fields'),
  ('020', 'dealer-users-table'),
  ('021', 'compliance-fields'),
  ('022', 'prequal-status-enum'),
  ('023', 'admin-settings'),
  ('024', 'dealer-addresses'),
  ('025', 'prequal-cents'),
  ('026', 'buyer-preferences'),
  ('027', 'vehicle-fields'),
  ('028', 'inventory-items'),
  ('029', 'auction-status'),
  ('030', 'auction-offers-cents'),
  ('031', 'financing-options-cents'),
  ('032', 'selected-deals-cents'),
  ('033', 'financing-offers-cents'),
  ('034', 'external-preapprovals-cents'),
  ('035', 'insurance-quotes-cents'),
  ('036', 'insurance-policies'),
  ('037', 'contract-documents'),
  ('038', 'esign-envelopes'),
  ('039', 'pickup-appointments'),
  ('040', 'affiliates'),
  ('041', 'referrals-multilevel'),
  ('042', 'clicks'),
  ('043', 'commissions-cents'),
  ('044', 'payouts-cents'),
  ('045', 'payment-methods'),
  ('046', 'deposit-payments-cents'),
  ('047', 'service-fee-payments-cents'),
  ('048', 'fee-financing-disclosures'),
  ('049', 'lender-disbursements'),
  ('050', 'compliance-events'),
  ('051', 'payment-provider-events'),
  ('052', 'admin-settings-table'),
  ('060', 'auction-offer-decisions'),
  ('070', 'seo-tables'),
  ('071', 'email-verification-table'),
  ('072', 'prequal-engine'),
  ('073', 'inventory-normalization'),
  ('074', 'shortlist-enhancements'),
  ('075', 'dealer-offer-management'),
  ('076', 'best-price-algorithm'),
  ('077', 'deal-builder-engine'),
  ('078', 'insurance-integration'),
  ('079', 'esign-pickup'),
  ('080', 'auth-completion'),
  ('081', 'affiliate-system-hardening'),
  ('090', 'trade-in-table'),
  ('091', 'contact-messages-table'),
  ('092', 'contact-messages-table-v2'),
  ('093', 'email-log-table'),
  ('094', 'admin-mfa-fields'),
  ('095', 'connection-canary-table'),
  ('096', 'schema-alignment-fixes'),
  ('097', 'affiliate-referral-attribution'),
  ('098', 'ai-orchestration-tables'),
  ('099', 'ai-extended-tables'),
  ('099b', 'ai-gemini-max-v2'),
  ('099c', 'admin-rls-audit-fixes'),
  ('100', 'sync-schema-all-pending')
ON CONFLICT (version) DO NOTHING;

COMMIT;
