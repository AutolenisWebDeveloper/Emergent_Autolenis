-- Phase 7: Sourcing Case → Deal Conversion Tracking
-- These tables track the one-time conversion from a sourcing case to a real deal pipeline.
-- They do NOT use FK constraints to Prisma-managed tables (SelectedDeal, VehicleRequestCase, etc.)
-- because Prisma owns those schemas. Instead, IDs are stored as plain columns and validated
-- programmatically in the conversion orchestrator service.

create table if not exists inventory_case_conversions (
  id uuid primary key default gen_random_uuid(),

  -- Sourcing lineage (validated by service layer, no FK to Prisma tables)
  sourcing_case_id text not null,
  selected_offer_id text not null,
  buyer_package_id text,

  -- Resolved entities
  buyer_user_id text,
  matched_dealer_id text,
  listing_id text,
  canonical_vehicle_id text,

  -- Created deal reference
  deal_id text,
  selected_deal_id text,

  -- Conversion status
  status text not null default 'PENDING',
  error_message text,
  payload jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- One conversion per sourcing case (idempotency guard)
create unique index if not exists uq_inventory_case_conversions_case
  on inventory_case_conversions(sourcing_case_id);

create table if not exists deal_conversion_events (
  id uuid primary key default gen_random_uuid(),
  conversion_id uuid not null references inventory_case_conversions(id) on delete cascade,
  event_type text not null,
  actor_user_id text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_deal_conversion_events_conversion
  on deal_conversion_events(conversion_id, created_at desc);
