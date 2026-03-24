# Auth / RBAC / Security Model — Vehicle Request Sourcing

## RBAC Matrix

### Buyer Permissions

| Action | Route | Conditions |
|--------|-------|------------|
| Create case | POST /api/buyer/requests | Must be BUYER role |
| Edit case | PATCH /api/buyer/requests/[caseId] | Own case only, DRAFT status only |
| Submit case | POST /api/buyer/requests/[caseId]/submit | Own case only, DRAFT status |
| Cancel case | POST /api/buyer/requests/[caseId]/cancel | Own case only, DRAFT/SUBMITTED |
| View cases | GET /api/buyer/requests | Own cases only (buyerId filter) |
| View case detail | GET /api/buyer/requests/[caseId] | Own case only |
| View offers | GET /api/buyer/requests/[caseId]/offers | Own case only, PRESENTED/ACCEPTED offers only |
| Accept offer | POST /api/.../accept | Own case only, offer must be PRESENTED |

### Admin Permissions

| Action | Route | Conditions |
|--------|-------|------------|
| View all cases | GET /api/admin/sourcing/cases | ADMIN role required |
| View case detail | GET /api/admin/sourcing/cases/[caseId] | ADMIN role, all data visible |
| Assign admin | POST .../assign | ADMIN role |
| Update status | POST .../status | ADMIN role, valid transitions only |
| Add outreach | POST .../outreach | ADMIN role |
| Enter offer | POST .../offers | ADMIN role |
| Present offer | POST .../offers/[offerId]/present | ADMIN role |
| Withdraw offer | POST .../offers/[offerId]/withdraw | ADMIN role |
| Invite dealer | POST .../invite-dealer | ADMIN role |

### Dealer Permissions

| Action | Route | Conditions |
|--------|-------|------------|
| View opportunities | GET /api/dealer/opportunities | DEALER role, onboarded only |
| Submit offer | POST .../[caseId]/offers | DEALER role, verified dealer |
| Claim invite | GET/POST /api/dealer/invite/claim | Public (token-based) |
| Complete invite | POST /api/dealer/invite/complete | DEALER role (after account creation) |

## Enforcement Layers

### Layer 1: API Route Authentication
All routes use `requireAuth(["ROLE"])` from `@/lib/auth-server` which:
- Verifies JWT session
- Checks role membership
- Throws 401 (unauthenticated) or 403 (forbidden)

### Layer 2: Data Isolation
- All queries filter by `buyerId` (buyer routes) or `dealerId` (dealer routes)
- `workspaceId` scoping on all multi-tenant operations
- Buyer never sees non-presented offers
- Dealer never sees buyer PII in opportunities

### Layer 3: Business Logic Guards
- Status transition validation (service layer)
- Max 3 items per case (service + API validation)
- Offer acceptance locks case edits (lockedAt timestamp)
- Dealer invite token is single-use, time-limited, SHA-256 hashed

## Audit Events (CaseEventLog)

| Action | Actor | Trigger |
|--------|-------|---------|
| STATUS_CHANGE | BUYER/ADMIN | Any status transition |
| CASE_SUBMITTED | BUYER | Case submission |
| CASE_CANCELLED | BUYER | Case cancellation |
| ADMIN_ASSIGNED | ADMIN | Admin assignment |
| OUTREACH_LOGGED | ADMIN | Outreach entry created |
| OFFER_CREATED | ADMIN/DEALER | Offer created |
| OFFER_PRESENTED | ADMIN | Offer presented to buyer |
| OFFER_WITHDRAWN | ADMIN | Offer withdrawn |
| OFFER_ACCEPTED | BUYER | Buyer accepts offer |
| DEALER_INVITED | ADMIN | Dealer invite sent |
| DEALER_CLAIMED | DEALER | Dealer claims invite |
| DEALER_COMPLETED | DEALER | Dealer completes onboarding |

## Security Controls

### Token Security (Dealer Invites)
- Generated: `crypto.randomBytes(32).toString('hex')` (256-bit)
- Stored: SHA-256 hash only (`crypto.createHash('sha256')`)
- Raw token sent via Resend email, never stored or returned from API
- Single-use: status transitions to CLAIMED on first use
- Time-limited: `tokenExpiresAt` checked on claim

### Data Protection
- Buyer PII not exposed in dealer opportunity listings
- Prequal snapshots stored as JSON (read-only after creation)
- All state transitions audited with actor identity

## Sourcing Feature Security Notes

### RBAC Verification Matrix

| Endpoint | Auth | Role | Data Scope | Buyer PII |
|----------|------|------|-----------|-----------|
| GET /api/buyer/requests | requireAuth | BUYER | buyerId filter | Own data only |
| POST /api/buyer/requests | requireAuth | BUYER | buyerId set from session | N/A |
| GET /api/buyer/requests/[caseId] | requireAuth | BUYER | buyerId filter | Own data only |
| GET /api/buyer/requests/[caseId]/offers | requireAuth | BUYER | buyerId filter, PRESENTED/ACCEPTED only | Own data only |
| POST /api/buyer/requests/[caseId]/offers/[offerId]/accept | requireAuth | BUYER | buyerId filter | Own data only |
| GET /api/admin/sourcing/cases | requireAuth | ADMIN | workspaceId filter | Admin sees all |
| GET /api/admin/sourcing/cases/[caseId] | requireAuth | ADMIN | Full access | Admin sees all |
| POST /api/admin/sourcing/cases/[caseId]/invite-dealer | requireAuth | ADMIN | Raw token NOT in response | N/A |
| GET /api/dealer/opportunities | requireAuth | DEALER | workspaceId filter | **No buyer PII** — select excludes buyer fields |
| POST /api/dealer/opportunities/[caseId]/offers | requireAuth | DEALER | dealerId from session | N/A |
| GET /api/dealer/invite/claim | Public | N/A | Token-based, read-only validate | Invite metadata only |
| POST /api/dealer/invite/claim | Public | N/A | Token-based, single-use claim | Invite metadata only |
| POST /api/dealer/invite/complete | requireAuth | DEALER | Creates SelectedDeal for pipeline | N/A |

### Token Security Hardening
- **Generation**: `crypto.randomBytes(32)` — 256-bit CSPRNG
- **Storage**: SHA-256 hash only; raw token never persisted in DB
- **Single-use**: `claimDealerInvite` rejects tokens with status ≠ SENT
- **Expiry**: 72-hour window checked before claim/validate
- **API response**: Raw token returned only to `createDealerInvite` caller (admin), never in GET/POST claim responses
- **GET vs POST**: GET `/api/dealer/invite/claim` is read-only validation; only POST mutates status

### Safeguards Posture
- All customer information access is controlled by RBAC + buyerId/dealerId scoping
- Prequal snapshots are frozen at case creation time (immutable JSON)
- CaseEventLog provides full audit trail with actor identity, role, and timestamps
- No customer PII is exposed in dealer opportunity listings (explicit `select` clause)
- Coverage gap detection is server-side only (GET /api/buyer/coverage-gap) — not derived from empty UI lists

### Deal Pipeline Integrity
- Sourced deals use dedicated FK fields (`sourcingCaseId`, `sourcedOfferId`) on SelectedDeal
- Existing auction FK fields (`auctionId`, `offerId`, `inventoryItemId`) are NOT overloaded
- Both auction and sourced deals flow through the same downstream pipeline (Contract Shield → insurance → e-sign → pickup)
- No parallel pipeline or bypass of existing gates

### File Upload Posture
- **Attachments are currently disabled** in the outreach log flow
- SourcingOutreachLog supports notes only (String); no file metadata fields active
- When file uploads are added, they MUST implement: allowlist extensions, magic-byte sniffing, size limits (10MB max), safe filenames, private storage, authorized access checks per OWASP File Upload Cheat Sheet
- Upload UI paths are blocked until upload controls are built

### Vendor Constraints
- All email notifications use **Resend only** via `lib/resend.ts` emailService
- All payment processing uses **Stripe only** — no payment logic added in sourcing feature
- No new vendors introduced

### Daily Operations
1. Check `/admin/sourcing` → "New Requests" tab for unassigned cases
2. Assign cases to admin team members
3. Conduct dealer outreach and log all activity
4. Enter or approve offers
5. Present offers to buyer when ready

### Escalation
- Cases in "Stale" tab need immediate attention
- SLA: respond to buyer within 48 hours of submission
- Unclaimed dealer invites: follow up after 24 hours

### Monitoring
- Track `DealerCoverageGapSignal` records for market coverage gaps
- Monitor `CaseEventLog` for audit compliance
- Review offer acceptance rates for quality metrics
