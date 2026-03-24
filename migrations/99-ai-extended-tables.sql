-- AI Orchestration Tables — Extended (tool calls, leads, SEO drafts, contract extractions)
-- Complements migration 98-ai-orchestration-tables.sql
-- NOTE: When using Prisma, IDs are generated client-side (cuid).
-- The gen_random_uuid() defaults below are fallbacks for direct SQL inserts.

-- Tool Calls (persistent audit of every tool execution)
CREATE TABLE IF NOT EXISTS ai_tool_calls (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  conversation_id TEXT NOT NULL,
  tool_name       TEXT NOT NULL,
  input           JSONB NOT NULL,
  output          JSONB,
  status          TEXT NOT NULL,  -- success | error | denied
  latency_ms      INTEGER NOT NULL DEFAULT 0,
  error           TEXT,
  user_id         TEXT,
  role            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id    TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_conversation_id ON ai_tool_calls(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_tool_name ON ai_tool_calls(tool_name);
CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_created_at ON ai_tool_calls(created_at);

-- Leads (captured from public chat interactions)
CREATE TABLE IF NOT EXISTS ai_leads (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  intent          TEXT,            -- buy | refinance | dealer | affiliate
  source          TEXT DEFAULT 'chat',
  conversation_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id    TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_leads_email ON ai_leads(email);
CREATE INDEX IF NOT EXISTS idx_ai_leads_created_at ON ai_leads(created_at);

-- SEO Drafts (blog posts and page-level SEO outputs)
CREATE TABLE IF NOT EXISTS ai_seo_drafts (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  title            TEXT NOT NULL,
  keywords         TEXT NOT NULL,
  content          TEXT NOT NULL,
  meta_title       TEXT,
  meta_description TEXT,
  slug             TEXT,
  status           TEXT NOT NULL DEFAULT 'draft',  -- draft | published | archived
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id     TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_status ON ai_seo_drafts(status);
CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_created_at ON ai_seo_drafts(created_at);

-- Contract Extractions (structured extraction results from contract intelligence)
CREATE TABLE IF NOT EXISTS ai_contract_extractions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  deal_id      TEXT,
  document_id  TEXT,
  parties      JSONB NOT NULL,
  vehicle      JSONB NOT NULL,
  pricing      JSONB NOT NULL,
  fees         JSONB NOT NULL,
  terms        JSONB NOT NULL,
  red_flags    JSONB NOT NULL,
  raw_text     TEXT,
  status       TEXT NOT NULL DEFAULT 'completed',  -- completed | partial | error
  disclaimer   TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_ai_contract_extractions_deal_id ON ai_contract_extractions(deal_id);
CREATE INDEX IF NOT EXISTS idx_ai_contract_extractions_document_id ON ai_contract_extractions(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_contract_extractions_created_at ON ai_contract_extractions(created_at);
