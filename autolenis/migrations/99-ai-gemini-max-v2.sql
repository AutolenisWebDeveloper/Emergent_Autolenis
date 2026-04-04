-- Gemini MAX MODE v2 – Additional AI tables
-- Ensures pgcrypto extension is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- AI SEO Drafts – stores AI-generated SEO content for admin review
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
CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_status ON ai_seo_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_created_at ON ai_seo_drafts(created_at);

-- AI Contract Extractions – stores AI-powered contract analysis results
CREATE TABLE IF NOT EXISTS ai_contract_extractions (
  id               TEXT PRIMARY KEY,
  contract_id      TEXT NOT NULL,
  extraction_type  TEXT NOT NULL,
  data             JSONB NOT NULL DEFAULT '{}',
  disclaimer       TEXT NOT NULL DEFAULT 'This analysis is for informational purposes only and does not constitute legal advice.',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_contract_extractions_contract_id ON ai_contract_extractions(contract_id);
CREATE INDEX IF NOT EXISTS idx_ai_contract_extractions_created_at ON ai_contract_extractions(created_at);

-- AI Leads – stores leads captured via the AI chat widget
CREATE TABLE IF NOT EXISTS ai_leads (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  source      TEXT NOT NULL DEFAULT 'chat_widget',
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_leads_email ON ai_leads(email);
CREATE INDEX IF NOT EXISTS idx_ai_leads_created_at ON ai_leads(created_at);
