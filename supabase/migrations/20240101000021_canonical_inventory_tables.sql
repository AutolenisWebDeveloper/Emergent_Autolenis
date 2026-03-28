-- Migration: Canonical Inventory Tables
-- Date: 2026-03-20
-- Purpose: Creates the three canonical inventory tables that are referenced
--          by FK constraints in phase 5/6/8 migrations and queried by
--          inventory search/admin API routes.
--
-- These tables must exist BEFORE the phase migrations run because:
--   - inventory_admin_events references inventory_listings_canonical(id)
--   - phase6 buyer_packages_sourcing references all three tables
--   - API routes query inventory_listings_canonical directly
--
-- Rollback: DROP TABLE inventory_listings_canonical, inventory_vehicles_canonical,
--           inventory_dealers_external CASCADE;
--
-- Safety: All CREATE TABLE / CREATE INDEX use IF NOT EXISTS for idempotency.

-- ---------------------------------------------------------------------------
-- 1. inventory_vehicles_canonical
--    Normalized vehicle identity (make/model/year/trim/VIN).
--    Multiple listings may reference the same canonical vehicle.
-- ---------------------------------------------------------------------------
create table if not exists inventory_vehicles_canonical (
  id         uuid primary key default gen_random_uuid(),
  vin        text,
  year       int,
  make       text,
  model      text,
  trim       text,
  body_style text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_vehicles_canonical_vin
  on inventory_vehicles_canonical(vin) where vin is not null;

create index if not exists idx_vehicles_canonical_make_model
  on inventory_vehicles_canonical(make, model);

-- ---------------------------------------------------------------------------
-- 2. inventory_dealers_external
--    External dealer directory harvested from scraped listings.
--    Maps to onboarded Dealer records via external_dealer_matches.
-- ---------------------------------------------------------------------------
create table if not exists inventory_dealers_external (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  phone           text,
  address         text,
  website         text,
  source          text,
  source_dealer_id text,
  city            text,
  state           text,
  zip             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_dealers_external_name
  on inventory_dealers_external(name);

create index if not exists idx_dealers_external_source
  on inventory_dealers_external(source, source_dealer_id);

-- ---------------------------------------------------------------------------
-- 3. inventory_listings_canonical
--    Promoted/normalized listings visible to buyers and admins.
--    Sourced from scrape_raw_listings via the ingest/promote pipeline.
-- ---------------------------------------------------------------------------
create table if not exists inventory_listings_canonical (
  id                   uuid primary key default gen_random_uuid(),
  raw_listing_id       uuid references scrape_raw_listings(id) on delete set null,
  canonical_vehicle_id uuid references inventory_vehicles_canonical(id) on delete set null,
  external_dealer_id   uuid references inventory_dealers_external(id) on delete set null,

  source       text,
  vin          text,
  year         int,
  make         text,
  model        text,
  trim         text,
  price        int,
  mileage      int,
  listing_url  text,

  dealer_name    text,
  dealer_phone   text,
  dealer_address text,
  dealer_website text,

  city  text,
  state text,
  zip   text,

  status       text not null default 'ACTIVE',
  last_seen_at timestamptz default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_listings_canonical_status
  on inventory_listings_canonical(status);

create index if not exists idx_listings_canonical_vin
  on inventory_listings_canonical(vin) where vin is not null;

create index if not exists idx_listings_canonical_make_model
  on inventory_listings_canonical(make, model);

create index if not exists idx_listings_canonical_zip
  on inventory_listings_canonical(zip);

create index if not exists idx_listings_canonical_last_seen
  on inventory_listings_canonical(last_seen_at desc);

create index if not exists idx_listings_canonical_source
  on inventory_listings_canonical(source);

create index if not exists idx_listings_canonical_raw
  on inventory_listings_canonical(raw_listing_id);
