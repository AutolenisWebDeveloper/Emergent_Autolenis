-- Phase 9: Workflow Automation, Notifications & SLA Timers
-- Creates tables for notification queue, SLA rules, and SLA events
-- Seeds baseline SLA rules for all workflow types

-- 1. Notification queue for pending/sent workflow notifications
create table if not exists workflow_notification_queue (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  recipient_type text not null,
  recipient_id text,
  recipient_email text,
  template_key text not null,
  subject text,
  payload jsonb default '{}'::jsonb,
  status text not null default 'PENDING',
  send_after timestamptz default now(),
  sent_at timestamptz,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_workflow_notification_queue_status
  on workflow_notification_queue(status, send_after);

-- 2. Configurable SLA thresholds by workflow type
create table if not exists workflow_sla_rules (
  id uuid primary key default gen_random_uuid(),
  workflow_type text not null,
  rule_key text not null,
  threshold_minutes int not null,
  action_type text not null,
  is_active boolean not null default true,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists uq_workflow_sla_rules
  on workflow_sla_rules(workflow_type, rule_key);

-- 3. Triggered SLA violations, escalations, reminders, and expirations
create table if not exists workflow_sla_events (
  id uuid primary key default gen_random_uuid(),
  workflow_type text not null,
  entity_id text not null,
  rule_key text not null,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_workflow_sla_events_entity
  on workflow_sla_events(workflow_type, entity_id, created_at desc);

-- 4. Seed baseline SLA rules
insert into workflow_sla_rules (workflow_type, rule_key, threshold_minutes, action_type, payload)
values
  ('INVENTORY_LEAD', 'NEW_LEAD_UNTOUCHED', 30, 'REMINDER', '{"notify":"ADMIN"}'),
  ('INVENTORY_LEAD', 'LEAD_STALE', 240, 'ESCALATION', '{"notify":"ADMIN"}'),
  ('SOURCING_CASE', 'CASE_OPEN_NO_INVITES', 60, 'REMINDER', '{"notify":"ADMIN"}'),
  ('SOURCING_CASE', 'CASE_STUCK_RESPONDING', 480, 'ESCALATION', '{"notify":"ADMIN"}'),
  ('SOURCING_INVITE', 'INVITE_NO_VIEW', 120, 'REMINDER', '{"notify":"DEALER"}'),
  ('SOURCING_INVITE', 'INVITE_EXPIRE', 1440, 'EXPIRED', '{"notify":"DEALER"}'),
  ('SOURCING_OFFER', 'NEW_OFFER_SUBMITTED', 1, 'REMINDER', '{"notify":"ADMIN"}'),
  ('CASE_CONVERSION', 'CONVERSION_STUCK', 60, 'ESCALATION', '{"notify":"ADMIN"}')
on conflict (workflow_type, rule_key) do nothing;
