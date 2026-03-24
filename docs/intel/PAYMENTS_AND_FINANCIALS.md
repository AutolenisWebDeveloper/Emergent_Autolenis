# PAYMENTS_AND_FINANCIALS.md
> Generated on: 2026-02-22 | Repository: Autolenis/VercelAutoLenis

## Payment Architecture

- **Payment provider:** Stripe only (`lib/stripe.ts`)
- **SDK:** `stripe` npm package, lazy-initialized singleton via Proxy pattern
- **Webhook:** Signature verification via `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
- **Service layer:** `lib/services/payment.service.ts` (983 LOC)
- **Constants:** `lib/constants.ts` — all fee amounts defined in both dollars and cents

## End-to-End Payment Flows

### 1. Deposit Flow ($99)

**Constants:** `DEPOSIT_AMOUNT = 99`, `DEPOSIT_AMOUNT_CENTS = 9900` (`lib/constants.ts:24-25`)

**Flow:**
1. Buyer initiates deposit → `POST /api/buyer/deposit` or `POST /api/payments/deposit`
2. `PaymentService.createDepositPayment(buyerId, auctionId)`:
   - Checks for existing PAID deposit (idempotent — returns early if found)
   - Creates Stripe `PaymentIntent` with metadata `{ buyerId, auctionId, type: "deposit" }`
   - Inserts `DepositPayment` record with status `PENDING`
   - Returns `clientSecret` for frontend
3. Frontend completes Stripe payment
4. Stripe webhook `checkout.session.completed` (type=deposit):
   - Updates `DepositPayment.status` → `SUCCEEDED`
   - Sets `stripePaymentIntentId`
   - Logs `ComplianceEvent` (DEPOSIT_PAYMENT → DEPOSIT_PAID)
   - Creates `AdminNotification` (P1, category: PAYMENT)
5. Alternatively, `payment_intent.succeeded`:
   - `PaymentService.confirmDepositPayment(paymentIntentId)` called
   - Updates status to `PAID`
   - Logs compliance event

**Idempotency:**
- `stripePaymentIntentId` has unique constraint on `DepositPayment`
- Duplicate deposit check at creation (`lib/services/payment.service.ts:15-24`)

**Models:** `DepositPayment` (status: PENDING → SUCCEEDED/FAILED/REFUNDED)

### 2. Concierge Fee Flow (V2: Flat Fee)

**Fee:** (`lib/constants.ts`, `src/config/pricingConfig.ts`)
- V2: Flat $499 Premium concierge fee (no OTD threshold)
- Deposit credit: $99 applied to final fee ($400 remaining)

**Payment Options:**
1. **Pay by card** — Stripe payment
2. **Include in loan** — fee rolled into financing with disclosure

**Flow (Card Payment):**
1. Buyer views fee options → `GET /api/buyer/deals/[dealId]/concierge-fee` or `GET /api/payments/fee/options/[dealId]`
2. `PaymentService.getFeeOptions(dealId)`:
   - Calculates base fee from OTD
   - Checks for paid deposit → applies credit
   - Returns `{ baseFeeCents, depositAppliedCents, remainingCents }`
3. Buyer pays by card → `POST /api/buyer/deals/[dealId]/concierge-fee/pay-card` or `POST /api/payments/fee/pay-card`
4. Creates `ServiceFeePayment` with `paymentMethod: CARD`
5. Stripe checkout session created via `createServiceFeeCheckoutSession()` (`lib/stripe.ts:45-68`)
6. Stripe webhook `checkout.session.completed` (type=service_fee):
   - Updates `ServiceFeePayment.status` → `SUCCEEDED`
   - Updates `SelectedDeal.status` → `FEE_PAID`
   - **Triggers affiliate commission** via `affiliateService.processCommission()`
   - Logs compliance event
   - Creates admin notification

**Flow (Loan Inclusion):**
1. Buyer requests loan impact → `GET /api/payments/fee/loan-impact/[dealId]`
2. System calculates monthly increase + total extra cost
3. Buyer agrees → `POST /api/payments/fee/loan-agree` or `POST /api/buyer/deals/[dealId]/concierge-fee/include-in-loan`
4. Creates `FeeFinancingDisclosure` with:
   - `feeAmount`, `apr`, `termMonths`, `monthlyIncrease`, `totalExtraCost`
   - `consentGiven`, `consentTimestamp`, `ipAddress`, `userAgent`
5. Creates `LenderFeeDisbursement` with status `PENDING`
6. Updates `ServiceFeePayment.paymentMethod` → `LOAN_INCLUSION`, status → `SUCCEEDED`
7. Deal advances to `FEE_PAID`

**Models:** `ServiceFeePayment`, `FeeFinancingDisclosure`, `LenderFeeDisbursement`

### 3. Refund Flow

**Models:** `Refund` (links to any payment type via `relatedPaymentId` + `relatedPaymentType`)

**Types:** deposit, service_fee, deposit_request, concierge_fee_request, manual

**Admin-Initiated:**
1. Admin triggers refund → `POST /api/admin/payments/refund` or `POST /api/admin/payments/refunds/initiate`
2. Creates `Refund` record with status `PENDING`
3. Processes through Stripe refund API
4. Updates related payment record (e.g., `DepositPayment.refunded = true`)
5. **Commission reversal:** If refunding a service fee, affiliate commissions linked to that deal are reversed atomically
6. Logs compliance event + creates admin notification

**Deal-Level Refunds:**
- `POST /api/admin/deals/[dealId]/refunds` — refund specific to a deal
- `POST /api/admin/refund/deposit` — deposit-specific refund

### 4. Chargebacks / Disputes

**Stripe Webhook:** `charge.dispute.created`
- Handler: `handleDisputeCreated(dispute)` in `app/api/webhooks/stripe/route.ts`
- Creates `Chargeback` record linked to `Transaction`
- Sets status to `OPEN`
- Creates P0 admin notification

**Models:** `Chargeback` (status: OPEN → WON/LOST), `Transaction`

### 5. Affiliate Commissions & Payouts

**Commission Rates:** (`lib/services/affiliate.service.ts:8-14`, `lib/constants.ts:27-33`)
| Level | Rate |
|-------|------|
| 1 | 15% |
| 2 | 3% |
| 3 | 2% |

> Both `lib/services/affiliate.service.ts` and `lib/constants.ts` define the same canonical 3-level rates (15%/3%/2%).

**Commission Flow:**
1. Service fee payment succeeds (Stripe webhook `checkout.session.completed`)
2. System checks if buyer was referred (via `Referral` record)
3. `affiliateService.processCommission(referrerAffiliate, buyerUserId, feeAmount, "PURCHASE")`:
   - Walks referral chain up to 3 levels
   - Creates `Commission` record per level with calculated amount
   - Updates `Affiliate.pendingEarnings`
4. Commissions accrue with status `PENDING`

**Payout Flow:**
1. Admin initiates payout → `POST /api/admin/affiliates/payouts/[payoutId]/process` or admin payment routes
2. Creates `Payout` record grouping eligible commissions
3. Processes payment (bank transfer or other method)
4. Updates commission statuses to `PAID`
5. Updates `Affiliate.totalEarnings`, decrements `pendingEarnings`

**Commission Reversal (on refund):**
- When a service fee is refunded, all commissions linked to that deal are reversed
- Commission status updated to `REVERSED`
- Affiliate earnings decremented
- Must be atomic with payment reversal (enforced by service layer)

**Models:** `Commission`, `Payout`, `AffiliatePayment`

### 6. Ledger / Transaction Model

**Model:** `Transaction` — financial ledger tracking all money movement

| Field | Purpose |
|-------|---------|
| `type` | PAYMENT, REFUND, CHARGEBACK, PAYOUT |
| `grossAmount` | Total amount |
| `stripeFee` | Stripe processing fee |
| `platformFee` | AutoLenis platform fee |
| `netAmount` | Net after fees |
| `currency` | Default "usd" |
| `status` | SUCCEEDED, PENDING, FAILED |
| `userType` | BUYER, DEALER, AFFILIATE |
| `dealId` | Linked deal |
| `refinanceId` | Linked refinance lead |

**Financial Audit:** `FinancialAuditLog` tracks admin actions on financial entities

### Admin Payment Management

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/payments/deposits/request` | Admin requests deposit from buyer |
| `POST /api/admin/payments/concierge-fees/request` | Admin requests concierge fee |
| `POST /api/admin/payments/send-link` | Send payment link to buyer |
| `POST /api/admin/payments/mark-received` | Manually mark payment received |
| `POST /api/admin/payments/refund` | Initiate refund |
| `GET /api/admin/payments` | All payments overview |
| `GET /api/admin/payments/deposits` | Deposit list |
| `GET /api/admin/payments/concierge-fees` | Fee list |
| `GET /api/admin/payments/refunds` | Refund list |
| `GET /api/admin/financial` | Financial dashboard |
| `GET /api/admin/financial/reconciliation` | Financial reconciliation |
| `GET /api/admin/financial/export` | Export financial data |
| `GET /api/admin/reports/finance` | Finance reports |

## Stripe Webhook Events Handled

**File:** `app/api/webhooks/stripe/route.ts`

| Event | Handler | Side Effects |
|-------|---------|-------------|
| `checkout.session.completed` | `handleCheckoutCompleted()` | Updates DepositPayment/ServiceFeePayment status; logs ComplianceEvent; creates AdminNotification; triggers affiliate commission (for service fees) |
| `payment_intent.succeeded` | `handlePaymentIntentSucceeded()` | Confirms payment; updates status |
| `payment_intent.payment_failed` | `handlePaymentIntentFailed()` | Updates payment status to FAILED; creates P0 admin notification |
| `charge.refunded` | `handleChargeRefunded()` | Creates Refund record; updates payment record; reverses commissions if applicable |
| `charge.dispute.created` | `handleDisputeCreated()` | Creates Chargeback record; creates P0 admin notification |
| `payout.paid` | `handlePayoutPaid()` | Updates payout status |

**Additional:** `app/api/webhooks/stripe/commission-trigger/route.ts` — dedicated endpoint for commission processing on payment events.

## Idempotency Strategy

| Mechanism | Location | Evidence |
|-----------|----------|---------|
| `PaymentProviderEvent.eventId` unique index | `prisma/schema.prisma` | Webhook event dedup — check `eventId` before processing |
| `DepositPayment.stripePaymentIntentId` unique | `prisma/schema.prisma` | Prevents duplicate deposit records |
| `ServiceFeePayment.stripePaymentIntentId` unique | `prisma/schema.prisma` | Prevents duplicate fee records |
| Existing payment check before creation | `payment.service.ts:15-24` | `createDepositPayment()` checks for existing PAID record |
| `AdminNotification.dedupeKey` | `prisma/schema.prisma` | Prevents duplicate notifications |
| `checkout.session.completed` status check | `webhooks/stripe/route.ts` | Only updates PENDING records |

**Gap:** While unique constraints prevent duplicate records, there's no explicit "already processed" check on webhook event ID before running side effects. The `PaymentProviderEvent` model exists but webhook handler doesn't clearly log/check it before processing.
