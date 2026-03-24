# Rollout Notes — Checkout Session Idempotency (Issue #357)

## Summary
Centralizes checkout session creation into a canonical `CheckoutService` that:
- Reuses open Stripe checkout sessions (prevents duplicate sessions)
- Creates fresh sessions when the previous one is expired/canceled/unusable
- Derives idempotency keys from the payment row ID + attempt counter (not broad buyer+auction keys)
- Enforces ownership validation, lifecycle state guards, and already-paid rejection

## Architecture

### Canonical entry point: `lib/services/checkout.service.ts`
All checkout session creation is centralized in:
- `CheckoutService.getOrCreateDepositCheckout()`
- `CheckoutService.getOrCreateServiceFeeCheckout()`

Both `app/actions/stripe.ts` and `app/api/payments/create-checkout/route.ts` now delegate to these canonical methods.

### Session reuse flow
1. Look up existing PENDING payment row (DepositPayment or ServiceFeePayment)
2. If the row has a `checkoutSessionId`, retrieve the session from Stripe
3. If the session status is `open`, return it directly (reuse — no new session created)
4. If the session is expired/complete/unusable, create a new Stripe checkout session
5. Persist the new `checkoutSessionId` and increment `checkoutAttempt` on the payment row
6. Use `{type}_cs_{paymentId}_{attempt}` as the Stripe idempotency key

### Why not static buyer+auction keys?
Static keys like `deposit_checkout_{buyerId}_{auctionId}` trap users for up to 24 hours (Stripe's idempotency window) — if the session expires after 30 minutes, the same key returns the expired session. The payment-row-derived key with an attempt counter allows fresh sessions to be created when needed.

## Changes

### `lib/services/checkout.service.ts` (NEW)
- `CheckoutService.getOrCreateDepositCheckout()`: Canonical deposit checkout flow
- `CheckoutService.getOrCreateServiceFeeCheckout()`: Canonical service fee checkout flow  
- `CheckoutError`: Typed error class with machine-readable `code` field

### `lib/stripe.ts`
- Removed static idempotency keys from `createDepositCheckoutSession` and `createServiceFeeCheckoutSession`
- These functions are now low-level wrappers; idempotency is handled by the checkout service

### `app/actions/stripe.ts`
- `startDepositCheckout`: Delegates to `CheckoutService.getOrCreateDepositCheckout()`
- `startServiceFeeCheckout`: Delegates to `CheckoutService.getOrCreateServiceFeeCheckout()`

### `app/api/payments/create-checkout/route.ts`
- Delegates to `CheckoutService` for both deposit and service fee flows
- Maps `CheckoutError` codes to HTTP status codes (403 for UNAUTHORIZED, 400 for others)

### `lib/services/payment.service.ts`
- Simplified `createDepositPayment`: Removed checkout-level idempotency logic (now handled by CheckoutService)

## Deployment Notes
- **Migration required**: `migrations/M004-checkout-session-idempotency.sql` adds `checkoutSessionId` (TEXT, nullable) and `checkoutAttempt` (INTEGER, default 0) to both `DepositPayment` and `ServiceFeePayment` tables.
- **Prisma schema updated**: Both models now include the new fields.
- **No webhook changes** — broader Stripe webhook logic is untouched
- **Backward compatible** — existing payment flows (PaymentService.createDepositPayment, etc.) continue to work for PaymentIntent-based flows

## Testing
- 28 behavioral runtime tests in `__tests__/checkout-idempotency.test.ts`  
- Tests use mocked Stripe + Supabase to verify actual behavior:
  - Second call returns same open session (no duplicate Stripe session)
  - Expired session results in fresh new session  
  - Duplicate PENDING rows are not created
  - Unauthorized buyer cannot create checkout for another buyer's deal
  - Invalid lifecycle state rejects checkout creation
  - Already-paid deposits/fees are rejected
  - Payment-row-derived idempotency keys (not buyer+auction)
  - Attempt counter increments on fresh session creation (not on reuse)
  - checkoutSessionId is persisted and used for session retrieval
  - checkoutAttempt stays the same when reusing open session
  - Duplicate service-fee rows are not created under repeated calls
- All 17 existing payment flow tests continue to pass
- Typecheck: No new errors in changed files
- Lint: Clean

