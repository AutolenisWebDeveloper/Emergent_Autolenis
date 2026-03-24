# Operational Runbooks — Phase 12

This directory contains runbooks for common operational incidents.
Each runbook provides step-by-step guidance for identifying, triaging,
and resolving production issues.

## Runbook Index

| Runbook | Severity | Scenario |
|---------|----------|----------|
| [Scraper Outage](./scraper-outage.md) | HIGH | External data source scraper is failing |
| [Source Degradation](./source-degradation.md) | MEDIUM | External data source returning partial/stale data |
| [Conversion Failures](./conversion-failures.md) | HIGH | Sourcing case → deal conversion failures |
| [Webhook Failures](./webhook-failures.md) | HIGH | Stripe, DocuSign, or other webhook delivery failures |
| [Notification Backlog](./notification-backlog.md) | MEDIUM | Workflow notifications queuing beyond SLA |
| [Database Rollback](./database-rollback.md) | CRITICAL | Emergency schema migration rollback |
| [Dealer Invite Failures](./dealer-invite-failures.md) | MEDIUM | Dealer onboarding invite delivery failures |
| [Trust & Compliance Escalations](./trust-compliance-escalations.md) | CRITICAL | Compliance/trust rule triggers requiring manual review |

## General Incident Workflow

1. **Detect** — Health check alert or monitoring dashboard shows anomaly
2. **Triage** — Open incident via `POST /api/admin/system/incidents`
3. **Investigate** — Check `system_job_runs`, `system_health_checks`, and application logs
4. **Mitigate** — Apply immediate fix or activate rate limiting
5. **Resolve** — Confirm fix, update incident to RESOLVED
6. **Post-mortem** — Document root cause and prevention measures
