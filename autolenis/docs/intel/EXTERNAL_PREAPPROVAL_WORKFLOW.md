# External Pre-Approval Workflow

## Overview

Buyers who already have a pre-approval letter from an external bank or lender can upload it via the `/buyer/prequal` page. An admin manually reviews the document and, on verification, the system writes a `PreQualification` record with `source = EXTERNAL_MANUAL`. This ensures all downstream gating (shortlisting, auctions, deal flow) works automatically without any changes to the gating logic.

**Platform Rule**: Approved native Pre-Qualification and approved External Preapproval unlock the **same** buyer buying entitlement.

## Canonical Backend (Prompt 4)

All External Preapproval frontend/system work uses the approved Prompt 4 canonical backend objects — **not** the legacy Prisma `ExternalPreApproval` / `ExternalPreApprovalSubmission` models:

| Object | Type | Purpose |
|---|---|---|
| `public.external_preapproval_submissions` | Table | Canonical submission records |
| `public.external_preapproval_status_history` | Table | Immutable status change audit trail |
| `public.external_preapproval_documents` | Table | Per-submission document metadata |
| `public.buyer_qualification_active` | View | Unified qualification (native + external) |
| `public.external_preapproval_set_status(...)` | Function | Status transition with validation |
| `public.external_preapproval_approve(...)` | Function | Atomic approve + PreQualification creation |

**Storage**: `buyer-docs` bucket, path: `{userId}/preapproval/{uuid}.{ext}`

## Architecture

### Models

| Model | Purpose |
|---|---|
| `external_preapproval_submissions` (canonical) | Tracks buyer-uploaded pre-approval documents and their review lifecycle |
| `PreQualification` (extended) | Now includes `source` (`INTERNAL` / `EXTERNAL_MANUAL`) and `externalSubmissionId` fields |
| `buyer_qualification_active` (view) | Unified view combining all active qualifications regardless of source |
| `ExternalPreApproval` (legacy) | Existing model; not used for gating; kept for backward compatibility |

### Status Lifecycle

```
SUBMITTED → IN_REVIEW → APPROVED → (EXPIRED | SUPERSEDED)
    ↓           ↓
  SUPERSEDED  REJECTED
```

- **SUBMITTED**: Buyer uploaded document, awaiting review
- **IN_REVIEW**: Admin has started reviewing
- **APPROVED**: Admin approved; PreQualification record created
- **REJECTED**: Admin rejected (reason required)
- **EXPIRED**: Time-based expiry
- **SUPERSEDED**: Buyer submitted a newer document

### PreQualification Source Discriminator

```
PreQualSource: INTERNAL | EXTERNAL_MANUAL
```

- `INTERNAL`: Created via the soft-pull scoring engine (existing flow)
- `EXTERNAL_MANUAL`: Created when admin verifies an external bank pre-approval

## API Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/buyer/prequal` | BUYER | Unified response via `buyer_qualification_active` view |
| GET | `/api/buyer/prequal/external` | BUYER | Get latest external submission for current buyer |
| POST | `/api/buyer/prequal/external` | BUYER | Submit external pre-approval (multipart: metadata + file) |
| GET | `/api/admin/external-preapprovals` | ADMIN | List pending submissions for review queue |
| POST | `/api/admin/external-preapprovals/[id]/review` | ADMIN | Approve or reject a submission |

## RBAC

- **BUYER**: Can submit and view own external pre-approvals only
- **ADMIN**: Can view all submissions and approve/reject
- **DEALER / AFFILIATE**: No access to external pre-approval data

## File Upload Security (OWASP)

Per the OWASP File Upload Cheat Sheet:

1. **Allowlisted MIME types**: `application/pdf`, `image/png`, `image/jpeg`
2. **Extension-MIME validation**: Extension must match declared type
3. **Random filenames**: Storage uses `crypto.randomUUID()`, not user-provided names
4. **Size limits**: 10 MB maximum
5. **Private storage**: Files stored in `buyer-docs` bucket under `{userId}/preapproval/`
6. **Sanitized metadata**: Original filename sanitized for display only

## Compliance (FTC Safeguards Rule Alignment)

- Least privilege: Only the owning buyer and admins can access submission data
- Auditability: All review actions logged via `ComplianceEvent`
- Data isolation: Submissions scoped by `buyerId` and `workspaceId`

## Unified Response Shape

`GET /api/buyer/prequal` now returns:

```json
{
  "success": true,
  "data": {
    "active": true,
    "preQualification": {
      "id": "...",
      "status": "ACTIVE",
      "source": "EXTERNAL_MANUAL",
      "creditTier": "GOOD",
      "maxOtdAmountCents": 3500000,
      "providerName": "External:Chase Bank",
      "expiresAt": "..."
    },
    "externalSubmission": {
      "id": "...",
      "status": "APPROVED",
      "lenderName": "Chase Bank",
      "approvedAmount": 35000
    }
  }
}
```

## Migration Notes

### Schema Changes

1. New enum: `ExternalPreApprovalStatus` (SUBMITTED, IN_REVIEW, APPROVED, REJECTED, EXPIRED, SUPERSEDED)
2. New enum: `PreQualSource` (INTERNAL, EXTERNAL_MANUAL)
3. New model: `ExternalPreApprovalSubmission`
4. Extended model: `PreQualification` — added `source` (default INTERNAL), `externalSubmissionId`
5. Updated `Workspace` relations to include `externalPreApprovalSubmissions`

### Migration Command

```bash
pnpm db:push
# or for production:
# prisma migrate dev --name add-external-preapproval-workflow
```

No data migration needed — existing PreQualification records default to `source = INTERNAL`.
