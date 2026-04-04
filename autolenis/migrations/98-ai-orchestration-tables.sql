-- AI Orchestration Tables
-- Stores conversation state, messages, and admin actions for the AI subsystem.

-- Conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id     TEXT,
  role        TEXT NOT NULL,
  agent       TEXT NOT NULL,
  intent      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_workspace_id ON ai_conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at);

-- Messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  conversation_id TEXT NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  sender          TEXT NOT NULL,
  content         TEXT NOT NULL,
  tool_used       TEXT,
  risk_level      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_id ON ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at ON ai_messages(created_at);

-- Admin Actions (audit trail for admin takeover, AI toggle, etc.)
CREATE TABLE IF NOT EXISTS ai_admin_actions (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  admin_id     TEXT NOT NULL,
  action_type  TEXT NOT NULL,
  payload      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_ai_admin_actions_admin_id ON ai_admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_ai_admin_actions_workspace_id ON ai_admin_actions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_ai_admin_actions_created_at ON ai_admin_actions(created_at);
