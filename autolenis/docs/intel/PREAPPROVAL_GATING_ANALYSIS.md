# Pre-Approval Gating Analysis

## Canonical Gating Model: `PreQualification`

The `PreQualification` model is the single canonical gating model in AutoLenis. All downstream systems (shortlisting, auctions, deal creation, financing offers) check for an ACTIVE PreQualification record to gate buyer actions.

## `ExternalPreApproval` vs `PreQualification`

| Aspect | `PreQualification` | `ExternalPreApproval` |
|---|---|---|
| Used for gating | ✅ Yes | ❌ No |
| Has status lifecycle | ✅ `prequal_status` | ❌ No status field |
| Has expiry | ✅ `expiresAt` | ❌ No expiry |
| Linked to BuyerProfile | ✅ via `buyerId` (unique) | ❌ No relation |
| Used in any TypeScript code | ✅ Extensively | ❌ Not referenced |

**Conclusion**: `ExternalPreApproval` is a legacy model not used for gating. It is kept for backward compatibility but should not be used for new features.

## Source Discriminator

With the External Pre-Approval workflow, `PreQualification` now supports a `source` field:

- `INTERNAL` (default): Created via the internal soft-pull scoring engine
- `EXTERNAL_MANUAL`: Created when an admin verifies a buyer-uploaded bank pre-approval document

This ensures both internal and external pre-approvals flow through the same gating model, and all downstream logic works without modification.

## How External Pre-Approvals Work

1. Buyer uploads a pre-approval document via `/buyer/prequal`
2. System creates an `ExternalPreApprovalSubmission` record (status: SUBMITTED)
3. Admin reviews the submission via `/admin/external-preapprovals`
4. On approval: System creates/updates a `PreQualification` record with `source = EXTERNAL_MANUAL`
5. All existing gating logic works automatically since it checks `PreQualification`

## Key Design Decision

We chose to write to `PreQualification` (the existing gating model) rather than creating a separate gating path because:

1. **Zero changes to downstream systems** — all gating already checks PreQualification
2. **Single source of truth** — no risk of gating logic divergence
3. **Source traceability** — the `source` + `externalSubmissionId` fields provide full audit trail
