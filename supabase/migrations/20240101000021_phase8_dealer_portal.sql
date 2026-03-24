-- Phase 8: Dealer Portal Participation Tables
-- Enables two-sided marketplace: dealer inbox, invite lifecycle, offer submission,
-- and external-to-onboarded dealer migration.
--
-- NOTE: These tables are intentionally named dealer_portal_* to avoid conflicts
-- with the identically-named but structurally different sourcing_case_invites/offers
-- tables created by the Phase 6 migration (which serves the buyer-package sourcing
-- flow). Phase 6 tables reference sourcing_cases; these reference VehicleRequestCase.

-- ---------------------------------------------------------------------------
-- dealer_portal_invites — case-level invites sent to onboarded dealers
-- ---------------------------------------------------------------------------
-- Lifecycle: PENDING → SENT → VIEWED → RESPONDED / DECLINED / EXPIRED
create table if not exists dealer_portal_invites (
  id          uuid primary key default gen_random_uuid(),
  case_id     text not null references "VehicleRequestCase"(id) on delete cascade,
  dealer_id   text not null references "Dealer"(id) on delete cascade,
  status      text not null default 'PENDING'
    check (status in ('PENDING','SENT','VIEWED','RESPONDED','DECLINED','EXPIRED')),
  notes       text,
  deadline    timestamptz,
  viewed_at   timestamptz,
  responded_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_dpi_dealer on dealer_portal_invites(dealer_id);
create index if not exists idx_dpi_case   on dealer_portal_invites(case_id);
create index if not exists idx_dpi_status on dealer_portal_invites(status);

-- Prevent duplicate invites for the same case + dealer pair.
create unique index if not exists idx_dpi_case_dealer
  on dealer_portal_invites(case_id, dealer_id);

-- ---------------------------------------------------------------------------
-- dealer_portal_offers — dealer-submitted offers through the portal
-- ---------------------------------------------------------------------------
-- Lifecycle: SUBMITTED → UNDER_REVIEW → SHORTLISTED → SELECTED / REJECTED / WITHDRAWN
create table if not exists dealer_portal_offers (
  id            uuid primary key default gen_random_uuid(),
  invite_id     uuid not null references dealer_portal_invites(id) on delete cascade,
  case_id       text not null references "VehicleRequestCase"(id) on delete cascade,
  dealer_id     text not null references "Dealer"(id) on delete cascade,
  listing_url   text,
  vin           text,
  year          int,
  make          text,
  model         text,
  trim          text,
  mileage       int,
  price_cents   int,
  fees_cents    int default 0,
  notes         text,
  status        text not null default 'SUBMITTED'
    check (status in ('SUBMITTED','UNDER_REVIEW','SHORTLISTED','SELECTED','REJECTED','WITHDRAWN')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_dpo_invite  on dealer_portal_offers(invite_id);
create index if not exists idx_dpo_case    on dealer_portal_offers(case_id);
create index if not exists idx_dpo_dealer  on dealer_portal_offers(dealer_id);
create index if not exists idx_dpo_status  on dealer_portal_offers(status);

-- ---------------------------------------------------------------------------
-- dealer_portal_external_matches — map scraped external dealers → onboarded dealers
-- ---------------------------------------------------------------------------
-- NOTE: This is separate from external_dealer_matches (Phase 5) which maps by
-- inventory_dealers_external UUID. This table maps by dealer name + source strings.
create table if not exists dealer_portal_external_matches (
  id                    uuid primary key default gen_random_uuid(),
  external_dealer_name  text not null,
  external_dealer_source text not null,
  dealer_id             text not null references "Dealer"(id) on delete cascade,
  matched_at            timestamptz not null default now(),
  matched_by            text,
  confidence            real default 1.0,
  notes                 text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_dpem_dealer on dealer_portal_external_matches(dealer_id);
create index if not exists idx_dpem_name   on dealer_portal_external_matches(external_dealer_name);

-- Prevent duplicate matches for the same external name + source + dealer.
create unique index if not exists idx_dpem_unique
  on dealer_portal_external_matches(external_dealer_name, external_dealer_source, dealer_id);
