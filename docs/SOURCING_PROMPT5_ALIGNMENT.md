# Sourcing System — Prompt 5 Alignment Report

## 1. Real Backend Usage Confirmation

For each Prompt 5 object, the integration status against the running implementation:

| Prompt 5 Canonical Object | Physical Table (Prisma Model) | Integration Status | Runtime Detail |
|---|---|---|---|
| `public.sourcing_cases` | `"VehicleRequestCase"` | **Indirectly integrated through actual DB mapping** | All mutations via `SourcingService` → Prisma ORM → same PostgreSQL DB. Dashboard reads via `supabase.from(SOURCING_TABLES.CASES)` → same physical table. No `sourcing_cases` named view exists yet. |
| `public.sourcing_dealer_outreach` | `"SourcingOutreachLog"` | **Indirectly integrated through actual DB mapping** | Writes via `SourcingService.addOutreachLog()` → Prisma → same DB. No `sourcing_dealer_outreach` named view exists yet. |
| `public.sourced_offers` | `"SourcedOffer"` | **Indirectly integrated through actual DB mapping** | Writes via `SourcingService.createOffer()/presentOffer()/withdrawOffer()/acceptOffer()` → Prisma → same DB. Cross-domain read in `deal-context.service.ts`. No `sourced_offers` named view exists yet. |
| `public.sourced_dealer_invitations` | `"DealerInvite"` | **Indirectly integrated through actual DB mapping** | Full invite lifecycle via `SourcingService.createDealerInvite()/validateDealerInvite()/claimDealerInvite()/completeDealerInvite()` → Prisma → same DB. No `sourced_dealer_invitations` named view exists yet. |
| `public.network_coverage_events` | `"DealerCoverageGapSignal"` | **Indirectly integrated through actual DB mapping** | Created via `SourcingService.checkDealerCoverage()` → Prisma → same DB. No `network_coverage_events` named view exists yet. |
| `public.sourcing_audit_log` | `"CaseEventLog"` | **Indirectly integrated through actual DB mapping** | All mutations logged via `SourcingService.logEvent()` → Prisma → same DB. No `sourcing_audit_log` named view exists yet. |
| `public.sourcing_events_outbox` | _(none)_ | **Not integrated** | Reserved for future async event processing. No table or view exists. No current consumer. |
| `public.log_coverage_from_request(...)` | _(TypeScript method)_ | **Indirectly integrated through actual DB mapping** | Implemented as `SourcingService.checkDealerCoverage()` in TypeScript, not as a PostgreSQL function. Writes to `DealerCoverageGapSignal` via Prisma. |

## 2. Source-of-Truth Confirmation

### What is the actual runtime source of truth today?

The **Prisma ORM layer** is the runtime source of truth for all sourcing mutations. The `SourcingService` class in `lib/services/sourcing.service.ts` exclusively uses `prisma.*` calls (40+ operations) for all CRUD.

### Is the app using the real Prompt 5 backend objects in production/runtime?

**No.** The Prompt 5 canonical **named objects** (`sourcing_cases`, `sourced_offers`, etc.) do not exist as tables or views in the database. The app reads/writes the underlying **Prisma-managed PascalCase tables** (`"VehicleRequestCase"`, `"SourcedOffer"`, etc.) which reside in the same PostgreSQL database that Supabase connects to.

Both Prisma and Supabase access the **same physical PostgreSQL rows**. The data is identical — only the access path differs:
- **Mutations**: `SourcingService` → Prisma client → PostgreSQL table `"VehicleRequestCase"`
- **Dashboard reads**: `buyer.service.ts` / `admin.service.ts` → `supabase.from(SOURCING_TABLES.CASES)` → same PostgreSQL table `"VehicleRequestCase"`

### Is the app still primarily using legacy Prisma models?

**Yes, for mutations.** The `SourcingService` uses Prisma exclusively. There are zero `supabase.*` calls in the sourcing service. Dashboard services use Supabase for read-only aggregate queries via `SOURCING_TABLES` constants.

## 3. Drift Risk Assessment

### Does dual-source-of-truth risk exist?

**No.** There is only one database with one set of physical tables. Both Prisma and Supabase connect to the same PostgreSQL instance. There is no second set of sourcing tables that could drift.

The `SOURCING_TABLES` constant maps Prompt 5 canonical names to the physical Prisma table names, ensuring Supabase dashboard reads target the same tables that Prisma writes to:

```typescript
export const SOURCING_TABLES = {
  CASES: "VehicleRequestCase",           // sourcing_cases
  DEALER_OUTREACH: "SourcingOutreachLog", // sourcing_dealer_outreach
  OFFERS: "SourcedOffer",                // sourced_offers
  DEALER_INVITATIONS: "DealerInvite",    // sourced_dealer_invitations
  COVERAGE_EVENTS: "DealerCoverageGapSignal", // network_coverage_events
  AUDIT_LOG: "CaseEventLog",             // sourcing_audit_log
} as const
```

### What prevents drift?

1. **Single service boundary**: All sourcing mutations go through `SourcingService`. No route handler directly accesses Prisma sourcing models.
2. **Canonical mapping constant**: `SOURCING_TABLES` connects Prompt 5 names to physical tables. Dashboard queries use these constants.
3. **Regression tests**: `__tests__/sourcing-prompt5-alignment.test.ts` guards against route handlers bypassing the service.
4. **Same database**: Prisma and Supabase both connect to the same PostgreSQL instance.

## 4. Service Boundary Enforcement

### Route handlers — all sourcing mutations via SourcingService

| Route | Method | Service Call |
|---|---|---|
| `app/api/buyer/requests/route.ts` | POST | `sourcingService.createCase()` |
| `app/api/buyer/requests/[caseId]/route.ts` | GET | `sourcingService.getCaseForBuyer()` |
| `app/api/buyer/requests/[caseId]/submit/route.ts` | POST | `sourcingService.submitCase()` |
| `app/api/buyer/requests/[caseId]/cancel/route.ts` | POST | `sourcingService.cancelCase()` |
| `app/api/buyer/requests/[caseId]/offers/route.ts` | GET | `sourcingService.getOffersForBuyer()` |
| `app/api/buyer/requests/[caseId]/offers/[offerId]/accept/route.ts` | POST | `sourcingService.acceptOffer()` |
| `app/api/buyer/coverage-gap/route.ts` | POST | `sourcingService.checkDealerCoverage()` |
| `app/api/admin/sourcing/cases/route.ts` | GET | `sourcingService.listCasesForAdmin()` |
| `app/api/admin/sourcing/cases/[caseId]/route.ts` | GET | `sourcingService.getCaseForAdmin()` |
| `app/api/admin/sourcing/cases/[caseId]/status/route.ts` | POST | `sourcingService.updateCaseStatus()` |
| `app/api/admin/sourcing/cases/[caseId]/assign/route.ts` | POST | `sourcingService.assignCase()` |
| `app/api/admin/sourcing/cases/[caseId]/outreach/route.ts` | POST | `sourcingService.addOutreachLog()` |
| `app/api/admin/sourcing/cases/[caseId]/offers/route.ts` | POST | `sourcingService.createOffer()` |
| `app/api/admin/sourcing/cases/[caseId]/offers/[offerId]/present/route.ts` | POST | `sourcingService.presentOffer()` |
| `app/api/admin/sourcing/cases/[caseId]/offers/[offerId]/withdraw/route.ts` | POST | `sourcingService.withdrawOffer()` |
| `app/api/admin/sourcing/cases/[caseId]/invite-dealer/route.ts` | POST | `sourcingService.createDealerInvite()` |
| `app/api/dealer/opportunities/route.ts` | GET | `sourcingService.listOpenCasesForDealer()` |
| `app/api/dealer/opportunities/[caseId]/offers/route.ts` | POST | `sourcingService.createOffer()` |
| `app/api/dealer/invite/claim/route.ts` | POST | `sourcingService.claimDealerInvite()` |
| `app/api/dealer/invite/complete/route.ts` | POST | `sourcingService.completeDealerInvite()` |

### Cross-domain read-only access (outside SourcingService)

| File | Access | Justification |
|---|---|---|
| `lib/services/deal-context.service.ts` | `prisma.sourcedOffer.findUnique()` | Cross-domain: deal context needs sourced offer vehicle data for downstream deal pipeline |
| `lib/ai/context-loader.ts` | `prisma.vehicleRequestCase.count()` | Read-only aggregate: AI context needs case count for conversation context |

These are legitimate read-only cross-domain queries. They do not perform mutations.

## 5. Canonical Views — Deployment Ready

The file `scripts/sourcing-canonical-views.sql` contains SQL to create Supabase-accessible views that map the Prompt 5 canonical snake_case names to the existing PascalCase tables:

| View | Source Table |
|---|---|
| `public.sourcing_cases` | `"VehicleRequestCase"` |
| `public.sourcing_dealer_outreach` | `"SourcingOutreachLog"` |
| `public.sourced_offers` | `"SourcedOffer"` |
| `public.sourced_dealer_invitations` | `"DealerInvite"` |
| `public.network_coverage_events` | `"DealerCoverageGapSignal"` |
| `public.sourcing_audit_log` | `"CaseEventLog"` |

These views can be deployed via Supabase SQL Editor without schema changes. Once deployed, `supabase.from("sourcing_cases")` will access the same data as `supabase.from("VehicleRequestCase")`.

## 6. Legacy / Prompt 5 Reconciliation

### Active Prisma models (authoritative for mutations)

| Prisma Model | Prompt 5 Canonical Name | Why Active | Authoritative For |
|---|---|---|---|
| `VehicleRequestCase` | `sourcing_cases` | All case lifecycle CRUD via SourcingService | Case creation, status transitions, buyer ownership |
| `VehicleRequestItem` | _(child of sourcing_cases)_ | Vehicle criteria per case (max 3) | Vehicle specs, budget, preferences |
| `SourcedOffer` | `sourced_offers` | Offer CRUD + pricing + status | Offer lifecycle, pricing breakdown, acceptance |
| `SourcingOutreachLog` | `sourcing_dealer_outreach` | Admin outreach tracking | Dealer contact methods, outcomes |
| `DealerInvite` | `sourced_dealer_invitations` | Token-based dealer invites | Invite lifecycle, claim, completion |
| `DealerCoverageGapSignal` | `network_coverage_events` | Coverage gap detection | Gap signals, reason codes |
| `CaseEventLog` | `sourcing_audit_log` | Audit trail for all mutations | Actor identity, action, timestamps |
| `CaseNote` | _(child of sourcing_cases)_ | Internal/external notes | Admin notes, buyer-visible notes |

### What is authoritative for new work

- **Service layer**: `SourcingService` for all sourcing mutations (Prisma-based)
- **Table mapping**: `SOURCING_TABLES` constant for Supabase `.from()` references
- **Ownership model**: `BuyerProfile.id` for buyer identity (never `User.id`)
- **Status machine**: `VALID_CASE_TRANSITIONS` in sourcing service

---

## Final Closure

The Prompt 3 sourcing implementation is **indirectly integrated** to the Prompt 5 backend through the same PostgreSQL database. Both Prisma (mutations) and Supabase (dashboard reads) access identical physical rows. The `SOURCING_TABLES` constant provides an explicit mapping from Prompt 5 canonical names to physical table names. All mutations are funneled through `SourcingService` with no route handler bypass. There is no dual-source-of-truth drift risk.

The Prompt 5 canonical **named objects** (`sourcing_cases`, `sourced_offers`, etc.) do not yet exist as database views. The SQL to create them is in `scripts/sourcing-canonical-views.sql` and is deployable via Supabase SQL Editor. Once deployed, the views will provide snake_case aliases to the same physical tables.

**Prompt 3 is not yet fully integrated to Prompt 5.**

To achieve full integration, deploy `scripts/sourcing-canonical-views.sql` to the Supabase database. This requires no code changes — only a one-time SQL execution.
