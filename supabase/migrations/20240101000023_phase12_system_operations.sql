-- Migration: Phase 12 — System Operations Tables
-- Date: 2026-03-20
-- Purpose: Production hardening tables for health checks, job runs, incidents,
--          rate limits, and config registry. Enables runtime observability,
--          reliability tracking, cost control, and operational governance.
--
-- Rollback: DROP TABLE IF EXISTS system_config_registry, system_rate_limits,
--           system_incidents, system_job_runs, system_health_checks CASCADE;

-- ============================================================================
-- 1. system_health_checks — Automated health probe results
-- ============================================================================

create table if not exists system_health_checks (
  id uuid primary key default gen_random_uuid(),
  check_key text not null,
  status text not null,
  message text,
  payload jsonb default '{}'::jsonb,
  checked_at timestamptz default now(),
  created_at timestamptz default now()
);

create index if not exists idx_system_health_checks_key
  on system_health_checks(check_key, checked_at desc);

-- ============================================================================
-- 2. system_job_runs — Cron, maintenance, analytics, and scraper job tracking
-- ============================================================================

create table if not exists system_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null,
  run_type text not null default 'CRON',
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms bigint,
  payload jsonb default '{}'::jsonb,
  error_message text,
  created_at timestamptz default now()
);

create index if not exists idx_system_job_runs_key
  on system_job_runs(job_key, started_at desc);

-- ============================================================================
-- 3. system_incidents — Operational incident record and resolution log
-- ============================================================================

create table if not exists system_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_key text not null,
  severity text not null,
  status text not null default 'OPEN',
  title text not null,
  description text,
  payload jsonb default '{}'::jsonb,
  opened_at timestamptz default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_system_incidents_status
  on system_incidents(status, severity, opened_at desc);

-- ============================================================================
-- 4. system_rate_limits — Rate and budget control configuration
-- ============================================================================

create table if not exists system_rate_limits (
  id uuid primary key default gen_random_uuid(),
  limit_key text not null unique,
  is_active boolean not null default true,
  max_per_hour int,
  max_per_day int,
  max_concurrent int,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- 5. system_config_registry — Environment/config expectations for validation
-- ============================================================================

create table if not exists system_config_registry (
  id uuid primary key default gen_random_uuid(),
  config_key text not null unique,
  environment text not null,
  is_required boolean not null default true,
  category text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================================
-- Seed: Rate Limits
-- ============================================================================

insert into system_rate_limits (limit_key, is_active, max_per_hour, max_per_day, max_concurrent, payload)
values
  ('SCRAPE_RUNS', true, 60, 500, 3, '{"scope":"admin_scrape_jobs"}'),
  ('CLAIM_LEADS', true, 500, 5000, 20, '{"scope":"buyer_claim_requests"}'),
  ('SOURCE_REQUESTS', true, 300, 3000, 20, '{"scope":"buyer_source_requests"}'),
  ('NOTIFICATION_SENDS', true, 5000, 50000, 10, '{"scope":"workflow_notifications"}'),
  ('ANALYTICS_SNAPSHOTS', true, 24, 24, 1, '{"scope":"daily_analytics"}')
on conflict (limit_key) do nothing;

-- ============================================================================
-- Seed: Config Registry
-- ============================================================================

insert into system_config_registry (config_key, environment, is_required, category, description)
values
  ('NEXT_PUBLIC_SUPABASE_URL', 'production', true, 'SUPABASE', 'Public Supabase URL'),
  ('SUPABASE_SERVICE_ROLE_KEY', 'production', true, 'SUPABASE', 'Server-side Supabase service role'),
  ('CRON_SECRET', 'production', true, 'SECURITY', 'Authorizes cron execution'),
  ('DOCUSIGN_CONNECT_SECRET', 'production', true, 'DOCUSIGN', 'Webhook verification secret'),
  ('DOCUSIGN_DEALER_TEMPLATE_ID', 'production', true, 'DOCUSIGN', 'Dealer agreement template'),
  ('RESEND_API_KEY', 'production', true, 'EMAIL', 'Outbound email provider key'),
  ('NEXT_PUBLIC_APP_URL', 'production', true, 'APP', 'Canonical application URL')
on conflict (config_key) do nothing;
