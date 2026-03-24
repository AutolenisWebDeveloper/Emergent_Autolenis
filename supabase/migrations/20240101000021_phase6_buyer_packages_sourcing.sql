-- Migration: Phase 6 — Buyer Packages & Sourcing Cases
-- Date: 2026-03-18
-- Purpose: Conversion layer from inventory leads / sourcing requests
--          into structured buyer packages, sourcing cases, dealer invites,
--          and offer intake.
--
-- Pre-requisites:
--   Phase 5 tables must exist: inventory_leads, vehicle_sourcing_requests,
--   inventory_listings_canonical, inventory_vehicles_canonical,
--   inventory_dealers_external.
--   The Prisma "Dealer" table must exist.
--
-- Safety: All CREATE TABLE / CREATE INDEX use IF NOT EXISTS for idempotency.

-- ---------------------------------------------------------------------------
-- 1. buyer_packages_intake
-- ---------------------------------------------------------------------------
create table if not exists buyer_packages_intake (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references inventory_leads(id) on delete set null,
  sourcing_request_id uuid references vehicle_sourcing_requests(id) on delete set null,

  buyer_user_id text,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  buyer_zip text,

  requested_listing_id uuid references inventory_listings_canonical(id) on delete set null,
  canonical_vehicle_id uuid references inventory_vehicles_canonical(id) on delete set null,

  year_min int,
  year_max int,
  make text,
  model text,
  trim text,
  max_price int,
  max_mileage int,
  preferred_zip text,
  preferred_radius int,

  package_type text not null default 'SOURCE',
  status text not null default 'DRAFT',
  notes text,
  payload jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_buyer_packages_intake_status
  on buyer_packages_intake(status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. sourcing_cases
-- ---------------------------------------------------------------------------
create table if not exists sourcing_cases (
  id uuid primary key default gen_random_uuid(),
  buyer_package_id uuid not null references buyer_packages_intake(id) on delete cascade,
  lead_id uuid references inventory_leads(id) on delete set null,
  sourcing_request_id uuid references vehicle_sourcing_requests(id) on delete set null,

  case_type text not null default 'SOURCE',
  status text not null default 'OPEN',
  assigned_admin_user_id text,

  matched_dealer_id text references public."Dealer"(id) on delete set null,
  matched_external_dealer_id uuid references inventory_dealers_external(id) on delete set null,
  selected_offer_id uuid,

  notes text,
  payload jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sourcing_cases_status
  on sourcing_cases(status, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. sourcing_case_invites
-- ---------------------------------------------------------------------------
create table if not exists sourcing_case_invites (
  id uuid primary key default gen_random_uuid(),
  sourcing_case_id uuid not null references sourcing_cases(id) on delete cascade,

  dealer_id text references public."Dealer"(id) on delete set null,
  external_dealer_id uuid references inventory_dealers_external(id) on delete set null,

  invite_type text not null default 'PLATFORM',
  status text not null default 'PENDING',
  sent_at timestamptz,
  viewed_at timestamptz,
  responded_at timestamptz,
  expires_at timestamptz,

  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sourcing_case_invites_case
  on sourcing_case_invites(sourcing_case_id, status);

-- ---------------------------------------------------------------------------
-- 4. sourcing_case_offers
-- ---------------------------------------------------------------------------
create table if not exists sourcing_case_offers (
  id uuid primary key default gen_random_uuid(),
  sourcing_case_id uuid not null references sourcing_cases(id) on delete cascade,
  invite_id uuid references sourcing_case_invites(id) on delete set null,

  dealer_id text references public."Dealer"(id) on delete set null,
  external_dealer_id uuid references inventory_dealers_external(id) on delete set null,
  listing_id uuid references inventory_listings_canonical(id) on delete set null,
  canonical_vehicle_id uuid references inventory_vehicles_canonical(id) on delete set null,

  status text not null default 'SUBMITTED',

  year int,
  make text,
  model text,
  trim text,
  vin text,
  mileage int,
  price int,
  fees jsonb default '{}'::jsonb,
  notes text,
  listing_url text,

  payload jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_sourcing_case_offers_case
  on sourcing_case_offers(sourcing_case_id, status);
