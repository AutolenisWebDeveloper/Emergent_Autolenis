/**
 * Schema Sync Migration Runner
 * Executes all pending schema changes against Supabase via the REST client.
 * Run with: node scripts/run-sync-migration.mjs
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[sync] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
})

// ─── Migration steps ──────────────────────────────────────────────────────────

const migrations = [

  // 1. schema_migrations tracking table
  {
    name: "schema_migrations table",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          SERIAL PRIMARY KEY,
        script_name TEXT        NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        notes       TEXT
      );
    `,
  },

  // 2. email_log canonical table
  {
    name: "email_log table",
    sql: `
      CREATE TABLE IF NOT EXISTS email_log (
        id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
        affiliate_id      UUID,
        deal_id           UUID,
        auction_id        UUID,
        type              TEXT        NOT NULL DEFAULT 'generic',
        recipient_email   TEXT        NOT NULL,
        from_email        TEXT,
        subject           TEXT,
        status            TEXT        NOT NULL DEFAULT 'SENT'
                            CHECK (status IN ('SENT','FAILED','BOUNCED','COMPLAINED','DELIVERED','OPENED','CLICKED')),
        resend_message_id TEXT,
        error_message     TEXT,
        metadata          JSONB       DEFAULT '{}',
        correlation_id    TEXT,
        template_key      TEXT
      );
    `,
  },

  // 3. email_log columns (idempotent adds)
  {
    name: "email_log updated_at trigger",
    sql: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS email_log_updated_at ON email_log;
      CREATE TRIGGER email_log_updated_at
        BEFORE UPDATE ON email_log
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `,
  },

  // 4. email_log indexes
  {
    name: "email_log indexes",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_email_log_user_id        ON email_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_log_type           ON email_log(type);
      CREATE INDEX IF NOT EXISTS idx_email_log_status         ON email_log(status);
      CREATE INDEX IF NOT EXISTS idx_email_log_created_at     ON email_log(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_email_log_recipient      ON email_log(recipient_email);
      CREATE INDEX IF NOT EXISTS idx_email_log_correlation_id ON email_log(correlation_id);
    `,
  },

  // 5. email_log RLS
  {
    name: "email_log RLS",
    sql: `
      ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Admins can do everything on email_log"    ON email_log;
      DROP POLICY IF EXISTS "Users can view their own email logs"       ON email_log;
      DROP POLICY IF EXISTS "Service role can insert email logs"        ON email_log;

      CREATE POLICY "Admins can do everything on email_log"
        ON email_log FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN','SUPER_ADMIN')
          )
        );

      CREATE POLICY "Users can view their own email logs"
        ON email_log FOR SELECT
        USING (user_id = auth.uid());

      CREATE POLICY "Service role can insert email logs"
        ON email_log FOR INSERT
        WITH CHECK (true);
    `,
  },

  // 6. AI tables
  {
    name: "ai_seo_drafts table",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_seo_drafts (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
        vehicle_id   UUID,
        title        TEXT,
        meta_desc    TEXT,
        body         TEXT,
        status       TEXT        NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','approved','published','rejected')),
        model_used   TEXT,
        prompt_tokens INT,
        output_tokens INT,
        metadata     JSONB       DEFAULT '{}'
      );
      ALTER TABLE ai_seo_drafts ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Admins manage ai_seo_drafts" ON ai_seo_drafts;
      CREATE POLICY "Admins manage ai_seo_drafts"
        ON ai_seo_drafts FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN','SUPER_ADMIN')
          )
        );
    `,
  },

  {
    name: "ai_contract_extractions table",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_contract_extractions (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deal_id         UUID,
        user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
        raw_text        TEXT,
        extracted_data  JSONB       DEFAULT '{}',
        flags           JSONB       DEFAULT '[]',
        risk_score      INT         DEFAULT 0,
        reviewed        BOOLEAN     NOT NULL DEFAULT FALSE,
        reviewed_by     UUID,
        reviewed_at     TIMESTAMPTZ,
        model_used      TEXT,
        metadata        JSONB       DEFAULT '{}'
      );
      ALTER TABLE ai_contract_extractions ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Admins manage ai_contract_extractions" ON ai_contract_extractions;
      CREATE POLICY "Admins manage ai_contract_extractions"
        ON ai_contract_extractions FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN','SUPER_ADMIN')
          )
        );
      DROP POLICY IF EXISTS "Users view own contract extractions" ON ai_contract_extractions;
      CREATE POLICY "Users view own contract extractions"
        ON ai_contract_extractions FOR SELECT
        USING (user_id = auth.uid());
    `,
  },

  {
    name: "ai_leads table",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_leads (
        id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
        session_id     TEXT,
        source         TEXT,
        intent         TEXT,
        risk_level     TEXT        DEFAULT 'low'
                         CHECK (risk_level IN ('low','medium','high','critical')),
        conversation   JSONB       DEFAULT '[]',
        extracted_info JSONB       DEFAULT '{}',
        converted      BOOLEAN     NOT NULL DEFAULT FALSE,
        converted_at   TIMESTAMPTZ,
        notes          TEXT,
        metadata       JSONB       DEFAULT '{}'
      );
      ALTER TABLE ai_leads ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Admins manage ai_leads" ON ai_leads;
      CREATE POLICY "Admins manage ai_leads"
        ON ai_leads FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('ADMIN','SUPER_ADMIN')
          )
        );
    `,
  },

  // 7. Mark all historical migrations as applied
  {
    name: "mark historical migrations",
    sql: `
      INSERT INTO schema_migrations (script_name, notes) VALUES
        ('01-initial-schema.sql',               'Core tables'),
        ('02-rls-policies.sql',                 'Row level security'),
        ('03-seed-data.sql',                    'Seed data'),
        ('04-affiliate-system.sql',             'Affiliate tables'),
        ('05-auction-system.sql',               'Auction tables'),
        ('06-contract-shield.sql',              'Contract shield'),
        ('07-admin-dashboard.sql',              'Admin dashboard'),
        ('08-notifications.sql',                'Notifications'),
        ('09-vehicle-requests.sql',             'Vehicle requests'),
        ('10-financing.sql',                    'Financing'),
        ('11-insurance.sql',                    'Insurance'),
        ('12-documents.sql',                    'Documents'),
        ('13-ai-conversations.sql',             'AI conversations'),
        ('14-referral-payouts.sql',             'Referral payouts'),
        ('93-create-email-log-table.sql',       'Email log (v1)'),
        ('99-admin-rls-audit-fixes.sql',        'RLS audit fixes'),
        ('99-ai-gemini-max-v2.sql',             'AI Gemini max v2'),
        ('100-sync-schema-all-pending.sql',     'Full schema sync')
      ON CONFLICT (script_name) DO NOTHING;
    `,
  },
]

// ─── Runner ───────────────────────────────────────────────────────────────────

async function runMigrations() {
  console.log("[sync] Starting schema sync migration...\n")
  let passed = 0
  let failed = 0

  for (const migration of migrations) {
    try {
      const { error } = await supabase.rpc("exec_sql", { sql: migration.sql }).single()

      if (error) {
        // Try direct query as fallback
        const { error: err2 } = await supabase.from("_dummy_").select().limit(0)
        void err2
        throw error
      }

      console.log(`  [ok] ${migration.name}`)
      passed++
    } catch (err) {
      console.error(`  [fail] ${migration.name}: ${err?.message || err}`)
      failed++
    }
  }

  console.log(`\n[sync] Complete: ${passed} passed, ${failed} failed out of ${migrations.length} migrations`)

  if (failed > 0) {
    console.log("\n[sync] Note: Some migrations may require running via the Supabase SQL Editor directly.")
    console.log("[sync] Copy the SQL from scripts/100-sync-schema-all-pending.sql and run it in:")
    console.log("[sync] https://supabase.com/dashboard → SQL Editor")
  }
}

runMigrations().catch(console.error)
