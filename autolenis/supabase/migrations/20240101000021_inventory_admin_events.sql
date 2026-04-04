-- Phase 4: Inventory admin event tracking table
-- Stores all admin actions on canonical inventory listings for audit purposes.

create table if not exists inventory_admin_events (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references inventory_listings_canonical(id) on delete cascade,
  action text not null,
  actor_user_id text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_inventory_admin_events_listing
  on inventory_admin_events(listing_id, created_at desc);
