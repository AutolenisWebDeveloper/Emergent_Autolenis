-- Phase 5: Leads, Sourcing & Dealer Matching
-- Converts scraper-fed inventory into actionable marketplace workflow.

-- 1. External Dealer Matches
-- Maps scraped dealer identity to a real onboarded AutoLenis dealer.
-- FK to inventory_dealers_external is omitted until that table is created;
-- the column is kept as a plain UUID for forward compatibility.
create table if not exists external_dealer_matches (
  id uuid primary key default gen_random_uuid(),
  external_dealer_id uuid not null,
  dealer_id text not null references public."Dealer"(id) on delete cascade,
  match_type text not null default 'ADMIN_CONFIRMED',
  confidence_score numeric(5,2) default 100,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Partial unique index: only one active match per external–dealer pair.
-- Inactive (historical) rows are allowed to coexist.
create unique index if not exists uq_external_dealer_matches_active
  on external_dealer_matches(external_dealer_id, dealer_id)
  where (is_active = true);

-- 2. Inventory Leads
-- Concrete buyer/client interest record tied to a canonical listing.
-- FK references to inventory_listings_canonical, inventory_vehicles_canonical,
-- and inventory_dealers_external are omitted until those tables exist;
-- columns are kept as plain UUIDs for forward compatibility.
create table if not exists inventory_leads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid,
  canonical_vehicle_id uuid,
  external_dealer_id uuid,
  matched_dealer_id text references public."Dealer"(id) on delete set null,

  buyer_user_id text,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  buyer_zip text,

  lead_type text not null default 'CLAIM',
  status text not null default 'NEW',
  assigned_admin_user_id text,
  assigned_dealer_id text references public."Dealer"(id) on delete set null,

  notes text,
  payload jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_inventory_leads_status
  on inventory_leads(status, created_at desc);

create index if not exists idx_inventory_leads_listing
  on inventory_leads(listing_id);

create index if not exists idx_inventory_leads_buyer
  on inventory_leads(buyer_email, buyer_phone);

-- 3. Inventory Lead Events
-- Timeline / audit trail for routing, status changes, assignment, conversion.
create table if not exists inventory_lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references inventory_leads(id) on delete cascade,
  event_type text not null,
  actor_user_id text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_inventory_lead_events_lead
  on inventory_lead_events(lead_id, created_at desc);

-- 4. Vehicle Sourcing Requests
-- Used when a buyer wants a vehicle but not necessarily a specific listing.
create table if not exists vehicle_sourcing_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id text,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  buyer_zip text,

  year_min int,
  year_max int,
  make text,
  model text,
  trim text,
  max_price int,
  max_mileage int,
  preferred_zip text,
  preferred_radius int,
  notes text,

  status text not null default 'OPEN',
  assigned_admin_user_id text,
  assigned_dealer_id text references public."Dealer"(id) on delete set null,

  payload jsonb default '{}'::jsonb,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_vehicle_sourcing_requests_status
  on vehicle_sourcing_requests(status, created_at desc);
