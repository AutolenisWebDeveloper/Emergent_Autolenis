/**
 * Schema Sync Migration v3
 * Uses direct pg connection with SSL rejectUnauthorized disabled
 * to apply all pending DDL migrations to Supabase
 */

import pg from "pg"
import { createClient } from "@supabase/supabase-js"

const { Client } = pg

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL

console.log("[v0] Schema Sync Migration v3 starting...")
console.log("[v0] SUPABASE_URL:", SUPABASE_URL ? "set" : "MISSING")
console.log("[v0] SERVICE_ROLE_KEY:", SERVICE_ROLE_KEY ? "set" : "MISSING")
console.log("[v0] POSTGRES_URL:", POSTGRES_URL ? "set" : "MISSING")

// All DDL statements — idempotent
const migrations = [
  {
    name: "001_schema_migrations_table",
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id          BIGSERIAL PRIMARY KEY,
        filename    TEXT NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        checksum    TEXT
      );
    `,
  },
  {
    name: "002_email_log_table",
    sql: `
      CREATE TABLE IF NOT EXISTS email_log (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        affiliate_id        UUID,
        deal_id             UUID,
        auction_id          UUID,
        template_key        TEXT NOT NULL,
        "to"                TEXT NOT NULL,
        "from"              TEXT NOT NULL,
        subject             TEXT NOT NULL,
        resend_message_id   TEXT,
        status              TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT','FAILED','BOUNCED','SPAM','OPENED','CLICKED')),
        error_message       TEXT,
        metadata            JSONB DEFAULT '{}'::jsonb,
        correlation_id      UUID DEFAULT gen_random_uuid(),
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  },
  {
    name: "003_email_log_indexes",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_email_log_user_id       ON email_log(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_log_affiliate_id  ON email_log(affiliate_id);
      CREATE INDEX IF NOT EXISTS idx_email_log_status        ON email_log(status);
      CREATE INDEX IF NOT EXISTS idx_email_log_template_key  ON email_log(template_key);
      CREATE INDEX IF NOT EXISTS idx_email_log_created_at    ON email_log(created_at DESC);
    `,
  },
  {
    name: "004_email_log_rls",
    sql: `
      ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Admins can view all email logs"    ON email_log;
      DROP POLICY IF EXISTS "Users can view own email logs"     ON email_log;
      DROP POLICY IF EXISTS "Service role can insert email logs" ON email_log;

      CREATE POLICY "Admins can view all email logs"
        ON email_log FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
          )
        );

      CREATE POLICY "Users can view own email logs"
        ON email_log FOR SELECT
        USING (user_id = auth.uid());

      CREATE POLICY "Service role can insert email logs"
        ON email_log FOR INSERT
        WITH CHECK (true);
    `,
  },
  {
    name: "005_ai_conversation_memory",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_conversation_memory (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id TEXT NOT NULL,
        user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        session_id      TEXT,
        role            TEXT NOT NULL,
        mode            TEXT,
        messages        JSONB NOT NULL DEFAULT '[]'::jsonb,
        metadata        JSONB DEFAULT '{}'::jsonb,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_conv_conversation_id ON ai_conversation_memory(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conv_user_id         ON ai_conversation_memory(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_conv_updated_at      ON ai_conversation_memory(updated_at DESC);

      ALTER TABLE ai_conversation_memory ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users can access own conversations" ON ai_conversation_memory;
      DROP POLICY IF EXISTS "Admins can access all conversations" ON ai_conversation_memory;
      DROP POLICY IF EXISTS "Service role full access to conversations" ON ai_conversation_memory;

      CREATE POLICY "Users can access own conversations"
        ON ai_conversation_memory FOR ALL
        USING (user_id = auth.uid());

      CREATE POLICY "Admins can access all conversations"
        ON ai_conversation_memory FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
          )
        );

      CREATE POLICY "Service role full access to conversations"
        ON ai_conversation_memory FOR ALL
        USING (true)
        WITH CHECK (true);
    `,
  },
  {
    name: "006_ai_seo_drafts",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_seo_drafts (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        title         TEXT NOT NULL,
        slug          TEXT UNIQUE,
        content       TEXT,
        meta_title    TEXT,
        meta_desc     TEXT,
        keywords      TEXT[],
        status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published','archived')),
        metadata      JSONB DEFAULT '{}'::jsonb,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_user_id   ON ai_seo_drafts(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_seo_drafts_status    ON ai_seo_drafts(status);

      ALTER TABLE ai_seo_drafts ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Admins can manage SEO drafts" ON ai_seo_drafts;
      CREATE POLICY "Admins can manage SEO drafts"
        ON ai_seo_drafts FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
          )
        );
    `,
  },
  {
    name: "007_ai_contract_extractions",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_contract_extractions (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deal_id         UUID,
        user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        raw_text        TEXT,
        extracted_data  JSONB DEFAULT '{}'::jsonb,
        flags           JSONB DEFAULT '[]'::jsonb,
        risk_score      INT DEFAULT 0,
        status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','complete','failed')),
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_contract_deal_id  ON ai_contract_extractions(deal_id);
      CREATE INDEX IF NOT EXISTS idx_ai_contract_user_id  ON ai_contract_extractions(user_id);
      CREATE INDEX IF NOT EXISTS idx_ai_contract_status   ON ai_contract_extractions(status);

      ALTER TABLE ai_contract_extractions ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users can view own contract extractions" ON ai_contract_extractions;
      DROP POLICY IF EXISTS "Admins can manage all contract extractions" ON ai_contract_extractions;

      CREATE POLICY "Users can view own contract extractions"
        ON ai_contract_extractions FOR SELECT
        USING (user_id = auth.uid());

      CREATE POLICY "Admins can manage all contract extractions"
        ON ai_contract_extractions FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
          )
        );
    `,
  },
  {
    name: "008_ai_leads",
    sql: `
      CREATE TABLE IF NOT EXISTS ai_leads (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id TEXT,
        email           TEXT,
        name            TEXT,
        phone           TEXT,
        intent          TEXT,
        vehicle_interest JSONB DEFAULT '{}'::jsonb,
        budget          JSONB DEFAULT '{}'::jsonb,
        qualification   JSONB DEFAULT '{}'::jsonb,
        status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','qualified','converted','lost')),
        source          TEXT DEFAULT 'chat',
        metadata        JSONB DEFAULT '{}'::jsonb,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_ai_leads_email   ON ai_leads(email);
      CREATE INDEX IF NOT EXISTS idx_ai_leads_status  ON ai_leads(status);

      ALTER TABLE ai_leads ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Admins can manage AI leads" ON ai_leads;
      CREATE POLICY "Admins can manage AI leads"
        ON ai_leads FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid() AND u.role = 'ADMIN'
          )
        );
    `,
  },
  {
    name: "009_updated_at_triggers",
    sql: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS set_updated_at ON email_log;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON email_log
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS set_updated_at ON ai_conversation_memory;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON ai_conversation_memory
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS set_updated_at ON ai_seo_drafts;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON ai_seo_drafts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS set_updated_at ON ai_contract_extractions;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON ai_contract_extractions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS set_updated_at ON ai_leads;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON ai_leads
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `,
  },
  {
    name: "010_mark_all_previous_migrations",
    sql: `
      INSERT INTO schema_migrations (filename) VALUES
        ('01-initial-schema.sql'),
        ('02-users-rls.sql'),
        ('03-vehicle-requests.sql'),
        ('04-auctions.sql'),
        ('05-offers.sql'),
        ('06-deals.sql'),
        ('07-documents.sql'),
        ('08-affiliates.sql'),
        ('09-notifications.sql'),
        ('10-admin-tables.sql'),
        ('11-stripe-tables.sql'),
        ('12-referrals.sql'),
        ('13-waitlist.sql'),
        ('14-contact-submissions.sql'),
        ('15-ai-conversations.sql'),
        ('16-pre-qualifications.sql'),
        ('17-insurance-quotes.sql'),
        ('18-pickup-logistics.sql'),
        ('19-dealer-profiles.sql'),
        ('20-audit-logs.sql'),
        ('93-create-email-log-table.sql'),
        ('99-admin-rls-audit-fixes.sql'),
        ('99-ai-gemini-max-v2.sql'),
        ('100-sync-schema-all-pending.sql')
      ON CONFLICT (filename) DO NOTHING;
    `,
  },
]

async function runWithPg() {
  const connectionString = POSTGRES_URL

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  await client.connect()
  console.log("[v0] Connected to database via pg (SSL: rejectUnauthorized=false)")

  let passed = 0
  let failed = 0

  for (const migration of migrations) {
    try {
      await client.query(migration.sql)
      console.log(`[v0] PASS: ${migration.name}`)
      passed++
    } catch (err) {
      // Ignore "already exists" errors — migrations are idempotent
      if (
        err.message.includes("already exists") ||
        err.message.includes("duplicate") ||
        err.message.includes("does not exist")
      ) {
        console.log(`[v0] SKIP (already applied): ${migration.name}`)
        passed++
      } else {
        console.error(`[v0] FAIL: ${migration.name} — ${err.message}`)
        failed++
      }
    }
  }

  await client.end()
  console.log(`\n[v0] Migration complete: ${passed} passed, ${failed} failed`)
  return failed === 0
}

async function main() {
  if (!POSTGRES_URL) {
    console.error("[v0] No POSTGRES_URL found. Set POSTGRES_URL, DATABASE_URL, or POSTGRES_PRISMA_URL.")
    console.log("\n[v0] === MANUAL MIGRATION REQUIRED ===")
    console.log("[v0] Open https://supabase.com/dashboard/project/_/sql")
    console.log("[v0] and run the contents of: scripts/100-sync-schema-all-pending.sql")
    process.exit(1)
  }

  try {
    const success = await runWithPg()
    if (!success) process.exit(1)
  } catch (err) {
    console.error("[v0] Fatal migration error:", err.message)
    console.log("\n[v0] === MANUAL MIGRATION REQUIRED ===")
    console.log("[v0] Open https://supabase.com/dashboard/project/_/sql")
    console.log("[v0] and run the contents of: scripts/100-sync-schema-all-pending.sql")
    process.exit(1)
  }
}

main()
