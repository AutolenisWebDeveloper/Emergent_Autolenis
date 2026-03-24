# Data Model Atlas — Vehicle Request Sourcing

## SelectedDeal Extension (Sourced Deals)

The SelectedDeal model is extended with nullable sourcing FK fields to support deals originating from the sourcing flow without overloading existing auction FK fields:

| Field | Type | Notes |
|-------|------|-------|
| sourcingCaseId | String? | FK → VehicleRequestCase.id (null for auction deals) |
| sourcedOfferId | String? @unique | FK → SourcedOffer.id (null for auction deals) |

Existing fields `auctionId`, `offerId`, `inventoryItemId` remain nullable for auction deals. Sourced deals leave these null.

**New Indexes:** sourcingCaseId, sourcedOfferId

## New Prisma Models

### DealerCoverageGapSignal
Records when no active/verified dealers serve a buyer's market area.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| workspaceId | String? | Tenant isolation |
| buyerId | String | Buyer who triggered |
| marketZip | String | Buyer's ZIP code |
| radiusMiles | Int | Search radius (default 50) |
| reasonCode | String | NO_ACTIVE_DEALERS, NO_MATCHING_INVENTORY, AUCTION_NO_OFFERS, ALL_PAUSED |
| resolvedAt | DateTime? | When gap was resolved |
| createdAt | DateTime | Auto-set |

**Indexes:** workspaceId, buyerId, marketZip, createdAt

---

### VehicleRequestCase
Top-level case tracking the buyer request lifecycle.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| workspaceId | String? | Tenant isolation |
| buyerId | String | Case owner |
| marketZip | String | Target market |
| radiusMiles | Int | Search radius |
| buyerLocationJson | Json? | Full location data |
| prequalSnapshotJson | Json? | Prequal snapshot at creation |
| status | BuyerCaseStatus | Current lifecycle status |
| adminSubStatus | AdminSubStatus | Admin workflow sub-status |
| assignedAdminUserId | String? | Assigned admin |
| createdAt, updatedAt | DateTime | Standard timestamps |
| submittedAt | DateTime? | When buyer submitted |
| firstAdminActionAt | DateTime? | First admin action |
| firstOfferAt | DateTime? | First offer created |
| buyerResponseAt | DateTime? | Buyer response timestamp |
| closedAt | DateTime? | Case closure |
| lockedAt | DateTime? | Locked when offer accepted |

**Relations:** items[], offers[], outreachLogs[], invite?, events[]
**Indexes:** workspaceId, buyerId, status, adminSubStatus, createdAt

---

### VehicleRequestItem (max 3 per case)
Individual vehicle criteria within a case.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| caseId | String | Parent case |
| vehicleType | VehicleType | CAR, SUV, TRUCK, VAN |
| condition | RequestCondition | NEW, USED, EITHER |
| yearMin, yearMax | Int | Year range |
| make | String | Vehicle make |
| model | String? | Optional if openToSimilar |
| openToSimilar | Boolean | Accept similar models |
| trim | String? | Optional trim |
| budgetType | BudgetType | MONTHLY or TOTAL |
| budgetTargetCents | Int | Budget in cents |
| mileageMax | Int? | Required if USED/EITHER |
| mustHaveFeaturesJson | Json? | Required features array |
| colorsJson | Json? | Preferred colors |
| distancePreference | DistancePreference | DELIVERY, PICKUP, EITHER |
| maxDistanceMiles | Int? | Max distance |
| timeline | RequestTimeline | Urgency |
| vin | String? | Optional specific VIN |
| notes | String? | Free-text notes |

**Indexes:** caseId

---

### SourcingOutreachLog
Admin outreach activity tracking.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| caseId | String | Parent case |
| adminUserId | String | Acting admin |
| dealerName | String | Target dealer |
| contactMethod | String | EMAIL, PHONE, IN_PERSON, OTHER |
| outcome | String | INTERESTED, DECLINED, NO_RESPONSE, FOLLOW_UP |
| occurredAt | DateTime | When outreach happened |
| notes | String? | Details |

**Indexes:** caseId, adminUserId

---

### SourcedOffer
Normalized offer from dealer or admin-brokered.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| workspaceId | String? | Tenant isolation |
| caseId | String | Parent case |
| buyerId | String | Target buyer |
| dealerId | String? | Null if non-onboarded |
| sourceDealerName | String? | Dealer business name |
| sourceDealerEmail | String? | Contact email |
| sourceDealerPhone | String? | Contact phone |
| sourceType | OfferSourceType | DEALER_SUBMITTED or ADMIN_ENTERED |
| vin, year, make, modelName, trim | String/Int? | Vehicle details |
| mileage | Int? | Vehicle mileage |
| condition | RequestCondition? | Vehicle condition |
| pricingBreakdownJson | Json? | Cash OTD, taxes, fees |
| paymentTermsJson | Json? | APR, term, monthly |
| expiresAt | DateTime? | Offer expiration |
| status | SourcedOfferStatus | DRAFT→PENDING_PRESENT→PRESENTED→ACCEPTED/DECLINED/EXPIRED |
| presentedToBuyerAt | DateTime? | When shown to buyer |
| acceptedAt | DateTime? | When accepted |

**Indexes:** workspaceId, caseId, buyerId, status

---

### DealerInvite
Secure tokenized invitation for dealer onboarding.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| caseId | String (unique) | One invite per case |
| offerId | String (unique) | Linked offer |
| tokenHash | String (unique) | SHA-256 hash (raw token never stored) |
| tokenExpiresAt | DateTime | Token expiration |
| dealerEmail | String? | Invited dealer email |
| dealerName | String? | Invited dealer name |
| status | DealerInviteStatus | SENT, CLAIMED, COMPLETED, EXPIRED |

**Indexes:** tokenHash, status

---

### CaseEventLog
Audit trail for all state transitions and key actions.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | Primary key |
| caseId | String | Parent case |
| actorUserId | String | Who performed action |
| actorRole | String | BUYER, ADMIN, DEALER, SYSTEM |
| action | String | STATUS_CHANGE, OFFER_CREATED, etc. |
| beforeValue | String? | Previous state |
| afterValue | String? | New state |
| notes | String? | Additional context |
| createdAt | DateTime | Timestamp |

**Indexes:** caseId, actorUserId, createdAt

---

## Enums

| Enum | Values |
|------|--------|
| BuyerCaseStatus | DRAFT, SUBMITTED, SOURCING, OFFERS_AVAILABLE, OFFER_SELECTED, DEALER_INVITED, IN_PLATFORM_TRANSACTION, CLOSED_WON, CLOSED_LOST, CLOSED_CANCELLED |
| AdminSubStatus | NEW, NEED_DEALERS, OUTREACH_IN_PROGRESS, WAITING_ON_DEALER, OFFERS_READY, OFFERS_PRESENTED, PENDING_BUYER_RESPONSE, DEALER_INVITE_SENT, DEALER_ONBOARDING, STALE, ESCALATED, RESOLVED |
| VehicleType | CAR, SUV, TRUCK, VAN |
| RequestCondition | NEW, USED, EITHER |
| BudgetType | MONTHLY, TOTAL |
| DistancePreference | DELIVERY, PICKUP, EITHER |
| RequestTimeline | ZERO_7_DAYS, EIGHT_14_DAYS, FIFTEEN_30_DAYS, THIRTY_PLUS_DAYS |
| OfferSourceType | DEALER_SUBMITTED, ADMIN_ENTERED |
| SourcedOfferStatus | DRAFT, PENDING_PRESENT, PRESENTED, ACCEPTED, DECLINED, EXPIRED |
| DealerInviteStatus | SENT, CLAIMED, COMPLETED, EXPIRED |
