# Feature Inventory — Vehicle Request Sourcing

## Feature: No Local Dealers → Vehicle Request Sourcing

### Status: Implemented

### Overview
When a pre-qualified buyer has no eligible local dealer inventory/offers, the system provides a non-dead-end path:
1. Buyer sees premium notice with CTA
2. Buyer submits up to 3 structured vehicle requests
3. Admin sourcing queue manages outreach + offer intake
4. Offers presented to buyer in standard UX
5. Buyer accepts → dealer invited → fast-lane onboarding → transaction continues in existing pipeline

### Components

| Component | Path | Purpose |
|-----------|------|---------|
| NoLocalDealersNotice | `components/buyer/no-local-dealers-notice.tsx` | Premium notice card with CTA |
| SourcingService | `lib/services/sourcing.service.ts` | 20-method service with full lifecycle |
| Buyer Request Pages | `app/buyer/requests/*` | List, create, detail pages |
| Admin Sourcing Pages | `app/admin/sourcing/*` | Queue + case management |
| Dealer Opportunities | `app/dealer/opportunities/*` | Opportunity listing |
| Dealer Invite Claim | `app/dealer/invite/claim/*` | Token-based onboarding |

### Email Templates (Resend)

| Template | Path | Trigger |
|----------|------|---------|
| Request Submitted | `components/email/sourcing-request-submitted-email.tsx` | Case submitted |
| Offers Available | `components/email/sourcing-offers-available-email.tsx` | Admin presents offers |
| Dealer Invite | `components/email/dealer-invite-email.tsx` | Admin sends invite |

### Status Flow
```
DRAFT → SUBMITTED → SOURCING → OFFERS_AVAILABLE → OFFER_SELECTED → DEALER_INVITED → IN_PLATFORM_TRANSACTION → CLOSED_WON/LOST/CANCELLED
```

### Admin Sub-Statuses
```
NEW → NEED_DEALERS → OUTREACH_IN_PROGRESS → WAITING_ON_DEALER → OFFERS_READY → OFFERS_PRESENTED → PENDING_BUYER_RESPONSE → DEALER_INVITE_SENT → DEALER_ONBOARDING → RESOLVED
```

### Test Coverage
- Unit: `__tests__/sourcing.test.ts` (49 sourcing tests)
- Unit: `__tests__/deal-context.test.ts` (5 deal context resolver tests — AUCTION + SOURCED + regression)
- E2E: `e2e/sourcing.spec.ts` (route tests + deal pipeline compatibility + API auth)

### Deal Pipeline Integration
- `lib/services/deal-context.service.ts` — Canonical deal context resolver
  - `resolveDealContextForBuyer()` — Resolves deal data from either auction or sourced offer
  - `resolveDealContextForDealer()` — Same for dealer-side access
  - Returns normalized `DealContext` object regardless of deal source
- Sourced deals use `sourcingCaseId` + `sourcedOfferId` on SelectedDeal (no FK overloading)
- Auction deals continue unchanged through `auctionId` + `offerId` + `inventoryItemId`
