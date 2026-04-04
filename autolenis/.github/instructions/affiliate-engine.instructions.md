---
applyTo: "lib/services/affiliate.service.ts|app/api/affiliate/**|app/api/webhooks/**commission**"
---
# Affiliate Engine (Non-Negotiable)

## Referral Chain Integrity
- Enforce: no self-referrals; prevent referral loops; max chain depth 5.
- Validate the entire referral chain on creation — reject if any circular dependency is detected.
- Referral links must be scoped to a workspace and validated before crediting.

## Commission Accrual Rules
- Commissions accrue **only** on successful revenue events (e.g., concierge fee `payment_intent.succeeded`).
- Never accrue commissions on pending, failed, or disputed payments.
- Commission calculations must be deterministic and auditable — log the fee tier, base amount, and resulting commission.

## Refund & Reversal Semantics
- Refunds must reverse commissions atomically with payment reversal — use a single transaction.
- Partial refunds must proportionally reverse commissions; full refunds reverse all commissions for that payment.
- Reversed commissions must be recorded in the event ledger with the original commission ID for traceability.

## Data Isolation
- Enforce strict data isolation: affiliates only see their own referrals, commissions, and payouts.
- Every affiliate query must scope to the authenticated affiliate's ID — never accept affiliate ID from the client.
- Payout summaries must never leak data from other affiliates or workspaces.

## Testing Requirements
- Add/maintain unit tests for:
  - Referral chain build and validation (including loop detection and max depth).
  - Commission calculation across fee tiers.
  - Full and partial refund reversal semantics.
  - Data isolation (verify affiliate A cannot see affiliate B's data).
  - Idempotency of commission accrual (duplicate webhook events must not double-credit).
