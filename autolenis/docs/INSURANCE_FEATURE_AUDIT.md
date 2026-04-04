# Insurance Feature — End-to-End Audit Report

**Date:** 2026-02-08
**Type:** Diagnostic Walkthrough (Read-Only Inspection)
**Scope:** All Insurance-related mechanisms, flows, pages, APIs, and data linkages

---

## 1️⃣ Feature Inventory

### Buyer Pages

| Path | Purpose | Status |
|------|---------|--------|
| `app/insurance/page.tsx` | Public landing page — explains insurance options, links to buyer onboarding | Implemented |
| `app/buyer/insurance/page.tsx` | Insurance management — select from quotes or upload proof of existing coverage | Implemented |
| `app/buyer/deal/insurance/page.tsx` | Insurance overview dashboard — shows status, policy summary, CTAs for quotes/proof | Implemented |
| `app/buyer/deal/insurance/quote/page.tsx` | Quote request form — coverage preference selection (liability, collision, comprehensive) | Implemented |
| `app/buyer/deal/insurance/quotes/page.tsx` | Quote comparison list — selectable cards, payment frequency toggle | Implemented |
| `app/buyer/deal/insurance/quotes/[quoteId]/page.tsx` | Individual quote detail — premium breakdown, coverage details, proceed-to-bind | Implemented |
| `app/buyer/deal/insurance/bind/page.tsx` | Policy binding confirmation — quote summary, effective date picker | Implemented |
| `app/buyer/deal/insurance/proof/page.tsx` | External proof upload — carrier name, policy number, dates, document URL | Implemented |
| `app/buyer/deal/insurance/confirmed/page.tsx` | Success confirmation — policy summary, next steps (proceed to contracts) | Implemented |

### Dealer Pages

| Path | Purpose | Status |
|------|---------|--------|
| `app/dealer/deals/[dealId]/insurance/page.tsx` | Read-only insurance status view — policy summary card, document request button | Implemented |

### Admin Pages

| Path | Purpose | Status |
|------|---------|--------|
| `app/admin/insurance/page.tsx` | Insurance dashboard — stat cards, recent quotes table, policies table (paginated) | Implemented |
| `app/admin/deals/[dealId]/insurance/page.tsx` | Deal-level insurance — quotes table, policies table, events timeline, verify/revoke actions, document requests | Implemented |

### API Routes

| Path | Methods | Purpose | Status |
|------|---------|---------|--------|
| `app/api/buyer/deals/[dealId]/insurance/route.ts` | GET | Fetch insurance overview for a deal | Implemented |
| `app/api/buyer/deals/[dealId]/insurance/request-quotes/route.ts` | POST | Request insurance quotes via provider | Implemented |
| `app/api/buyer/deals/[dealId]/insurance/select-quote/route.ts` | POST | Select a specific quote | Implemented |
| `app/api/buyer/deals/[dealId]/insurance/select/route.ts` | POST | Select insurance quote (via DealService) | Implemented |
| `app/api/buyer/deals/[dealId]/insurance/bind-policy/route.ts` | POST | Bind a selected quote into a policy | Implemented |
| `app/api/buyer/deals/[dealId]/insurance/external-proof/route.ts` | POST | Upload external insurance proof | Implemented |
| `app/api/buyer/deals/[dealId]/insurance/doc-requests/route.ts` | GET, POST | View/respond to insurance document requests | Implemented |
| `app/api/admin/insurance/route.ts` | GET | Fetch aggregated insurance data (dashboard) | Implemented |
| `app/api/admin/deals/[dealId]/insurance/route.ts` | GET | Full insurance detail for a deal (admin) | Implemented |
| `app/api/admin/deals/[dealId]/insurance/verify-external/route.ts` | POST | Verify or revoke external policy verification | Implemented |
| `app/api/admin/deals/[dealId]/insurance/request-docs/route.ts` | GET, POST | View/create insurance document requests | Implemented |
| `app/api/dealer/deals/[dealId]/insurance/route.ts` | GET | Read-only dealer view of insurance status | Implemented |
| `app/api/dealer/deals/[dealId]/insurance/request-docs/route.ts` | GET, POST | View/create insurance document requests | Implemented |

### Service Files

| Path | Purpose | Status |
|------|---------|--------|
| `lib/services/insurance.service.ts` | Core insurance logic — quotes, binding, proof, admin/dealer views, verification | Implemented |
| `lib/services/deal.service.ts` (insurance functions) | Deal-level insurance integration — `selectInsuranceQuote`, `uploadExternalInsuranceProof`, `advanceDealStatusIfReady` | Implemented |

### Prisma Models

| Model | Purpose | Status |
|-------|---------|--------|
| `InsuranceQuote` | Stores insurance quotes (carrier, coverage, premium, limits, deductibles) | Implemented |
| `InsurancePolicy` | Stores bound policies or external proofs (carrier, policy number, dates, status, document URL) | Implemented |
| `InsuranceDocRequest` | Stores document requests from admin/dealer to buyer | Implemented |
| `SelectedDeal.insurancePolicy` | 1-to-1 relation linking a deal to its insurance policy | Implemented |
| `SelectedDeal.insurance_status` | String field tracking insurance status on the deal | Implemented |

### Insurance Provider

| Component | Purpose | Status |
|-----------|---------|--------|
| `MockInsuranceProvider` (in `insurance.service.ts`) | Generates mock quotes from Progressive, Geico, State Farm; simulates binding | Stubbed — no real provider integration exists |
| `InsuranceProviderAdapter` interface | Defines contract for real provider implementations | Implemented (interface only) |

### Enums

| Enum | Location | Values | Notes |
|------|----------|--------|-------|
| `InsuranceStatus` (Prisma) | `schema.prisma` | QUOTE_REQUESTED, QUOTE_RECEIVED, POLICY_SELECTED, POLICY_BOUND, EXTERNAL_UPLOADED | Used by InsurancePolicy model |
| `InsuranceStatus` (TypeScript) | `lib/types/index.ts` | PENDING, ACTIVE, CANCELLED | Different values — not aligned with Prisma enum |
| `InsuranceStatus` (deal.service.ts) | `deal.service.ts` | NOT_SELECTED, SELECTED_AUTOLENIS, EXTERNAL_PROOF_UPLOADED, BOUND | Used for deal-level `insurance_status` string field |
| `DealStatus` (Prisma) | `schema.prisma` | Includes INSURANCE_PENDING, INSURANCE_COMPLETE | Part of full deal lifecycle |

### Tests

| Path | Purpose | Status |
|------|---------|--------|
| `__tests__/insurance.test.ts` | Tests InsuranceService (policy attachment, quote selection, mock provider, status flow) — 12 tests | Implemented |

---

## 2️⃣ End-to-End Buyer Flow Walkthrough

### Step 1: Enter the Insurance Section

- **Page:** `app/buyer/deal/insurance/page.tsx`
- **API Called:** `GET /api/buyer/deals/{dealId}/insurance` → `InsuranceService.getInsuranceOverview()`
- **What Happens:** The buyer sees their current insurance status, any existing policy summary, and counts of available quotes. Two CTAs are presented: "Get Quotes" and "Upload Proof."
- **Data Created/Updated:** None (read-only).
- **Flow Status:** ✅ Works — buyer can view their insurance state.

### Step 2: Request Insurance Quotes

- **Page:** `app/buyer/deal/insurance/quote/page.tsx`
- **API Called:** `POST /api/buyer/deals/{dealId}/insurance/request-quotes` → `InsuranceService.requestQuotes()`
- **What Happens:** The buyer selects coverage preferences (liability limits, deductibles). The API calls `MockInsuranceProvider.requestQuotes()`, which generates 3 simulated quotes from Progressive, Geico, and State Farm. Quotes are stored in the `InsuranceQuote` table. An `insurance_events` log entry is created. The deal's `insurance_status` is updated to reflect quote request.
- **Data Created:** 3 `InsuranceQuote` records, 1+ `insurance_events` log entries.
- **Flow Status:** ⚠️ Functional but uses mock data only — `MockInsuranceProvider` generates hardcoded quotes with random premiums. No real insurance API is called. Comment in source: *"In production, this would load from insurance_providers table."*

### Step 3: View and Compare Quotes

- **Page:** `app/buyer/deal/insurance/quotes/page.tsx` and `quotes/[quoteId]/page.tsx`
- **API Called:** `GET /api/buyer/deals/{dealId}/insurance` → `InsuranceService.getInsuranceOverview()`
- **What Happens:** Buyer browses quote list with payment frequency toggle (monthly/semi-annual/annual). Can click into individual quotes for detailed coverage breakdown. Selects a preferred quote.
- **Data Created/Updated:** None (read-only browsing).
- **Flow Status:** ✅ Works — displays quotes from database.

### Step 4: Select a Quote

- **API Called:** `POST /api/buyer/deals/{dealId}/insurance/select-quote` → `InsuranceService.selectQuote()`
- **What Happens:** The selected quote's status is updated. The deal's `insurance_status` is set. Validates quote ownership, expiration, and buyer authorization.
- **Data Updated:** `InsuranceQuote.status` → SELECTED, `SelectedDeal.insurance_status` updated.
- **Flow Status:** ✅ Works.

### Step 5: Bind the Policy (AutoLenis Path)

- **Page:** `app/buyer/deal/insurance/bind/page.tsx`
- **API Called:** `POST /api/buyer/deals/{dealId}/insurance/bind-policy` → `InsuranceService.bindPolicy()`
- **What Happens:** The selected quote is converted to a bound policy. `MockInsuranceProvider.bindPolicy()` generates a mock policy number (`POL-{CARRIER}-{TIMESTAMP}`). An `InsurancePolicy` record is created linked to the deal. The deal's `insurance_status` is updated. `advanceDealStatusIfReady()` is potentially triggered (via deal.service.ts) to progress deal status toward `CONTRACT_PENDING`.
- **Data Created:** 1 `InsurancePolicy` record, `insurance_events` log entries.
- **Data Updated:** `InsuranceQuote.status` → BOUND, `SelectedDeal.insurance_status` → "BOUND" or "SELECTED_AUTOLENIS".
- **Flow Status:** ⚠️ Functional but mock-only — no real policy is bound with any carrier.

### Step 5 (Alternate): Upload External Proof

- **Page:** `app/buyer/deal/insurance/proof/page.tsx`
- **API Called:** `POST /api/buyer/deals/{dealId}/insurance/external-proof` → `InsuranceService.uploadExternalProof()`
- **What Happens:** Buyer enters carrier name, policy number, start/end dates, and document URL. An `InsurancePolicy` record is created with `coverageType = "EXTERNAL"` and `status = "EXTERNAL_UPLOADED"`. The deal's `insurance_status` is set to "EXTERNAL_PROOF_UPLOADED".
- **Data Created:** 1 `InsurancePolicy` record.
- **Data Updated:** `SelectedDeal.insurance_status` → "EXTERNAL_PROOF_UPLOADED".
- **Flow Status:** ✅ Works — fully functional data capture path.

### Step 6: Confirmation

- **Page:** `app/buyer/deal/insurance/confirmed/page.tsx`
- **API Called:** `GET /api/buyer/deals/{dealId}/insurance`
- **What Happens:** Displays policy summary (carrier, policy number, coverage period). Shows next step CTA: proceed to contracts.
- **Data Created/Updated:** None (read-only).
- **Flow Status:** ✅ Works.

### Step 7: Return to Deal Summary

- **Page:** `app/buyer/deal/page.tsx`
- **What Happens:** The deal overview shows insurance as a status indicator. If insurance is not complete, it displays a "REQUIRED" warning. Insurance completion contributes to `advanceDealStatusIfReady()` logic, which can transition the deal from `INSURANCE_READY` to `CONTRACT_PENDING`.
- **Flow Status:** ✅ Works — insurance status is reflected in the deal overview.

---

## 3️⃣ Dealer Visibility & Interaction

### How a Dealer Views Insurance for a Deal

- **Page:** `app/dealer/deals/[dealId]/insurance/page.tsx`
- **API:** `GET /api/dealer/deals/{dealId}/insurance` → `InsuranceService.getDealerView()`
- **What is displayed:** Insurance status badge, policy summary card (carrier, policy number, effective/expiration dates).
- **Access Control:** Verifies the dealer user exists and that the dealer owns the associated offer.

### Can Dealers Request Insurance Documents?

**Yes.** The dealer insurance page has a "Request Documents" button.
- **API:** `POST /api/dealer/deals/{dealId}/insurance/request-docs` — creates an `InsuranceDocRequest` record.
- **API:** `GET /api/dealer/deals/{dealId}/insurance/request-docs` — lists existing requests.
- Both endpoints verify dealer ownership of the deal.

### Backend Enforcement

- Role-based access: `DEALER_USER` role required.
- Dealer ownership verification: the dealer must own the associated auction offer.
- Read-only insurance data: dealers cannot modify insurance status, verify policies, or bind policies.

---

## 4️⃣ Admin Visibility & Control

### Where Admins See Insurance Data

1. **Dashboard:** `app/admin/insurance/page.tsx` — aggregate stats (total quotes, active policies, AutoLenis policies), recent quotes table, policies table.
2. **Deal-Level:** `app/admin/deals/[dealId]/insurance/page.tsx` — full quotes table, policies table with verify actions, events timeline.

### Can Admins Verify Insurance?

**Yes.** Admin deal-level insurance page includes verify/revoke buttons for external policies.
- **API:** `POST /api/admin/deals/{dealId}/insurance/verify-external` → `InsuranceService.verifyExternalPolicy()`
- Updates `InsurancePolicy.is_verified` boolean.

### Can Admins Request or Manage Insurance Documents?

**Yes.**
- **API:** `POST /api/admin/deals/{dealId}/insurance/request-docs` — creates document requests with type, optional notes, and due date.
- **API:** `GET /api/admin/deals/{dealId}/insurance/request-docs` — lists document requests for a deal.

### Do Admin Actions Affect Deal State?

**Partially.** Admin verification (`is_verified` flag) updates the policy record but does **not** automatically trigger deal status progression. The `advanceDealStatusIfReady()` function checks `insurance_status` on the deal, not the `is_verified` flag. Admin verification is an informational/compliance action only — it does not gate deal advancement.

---

## 5️⃣ Deal Integration Analysis

### Is Insurance Linked to the Deal Model?

**Yes.** `SelectedDeal` has:
- `insurancePolicy` — 1-to-1 relation to `InsurancePolicy` (via `dealId`)
- `insurance_status` — string field tracking current insurance state

### What Fields Reflect Insurance Status?

| Field | Model | Values |
|-------|-------|--------|
| `insurance_status` | `SelectedDeal` | NOT_SELECTED, SELECTED_AUTOLENIS, EXTERNAL_PROOF_UPLOADED, BOUND |
| `status` | `InsurancePolicy` | QUOTE_REQUESTED, QUOTE_RECEIVED, POLICY_SELECTED, POLICY_BOUND, EXTERNAL_UPLOADED |
| `is_verified` | `InsurancePolicy` | Boolean (admin verification of external policies) |

### Do Deal Status Updates Occur?

**Yes.** The `advanceDealStatusIfReady()` function in `deal.service.ts`:
- From `FINANCING_CHOSEN`: if insurance status is SELECTED_AUTOLENIS, EXTERNAL_PROOF_UPLOADED, or BOUND, and fee is ready → advances to `CONTRACT_PENDING`.
- From `FINANCING_CHOSEN`: if only fee is ready → advances to `INSURANCE_READY`.
- From `INSURANCE_READY`: once insurance completes → `CONTRACT_PENDING`.

### Is This Linkage Automatic, Manual, or Missing?

**Automatic.** Both `selectInsuranceQuote()` and `uploadExternalInsuranceProof()` in `deal.service.ts` call `advanceDealStatusIfReady()` after updating the deal's `insurance_status`.

### Does Insurance Currently Affect Deal Progression?

**PARTIAL.**

Insurance **does** affect deal progression through `advanceDealStatusIfReady()`. However:
1. The `DealStatus` Prisma enum includes `INSURANCE_PENDING` and `INSURANCE_COMPLETE`, but the deal service uses a custom `INSURANCE_READY` status (in a local type) that does not match the Prisma enum — this is a misalignment.
2. The `insurance_status` field on `SelectedDeal` is a free-form `String?`, not constrained by the Prisma `InsuranceStatus` enum.
3. The TypeScript `InsuranceStatus` type in `lib/types/index.ts` (PENDING, ACTIVE, CANCELLED) does not match the Prisma enum (QUOTE_REQUESTED, QUOTE_RECEIVED, etc.) or the deal service type (NOT_SELECTED, SELECTED_AUTOLENIS, etc.) — three different definitions exist.

---

## 6️⃣ Data & State Flow Diagram

```
Buyer Input (quote request / external proof upload)
    │
    ▼
API Route (role-verified, BUYER)
    │
    ▼
InsuranceService (insurance.service.ts)
    │
    ├─► MockInsuranceProvider (stub: generates fake quotes/policies)
    │
    ├─► InsuranceQuote table (quotes stored)
    │
    ├─► InsurancePolicy table (policy created on bind or external upload)
    │
    ├─► insurance_events table (raw SQL logging)
    │
    └─► SelectedDeal.insurance_status updated
            │
            ▼
DealService.advanceDealStatusIfReady()
    │
    ├─► Checks insurance_status + fee status
    │
    └─► Advances SelectedDeal.status (e.g., INSURANCE_READY → CONTRACT_PENDING)
            │
            ▼
Dealer Visibility (GET /api/dealer/deals/{dealId}/insurance)
    │
    └─► Read-only: status badge, policy summary, document request capability
            │
            ▼
Admin Visibility (GET /api/admin/deals/{dealId}/insurance)
    │
    ├─► Full quotes, policies, events timeline
    ├─► Verify/revoke external policies (is_verified flag)
    └─► Request documents from buyer
```

### Missing Links

- **MockInsuranceProvider → Real Provider:** No actual insurance API integration exists. All quotes and bindings are simulated.
- **Admin Verification → Deal Progression:** The `is_verified` flag does not feed back into `advanceDealStatusIfReady()`. External policy verification is informational only.
- **Document Requests → Buyer Response Loop:** `InsuranceDocRequest` records are created, but the buyer doc-request response endpoint (`POST doc-requests` with `documentUrl`) writes directly via Supabase queries, not through InsuranceService.

### Broken Transitions

- **Enum Misalignment:** Three separate `InsuranceStatus` definitions (Prisma enum, TypeScript type, deal.service local type) use different values. No runtime enforcement connects them.
- **DealStatus Mismatch:** `deal.service.ts` references `INSURANCE_READY` as a deal status, but the Prisma `DealStatus` enum has `INSURANCE_PENDING` and `INSURANCE_COMPLETE` — not `INSURANCE_READY`.

### Dead Ends

- `InsuranceService.getQuotes()` — delegates to `getAdminFullDetail()` instead of being a standalone function.
- `InsuranceService.selectPolicy()` — returns hardcoded `{ success: true }` (stub).

---

## 7️⃣ Gaps & Breakpoints Summary

### Mock Provider (Critical)

- `MockInsuranceProvider` is the only provider implementation. It generates fake quotes with random premiums and mock policy numbers.
- No real insurance carrier API is integrated.
- The `getProvider()` factory function always returns a new `MockInsuranceProvider` instance with a comment indicating production would load from a database.

### ~~Enum/Type Misalignment~~ ✅ RESOLVED

- ~~`InsuranceStatus` exists in three places with incompatible values~~ → Resolved: `lib/types/index.ts` now exports two canonical types:
  - `InsurancePolicyStatus` — policy lifecycle (matches Prisma `InsuranceStatus` enum)
  - `DealInsuranceReadiness` — deal-level readiness (used by `SelectedDeal.insurance_status`)
- The local `InsuranceStatus` type was removed from `deal.service.ts`; it now imports `DealInsuranceReadiness` from `lib/types`.
- `SelectedDeal.insurance_status` remains a free-form `String?` in Prisma, which is acceptable since the deal service types enforce valid values at the application layer.

### ~~DealStatus Mismatch~~ ✅ RESOLVED

- ~~Deal service logic uses `INSURANCE_READY` (not in Prisma enum)~~ → Resolved: `deal.service.ts` now uses `INSURANCE_PENDING` and `INSURANCE_COMPLETE` (matching Prisma `DealStatus` enum).
- Transitions updated: `FINANCING_CHOSEN` → `INSURANCE_PENDING` (fee paid, waiting for insurance) → `INSURANCE_COMPLETE` (insurance done).

### ~~Stubbed Functions~~ ✅ RESOLVED

- ~~`InsuranceService.selectPolicy()` returns hardcoded `{ success: true }`~~ → Removed. Caller (`app/api/insurance/select/route.ts`) now calls real `selectQuote()`.
- ~~`InsuranceService.getQuotes()` delegates to `getAdminFullDetail()`~~ → Removed (no code callers existed).

### Admin Verification — Informational Only (By Design)

- Admin can mark external policies as verified (`is_verified`), but this flag is intentionally informational.
- It does **not** gate deal progression. The admin insurance page now explicitly states: *"Verification is informational only and does not affect deal progression."*

### Document Request Response Path

- Document request creation (admin/dealer) and response (buyer) work via direct Supabase queries, bypassing the InsuranceService layer — inconsistent with the rest of the architecture.

### Schema Redundancy

- `InsuranceQuote` and `InsurancePolicy` models contain dual-naming fields (camelCase and snake_case variants) for backward compatibility, adding maintenance overhead.

---

## 8️⃣ Final Status Verdict

**⚠️ Insurance feature is partially wired**

**Justification:**
- All buyer pages, admin pages, dealer pages, and API routes exist and are implemented.
- The full buyer journey (request quotes → view quotes → select → bind/upload proof → confirmation) is functional end-to-end at the UI and API layers.
- Deal integration exists: insurance status updates flow through `advanceDealStatusIfReady()` to progress deal status using canonical `INSURANCE_PENDING` / `INSURANCE_COMPLETE` values.
- Type/enum alignment is now consistent: `InsurancePolicyStatus` for policy lifecycle, `DealInsuranceReadiness` for deal-level readiness.
- Stubs have been removed; all API routes call real service methods.
- However, the insurance provider is a mock stub — no real insurance carrier API is called, no real quotes are generated, and no real policies are bound.

The feature's UI, API routing, data persistence, and deal integration scaffolding are in place. The primary remaining blocker to full production functionality is the absence of a real insurance provider integration.

---

## 9️⃣ Canonical Status Mapping Table

### DealStatus Values (deal lifecycle stage)

| Value | When It Applies |
|-------|----------------|
| `INSURANCE_PENDING` | Fee is paid but insurance is not yet selected/uploaded |
| `INSURANCE_COMPLETE` | Insurance has been selected (AutoLenis) or proof uploaded (external); deal ready for contracts |

### DealInsuranceReadiness Values (SelectedDeal.insurance_status field)

| Value | When It Applies |
|-------|----------------|
| `NOT_SELECTED` | No insurance action taken yet |
| `SELECTED_AUTOLENIS` | Buyer selected an AutoLenis quote |
| `EXTERNAL_PROOF_UPLOADED` | Buyer uploaded proof of external insurance |
| `BOUND` | AutoLenis policy has been bound with carrier |

### InsurancePolicyStatus Values (InsurancePolicy.status field — Prisma enum)

| Value | When It Applies |
|-------|----------------|
| `QUOTE_REQUESTED` | Quote request sent to provider |
| `QUOTE_RECEIVED` | Provider returned quote results |
| `POLICY_SELECTED` | Buyer selected this policy/quote |
| `POLICY_BOUND` | Policy has been bound (active coverage) |
| `EXTERNAL_UPLOADED` | External proof of insurance uploaded |

---

## 🔟 PASS/FAIL Checklist

| Area | Status | Notes |
|------|--------|-------|
| Buyer journey pages (7 deal insurance pages) | ✅ PASS | All 7 pages functional: overview, quote form, results, detail, bind, proof, confirmed |
| Admin/Dealer deal pages | ✅ PASS | Admin dashboard, admin deal-level (with verify), dealer read-only |
| API routes (13) | ✅ PASS | All 13 routes implemented with role-based auth; `selectPolicy` stub replaced |
| Schema alignment | ✅ PASS | Prisma `DealStatus` enum includes `INSURANCE_PENDING`/`INSURANCE_COMPLETE`; deal.service.ts now uses these values |
| Type/enum alignment (no duplicate competing definitions) | ✅ PASS | `InsurancePolicyStatus` for policy lifecycle, `DealInsuranceReadiness` for deal readiness; local `InsuranceStatus` removed from deal.service.ts |
| Tests | ✅ PASS | 18 insurance tests pass (12 original + 6 new for normalization/transitions) |

### Remaining Blockers

| Blocker | File Path | Minimal Fix |
|---------|-----------|-------------|
| MockInsuranceProvider only | `lib/services/insurance.service.ts` lines 67–150 | Replace with real carrier API adapter |
| `deal_status` field used in non-insurance deal.service.ts functions | `lib/services/deal.service.ts` (lines 96, 123, 344, etc.) | Broader refactor to use Prisma `status` field consistently |
| Schema field redundancy (camelCase + snake_case) | `prisma/schema.prisma` (InsuranceQuote, InsurancePolicy) | Migration to single naming convention |
