# Route Map — Vehicle Request Sourcing

## Buyer UI Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/buyer/requests` | List all vehicle request cases | BUYER |
| `/buyer/requests/new` | Create 1–3 vehicle requests | BUYER |
| `/buyer/requests/[caseId]` | Case detail, timeline, offers, accept | BUYER |

## Admin UI Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/admin/sourcing` | Sourcing queue (tabbed: New, Needs Outreach, Waiting, Offers Ready, Stale, Closed) | ADMIN |
| `/admin/sourcing/[caseId]` | Case detail with full management (outreach, offers, invite) | ADMIN |

## Dealer UI Routes

| Route | Purpose | Auth |
|-------|---------|------|
| `/dealer/opportunities` | View sourcing opportunities | DEALER |
| `/dealer/invite/claim` | Claim dealer invitation (public, token-based) | Public |

## Buyer API Routes

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/buyer/requests` | List buyer's cases | BUYER |
| POST | `/api/buyer/requests` | Create + auto-submit case (1–3 items) | BUYER |
| GET | `/api/buyer/requests/[caseId]` | Get case detail | BUYER |
| POST | `/api/buyer/requests/[caseId]/submit` | Submit draft case | BUYER |
| POST | `/api/buyer/requests/[caseId]/cancel` | Cancel case (DRAFT/SUBMITTED only) | BUYER |
| GET | `/api/buyer/requests/[caseId]/offers` | List presented offers | BUYER |
| POST | `/api/buyer/requests/[caseId]/offers/[offerId]/accept` | Accept offer | BUYER |
| GET | `/api/buyer/coverage-gap` | Server-side coverage gap detection | BUYER |

## Admin API Routes

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/admin/sourcing/cases` | List sourcing queue (tab filter) | ADMIN |
| GET | `/api/admin/sourcing/cases/[caseId]` | Get full case detail | ADMIN |
| POST | `/api/admin/sourcing/cases/[caseId]/assign` | Assign admin to case | ADMIN |
| POST | `/api/admin/sourcing/cases/[caseId]/status` | Update case status | ADMIN |
| POST | `/api/admin/sourcing/cases/[caseId]/outreach` | Add outreach log entry | ADMIN |
| POST | `/api/admin/sourcing/cases/[caseId]/offers` | Admin-enter brokered offer | ADMIN |
| POST | `/api/admin/sourcing/cases/[caseId]/offers/[offerId]/present` | Present offer to buyer | ADMIN |
| POST | `/api/admin/sourcing/cases/[caseId]/offers/[offerId]/withdraw` | Withdraw offer | ADMIN |
| POST | `/api/admin/sourcing/cases/[caseId]/invite-dealer` | Send dealer invitation | ADMIN |

## Dealer API Routes

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| GET | `/api/dealer/opportunities` | List sourcing opportunities | DEALER |
| POST | `/api/dealer/opportunities/[caseId]/offers` | Submit dealer offer | DEALER |
| GET | `/api/dealer/invite/claim` | Validate invite token | Public |
| POST | `/api/dealer/invite/claim` | Claim invite token | Public |
| POST | `/api/dealer/invite/complete` | Complete dealer onboarding | DEALER |
