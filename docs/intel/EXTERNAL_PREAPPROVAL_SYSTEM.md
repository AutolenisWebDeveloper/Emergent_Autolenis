# External Pre-Approval System — Intelligence Pack

## Architecture

### Core Principle: Canonical Gating via PreQualification
When an admin marks a buyer's manual pre-approval as APPROVED, the system writes a
full `PreQualification` record with `source=EXTERNAL_MANUAL`. This is the **canonical
gating model** — all existing route/feature gates check `PreQualification`, so
externally approved buyers get the **exact same** permissions, routes, and workflow
progression as internally pre-qualified buyers. **No special-case branching is needed.**

### Models
- **ExternalPreApprovalSubmission**: Stores buyer-submitted lender pre-approval documents,
  metadata, and review lifecycle (SUBMITTED → IN_REVIEW → APPROVED/REJECTED/EXPIRED/SUPERSEDED).
  Includes normalized cents fields, SHA256 file hash, submission notes, rejection reason codes.
- **ExternalPreApproval**: Legacy evidence model (kept for backward compatibility).
- **PreQualification**: Canonical gating model. Extended with `source` discriminator
  (`INTERNAL` | `EXTERNAL_MANUAL`), `externalSubmissionId` for traceability,
  and `providerName` for display.

### API Endpoints

| Method | Path                                                  | Role  | Purpose                        |
| ------ | ----------------------------------------------------- | ----- | ------------------------------ |
| GET    | `/api/buyer/prequal/external`                         | BUYER | Get latest own submission      |
| POST   | `/api/buyer/prequal/external`                         | BUYER | Upload new pre-approval        |
| GET    | `/api/admin/external-preapprovals`                    | ADMIN | Review queue (paginated)       |
| POST   | `/api/admin/external-preapprovals/:id/review`         | ADMIN | Verify or reject submission    |
| GET    | `/api/admin/external-preapprovals/:id/document`       | ADMIN | Secure document access         |
| GET    | `/api/admin/preapprovals`                             | ADMIN | Filtered review queue          |
| POST   | `/api/admin/preapprovals/:id/review`                  | ADMIN | Verify or reject (alt route)   |

### Services
- `lib/services/external-preapproval.service.ts`: Submission, listing, and review logic.
  On VERIFY, atomically creates PreQualification with `source=EXTERNAL_MANUAL`.
  Sends email notifications (Resend) on submission, approval, and rejection.
- `lib/services/prequal.service.ts`: Extended `getCurrentPreQual()` to return `source` field.

### Validators
- `lib/validators/external-preapproval.ts`: Zod schemas for submit and review inputs.
  Strict mode rejects unknown fields. OWASP upload constants defined here.
  Submit schema includes `submissionNotes`. Review schema includes `rejectionReasonCode`.

### UI
- `/buyer/prequal`: Extended with upload form (lender name, amount, APR, term, notes,
  file upload) and submission history/status tracking.
- `/admin/external-preapprovals`: Admin review queue with approve/reject workflow,
  buyer notes display, SHA256 hash, rejection reason codes dropdown.
- `/admin/preapprovals`: Alternative review queue with filter tabs and credit tier override.

## Schema: ExternalPreApprovalSubmission

```prisma
model ExternalPreApprovalSubmission {
  id                     String   @id @default(cuid())
  buyerId                String
  workspaceId            String?

  // Submission metadata
  lenderName             String
  approvedAmount         Float
  maxOtdAmountCents      Int?     // normalized OTD in cents
  apr                    Float?
  aprBps                 Int?     // APR in basis points
  termMonths             Int?
  minMonthlyPaymentCents Int?
  maxMonthlyPaymentCents Int?
  dtiRatioBps            Int?     // DTI ratio in basis points
  expiresAt              DateTime?
  submissionNotes        String?  // buyer notes

  // Document (private storage, OWASP-aligned)
  storageBucket          String?
  documentStoragePath    String?
  originalFileName       String?
  fileSizeBytes          Int?
  mimeType               String?
  sha256                 String?  // file integrity hash

  // Review workflow
  status                 ExternalPreApprovalStatus @default(SUBMITTED)
  reviewedBy             String?
  reviewedAt             DateTime?
  decisionAt             DateTime?
  reviewNotes            String?  // admin notes
  rejectionReason        String?
  rejectionReasonCode    String?
  supersededById         String?  // self FK for chain tracking
  preQualificationId     String?  // link to created PreQualification
}
```

## Schema: PreQualification (extended)

```prisma
model PreQualification {
  source               PreQualSource @default(INTERNAL)  // INTERNAL | EXTERNAL_MANUAL
  externalSubmissionId String?       // links to ExternalPreApprovalSubmission
  providerName         String?       // e.g. "External Verified: Chase Bank"
}
```

## Security Controls (OWASP File Upload)

| Control                | Implementation                                     |
| ---------------------- | -------------------------------------------------- |
| MIME allowlist          | PDF, PNG, JPEG only — validated server-side         |
| Extension validation   | Must match declared MIME type                       |
| File size limit         | 10 MB max                                          |
| Random filenames        | crypto.randomUUID() — user names never used         |
| SHA256 hash             | Computed on upload for integrity verification       |
| Private storage         | `private/external-preapprovals/{userId}/{uuid}.ext` |
| Filename sanitization   | Original name sanitized for metadata only           |
| Authorized access only  | Document endpoint requires ADMIN role               |

## Email Notifications (Resend)

| Event                  | Recipient | Template Key     |
| ---------------------- | --------- | ---------------- |
| New submission         | Admin     | notification     |
| Approval (APPROVED)    | Buyer     | notification     |
| Rejection              | Buyer     | notification     |

## Compliance Events

| Event Type                        | Action  | When                          |
| --------------------------------- | ------- | ----------------------------- |
| `MANUAL_PREAPPROVAL_APPROVED`   | APPROVE | Admin verifies a submission   |
| `EXTERNAL_PREAPPROVAL_REJECTED`   | REJECT  | Admin rejects a submission    |

All events include `submissionId`, `reviewedBy`, `rejectionReasonCode`, and relevant
metadata for audit trails.

## Rejection Reason Codes

| Code                    | Description                    |
| ----------------------- | ------------------------------ |
| EXPIRED_DOCUMENT        | Document has expired           |
| UNVERIFIABLE_LENDER     | Cannot verify lender           |
| AMOUNT_MISMATCH         | Amount doesn't match document  |
| ILLEGIBLE_DOCUMENT      | Document is not readable       |
| INCOMPLETE_INFORMATION  | Missing required information   |
| SUSPECTED_FRAUD         | Suspected fraudulent document  |
| OTHER                   | Other reason (see free text)   |

## Migration Notes

These schema changes require a Prisma migration:
```bash
pnpm prisma migrate dev --name add-external-preapproval-fields
```
