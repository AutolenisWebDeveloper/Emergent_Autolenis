---
applyTo: "lib/stripe.ts|lib/services/payment.service.ts|app/api/payments/**|app/api/webhooks/**"
---
# Payments + Webhooks (Non-Negotiable)

- All payment mutations MUST be idempotent and safe under retries/replays.
- All webhooks MUST verify signatures and reject invalid payloads.
- Never trust webhook metadata alone; always reconcile against DB records.
- Any refund MUST:
  1) update the payment record state,
  2) write an immutable ledger/transaction entry,
  3) reverse affiliate commissions when applicable,
  4) emit an auditable compliance/admin event.
- Add/maintain unit tests for: fee tier logic, deposit-credit logic, refund reversal, webhook replay protection.
