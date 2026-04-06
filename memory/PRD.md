# AutoLenis - Production Readiness Document

## Project Overview
AutoLenis is a multi-role car-buying concierge platform with buyer, dealer, affiliate, and admin portals.

## Architecture
- **Framework**: Next.js 16 (App Router) + TypeScript + React
- **ORM/Schema**: Prisma 6.16.0 (schema/types/migrations)
- **Runtime DB**: Supabase as runtime persistence layer (all queries via Supabase client)
- **Database**: PostgreSQL via Supabase (PgBouncer pooled)
- **Deployment**: Vercel Pro, Node 24.x, pnpm 10.28.0
- **Middleware**: `proxy.ts` (NOT `middleware.ts` — Next.js 16 native)

## Production URLs
- https://www.autolenis.com
- https://autolenis-deploy.vercel.app

## Inventory Pipeline Architecture

### Canonical Source
- **InventoryItem** table is the single source of truth for all website-visible inventory
- All buyer search, dealer inventory, and admin inventory queries target `InventoryItem` via Supabase client
- The previous `inventory_listings_canonical` Supabase view is DEPRECATED and no longer queried

### Ingestion Paths
1. **DMS Feed (JSON/XML/CSV)**: DealerSource → fetch-source API → parse → normalize → upsert InventoryItem
2. **Manual Entry**: POST /api/dealer/inventory → creates Vehicle + InventoryItem
3. **CSV Bulk Import**: POST /api/dealer/inventory/import → InventoryService.bulkImport

### Data Flow
```
DealerSource (feed URL) 
  → fetchAndSyncSource() [lib/services/inventory-fetch.service.ts]
  → HTTP fetch feed URL
  → parseFeedInventory() / parseXmlInventory() / parseCsvInventory()
  → normalizeSighting()
  → upsert InventoryItem (by VIN or stockNumber)
```

### DB Schema Notes
- `InventoryItem` requires `vehicleId` (NOT NULL in DB) - Vehicle records must be created first
- `InventoryItem.price` (Float) and `InventoryItem.priceCents` (Int) both exist - always set both
- All inventory must have `workspaceId` set (default: `ws_live_default`)
- Prisma schema updated to include `vehicleId` and `price` fields

### Key Endpoints
| Endpoint | Purpose |
|----------|---------|
| GET /api/inventory/search | Public buyer inventory search |
| GET /api/inventory/filters | Available filter options (makes, body styles) |
| GET /api/dealer/inventory | Dealer's own inventory |
| POST /api/dealer/inventory | Manual inventory entry |
| POST /api/dealer/inventory/import | CSV bulk import |
| GET /api/admin/inventory | Admin inventory counts + source status |
| GET /api/admin/inventory/search | Admin inventory search |
| POST /api/admin/inventory/sync | Trigger feed sync |
| POST /api/admin/inventory/[id]/action | Admin: suppress/restore/mark sold/hold |
| POST /api/internal/inventory/fetch-source | Internal: trigger feed sync |

## Complete Fix Inventory (All Sessions)

### Session 3-4: Inventory Pipeline Fix (Emergent - Apr 2026)
| Fix | Where Applied | Status |
|-----|---------------|--------|
| Backfilled 3 existing InventoryItem records with Vehicle data | Supabase DB | Done |
| Assigned all dealers to ws_live_default workspace | Supabase DB | Done |
| Seeded 17 realistic inventory items (20 total with backfilled) | Supabase DB | Done |
| Rewrote /api/inventory/search to query InventoryItem directly | Code | Done |
| Rewrote /api/admin/inventory/search to query InventoryItem directly | Code | Done |
| Rewrote /api/admin/inventory/[id]/action to use InventoryItem | Code | Done |
| Rewrote /api/inventory/filters to use Supabase InventoryItem | Code | Done |
| Fixed /api/admin/inventory/maintenance/stale to use InventoryItem | Code | Done |
| Fixed analytics service to use InventoryItem | Code | Done |
| Added vehicleId + price to Prisma InventoryItem schema | Code | Done |
| Added Vehicle relation to InventoryItem model | Code | Done |
| Implemented real DMS feed fetcher (JSON/XML/CSV) | Code | Done |
| Created /api/admin/inventory/sync endpoint | Code | Done |
| Created /api/admin/inventory route (counts + source status) | Code | Done |
| Fixed dealer inventory POST to create Vehicle + InventoryItem properly | Code | Done |
| Fixed price normalization (double-conversion bug) | Code | Done |
| DMS JSON feed sync: 5 vehicles synced + upserted correctly | Validated | Done |
| DMS XML feed sync: 2 vehicles synced + upserted correctly | Validated | Done |
| Repeated sync updates existing records (no duplicates) | Validated | Done |

## Current State (Apr 2026)
- **Inventory**: 27 vehicles (20 manual seed + 5 JSON feed + 2 XML feed)
- **Search**: Fully functional with make/model/year/price/bodyStyle filters + sorting
- **Feed Sync**: JSON and XML both working end-to-end
- **Build**: Passes with zero TypeScript errors

## Critical Rules
- DO NOT create `middleware.ts` — project uses `proxy.ts` natively (Next.js 16)
- Prisma schema and DB are matched using camelCase — no `@map` annotations
- `autolenis/` directory is stale — deleted during build via vercel.json
- ALL database queries go through Supabase client, NOT Prisma (Prisma used only for types/schema)
- `inventory_listings_canonical` view is DEPRECATED — do not query it

## Remaining Tasks
### P0 (Immediate)
- Push code changes to GitHub via "Save to Github" and verify Vercel deployment

### P1
- Permanently remove `autolenis/` from git history
- Add `sourceReferenceId` to InventoryItem for per-source stale detection
- Update test feed URLs to use production URLs before deploying feed sources

### P2
- Set up Prisma schema drift detection CI
- Switch MicroBilt & DocuSign from sandbox to production
- Configure Sentry for error monitoring
