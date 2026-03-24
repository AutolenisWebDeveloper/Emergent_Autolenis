---
applyTo: "lib/services/deal/**|app/api/buyer/deals/**|app/api/dealer/deals/**|app/api/admin/deals/**"
---
# Deal Pipeline (Non-Negotiable)

## Deal Lifecycle
- The deal pipeline is modular: creation (`creation.ts`), financing (`financing.ts`), insurance (`insurance.ts`), status (`status.ts`), retrieval (`retrieval.ts`).
- Status transitions must follow the defined state machine — never skip states or move backward without an explicit reversal operation.
- Every status transition must write an event to the event ledger with: deal ID, old status, new status, actor, and correlation ID.

## Data Ownership
- Buyers own their deals — a buyer can only see/modify their own deals, scoped by `buyerProfileId` and `workspaceId`.
- Dealers see deals assigned to them — scoped by `dealerId` and `workspaceId`.
- Admins see all deals within their workspace — scoped by `workspaceId` only.
- Never expose one buyer's deal data to another buyer.

## Financial Accuracy
- Financing offers must preserve the exact terms from the lender — never round, truncate, or modify APR, term, or payment values.
- Insurance quotes must include all fee components and display the total accurately.
- All monetary values must use integer cents (or the currency's smallest unit) to avoid floating-point errors.

## Testing Requirements
- Test status transitions: valid transitions succeed, invalid transitions return errors.
- Test data isolation: buyer A cannot access buyer B's deals.
- Test financial calculations: verify no floating-point precision issues.
