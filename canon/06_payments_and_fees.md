---
id: payments-and-fees
version: "1.0.0"
updatedAt: "2026-02-23"
tags:
  - fees
  - pricing
  - deposit
  - payment
  - stripe
roleVisibility:
  - public
  - buyer
  - dealer
  - affiliate
  - admin
---

# Payments and Fees

## Pricing Plans

AutoLenis offers two plans:

| Plan    | Price              | Deposit Credit                                     |
| ------- | ------------------ | -------------------------------------------------- |
| Free    | Free Plan          | $99 credited toward vehicle purchase at closing     |
| Premium | $499 concierge fee | $99 credited toward fee ($400 remaining)           |

## $99 Serious Buyer Deposit

- A **$99 Serious Buyer Deposit** is required to start the auction for **both** plans
- On the **Free plan**, the deposit is credited toward your vehicle purchase at closing (purchase credit / due-at-signing credit)
- On the **Premium plan**, the deposit is credited toward the $499 concierge fee ($400 remaining)
- If **no dealer offers** are received during the auction, the $99 deposit is **refundable**

## What's Included

**Free plan:**

- Silent reverse auction among dealers
- Best price engine
- Contract Shield AI verification
- Insurance quote coordination
- E-signature and QR pickup
- Standard support

**Premium plan additionally includes:**

- Full-service buying support from start to finish
- Dedicated buying specialist
- Priority dealer handling
- Financing assistance to help find the right loan options
- Smarter financing process designed to reduce unnecessary inquiries
- Contract review and closing coordination
- Free home delivery (subject to delivery area eligibility and scheduling availability)
- Priority support

## Payment Options

Two ways to pay the concierge fee:

1. **Pay Directly** (recommended)
   - Credit or debit card
   - Does not affect the loan amount or monthly payment
   
2. **Include in Loan**
   - Fee is added to the financing amount
   - Transparent impact calculation shows the difference in monthly payment

## Fee Transparency

- AutoLenis may charge dealers platform access fees (subscription or participation-based)
- No hidden fees beyond standard dealer, DMV, and tax costs
- The concierge fee is not a dealer markup — it funds the competitive auction process and platform services

## Refund & Cancellation Policy

- The $99 deposit is refundable if no dealer offers are received during the auction
- Once an offer is accepted and the auction has concluded, the concierge fee is non-refundable
- The deposit is credited toward the total concierge fee on purchase completion

## Payment Processing

- All payments are processed through **Stripe**
- Payment and webhook handling is idempotent and replay-safe
- Payment data is encrypted in transit and at rest
