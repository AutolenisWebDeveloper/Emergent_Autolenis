-- Admin dashboard RLS audit + fixes (idempotent)
-- Run in Supabase SQL editor or psql

BEGIN;

-- Helper: current user id as uuid (safe cast)
CREATE OR REPLACE FUNCTION public.current_user_id_uuid()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  claim_sub text;
  claim_user text;
  uid uuid;
BEGIN
  uid := auth.uid();
  IF uid IS NOT NULL THEN
    RETURN uid;
  END IF;

  claim_sub := NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), '');
  claim_user := NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '');

  BEGIN
    IF claim_sub IS NOT NULL THEN
      RETURN claim_sub::uuid;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    -- ignore invalid UUIDs
  END;

  BEGIN
    IF claim_user IS NOT NULL THEN
      RETURN claim_user::uuid;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    -- ignore invalid UUIDs
  END;

  RETURN NULL;
END;
$$;

-- Helper: current user id as text
CREATE OR REPLACE FUNCTION public.current_user_id_text()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT COALESCE(
    auth.uid()::text,
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'sub'), ''),
    NULLIF((current_setting('request.jwt.claims', true)::jsonb ->> 'user_id'), '')
  );
$$;

-- Helper: admin check based on AdminUser (supports text/uuid userId)
CREATE OR REPLACE FUNCTION public.is_admin(p_user uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
DECLARE
  admin_table regclass;
  match_found boolean;
BEGIN
  admin_table := to_regclass('public."AdminUser"');
  IF admin_table IS NULL THEN
    admin_table := to_regclass('public.admin_user');
  END IF;
  IF admin_table IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE "userId"::text = $1)', admin_table)
      USING p_user::text
      INTO match_found;
    RETURN COALESCE(match_found, false);
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM %s WHERE "user_id"::text = $1)', admin_table)
        USING p_user::text
        INTO match_found;
      RETURN COALESCE(match_found, false);
    EXCEPTION WHEN undefined_column THEN
      RETURN false;
    END;
  END;
END;
$$;

-- Helper: dealer ids for current user
CREATE OR REPLACE FUNCTION public.current_dealer_ids()
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  IF to_regclass('public."Dealer"') IS NOT NULL THEN
    RETURN QUERY EXECUTE
      'SELECT d.id::text FROM public."Dealer" d WHERE d."userId"::text = public.current_user_id_text()';
  END IF;

  IF to_regclass('public."DealerUser"') IS NOT NULL THEN
    RETURN QUERY EXECUTE
      'SELECT du."dealerId"::text FROM public."DealerUser" du WHERE du."userId"::text = public.current_user_id_text()';
  END IF;

  RETURN;
END;
$$;

-- Helper: affiliate ids for current user
CREATE OR REPLACE FUNCTION public.current_affiliate_ids()
RETURNS SETOF text
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
AS $$
BEGIN
  IF to_regclass('public."Affiliate"') IS NOT NULL THEN
    RETURN QUERY EXECUTE
      'SELECT a.id::text FROM public."Affiliate" a WHERE a."userId"::text = public.current_user_id_text()';
  END IF;

  RETURN;
END;
$$;

-- Ensure canary table is readable by anon/authenticated
DO $$
BEGIN
  IF to_regclass('public._connection_canary') IS NOT NULL THEN
    ALTER TABLE public._connection_canary ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = '_connection_canary'
        AND policyname = 'connection_canary_read'
    ) THEN
      CREATE POLICY "connection_canary_read" ON public._connection_canary
        FOR SELECT
        TO anon, authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- Admin settings (snake_case)
DO $$
BEGIN
  IF to_regclass('public.admin_settings') IS NOT NULL THEN
    ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_settings'
        AND policyname = 'admin_settings_admin_select'
    ) THEN
      CREATE POLICY "admin_settings_admin_select" ON public.admin_settings
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_settings'
        AND policyname = 'admin_settings_admin_insert'
    ) THEN
      CREATE POLICY "admin_settings_admin_insert" ON public.admin_settings
        FOR INSERT TO authenticated
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_settings'
        AND policyname = 'admin_settings_admin_update'
    ) THEN
      CREATE POLICY "admin_settings_admin_update" ON public.admin_settings
        FOR UPDATE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_settings'
        AND policyname = 'admin_settings_admin_delete'
    ) THEN
      CREATE POLICY "admin_settings_admin_delete" ON public.admin_settings
        FOR DELETE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS admin_settings_key_idx ON public.admin_settings("key");
  END IF;
END $$;

-- Admin settings (camelCase)
DO $$
BEGIN
  IF to_regclass('public."AdminSettings"') IS NOT NULL THEN
    ALTER TABLE public."AdminSettings" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminSettings'
        AND policyname = 'AdminSettings_admin_select'
    ) THEN
      CREATE POLICY "AdminSettings_admin_select" ON public."AdminSettings"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminSettings'
        AND policyname = 'AdminSettings_admin_insert'
    ) THEN
      CREATE POLICY "AdminSettings_admin_insert" ON public."AdminSettings"
        FOR INSERT TO authenticated
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminSettings'
        AND policyname = 'AdminSettings_admin_update'
    ) THEN
      CREATE POLICY "AdminSettings_admin_update" ON public."AdminSettings"
        FOR UPDATE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminSettings'
        AND policyname = 'AdminSettings_admin_delete'
    ) THEN
      CREATE POLICY "AdminSettings_admin_delete" ON public."AdminSettings"
        FOR DELETE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "AdminSettings_key_idx" ON public."AdminSettings"("key");
  END IF;
END $$;

-- Admin user table access (admin-only)
DO $$
BEGIN
  IF to_regclass('public."AdminUser"') IS NOT NULL THEN
    ALTER TABLE public."AdminUser" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminUser'
        AND policyname = 'AdminUser_admin_select'
    ) THEN
      CREATE POLICY "AdminUser_admin_select" ON public."AdminUser"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminUser'
        AND policyname = 'AdminUser_admin_insert'
    ) THEN
      CREATE POLICY "AdminUser_admin_insert" ON public."AdminUser"
        FOR INSERT TO authenticated
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminUser'
        AND policyname = 'AdminUser_admin_update'
    ) THEN
      CREATE POLICY "AdminUser_admin_update" ON public."AdminUser"
        FOR UPDATE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminUser'
        AND policyname = 'AdminUser_admin_delete'
    ) THEN
      CREATE POLICY "AdminUser_admin_delete" ON public."AdminUser"
        FOR DELETE TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "AdminUser_userId_idx" ON public."AdminUser"("userId");
  END IF;
END $$;

-- SEO tables (support both snake_case and camelCase variants)
DO $$
BEGIN
  IF to_regclass('public.seo_pages') IS NOT NULL THEN
    ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_pages'
        AND policyname = 'seo_pages_admin_select'
    ) THEN
      CREATE POLICY "seo_pages_admin_select" ON public.seo_pages
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_pages'
        AND policyname = 'seo_pages_admin_write'
    ) THEN
      CREATE POLICY "seo_pages_admin_write" ON public.seo_pages
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS seo_pages_page_key_idx ON public.seo_pages(page_key);
  END IF;

  IF to_regclass('public.seo_schema') IS NOT NULL THEN
    ALTER TABLE public.seo_schema ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_schema'
        AND policyname = 'seo_schema_admin_select'
    ) THEN
      CREATE POLICY "seo_schema_admin_select" ON public.seo_schema
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_schema'
        AND policyname = 'seo_schema_admin_write'
    ) THEN
      CREATE POLICY "seo_schema_admin_write" ON public.seo_schema
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS seo_schema_page_key_idx ON public.seo_schema(page_key);
  END IF;

  IF to_regclass('public.seo_health') IS NOT NULL THEN
    ALTER TABLE public.seo_health ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_health'
        AND policyname = 'seo_health_admin_select'
    ) THEN
      CREATE POLICY "seo_health_admin_select" ON public.seo_health
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_health'
        AND policyname = 'seo_health_admin_write'
    ) THEN
      CREATE POLICY "seo_health_admin_write" ON public.seo_health
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS seo_health_page_key_idx ON public.seo_health(page_key);
  END IF;

  IF to_regclass('public.seo_keywords') IS NOT NULL THEN
    ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_keywords'
        AND policyname = 'seo_keywords_admin_select'
    ) THEN
      CREATE POLICY "seo_keywords_admin_select" ON public.seo_keywords
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'seo_keywords'
        AND policyname = 'seo_keywords_admin_write'
    ) THEN
      CREATE POLICY "seo_keywords_admin_write" ON public.seo_keywords
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS seo_keywords_page_key_idx ON public.seo_keywords(page_key);
  END IF;
END $$;

-- SEO tables (camelCase)
DO $$
BEGIN
  IF to_regclass('public."SeoPages"') IS NOT NULL THEN
    ALTER TABLE public."SeoPages" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoPages'
        AND policyname = 'SeoPages_admin_select'
    ) THEN
      CREATE POLICY "SeoPages_admin_select" ON public."SeoPages"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoPages'
        AND policyname = 'SeoPages_admin_write'
    ) THEN
      CREATE POLICY "SeoPages_admin_write" ON public."SeoPages"
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "SeoPages_page_key_idx" ON public."SeoPages"("pageKey");
  END IF;

  IF to_regclass('public."SeoSchema"') IS NOT NULL THEN
    ALTER TABLE public."SeoSchema" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoSchema'
        AND policyname = 'SeoSchema_admin_select'
    ) THEN
      CREATE POLICY "SeoSchema_admin_select" ON public."SeoSchema"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoSchema'
        AND policyname = 'SeoSchema_admin_write'
    ) THEN
      CREATE POLICY "SeoSchema_admin_write" ON public."SeoSchema"
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "SeoSchema_page_key_idx" ON public."SeoSchema"("pageKey");
  END IF;

  IF to_regclass('public."SeoHealth"') IS NOT NULL THEN
    ALTER TABLE public."SeoHealth" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoHealth'
        AND policyname = 'SeoHealth_admin_select'
    ) THEN
      CREATE POLICY "SeoHealth_admin_select" ON public."SeoHealth"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoHealth'
        AND policyname = 'SeoHealth_admin_write'
    ) THEN
      CREATE POLICY "SeoHealth_admin_write" ON public."SeoHealth"
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "SeoHealth_page_key_idx" ON public."SeoHealth"("pageKey");
  END IF;

  IF to_regclass('public."SeoKeywords"') IS NOT NULL THEN
    ALTER TABLE public."SeoKeywords" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoKeywords'
        AND policyname = 'SeoKeywords_admin_select'
    ) THEN
      CREATE POLICY "SeoKeywords_admin_select" ON public."SeoKeywords"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'SeoKeywords'
        AND policyname = 'SeoKeywords_admin_write'
    ) THEN
      CREATE POLICY "SeoKeywords_admin_write" ON public."SeoKeywords"
        FOR ALL TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()))
        WITH CHECK (public.is_admin(public.current_user_id_uuid()));
    END IF;

    CREATE INDEX IF NOT EXISTS "SeoKeywords_page_key_idx" ON public."SeoKeywords"("pageKey");
  END IF;
END $$;

-- Admin audit tables: allow AdminUser-based admin access if needed
DO $$
BEGIN
  IF to_regclass('public."AdminAuditLog"') IS NOT NULL THEN
    ALTER TABLE public."AdminAuditLog" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminAuditLog'
        AND policyname = 'AdminAuditLog_admin_read'
    ) THEN
      CREATE POLICY "AdminAuditLog_admin_read" ON public."AdminAuditLog"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;
  END IF;

  IF to_regclass('public."AdminLoginAttempt"') IS NOT NULL THEN
    ALTER TABLE public."AdminLoginAttempt" ENABLE ROW LEVEL SECURITY;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'AdminLoginAttempt'
        AND policyname = 'AdminLoginAttempt_admin_read'
    ) THEN
      CREATE POLICY "AdminLoginAttempt_admin_read" ON public."AdminLoginAttempt"
        FOR SELECT TO authenticated
        USING (public.is_admin(public.current_user_id_uuid()));
    END IF;
  END IF;
END $$;

COMMIT;
