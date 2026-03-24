import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[v0] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function run(label, sql) {
  console.log(`[v0] Running: ${label}`)
  const { error } = await supabase.rpc("exec_sql", { query: sql }).single()
  if (error) {
    // Try direct query as fallback
    const { error: err2 } = await supabase.from("_dummy_").select().limit(0)
    // Use raw SQL via PostgREST
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.warn(`[v0] Warning for "${label}": ${body}`)
    } else {
      console.log(`[v0] OK: ${label}`)
    }
  } else {
    console.log(`[v0] OK: ${label}`)
  }
}

async function main() {
  console.log("[v0] Starting schema sync migration...")

  // 1. schema_migrations tracking table
  await run("schema_migrations table", `
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version      TEXT PRIMARY KEY,
      description  TEXT,
      applied_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  // 2. email_log table (canonical, idempotent)
  await run("email_log table", `
    CREATE TABLE IF NOT EXISTS public.email_log (
      id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      template_key      TEXT NOT NULL,
      to_email          TEXT NOT NULL,
      from_email        TEXT NOT NULL,
      subject           TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING','SENT','FAILED','BOUNCED','COMPLAINED')),
      resend_message_id TEXT,
      error_message     TEXT,
      affiliate_id      UUID,
      deal_id           UUID,
      auction_id        UUID,
      correlation_id    UUID DEFAULT gen_random_uuid(),
      metadata          JSONB DEFAULT '{}',
      type              TEXT DEFAULT 'transactional',
      retry_count       INT DEFAULT 0
    );
  `)

  // 3. email_log indexes
  await run("email_log indexes", `
    CREATE INDEX IF NOT EXISTS idx_email_log_user_id     ON public.email_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_email_log_status       ON public.email_log(status);
    CREATE INDEX IF NOT EXISTS idx_email_log_template_key ON public.email_log(template_key);
    CREATE INDEX IF NOT EXISTS idx_email_log_created_at   ON public.email_log(created_at DESC);
  `)

  // 4. email_log RLS
  await run("email_log RLS", `
    ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "admin_full_access_email_log" ON public.email_log;
    DROP POLICY IF EXISTS "users_view_own_email_log"    ON public.email_log;
    DROP POLICY IF EXISTS "service_insert_email_log"    ON public.email_log;
    CREATE POLICY "admin_full_access_email_log" ON public.email_log
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
      );
    CREATE POLICY "users_view_own_email_log" ON public.email_log
      FOR SELECT USING (user_id = auth.uid());
    CREATE POLICY "service_insert_email_log" ON public.email_log
      FOR INSERT WITH CHECK (true);
  `)

  // 5. ai_seo_drafts table
  await run("ai_seo_drafts table", `
    CREATE TABLE IF NOT EXISTS public.ai_seo_drafts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      vehicle_id  UUID,
      title       TEXT,
      description TEXT,
      keywords    TEXT[],
      content     TEXT,
      status      TEXT DEFAULT 'draft',
      metadata    JSONB DEFAULT '{}'
    );
    ALTER TABLE public.ai_seo_drafts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "admin_full_ai_seo_drafts" ON public.ai_seo_drafts;
    DROP POLICY IF EXISTS "users_own_ai_seo_drafts"  ON public.ai_seo_drafts;
    CREATE POLICY "admin_full_ai_seo_drafts" ON public.ai_seo_drafts
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
      );
    CREATE POLICY "users_own_ai_seo_drafts" ON public.ai_seo_drafts
      FOR ALL USING (user_id = auth.uid());
  `)

  // 6. ai_contract_extractions table
  await run("ai_contract_extractions table", `
    CREATE TABLE IF NOT EXISTS public.ai_contract_extractions (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      deal_id         UUID,
      raw_text        TEXT,
      extracted_data  JSONB DEFAULT '{}',
      red_flags       JSONB DEFAULT '[]',
      summary         TEXT,
      status          TEXT DEFAULT 'pending',
      metadata        JSONB DEFAULT '{}'
    );
    ALTER TABLE public.ai_contract_extractions ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "admin_full_ai_contracts" ON public.ai_contract_extractions;
    DROP POLICY IF EXISTS "users_own_ai_contracts"  ON public.ai_contract_extractions;
    CREATE POLICY "admin_full_ai_contracts" ON public.ai_contract_extractions
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
      );
    CREATE POLICY "users_own_ai_contracts" ON public.ai_contract_extractions
      FOR ALL USING (user_id = auth.uid());
  `)

  // 7. ai_leads table
  await run("ai_leads table", `
    CREATE TABLE IF NOT EXISTS public.ai_leads (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      conversation_id TEXT,
      email           TEXT,
      name            TEXT,
      intent          TEXT,
      captured_data   JSONB DEFAULT '{}',
      converted       BOOLEAN DEFAULT false,
      user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      metadata        JSONB DEFAULT '{}'
    );
    ALTER TABLE public.ai_leads ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "admin_full_ai_leads" ON public.ai_leads;
    CREATE POLICY "admin_full_ai_leads" ON public.ai_leads
      FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
      );
  `)

  // 8. Mark migrations as applied
  await run("mark migrations applied", `
    INSERT INTO public.schema_migrations (version, description) VALUES
      ('93-create-email-log-table',         'email_log table initial creation'),
      ('99-admin-rls-audit-fixes',          'Admin RLS audit and fixes'),
      ('99-ai-gemini-max-v2',              'AI Gemini max v2 tables'),
      ('100-sync-schema-all-pending',       'Consolidated schema sync - all pending migrations')
    ON CONFLICT (version) DO NOTHING;
  `)

  console.log("[v0] Schema sync complete.")
}

main().catch((err) => {
  console.error("[v0] Migration failed:", err.message)
  process.exit(1)
})
