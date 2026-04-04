-- Migration: Buyer Package Billing Tables & RPC Functions
-- Date: 2026-03-20
-- Purpose: Creates the buyer package billing infrastructure tables and
--          6 RPC functions used by buyer-package.service.ts and Stripe webhooks.
--
-- These are required for:
--   - Buyer registration (initializeBuyerPackage)
--   - Stripe webhook handlers (deposit paid/failed/refunded, premium fee)
--   - Admin buyer detail page (billing/history/ledger queries)
--
-- Rollback:
--   DROP FUNCTION IF EXISTS initialize_buyer_package_registration;
--   DROP FUNCTION IF EXISTS upgrade_buyer_to_premium;
--   DROP FUNCTION IF EXISTS mark_buyer_deposit_paid;
--   DROP FUNCTION IF EXISTS mark_buyer_deposit_failed;
--   DROP FUNCTION IF EXISTS mark_buyer_deposit_refunded;
--   DROP FUNCTION IF EXISTS record_premium_fee_payment;
--   DROP TABLE IF EXISTS buyer_payment_ledger;
--   DROP TABLE IF EXISTS buyer_package_history;
--   DROP TABLE IF EXISTS buyer_package_billing;
--
-- Safety: All CREATE TABLE / CREATE INDEX use IF NOT EXISTS for idempotency.
--         All CREATE OR REPLACE FUNCTION for function idempotency.

-- ---------------------------------------------------------------------------
-- 1. buyer_package_billing
--    One row per buyer. Tracks deposit and premium fee payment state.
-- ---------------------------------------------------------------------------
create table if not exists buyer_package_billing (
  buyer_id                          text primary key references "BuyerProfile"(id) on delete cascade,
  deposit_required                  boolean not null default false,
  deposit_amount_cents              int not null default 0,
  deposit_status                    text not null default 'NONE',
  deposit_credit_treatment          text not null default 'NONE',
  deposit_paid_at                   timestamptz,
  premium_fee_total_cents           int not null default 0,
  premium_fee_credit_from_deposit_cents int not null default 0,
  premium_fee_remaining_cents       int not null default 0,
  premium_fee_status                text not null default 'NONE',
  created_at                        timestamptz not null default now(),
  updated_at                        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. buyer_package_history
--    Immutable audit trail of package tier changes.
-- ---------------------------------------------------------------------------
create table if not exists buyer_package_history (
  id            uuid primary key default gen_random_uuid(),
  buyer_id      text not null references "BuyerProfile"(id) on delete cascade,
  old_tier      text,
  new_tier      text not null,
  change_source text not null,
  change_reason text,
  changed_at    timestamptz not null default now()
);

create index if not exists idx_buyer_package_history_buyer
  on buyer_package_history(buyer_id, changed_at desc);

-- ---------------------------------------------------------------------------
-- 3. buyer_payment_ledger
--    Immutable log of all buyer payment events (deposits, fees, refunds).
-- ---------------------------------------------------------------------------
create table if not exists buyer_payment_ledger (
  id                  uuid primary key default gen_random_uuid(),
  buyer_id            text not null references "BuyerProfile"(id) on delete cascade,
  payment_type        text not null,
  direction           text not null,
  amount_cents        int not null,
  external_payment_id text,
  metadata            jsonb,
  created_at          timestamptz not null default now()
);

create index if not exists idx_buyer_payment_ledger_buyer
  on buyer_payment_ledger(buyer_id, created_at desc);

create index if not exists idx_buyer_payment_ledger_external
  on buyer_payment_ledger(external_payment_id) where external_payment_id is not null;

-- ---------------------------------------------------------------------------
-- RPC 1: initialize_buyer_package_registration
--   Called during buyer signup to set initial package tier and create billing row.
-- ---------------------------------------------------------------------------
create or replace function initialize_buyer_package_registration(
  p_buyer_id text,
  p_package  text,
  p_source   text,
  p_version  text default 'v1'
)
returns void
language plpgsql
security definer
as $$
begin
  -- Update BuyerProfile with package info
  update "BuyerProfile"
  set "package_tier"             = p_package,
      "package_selected_at"      = now(),
      "package_selection_source"  = p_source,
      "package_version"          = p_version,
      "updatedAt"                = now()
  where id = p_buyer_id;

  -- Create or update billing record
  insert into buyer_package_billing (buyer_id, deposit_required, deposit_amount_cents, deposit_status, premium_fee_status)
  values (
    p_buyer_id,
    case when p_package = 'PREMIUM' then true else false end,
    case when p_package = 'PREMIUM' then 9900 else 0 end,
    case when p_package = 'PREMIUM' then 'PENDING' else 'NONE' end,
    case when p_package = 'PREMIUM' then 'PENDING' else 'NONE' end
  )
  on conflict (buyer_id) do update set
    deposit_required     = excluded.deposit_required,
    deposit_amount_cents = excluded.deposit_amount_cents,
    deposit_status       = excluded.deposit_status,
    premium_fee_status   = excluded.premium_fee_status,
    updated_at           = now();

  -- Record history entry
  insert into buyer_package_history (buyer_id, old_tier, new_tier, change_source, change_reason)
  values (p_buyer_id, null, p_package, p_source, 'Initial registration');
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC 2: upgrade_buyer_to_premium
--   Upgrades a buyer from STANDARD to PREMIUM tier.
-- ---------------------------------------------------------------------------
create or replace function upgrade_buyer_to_premium(
  p_buyer_id      text,
  p_change_source text,
  p_reason        text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_old_tier text;
begin
  -- Get current tier
  select "package_tier" into v_old_tier
  from "BuyerProfile"
  where id = p_buyer_id;

  -- Update BuyerProfile
  update "BuyerProfile"
  set "package_tier"       = 'PREMIUM',
      "package_upgraded_at" = now(),
      "updatedAt"          = now()
  where id = p_buyer_id;

  -- Update or create billing record
  insert into buyer_package_billing (buyer_id, deposit_required, deposit_amount_cents, deposit_status, premium_fee_status)
  values (p_buyer_id, true, 9900, 'PENDING', 'PENDING')
  on conflict (buyer_id) do update set
    deposit_required     = true,
    deposit_amount_cents = 9900,
    deposit_status       = case when buyer_package_billing.deposit_status = 'PAID' then 'PAID' else 'PENDING' end,
    premium_fee_status   = case when buyer_package_billing.premium_fee_status = 'PAID' then 'PAID' else 'PENDING' end,
    updated_at           = now();

  -- Record history
  insert into buyer_package_history (buyer_id, old_tier, new_tier, change_source, change_reason)
  values (p_buyer_id, v_old_tier, 'PREMIUM', p_change_source, p_reason);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC 3: mark_buyer_deposit_paid
--   Called by Stripe webhook on successful deposit payment.
--   p_amount is in dollars (not cents) to match the TypeScript service layer
--   interface (buyer-package.service.ts converts Stripe's cents to dollars
--   before calling). Converted to cents internally for storage.
-- ---------------------------------------------------------------------------
create or replace function mark_buyer_deposit_paid(
  p_buyer_id            text,
  p_external_payment_id text default null,
  p_amount              numeric default 99.0,
  p_metadata            jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_amount_cents int;
begin
  v_amount_cents := round(p_amount * 100)::int;

  -- Update billing
  update buyer_package_billing
  set deposit_status  = 'PAID',
      deposit_paid_at = now(),
      deposit_credit_treatment = 'CREDIT_TO_FEE',
      premium_fee_credit_from_deposit_cents = v_amount_cents,
      premium_fee_remaining_cents = greatest(premium_fee_total_cents - v_amount_cents, 0),
      updated_at      = now()
  where buyer_id = p_buyer_id;

  -- Record ledger entry
  insert into buyer_payment_ledger (buyer_id, payment_type, direction, amount_cents, external_payment_id, metadata)
  values (p_buyer_id, 'DEPOSIT', 'IN', v_amount_cents, p_external_payment_id, p_metadata);

  -- Record history
  insert into buyer_package_history (buyer_id, old_tier, new_tier, change_source, change_reason)
  values (
    p_buyer_id,
    (select "package_tier" from "BuyerProfile" where id = p_buyer_id),
    (select "package_tier" from "BuyerProfile" where id = p_buyer_id),
    'PAYMENT',
    'Deposit paid'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC 4: mark_buyer_deposit_failed
--   Called by Stripe webhook on failed deposit payment.
--   p_amount is in dollars (not cents) — see RPC 3 comment for rationale.
-- ---------------------------------------------------------------------------
create or replace function mark_buyer_deposit_failed(
  p_buyer_id            text,
  p_external_payment_id text default null,
  p_amount              numeric default 99.0,
  p_metadata            jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_amount_cents int;
begin
  v_amount_cents := round(p_amount * 100)::int;

  -- Update billing
  update buyer_package_billing
  set deposit_status = 'FAILED',
      updated_at     = now()
  where buyer_id = p_buyer_id;

  -- Record ledger entry
  insert into buyer_payment_ledger (buyer_id, payment_type, direction, amount_cents, external_payment_id, metadata)
  values (p_buyer_id, 'DEPOSIT', 'FAILED', v_amount_cents, p_external_payment_id, p_metadata);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC 5: mark_buyer_deposit_refunded
--   Called by Stripe webhook on deposit refund.
--   p_amount is in dollars (not cents) — see RPC 3 comment for rationale.
-- ---------------------------------------------------------------------------
create or replace function mark_buyer_deposit_refunded(
  p_buyer_id            text,
  p_external_payment_id text default null,
  p_amount              numeric default 99.0,
  p_metadata            jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_amount_cents int;
begin
  v_amount_cents := round(p_amount * 100)::int;

  -- Update billing
  update buyer_package_billing
  set deposit_status = 'REFUNDED',
      deposit_credit_treatment = 'NONE',
      premium_fee_credit_from_deposit_cents = 0,
      premium_fee_remaining_cents = premium_fee_total_cents,
      updated_at     = now()
  where buyer_id = p_buyer_id;

  -- Record ledger entry
  insert into buyer_payment_ledger (buyer_id, payment_type, direction, amount_cents, external_payment_id, metadata)
  values (p_buyer_id, 'DEPOSIT', 'REFUND', v_amount_cents, p_external_payment_id, p_metadata);

  -- Record history
  insert into buyer_package_history (buyer_id, old_tier, new_tier, change_source, change_reason)
  values (
    p_buyer_id,
    (select "package_tier" from "BuyerProfile" where id = p_buyer_id),
    (select "package_tier" from "BuyerProfile" where id = p_buyer_id),
    'PAYMENT',
    'Deposit refunded'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC 6: record_premium_fee_payment
--   Called by Stripe webhook on successful premium/service fee payment.
--   p_amount is in dollars (not cents) — see RPC 3 comment for rationale.
-- ---------------------------------------------------------------------------
create or replace function record_premium_fee_payment(
  p_buyer_id            text,
  p_amount              numeric default 0,
  p_external_payment_id text default null,
  p_metadata            jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
declare
  v_amount_cents int;
begin
  v_amount_cents := round(p_amount * 100)::int;

  -- Update billing
  update buyer_package_billing
  set premium_fee_status = 'PAID',
      premium_fee_remaining_cents = greatest(premium_fee_remaining_cents - v_amount_cents, 0),
      updated_at = now()
  where buyer_id = p_buyer_id;

  -- Record ledger entry
  insert into buyer_payment_ledger (buyer_id, payment_type, direction, amount_cents, external_payment_id, metadata)
  values (p_buyer_id, 'PREMIUM_FEE', 'IN', v_amount_cents, p_external_payment_id, p_metadata);
end;
$$;
