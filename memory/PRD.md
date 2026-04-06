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
- `inventory_listings_canonical` Supabase view is DEPRECATED (write-only by old promote.service.ts, no active reader)

### DB Schema: InventoryItem Required Columns
- `id` (PK, cuid)
- `dealerId` (FK → Dealer, NOT NULL)
- `vehicleId` (FK → Vehicle, NOT NULL — DB enforced, added to Prisma schema)
- `workspaceId` (NOT NULL, default: ws_live_default)
- `vin`, `make`, `model`, `year`, `trim`, `bodyStyle` (vehicle identity)
- `priceCents` (Int), `price` (Float — DB legacy, always set both)
- `mileage`, `exteriorColor`, `interiorColor`, `transmission`, `fuelType`
- `isNew`, `status` (AVAILABLE/HOLD/SOLD/REMOVED), `source` (MANUAL/API_FEED)
- `stockNumber`, `photosJson`, `lastSyncedAt`, `createdAt`, `updatedAt`

### Ingestion Paths
1. **DMS Feed (JSON/XML/CSV)**: DealerSource → fetchAndSyncSource() → parse → normalize → upsert InventoryItem
2. **Manual Entry**: POST /api/dealer/inventory → creates Vehicle + InventoryItem
3. **CSV Bulk Import**: POST /api/dealer/inventory/import → InventoryService.bulkImport

### Feed Sync Pipeline
```
DealerSource (feed URL)
  → fetchAndSyncSource() [lib/services/inventory-fetch.service.ts]
  → HTTP fetch feed URL
  → parseFeedInventory() / parseXmlInventory() / parseCsvInventory()
  → normalizeSighting()
  → upsert InventoryItem (by VIN + dealerId, or stockNumber + dealerId)
  → create Vehicle record if new (vehicleId NOT NULL constraint)
```

### Key Endpoints
| Endpoint | Purpose | Auth |
|----------|---------|------|
| GET /api/inventory/search | Buyer inventory search | Public |
| GET /api/inventory/filters | Filter options (makes, body styles) | Public |
| GET /api/dealer/inventory | Dealer's own inventory | Dealer |
| POST /api/dealer/inventory | Manual inventory entry | Dealer |
| POST /api/dealer/inventory/import | CSV bulk import | Dealer |
| GET /api/admin/inventory | Inventory counts + source status | Admin |
| GET /api/admin/inventory/search | Admin inventory search | Admin |
| POST /api/admin/inventory/sync | Trigger feed sync | Admin |
| POST /api/admin/inventory/[id]/action | Lifecycle: suppress/restore/sold/hold | Admin |
| POST /api/internal/inventory/fetch-source | Internal: trigger feed sync | Internal |

## Current Inventory State (Apr 2026)
- **Total**: 27 vehicles (20 manual seed + 5 JSON feed + 2 XML feed)
- **Status**: All AVAILABLE
- **Workspace**: All in ws_live_default
- **Data completeness**: 0 NULL vins, 0 NULL makes, all required fields populated
- **Build**: Production build passes with zero TypeScript errors

## Critical Rules
- DO NOT create `middleware.ts` — project uses `proxy.ts` natively (Next.js 16)
- Prisma schema and DB are matched using camelCase — no `@map` annotations
- `autolenis/` directory is stale — deleted during build via vercel.json
- ALL database queries go through Supabase client, NOT Prisma runtime
- `inventory_listings_canonical` view is DEPRECATED — do not READ from it
- InventoryItem requires `vehicleId` (NOT NULL in DB) — create Vehicle record first
- Always set BOTH `priceCents` (Int cents) AND `price` (Float dollars) on InventoryItem

## Remaining Tasks
### P0 (Immediate)
- Push code changes via "Save to Github" → Vercel auto-deploy
- Verify Vercel production branch is `main`
- Update DealerSource feed URLs from localhost to production URLs

### P1
- Add `sourceReferenceId` to InventoryItem for per-source stale detection
- Permanently remove `autolenis/` from git history
- Set up real dealer DMS feed URLs when available

### P2
- Set up Prisma schema drift detection CI
- Switch MicroBilt & DocuSign from sandbox to production
- Configure Sentry for error monitoring
