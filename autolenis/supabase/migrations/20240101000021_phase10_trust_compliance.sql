-- ============================================================
-- Phase 10: Trust, Compliance, Fraud Controls, Moderation,
--           and Data Governance
-- ============================================================

-- 1. trust_flags — system- or human-generated risk/quality flags
create table if not exists trust_flags (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  flag_code text not null,
  severity text not null,
  source_type text not null default 'SYSTEM',
  source_user_id text,
  status text not null default 'OPEN',
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_trust_flags_entity
  on trust_flags(entity_type, entity_id, created_at desc);

create index if not exists idx_trust_flags_status
  on trust_flags(status, severity, created_at desc);

-- 2. trust_reviews — structured human review workflow
create table if not exists trust_reviews (
  id uuid primary key default gen_random_uuid(),
  trust_flag_id uuid not null references trust_flags(id) on delete cascade,
  reviewer_user_id text,
  review_status text not null default 'OPEN',
  resolution_code text,
  notes text,
  payload jsonb default '{}'::jsonb,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_trust_reviews_status
  on trust_reviews(review_status, created_at desc);

-- 3. compliance_cases — higher-level investigation records
create table if not exists compliance_cases (
  id uuid primary key default gen_random_uuid(),
  case_type text not null,
  entity_type text not null,
  entity_id text not null,
  related_flag_id uuid references trust_flags(id) on delete set null,
  status text not null default 'OPEN',
  assigned_admin_user_id text,
  priority text not null default 'MEDIUM',
  title text,
  notes text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_compliance_cases_status
  on compliance_cases(status, priority, created_at desc);

-- 4. moderation_actions — explicit moderation decisions
create table if not exists moderation_actions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  action_type text not null,
  actor_user_id text,
  reason_code text,
  notes text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_moderation_actions_entity
  on moderation_actions(entity_type, entity_id, created_at desc);

-- 5. retention_policies — data retention policy registry
create table if not exists retention_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null unique,
  entity_type text not null,
  retention_days int not null,
  action_after_expiry text not null default 'DELETE',
  is_active boolean not null default true,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. retention_holds — litigation/investigation/preservation holds
create table if not exists retention_holds (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  hold_reason text not null,
  hold_source text not null default 'LEGAL',
  is_active boolean not null default true,
  released_at timestamptz,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_retention_holds_entity
  on retention_holds(entity_type, entity_id, is_active);

-- ============================================================
-- Seed baseline retention policies
-- NOTE: entity_type values here cover a broader set than
-- TrustEntityType (e.g. SCRAPE_RAW_LISTING, MODERATION_ACTION)
-- because retention applies to data artifacts beyond trust entities.
-- ============================================================
insert into retention_policies (policy_key, entity_type, retention_days, action_after_expiry, payload)
values
  ('RAW_LISTING_RETENTION', 'SCRAPE_RAW_LISTING', 180, 'DELETE', '{}'),
  ('CANONICAL_LISTING_RETENTION', 'INVENTORY_LISTING', 730, 'ARCHIVE', '{}'),
  ('LEAD_RETENTION', 'INVENTORY_LEAD', 1095, 'ARCHIVE', '{}'),
  ('SOURCING_CASE_RETENTION', 'SOURCING_CASE', 1095, 'ARCHIVE', '{}'),
  ('OFFER_RETENTION', 'SOURCING_OFFER', 1095, 'ARCHIVE', '{}'),
  ('CONVERSION_RETENTION', 'CASE_CONVERSION', 2555, 'ARCHIVE', '{}'),
  ('MODERATION_RETENTION', 'MODERATION_ACTION', 2555, 'ARCHIVE', '{}')
on conflict (policy_key) do nothing;
