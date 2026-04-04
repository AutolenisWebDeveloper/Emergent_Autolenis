# Vehicle Request Sourcing Feature

## Overview

When a pre-qualified buyer has no eligible local dealer inventory, the system enables a sourcing workflow:

1. Buyer sees "No Local Dealers" notice with CTA
2. Buyer submits up to 3 vehicle requests
3. Admin sources offers from dealers or enters brokered offers
4. Offers are presented to buyer in standard UX pattern
5. Buyer accepts an offer
6. Winning dealer is invited to join AutoLenis (fast-lane onboarding)
7. Transaction continues in the existing pipeline (Contract Shield → insurance → e-sign → pickup)

## Data Models

| Model | Purpose |
|-------|---------|
| `DealerCoverageGapSignal` | Records when no dealers serve a buyer's market |
| `VehicleRequestCase` | Top-level case tracking buyer request lifecycle |
| `VehicleRequestItem` | Individual vehicle criteria (max 3 per case) |
| `SourcingOutreachLog` | Admin outreach to potential dealers |
| `SourcedOffer` | Normalized offer from dealer or admin-brokered |
| `DealerInvite` | Secure tokenized invitation for dealer onboarding |
| `CaseEventLog` | Audit trail for all state transitions |

## Status Flow

```
DRAFT → SUBMITTED → SOURCING → OFFERS_AVAILABLE → OFFER_SELECTED → DEALER_INVITED → IN_PLATFORM_TRANSACTION → CLOSED_WON/LOST
```

## API Routes

### Buyer
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/buyer/requests` | List buyer's cases |
| POST | `/api/buyer/requests` | Create + submit case |
| GET | `/api/buyer/requests/[caseId]` | Case detail |
| POST | `/api/buyer/requests/[caseId]/submit` | Submit draft |
| POST | `/api/buyer/requests/[caseId]/cancel` | Cancel case |
| GET | `/api/buyer/requests/[caseId]/offers` | List presented offers |
| POST | `/api/buyer/requests/[caseId]/offers/[offerId]/accept` | Accept offer |

### Admin
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/sourcing/cases` | List sourcing queue |
| GET | `/api/admin/sourcing/cases/[caseId]` | Case detail |
| POST | `/api/admin/sourcing/cases/[caseId]/assign` | Assign admin |
| POST | `/api/admin/sourcing/cases/[caseId]/status` | Update status |
| POST | `/api/admin/sourcing/cases/[caseId]/outreach` | Add outreach log |
| POST | `/api/admin/sourcing/cases/[caseId]/offers` | Admin-enter offer |
| POST | `/api/admin/sourcing/cases/[caseId]/offers/[offerId]/present` | Present to buyer |
| POST | `/api/admin/sourcing/cases/[caseId]/offers/[offerId]/withdraw` | Withdraw offer |
| POST | `/api/admin/sourcing/cases/[caseId]/invite-dealer` | Send dealer invite |

### Dealer
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/dealer/opportunities` | List sourcing opportunities |
| POST | `/api/dealer/opportunities/[caseId]/offers` | Submit offer |
| GET/POST | `/api/dealer/invite/claim` | Validate/claim invite token |
| POST | `/api/dealer/invite/complete` | Complete onboarding |

## UI Routes

| Route | Role | Purpose |
|-------|------|---------|
| `/buyer/requests` | Buyer | List vehicle requests |
| `/buyer/requests/new` | Buyer | Create new request (1-3 vehicles) |
| `/buyer/requests/[caseId]` | Buyer | Case detail + offers + timeline |
| `/admin/sourcing` | Admin | Sourcing queue with tabs |
| `/admin/sourcing/[caseId]` | Admin | Full case management |
| `/dealer/opportunities` | Dealer | View available opportunities |
| `/dealer/invite/claim` | Public | Claim dealer invitation |

## RBAC Summary

| Role | Permissions |
|------|------------|
| BUYER | Create/submit/cancel own cases, view own offers, accept offer |
| ADMIN | View/manage all cases, assign, update status, add outreach, enter offers, present offers, invite dealers |
| DEALER | View opportunities, submit offers, claim invites, complete onboarding |

## Audit Events

All state transitions are logged to `CaseEventLog` with: actor (userId + role), timestamp, action, before/after values, and optional notes.

## Notifications (Resend)

| Template | Recipient | Trigger |
|----------|-----------|---------|
| `sourcing-request-submitted-email` | Buyer | Case submitted |
| `sourcing-offers-available-email` | Buyer | Offers presented |
| `dealer-invite-email` | Dealer | Invite sent |
