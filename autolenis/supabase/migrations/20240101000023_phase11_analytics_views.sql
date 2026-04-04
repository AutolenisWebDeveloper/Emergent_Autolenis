-- Phase 11: Analytics, KPIs, Source Intelligence, Marketplace Reporting
--
-- Rollback:
--   DROP VIEW IF EXISTS analytics_inventory_overview CASCADE;
--   DROP VIEW IF EXISTS analytics_lead_funnel CASCADE;
--   DROP VIEW IF EXISTS analytics_sourcing_case_funnel CASCADE;
--   DROP VIEW IF EXISTS analytics_invite_performance CASCADE;
--   DROP VIEW IF EXISTS analytics_offer_performance CASCADE;
--   DROP VIEW IF EXISTS analytics_conversion_performance CASCADE;
--   DROP VIEW IF EXISTS analytics_ops_risk_overview CASCADE;
--   DROP TABLE IF EXISTS analytics_daily_snapshots CASCADE;
--
-- Dependencies: analytics service (lib/services/analytics/) and admin API
--   route (app/api/admin/analytics/dashboard/) read from these views/table.
--   Remove or update those references before executing rollback.

-- ---------------------------------------------------------------------------
-- 1. Daily KPI snapshot table (durable history)
-- ---------------------------------------------------------------------------
create table if not exists analytics_daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  metric_group text not null,
  metric_key text not null,
  metric_value numeric not null default 0,
  dimension_1 text,
  dimension_2 text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create unique index if not exists uq_analytics_daily_snapshots
  on analytics_daily_snapshots(snapshot_date, metric_group, metric_key, coalesce(dimension_1, ''), coalesce(dimension_2, ''));

-- ---------------------------------------------------------------------------
-- 2. Reporting views
-- ---------------------------------------------------------------------------

-- Inventory overview
create or replace view analytics_inventory_overview as
select
  count(*) as total_canonical_listings,
  count(*) filter (where status = 'ACTIVE') as active_listings,
  count(*) filter (where status = 'BUYER_VISIBLE') as buyer_visible_listings,
  count(*) filter (where status = 'STALE') as stale_listings,
  count(*) filter (where status = 'SUPPRESSED') as suppressed_listings,
  count(*) filter (where vin is not null and vin <> '') as listings_with_vin,
  count(*) filter (where price is not null and price > 0) as listings_with_price
from inventory_listings_canonical;

-- Lead funnel
create or replace view analytics_lead_funnel as
select
  count(*) as total_leads,
  count(*) filter (where lead_type = 'CLAIM') as claim_leads,
  count(*) filter (where lead_type = 'SOURCE') as source_leads,
  count(*) filter (where status = 'NEW') as new_leads,
  count(*) filter (where status = 'REVIEW') as review_leads,
  count(*) filter (where status = 'ASSIGNED') as assigned_leads,
  count(*) filter (where status = 'CONTACTED') as contacted_leads,
  count(*) filter (where status = 'NEGOTIATING') as negotiating_leads,
  count(*) filter (where status = 'CONVERTED') as converted_leads,
  count(*) filter (where status = 'CLOSED') as closed_leads,
  count(*) filter (where status = 'REJECTED') as rejected_leads
from inventory_leads;

-- Sourcing case funnel
create or replace view analytics_sourcing_case_funnel as
select
  count(*) as total_cases,
  count(*) filter (where status = 'OPEN') as open_cases,
  count(*) filter (where status = 'INVITED') as invited_cases,
  count(*) filter (where status = 'RESPONDING') as responding_cases,
  count(*) filter (where status = 'OPTIONS_READY') as options_ready_cases,
  count(*) filter (where status = 'SELECTED') as selected_cases,
  count(*) filter (where status = 'CLOSED') as closed_cases,
  count(*) filter (where status = 'CANCELLED') as cancelled_cases
from sourcing_cases;

-- Invite performance
create or replace view analytics_invite_performance as
select
  count(*) as total_invites,
  count(*) filter (where status = 'SENT') as sent_invites,
  count(*) filter (where status = 'VIEWED') as viewed_invites,
  count(*) filter (where status = 'RESPONDED') as responded_invites,
  count(*) filter (where status = 'DECLINED') as declined_invites,
  count(*) filter (where status = 'EXPIRED') as expired_invites,
  round(
    100.0 * count(*) filter (where status in ('VIEWED', 'RESPONDED')) / nullif(count(*) filter (where status in ('SENT', 'VIEWED', 'RESPONDED', 'DECLINED', 'EXPIRED')), 0),
    2
  ) as invite_view_rate_pct,
  round(
    100.0 * count(*) filter (where status = 'RESPONDED') / nullif(count(*) filter (where status in ('SENT', 'VIEWED', 'RESPONDED', 'DECLINED', 'EXPIRED')), 0),
    2
  ) as invite_response_rate_pct
from sourcing_case_invites;

-- Offer performance
create or replace view analytics_offer_performance as
select
  count(*) as total_offers,
  count(*) filter (where status = 'SUBMITTED') as submitted_offers,
  count(*) filter (where status = 'UNDER_REVIEW') as under_review_offers,
  count(*) filter (where status = 'SHORTLISTED') as shortlisted_offers,
  count(*) filter (where status = 'SELECTED') as selected_offers,
  count(*) filter (where status = 'REJECTED') as rejected_offers,
  count(*) filter (where status = 'WITHDRAWN') as withdrawn_offers,
  round(
    avg(price) filter (where price is not null),
    2
  ) as avg_offer_price
from sourcing_case_offers;

-- Conversion performance
create or replace view analytics_conversion_performance as
select
  count(*) as total_conversions,
  count(*) filter (where status = 'COMPLETED') as completed_conversions,
  count(*) filter (where status = 'FAILED') as failed_conversions,
  count(*) filter (where status not in ('COMPLETED', 'FAILED')) as in_progress_conversions,
  round(
    100.0 * count(*) filter (where status = 'COMPLETED') / nullif(count(*), 0),
    2
  ) as completion_rate_pct
from inventory_case_conversions;

-- Ops / risk overview
create or replace view analytics_ops_risk_overview as
select
  (select count(*) from trust_flags where status = 'OPEN') as open_trust_flags,
  (select count(*) from compliance_cases where status in ('OPEN', 'IN_REVIEW', 'ESCALATED')) as open_compliance_cases,
  (select count(*) from workflow_sla_events where resolved = false) as open_sla_events,
  (select count(*) from workflow_notification_queue where status = 'FAILED') as failed_notifications;
