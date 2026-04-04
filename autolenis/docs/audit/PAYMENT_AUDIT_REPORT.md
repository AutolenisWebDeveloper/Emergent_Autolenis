# PAYMENT_AUDIT_REPORT.md — AutoLenis Payment System Audit

## Overview

The payment system handles deposits, concierge fees, affiliate commissions, refunds, and financial reporting through Stripe integration.

---

## $99 Deposit

### Implementation
- **File**: `lib/services/payment.service.ts` (lines 13-62)
- **Amount**: 9900 cents ($99.00)
- **Status Flow**: PENDING → SUCCEEDED → REFUNDED
- **Stripe Integration**: PaymentIntent via `createDepositCheckoutSession()`

### Verification
- ✅ Idempotent — checks for existing PAID deposits before creating new
- ✅ Stored in `DepositPayment` table with `stripePaymentIntentId`
- ✅ Applied as credit toward concierge fee
- ✅ Refundable via admin-initiated refund flow

---

## Concierge Fee

### Implementation
- **File**: `lib/services/payment.service.ts` (lines 152-213)
- **Tier Structure**:
  - Low tier (≤ threshold): $499 (49,900 cents)
  - V2: Single flat fee: $499 (49,900 cents)
- **Deposit Credit**: $99 automatically deducted from fee
- **Payment Methods**: CARD (direct) or LOAN_INCLUSION (financed)

### Verification
- ✅ `calculateBaseFee()` implements tier-based calculation
- ✅ `getFeeOptions()` returns breakdown (baseFee, depositApplied, remaining)
- ✅ Two payment paths properly handled

---

## Loan Inclusion Option

### Implementation
- **File**: `lib/services/payment.service.ts` (lines 348-402)
- **Method**: `agreeLoanInclusion()` records `FeeFinancingDisclosure`
- **Disclosure**: Consent text + timestamp stored
- **Impact Calculator**: `calculateLoanImpact()` computes monthly payment increase

### Verification
- ✅ `FeeFinancingDisclosure` model stores consent
- ✅ Loan impact calculation available via `/api/payments/fee/loan-impact/[dealId]`
- ✅ `LenderFeeDisbursement` tracks actual disbursement

---

## Loan Impact Calculator

### Implementation
- **File**: `lib/services/payment.service.ts` (lines 348-402)
- **Calculation**: Monthly increase = fee / ((1 - (1 + r)^(-n)) / r) where r = APR/12, n = remaining months
- **Returns**: monthlyIncrease, totalCost, effectiveApr

### Verification
- ✅ Standard amortization formula applied
- ✅ Accessible via API endpoint
- ✅ `calculator-parity.test.ts` validates calculation accuracy

---

## Lender Disbursement Logic

### Implementation
- **File**: `lib/services/payment.service.ts`
- **Method**: `processLenderDisbursement()` creates `LenderFeeDisbursement` record
- **Trigger**: When fee payment method is LOAN_INCLUSION

### Verification
- ✅ `LenderFeeDisbursement` model tracks lender, amount, date
- ✅ Linked to SelectedDeal

---

## Stripe Webhook Handling

### Implementation
- **File**: `app/api/webhooks/stripe/route.ts`

### Event Handlers

| Event | Action | Verified |
|-------|--------|----------|
| `checkout.session.completed` | Updates payment status to SUCCEEDED; processes commissions | ✅ |
| `payment_intent.succeeded` | Updates payment; creates Transaction ledger entry | ✅ |
| `payment_intent.payment_failed` | Sets status=FAILED; sends P0 admin notification | ✅ |
| `charge.refunded` | Sets refunded=true; logs ComplianceEvent; creates REFUND Transaction | ✅ |
| `charge.dispute.created` | Creates Chargeback record; CHARGEBACK Transaction; P0 notification | ✅ |
| `payout.paid` | Creates PAYOUT Transaction entry | ✅ |

### Verification
- ✅ Webhook signature verification via `constructWebhookEvent()`
- ✅ All 6 event types handled
- ✅ Error handling with 400 responses for invalid payloads

---

## Idempotency Handling

| Operation | Mechanism | Verified |
|-----------|-----------|----------|
| Deposit creation | Checks existing PAID deposits | ✅ |
| Commission creation | Checks `existingCommissions.length > 0` | ✅ |
| Referral chain building | Checks `existingReferrals.length > 0` | ✅ |
| Transaction creation | Dedup by `stripePaymentIntentId` | ✅ |
| Payment status update | Checks current status before updating | ✅ |

---

## Refund Logic

### Implementation
- **File**: `lib/services/payment.service.ts` (lines 577-668)
- **Admin Route**: `POST /api/admin/payments/refunds/initiate`

### Flow
1. Admin initiates refund
2. `processRefund()` finds payment record
3. Calls `stripe.refunds.create()` with `reason: "requested_by_customer"`
4. Updates DB status to REFUNDED
5. For service fees: reverses Commission records (status=REVERSED)
6. Logs ComplianceEvent

### Verification
- ✅ Type-specific handling (deposit vs. service_fee)
- ✅ Commission reversal on service fee refund
- ✅ Stripe refund API call with payment_intent
- ✅ Compliance logging

---

## ComplianceEvent Logging

### Events Logged
| Event Type | Trigger | Verified |
|------------|---------|----------|
| DEPOSIT_PAID | Deposit confirmed | ✅ |
| SERVICE_FEE_PAID | Fee confirmed | ✅ |
| REFUND_PROCESSED | Refund completed | ✅ |
| COMMISSION_CREATED | Commission generated | ✅ |
| COMMISSION_REVERSED | Commission reversed on refund | ✅ |
| DOC_UPLOADED | Contract uploaded | ✅ |
| SCAN_COMPLETED | Contract Shield scan done | ✅ |
| ADMIN_OVERRIDE | Admin override action | ✅ |

---

## FeeFinancingDisclosure Storage

### Implementation
- **Model**: `FeeFinancingDisclosure`
- **Fields**: dealId, consentGiven, disclosureText, agreedAt
- **Created by**: `agreeLoanInclusion()` in payment service

### Verification
- ✅ Consent timestamp recorded
- ✅ Disclosure text stored
- ✅ Linked to SelectedDeal

---

## Commission System

### Implementation
- **File**: `lib/services/affiliate.service.ts` (lines 313-420)
- **Rates**: Level 1: 15%, Level 2: 3%, Level 3: 2%
- **Trigger**: After service fee payment confirmed

### Verification
- ✅ 3-level commission chain
- ✅ Idempotent creation
- ✅ Self-referral prevention
- ✅ Loop detection
- ✅ Reversal on refund

---

## Financial Reporting

### Models
- `Transaction` — Universal ledger (PAYMENT, REFUND, CHARGEBACK, PAYOUT)
- `Chargeback` — Dispute tracking
- `FinancialAuditLog` — Financial action audit

### Verification
- ✅ All payment events create Transaction entries
- ✅ Chargeback tracking via Stripe disputes
- ✅ Admin financial reporting pages exist

---

## Risk Assessment

| Area | Risk Level | Notes |
|------|-----------|-------|
| Deposit handling | ✅ Low | Idempotent, refundable |
| Fee calculation | ✅ Low | Tier-based, transparent |
| Webhook processing | ✅ Low | Signature verified, idempotent |
| Refund logic | ✅ Low | Proper reversal chain |
| Commission calculation | ✅ Low | Idempotent, loop-safe |
| Loan impact calculator | ✅ Low | Standard amortization |
| Financial reporting | ✅ Low | Universal ledger pattern |
