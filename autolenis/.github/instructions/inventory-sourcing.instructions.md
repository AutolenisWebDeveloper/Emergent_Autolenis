---
applyTo: "lib/services/inventory-sourcing/**|lib/services/inventory.service.ts|app/api/inventory/**|app/api/admin/inventory/**"
---
# Inventory & Sourcing (Non-Negotiable)

## Inventory Data Integrity
- Vehicle data must be normalized on ingestion — use the established normalization service for consistent make/model/trim formatting.
- External data sources (scraping, API feeds) must be validated and sanitized before storage.
- Inventory items must track their source (dealer upload, scrape, API feed) for auditability.
- Price and mileage values must be stored as integers to avoid floating-point issues.

## Sourcing Case Workflow
- Sourcing cases follow defined status flows: OPEN → INVITED → RESPONDING → OPTIONS_READY → SELECTED → CLOSED/CANCELLED.
- Status transitions must be validated — no state skipping or backward movement without explicit cancellation.
- Invite statuses: PENDING → SENT → VIEWED → RESPONDED/DECLINED/EXPIRED.
- Offer statuses: SUBMITTED → UNDER_REVIEW → SHORTLISTED → SELECTED/REJECTED/WITHDRAWN.

## Conversion Pipeline
- Conversion from sourcing case to deal must be atomic — create the deal and close the sourcing case in a single transaction.
- Conversion events must be recorded in the event ledger for audit trail.

## Search & Performance
- Inventory search must use indexed columns — never perform full-table scans on the inventory table.
- Search results must be paginated — never return unbounded result sets.
- Filter parameters must be validated with Zod before constructing queries.

## Testing Requirements
- Test normalization: various input formats produce consistent output.
- Test status transitions: valid transitions succeed, invalid ones are rejected.
- Test search: pagination, filtering, and sorting produce correct results.
