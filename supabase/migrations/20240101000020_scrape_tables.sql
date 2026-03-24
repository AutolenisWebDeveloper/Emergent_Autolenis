-- Scrape jobs (each ZIP run)
create table if not exists scrape_jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  zip text not null,
  radius int,
  status text default 'running',
  started_at timestamptz default now(),
  completed_at timestamptz,
  total_found int default 0,
  total_saved int default 0,
  error text
);

-- Raw listings (DO NOT SKIP THIS TABLE)
create table if not exists scrape_raw_listings (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references scrape_jobs(id) on delete cascade,

  source text not null,
  source_listing_id text,
  listing_url text,

  vin text,
  price int,
  year int,
  make text,
  model text,
  mileage int,

  dealer_name text,
  dealer_phone text,
  dealer_address text,
  dealer_website text,

  raw_payload jsonb,

  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_scrape_raw_vin on scrape_raw_listings(vin);
create index if not exists idx_scrape_raw_source on scrape_raw_listings(source);
create index if not exists idx_scrape_raw_last_seen on scrape_raw_listings(last_seen_at);
