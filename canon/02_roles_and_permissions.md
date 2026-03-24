---
id: roles-and-permissions
version: "1.0.0"
updatedAt: "2026-02-23"
tags:
  - roles
  - permissions
  - rbac
  - access-control
roleVisibility:
  - admin
---

# Roles and Permissions

## Overview

AutoLenis enforces role-based access control (RBAC) at both the middleware/edge layer and inside API route handlers. Every user is assigned exactly one role. Data isolation is strict — users only see data they are authorized to access.

## Role Definitions

### BUYER

The primary consumer role. Buyers use the platform to find, negotiate, and purchase vehicles.

**Permissions:**

- Start and refresh pre-qualification
- Create vehicle requests
- View and manage their own shortlist (max 5 items)
- Track their own auctions
- Review and compare offers received on their deals
- Upload required documents (license, income proof, insurance, etc.)
- Accept or decline offers
- View Contract Shield results for their deals
- Complete e-signature and schedule QR pickup
- View their own deal history and status

**Restrictions:**

- Cannot view other buyers' data
- Cannot see dealer identities until offer stage
- Cannot execute binding actions without confirmation

### DEALER

Licensed dealers participate in auctions and submit offers.

**Permissions:**

- View active buyer requests matched to their criteria
- Submit offers in silent reverse auctions (cannot see competing bids)
- Upload required deal documents
- View accepted deal details and status
- Respond to Contract Shield flags
- Schedule pickup coordination

**Restrictions:**

- Cannot view buyer identity details beyond authorized fields (vehicle preferences, pre-qualified budget)
- Cannot access buyer credit reports
- Cannot view competing dealer bids
- Cannot view other dealers' data

### ADMIN

Platform operators with elevated access for oversight and management.

**Permissions:**

- User management — search, view, modify roles
- Dealer management — onboarding, compliance, status
- Affiliate management — commissions, payouts, reconciliation
- Deal oversight — active deals, auctions, contracts
- Payment tracking and refund processing
- System reports and analytics
- AI system configuration

**Restrictions:**

- Sensitive actions require explicit confirmation: role changes, refunds, payout adjustments, record modifications, system emails, data deletion
- All admin actions are logged for audit
- Default to read-only analysis unless write access is explicitly requested

### AFFILIATE

Referral partners who earn commissions on completed deals.

**Permissions:**

- Generate and manage referral links
- View their own referral history and attribution
- Track commission earnings and pending payouts
- View payout status and history
- Dispute commission calculations via escalation path

**Restrictions:**

- Cannot view buyer private information
- Cannot view internal admin audit details
- Can only see their own referrals, commissions, and payouts (strict data isolation)

## Data Isolation Rules

| Data Type            | Buyer         | Dealer           | Affiliate     | Admin      |
| -------------------- | ------------- | ---------------- | ------------- | ---------- |
| Own profile          | Read/Write    | Read/Write       | Read/Write    | Read/Write |
| Other users' data    | None          | None             | None          | Read       |
| Deal details         | Own only      | Matched only     | Referred only | All        |
| Credit reports       | Own only      | None             | None          | Read       |
| Competing bids       | None          | None             | None          | Read       |
| Commission data      | None          | None             | Own only      | All        |
| Payout data          | None          | None             | Own only      | All        |
| System analytics     | None          | None             | None          | Read       |

## Permission Enforcement

- RBAC is enforced at **both** middleware/edge and inside API route handlers
- Client-provided role and workspace IDs are never trusted — always verified server-side
- All external inputs are validated with Zod; unknown fields are rejected
