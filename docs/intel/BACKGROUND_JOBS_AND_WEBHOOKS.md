# BACKGROUND_JOBS_AND_WEBHOOKS.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## Cron Routes

### 1. Affiliate Reconciliation
- **Route:** `POST /api/cron/affiliate-reconciliation`
- **File:** `app/api/cron/affiliate-reconciliation/route.ts`
- **Security:** `validateCronRequest()` from `lib/middleware/cron-security.ts` — Bearer token (`CRON_SECRET`) + Vercel IP allowlist in production
- **Purpose:** Reconcile affiliate commission records, ensure consistency between referral records and commission payouts, detect and flag anomalies
- **Side Effects:**
  - Updates commission statuses
  - Flags orphaned referrals
  - Logs reconciliation results
- **Retry/Idempotency:** Job is idempotent — re-running produces same state. No retry mechanism beyond Vercel Cron scheduling.

### 2. Contract Shield Reconciliation
- **Route:** `POST /api/cron/contract-shield-reconciliation`
- **File:** `app/api/cron/contract-shield-reconciliation/route.ts`
- **Security:** Same `validateCronRequest()` pattern
- **Purpose:** Sync scan statuses with deal statuses, detect stale scans, send pending review reminders
- **Job Types:** `SYNC_STATUSES`, `CHECK_STALE_SCANS`, `NOTIFY_PENDING`
- **Side Effects:**
  - Updates `ContractShieldScan` statuses
  - Creates `ContractShieldNotification` records
  - Creates `ContractShieldReconciliation` audit records
- **Retry/Idempotency:** Each run creates a new `ContractShieldReconciliation` record with processing stats.

### 3. Close Expired Auctions
- **Route:** `POST /api/auction/close-expired`
- **File:** `app/api/auction/close-expired/route.ts`
- **Security:** Unknown — may use cron secret or be internally triggered
- **Purpose:** Close auctions that have passed their `endsAt` timestamp
- **Side Effects:**
  - Updates `Auction.status` to `CLOSED`
  - Sets `closedAt` timestamp
  - Triggers best-price computation for closed auctions

## Webhook Routes

### 1. Stripe Webhook (Primary)
- **Route:** `POST /api/webhooks/stripe`
- **File:** `app/api/webhooks/stripe/route.ts`
- **Security:** `constructWebhookEvent(body, signature)` — Stripe signature verification using `STRIPE_WEBHOOK_SECRET` (`lib/stripe.ts:90-100`)
- **Events Handled:**

| Event | Handler Function | Side Effects |
|-------|-----------------|-------------|
| `checkout.session.completed` | `handleCheckoutCompleted()` | Updates deposit/fee payment status; logs ComplianceEvent; creates AdminNotification (P1); triggers affiliate commission for service fees |
| `payment_intent.succeeded` | `handlePaymentIntentSucceeded()` | Confirms payment; updates payment record status |
| `payment_intent.payment_failed` | `handlePaymentIntentFailed()` | Updates status to FAILED; creates P0 admin notification |
| `charge.refunded` | `handleChargeRefunded()` | Creates Refund record; marks payment as refunded; reverses affiliate commissions |
| `charge.dispute.created` | `handleDisputeCreated()` | Creates Chargeback record (status: OPEN); creates P0 admin notification |
| `payout.paid` | `handlePayoutPaid()` | Updates payout status |

- **Idempotency:** `PaymentProviderEvent.eventId` unique index enables dedup. `stripePaymentIntentId` unique on payment tables prevents duplicate records.
- **Retry:** Stripe retries failed webhooks automatically. Handler should be idempotent to handle replays.
- **Gap:** Webhook handler does not explicitly check `PaymentProviderEvent` table before processing, relying on DB constraints instead.

### 2. Stripe Commission Trigger
- **Route:** `POST /api/webhooks/stripe/commission-trigger`
- **File:** `app/api/webhooks/stripe/commission-trigger/route.ts`
- **Security:** Stripe signature verification
- **Purpose:** Dedicated endpoint for processing affiliate commissions triggered by payment events
- **Side Effects:** Creates Commission records via `affiliateService.processCommission()`

### 3. E-Sign Webhook
- **Route:** `POST /api/esign/webhook`
- **File:** `app/api/esign/webhook/route.ts`
- **Security:** `ESIGN_WEBHOOK_SECRET` — exact verification mechanism depends on provider
- **Purpose:** Receive e-signature status updates
- **Side Effects:**
  - Updates `ESignEnvelope.status` (CREATED → SENT → VIEWED → SIGNED → COMPLETED)
  - Updates deal status on completion
  - Logs compliance events

### 4. E-Sign Provider Webhook
- **Route:** `POST /api/esign/provider-webhook`
- **File:** `app/api/esign/provider-webhook/route.ts`
- **Security:** Provider-specific verification
- **Purpose:** Provider-specific webhook variant for e-signature events
- **Side Effects:** Similar to e-sign webhook above

## Security Summary

| Route | Auth Mechanism | Secret Env Var |
|-------|---------------|---------------|
| Cron routes | Bearer token + IP allowlist | `CRON_SECRET` |
| Stripe webhooks | Stripe signature verification | `STRIPE_WEBHOOK_SECRET` |
| E-sign webhooks | Secret-based verification | `ESIGN_WEBHOOK_SECRET` |

### Cron Security Details (`lib/middleware/cron-security.ts`)
1. **Token check:** `Authorization` header must match `Bearer ${CRON_SECRET}`
2. **IP check (production only):** Request IP must be in Vercel Cron ranges:
   - `76.76.21.0/24`
   - `76.76.21.21`
   - `76.76.21.142`
3. **Missing secret:** Returns 503 (service not configured)
4. **Invalid secret:** Returns 401 (unauthorized)
5. **Invalid IP:** Returns 403 (forbidden)

## Retry and Idempotency Expectations

| System | Retry Mechanism | Idempotency |
|--------|----------------|-------------|
| Stripe webhooks | Stripe auto-retries (up to 3 days) | DB unique constraints on payment IDs; should check PaymentProviderEvent |
| Cron jobs | Vercel Cron scheduler (next run) | Jobs designed to be re-runnable; reconciliation records track each execution |
| E-sign webhooks | Provider-dependent | Status updates are idempotent (latest status wins) |
| Auction expiry | Next cron invocation | Check `status !== CLOSED` before closing |

## Observable Gaps

1. **No dead-letter queue:** Failed webhook events are not captured for manual retry
2. **No distributed job lock:** Concurrent cron invocations could conflict (mitigated by Vercel Cron being single-trigger)
3. **Webhook event logging:** `PaymentProviderEvent` model exists but not clearly used for pre-check dedup in webhook handler
4. **No exponential backoff:** Application doesn't implement its own retry logic for transient failures
5. **Cron scheduling config:** No `vercel.json` cron configuration found in repo root — scheduling may be configured in Vercel dashboard
