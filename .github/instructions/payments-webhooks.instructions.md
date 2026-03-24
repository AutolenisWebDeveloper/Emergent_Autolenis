---
applyTo: "lib/stripe.ts|lib/services/payment.service.ts|app/api/payments/**|app/api/webhooks/**"
---
# Payments + Webhooks (Non-Negotiable)

## Idempotency & Safety
- All payment mutations MUST be idempotent and safe under retries/replays.
- Use Stripe idempotency keys for all create/update operations — derive keys deterministically from business identifiers (e.g., `deal_id + payment_type`).
- Before processing any payment webhook event, check whether it was already processed (by event ID or idempotency key) and skip if so.

## Webhook Verification
- All webhooks MUST verify signatures using the provider's SDK (e.g., `stripe.webhooks.constructEvent()`) and reject invalid payloads with 400.
- Never trust webhook metadata alone; always reconcile the event data against DB records before taking action.
- Log every webhook receipt with: event type, event ID, correlation ID, and processing result (accepted/skipped/failed).

## Refund Protocol
- Any refund MUST execute these steps atomically within a single transaction:
  1. Update the payment record state to `REFUNDED` (or `PARTIALLY_REFUNDED`).
  2. Write an immutable ledger/transaction entry recording the refund amount, reason, and actor.
  3. Reverse affiliate commissions proportionally when applicable.
  4. Emit an auditable compliance/admin event to the event ledger.
- Partial refunds must track the remaining balance and prevent over-refunding.
- Refunds must be idempotent — re-processing the same refund event must not double-reverse commissions.

## Fee Tier Logic
- Fee calculations must use the configured tier table — never hard-code fee percentages.
- Deposit-credit logic must correctly apply credits to the final payment amount.
- All fee calculations must be documented with intermediate values in the event ledger.

## Testing Requirements
- Add/maintain unit tests for:
  - Fee tier calculation across all configured tiers.
  - Deposit-credit application and edge cases (zero deposit, deposit exceeding total).
  - Full and partial refund reversal (payment state + ledger + commissions).
  - Webhook replay protection (duplicate event IDs are safely skipped).
  - Webhook signature verification (invalid signatures return 400).
  - Concurrent payment processing (race condition safety).
