---
id: affiliate-program
version: "1.0.0"
updatedAt: "2026-02-23"
tags:
  - affiliate
  - commissions
  - payouts
  - referral
  - attribution
roleVisibility:
  - affiliate
  - admin
---

# Affiliate Program

## Overview

The AutoLenis affiliate program allows referral partners to earn commissions on completed deals. Affiliates generate unique referral links, share them with potential buyers, and earn a percentage of the concierge fee when a referred buyer completes a purchase.

## Commission Structure

Commissions are paid on a multi-level structure based on referral depth:

| Level | Relationship       | Commission Rate |
| ----- | ------------------ | --------------- |
| 1     | Direct referral    | 15%             |
| 2     | Second-degree      | 3%              |
| 3     | Third-degree       | 2%              |

**Maximum referral chain depth: 3 levels.**

### Commission Examples

| Scenario                             | Concierge Fee | Level 1 (15%) | Level 2 (3%) |
| ------------------------------------ | ------------- | ------------- | ------------ |
| Premium plan ($499), direct referral | $499          | $74.85        | $14.97       |

## When Commissions Are Earned

- Commissions accrue **only** on completed deals where the concierge fee has been successfully collected
- No commission is earned on deposits alone
- No commission is earned if the deal is cancelled before completion

## Attribution Rules

- **Cookie-based attribution** with a **30-day window**
- The referral link sets a tracking cookie; if the buyer completes a purchase within 30 days, the affiliate receives attribution
- Each affiliate has a unique referral link
- Attribution is tracked and displayed on the affiliate dashboard

## Referral Chain Rules (Non-Negotiable)

- **No self-referrals** — an affiliate cannot refer themselves
- **No loops** — circular referral chains are prevented
- **Maximum depth: 3 levels** — no commissions beyond level 3
- Commissions are calculated from the concierge fee amount, not the vehicle price

## Refund and Reversal Policy

- If a deal is refunded, commissions are **reversed atomically** with the payment reversal
- Commission reversals are processed in the same transaction as the refund
- Affiliates are notified of reversals

## Payouts

- Commissions are aggregated and paid out on a scheduled basis
- Payout reconciliation is managed by admins
- Commissions are **taxable income** for the affiliate

## Data Isolation

- Affiliates can **only** see their own referrals, commissions, and payouts
- Affiliates cannot view buyer private information
- Affiliates cannot view internal admin audit details
- Limited buyer information is shared with affiliates for commission calculation purposes only

## Affiliate Dashboard Features

| Feature             | Description                                    |
| ------------------- | ---------------------------------------------- |
| Referral link       | Unique link for tracking attribution           |
| Total referrals     | Count of referred buyers                       |
| Active deals        | Deals from referrals currently in progress     |
| Commission earnings | Total earned and pending commissions           |
| Payout status       | History and status of payouts                  |
| Attribution details | Which referrals are attributed to the affiliate|

## Dispute Resolution

If an affiliate disputes a commission calculation:

1. Submit a dispute through the affiliate dashboard
2. Provide the deal reference and expected commission
3. Admin reviews attribution and payment records
4. Resolution is communicated to the affiliate
