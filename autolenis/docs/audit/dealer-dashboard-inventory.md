# Dealer Dashboard — Surface Area Inventory

## Pages / Routes

| Route | File Path | Purpose | API Dependencies | Status |
|-------|-----------|---------|------------------|--------|
| `/dealer/dashboard` | `app/dealer/dashboard/page.tsx` | Main dashboard with stats, golden deal, activity feed | `/api/dealer/dashboard` | OK |
| `/dealer/requests` | `app/dealer/requests/page.tsx` | List buyer requests | `/api/dealer/requests` | OK |
| `/dealer/requests/[requestId]` | `app/dealer/requests/[requestId]/page.tsx` | Request detail | `/api/dealer/requests/[requestId]` | OK |
| `/dealer/inventory` | `app/dealer/inventory/page.tsx` | Vehicle inventory list | `/api/dealer/inventory` | OK |
| `/dealer/inventory/add` | `app/dealer/inventory/add/page.tsx` | Add single vehicle | `/api/dealer/inventory` | OK |
| `/dealer/inventory/bulk-upload` | `app/dealer/inventory/bulk-upload/page.tsx` | CSV/file bulk upload | `/api/dealer/inventory/bulk-upload`, `/api/dealer/inventory/url-import` | OK |
| `/dealer/inventory/column-mapping` | `app/dealer/inventory/column-mapping/page.tsx` | Column mapping for import | `/api/dealer/inventory/import` | OK |
| `/dealer/inventory/import-history` | `app/dealer/inventory/import-history/page.tsx` | Past import jobs | `/api/dealer/inventory/import-history` | OK |
| `/dealer/auctions` | `app/dealer/auctions/page.tsx` | All auctions list | `/api/dealer/auctions` | OK |
| `/dealer/auctions/[id]` | `app/dealer/auctions/[id]/page.tsx` | Auction detail + offer creation | `/api/dealer/auctions/[id]`, `/api/dealer/auction/[id]/offer` | OK |
| `/dealer/auctions/invited` | `app/dealer/auctions/invited/page.tsx` | Invited auctions | `/api/dealer/auctions` | OK (fixed) |
| `/dealer/auctions/offers` | `app/dealer/auctions/offers/page.tsx` | Offers submitted on auctions | `/api/dealer/offers` | OK (fixed) |
| `/dealer/offers` | `app/dealer/offers/page.tsx` | All dealer offers | `/api/dealer/offers` | OK |
| `/dealer/offers/[offerId]` | `app/dealer/offers/[offerId]/page.tsx` | Offer detail | `/api/dealer/offers` | OK |
| `/dealer/offers/new` | `app/dealer/offers/new/page.tsx` | Create new offer | `/api/dealer/offers` | OK |
| `/dealer/deals` | `app/dealer/deals/page.tsx` | Active deals | `/api/dealer/deals` | OK |
| `/dealer/deals/[dealId]` | `app/dealer/deals/[dealId]/page.tsx` | Deal detail | `/api/dealer/deals/[dealId]` | OK |
| `/dealer/deals/[dealId]/insurance` | `app/dealer/deals/[dealId]/insurance/page.tsx` | Insurance docs for deal | `/api/dealer/deals/[dealId]/insurance` | OK |
| `/dealer/opportunities` | `app/dealer/opportunities/page.tsx` | Sourcing opportunities | `/api/dealer/opportunities` | OK |
| `/dealer/contracts` | `app/dealer/contracts/page.tsx` | Contracts list + upload | `/api/dealer/contracts`, `/api/contract/scan` | OK |
| `/dealer/contracts/[id]` | `app/dealer/contracts/[id]/page.tsx` | Contract detail | `/api/dealer/contracts`, `/api/contract/fix` | OK |
| `/dealer/documents` | `app/dealer/documents/page.tsx` | Documents management | `/api/dealer/documents`, `/api/dealer/documents/upload` | OK |
| `/dealer/documents/[documentId]` | `app/dealer/documents/[documentId]/page.tsx` | Document detail | `/api/dealer/documents` | OK |
| `/dealer/payments` | `app/dealer/payments/page.tsx` | Payment history + checkout | `/api/dealer/payments`, `/api/dealer/payments/checkout` | OK |
| `/dealer/payments/success` | `app/dealer/payments/success/page.tsx` | Payment success confirmation | — | OK |
| `/dealer/payments/cancel` | `app/dealer/payments/cancel/page.tsx` | Payment cancelled | — | OK |
| `/dealer/messages` | `app/dealer/messages/page.tsx` | Support tickets list | `/api/dealer/messages` | OK |
| `/dealer/messages/[threadId]` | `app/dealer/messages/[threadId]/page.tsx` | Thread detail | `/api/dealer/messages/[threadId]` | OK |
| `/dealer/messages/new` | `app/dealer/messages/new/page.tsx` | Create new message | `/api/dealer/messages` | OK |
| `/dealer/pickups` | `app/dealer/pickups/page.tsx` | Vehicle pickups | `/api/dealer/pickups` | OK |
| `/dealer/profile` | `app/dealer/profile/page.tsx` | Dealer profile view/edit | `/api/dealer/profile` | OK (API created) |
| `/dealer/settings` | `app/dealer/settings/page.tsx` | Account settings | `/api/dealer/settings` | OK |
| `/dealer/onboarding` | `app/dealer/onboarding/page.tsx` | Onboarding wizard | `/api/dealer/onboarding` | OK |
| `/dealer/sign-in` | `app/dealer/sign-in/page.tsx` | Dealer sign-in redirect | — | OK |
| `/dealer/invite/claim` | `app/dealer/invite/claim/page.tsx` | Claim invite | `/api/dealer/invite/claim`, `/api/dealer/invite/complete` | OK |
| `/dealer/leads` | `app/dealer/leads/page.tsx` | Leads (alias for auctions) | `/api/dealer/auctions` | OK |
| `/dealer/leads/[leadId]` | `app/dealer/leads/[leadId]/page.tsx` | Lead detail | `/api/dealer/auctions/[leadId]` | OK |

## API Routes

| API Route | File Path | Methods | Auth | Status |
|-----------|-----------|---------|------|--------|
| `/api/dealer/dashboard` | `app/api/dealer/dashboard/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/settings` | `app/api/dealer/settings/route.ts` | GET, PATCH | DEALER/DEALER_USER | OK |
| `/api/dealer/profile` | `app/api/dealer/profile/route.ts` | GET, PATCH | DEALER/DEALER_USER | OK (created) |
| `/api/dealer/onboarding` | `app/api/dealer/onboarding/route.ts` | POST | DEALER | OK |
| `/api/dealer/register` | `app/api/dealer/register/route.ts` | POST | — | OK |
| `/api/dealer/application-status` | `app/api/dealer/application-status/route.ts` | GET | DEALER | OK |
| `/api/dealer/auctions` | `app/api/dealer/auctions/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/auctions/[auctionId]` | `app/api/dealer/auctions/[auctionId]/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/auctions/[auctionId]/offers` | `app/api/dealer/auctions/[auctionId]/offers/route.ts` | GET, POST | DEALER/DEALER_USER | OK |
| `/api/dealer/auction/[id]/offer` | `app/api/dealer/auction/[id]/offer/route.ts` | POST | DEALER/DEALER_USER | OK |
| `/api/dealer/inventory` | `app/api/dealer/inventory/route.ts` | GET, POST | DEALER/DEALER_USER | OK |
| `/api/dealer/inventory/[id]` | `app/api/dealer/inventory/[id]/route.ts` | PATCH, DELETE | DEALER/DEALER_USER | OK |
| `/api/dealer/inventory/bulk-upload` | `app/api/dealer/inventory/bulk-upload/route.ts` | POST | DEALER/DEALER_USER | OK |
| `/api/dealer/inventory/import` | `app/api/dealer/inventory/import/route.ts` | POST | DEALER/DEALER_USER | OK |
| `/api/dealer/inventory/url-import` | `app/api/dealer/inventory/url-import/route.ts` | POST | DEALER/DEALER_USER | OK |
| `/api/dealer/inventory/import-history` | `app/api/dealer/inventory/import-history/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/offers` | `app/api/dealer/offers/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/deals` | `app/api/dealer/deals/route.ts` | GET | DEALER/DEALER_USER | OK (error handling fixed) |
| `/api/dealer/deals/[dealId]` | `app/api/dealer/deals/[dealId]/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/deals/[dealId]/pickup` | `app/api/dealer/deals/[dealId]/pickup/route.ts` | POST | DEALER/DEALER_USER | OK |
| `/api/dealer/deals/[dealId]/insurance` | `app/api/dealer/deals/[dealId]/insurance/route.ts` | GET, POST | DEALER/DEALER_USER | OK |
| `/api/dealer/contracts` | `app/api/dealer/contracts/route.ts` | GET, POST | DEALER/DEALER_USER | OK |
| `/api/dealer/documents` | `app/api/dealer/documents/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/documents/upload` | `app/api/dealer/documents/upload/route.ts` | POST | DEALER/DEALER_USER | OK |
| `/api/dealer/payments` | `app/api/dealer/payments/route.ts` | GET | DEALER/DEALER_USER | OK (error handling fixed) |
| `/api/dealer/payments/checkout` | `app/api/dealer/payments/checkout/route.ts` | POST | DEALER/DEALER_USER | OK |
| `/api/dealer/messages` | `app/api/dealer/messages/route.ts` | GET, POST | DEALER/DEALER_USER | OK |
| `/api/dealer/messages/[threadId]` | `app/api/dealer/messages/[threadId]/route.ts` | GET, POST | DEALER/DEALER_USER | OK |
| `/api/dealer/opportunities` | `app/api/dealer/opportunities/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/pickups` | `app/api/dealer/pickups/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/requests` | `app/api/dealer/requests/route.ts` | GET | DEALER/DEALER_USER | OK |
| `/api/dealer/invite/claim` | `app/api/dealer/invite/claim/route.ts` | POST | — | OK |
| `/api/dealer/invite/complete` | `app/api/dealer/invite/complete/route.ts` | POST | DEALER | OK |

## Sidebar Navigation

Configured in `app/dealer/layout.tsx`, rendered in `app/dealer/layout-client.tsx`.

| Label | Route | Icon |
|-------|-------|------|
| Dashboard | `/dealer/dashboard` | LayoutDashboard |
| Buyer Requests | `/dealer/requests` | FileText |
| Inventory | `/dealer/inventory` | Package |
| Auctions | `/dealer/auctions` | Gavel |
| ↳ Invited Auctions | `/dealer/auctions/invited` | — |
| ↳ Offers Submitted | `/dealer/auctions/offers` | — |
| My Deals | `/dealer/deals` | Handshake |
| Sourcing Opportunities | `/dealer/opportunities` | Search |
| Contracts & Contract Shield | `/dealer/contracts` | FileCheck |
| Documents | `/dealer/documents` | FolderOpen |
| Payments & Fees | `/dealer/payments` | CreditCard |
| Messages | `/dealer/messages` | MessageSquare |
| Pickups | `/dealer/pickups` | Truck |
| Dealer Settings | `/dealer/settings` | Settings |

## Email Templates

| Template | File | Triggered By |
|----------|------|-------------|
| Dealer Invite | `components/email/dealer-invite-email.tsx` | Admin invites dealer |
| Dealer Approval | `components/email/dealer-approval-email.tsx` | Admin approves dealer application |
| Dealer Rejection | `components/email/dealer-rejection-email.tsx` | Admin rejects dealer application |
