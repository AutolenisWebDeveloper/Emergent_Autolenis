# Supabase Storage Policy — AutoLenis Platform

## Overview

This document defines the **storage bucket architecture**, access policies, metadata contracts, and operational rules for all Supabase Storage buckets used by the AutoLenis platform. All storage must comply with the security, compliance, and workspace isolation requirements defined in `SUPABASE_MASTER_SPEC.md`.

---

## 1. Bucket Definitions

| Bucket | Visibility | Encryption | Description |
|---|---|---|---|
| `buyer-private-documents` | Private | At-rest | Buyer-uploaded personal documents |
| `dealer-private-documents` | Private | At-rest | Dealer-uploaded operational documents |
| `contract-shield-input` | Private | At-rest | Contract documents submitted for scanning |
| `contract-shield-output` | Private | At-rest | Scan results, fix lists, and processed artifacts |
| `insurance-proof` | Private | At-rest | Insurance proof-of-coverage uploads |
| `esign-archives` | Private | At-rest | Executed e-signature document archives |
| `kyc-documents` | Private | At-rest | KYC/identity verification documents |
| `admin-secure-exports` | Private | At-rest | Admin-generated data exports |
| `public-affiliate-assets` | Public | — | Affiliate marketing materials and assets |
| `system-generated-artifacts` | Private | At-rest | System-generated reports and artifacts |

---

## 2. Path Convention

All files must follow a workspace-scoped path structure:

```
workspace/{workspace_id}/{entity_type}/{entity_id}/{filename}
```

### Examples

| Bucket | Path Pattern |
|---|---|
| `buyer-private-documents` | `workspace/{wid}/buyer/{buyer_id}/documents/{filename}` |
| `dealer-private-documents` | `workspace/{wid}/dealer/{dealer_id}/documents/{filename}` |
| `contract-shield-input` | `workspace/{wid}/deal/{deal_id}/contracts/{version}/{filename}` |
| `contract-shield-output` | `workspace/{wid}/deal/{deal_id}/scans/{scan_id}/{filename}` |
| `insurance-proof` | `workspace/{wid}/buyer/{buyer_id}/insurance/{filename}` |
| `esign-archives` | `workspace/{wid}/deal/{deal_id}/esign/{envelope_id}/{filename}` |
| `kyc-documents` | `workspace/{wid}/user/{user_id}/kyc/{filename}` |
| `admin-secure-exports` | `workspace/{wid}/admin/exports/{export_id}/{filename}` |
| `public-affiliate-assets` | `affiliates/{affiliate_id}/assets/{filename}` |
| `system-generated-artifacts` | `workspace/{wid}/system/{job_type}/{job_id}/{filename}` |

---

## 3. Access Policies

### 3.1 Private Buckets — Signed URLs Only

All private buckets must enforce signed-URL-only access:

- No direct public access
- Signed URLs generated server-side via service role
- URL time-to-live (TTL) limits:

| Bucket | Max TTL | Use Case |
|---|---|---|
| `buyer-private-documents` | 15 minutes | Document viewing |
| `dealer-private-documents` | 15 minutes | Document viewing |
| `contract-shield-input` | 30 minutes | Upload and scan processing |
| `contract-shield-output` | 15 minutes | Scan result viewing |
| `insurance-proof` | 15 minutes | Proof viewing |
| `esign-archives` | 10 minutes | Archive viewing |
| `kyc-documents` | 5 minutes | KYC review (high sensitivity) |
| `admin-secure-exports` | 30 minutes | Export download |
| `system-generated-artifacts` | 15 minutes | Report viewing |

### 3.2 Public Bucket — Affiliate Assets

The `public-affiliate-assets` bucket allows:

- Public read access for approved marketing materials
- Write access restricted to authenticated affiliates (own path) and admins
- Content moderation review before publishing

### 3.3 Role-Based Access

| Role | Buckets Accessible | Operations |
|---|---|---|
| **Buyer** | `buyer-private-documents`, `insurance-proof` | Upload (own path), read (own files via signed URL) |
| **Dealer** | `dealer-private-documents`, `contract-shield-input` | Upload (own path), read (own files via signed URL) |
| **Affiliate** | `public-affiliate-assets` | Upload (own path), read (own + public) |
| **Admin** | All buckets | Read (via signed URL), manage (workspace-scoped) |
| **Service Role** | All buckets | Full access for backend processing |

---

## 4. Upload Validation Rules

Every file upload must pass the following validations before storage:

### 4.1 Content-Type Validation

| Bucket | Allowed MIME Types |
|---|---|
| `buyer-private-documents` | `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| `dealer-private-documents` | `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `application/vnd.openxmlformats-officedocument.*` |
| `contract-shield-input` | `application/pdf` |
| `contract-shield-output` | `application/pdf`, `application/json` |
| `insurance-proof` | `application/pdf`, `image/jpeg`, `image/png` |
| `esign-archives` | `application/pdf` |
| `kyc-documents` | `application/pdf`, `image/jpeg`, `image/png` |
| `admin-secure-exports` | `application/pdf`, `text/csv`, `application/json` |
| `public-affiliate-assets` | `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`, `application/pdf` |
| `system-generated-artifacts` | `application/pdf`, `application/json`, `text/csv` |

### 4.2 File Size Limits

| Bucket | Max File Size |
|---|---|
| `buyer-private-documents` | 10 MB |
| `dealer-private-documents` | 25 MB |
| `contract-shield-input` | 50 MB |
| `contract-shield-output` | 25 MB |
| `insurance-proof` | 10 MB |
| `esign-archives` | 50 MB |
| `kyc-documents` | 10 MB |
| `admin-secure-exports` | 100 MB |
| `public-affiliate-assets` | 5 MB |
| `system-generated-artifacts` | 50 MB |

### 4.3 Extension Allowlist

Only files with extensions matching the allowed MIME types are accepted. Executable files (`.exe`, `.bat`, `.sh`, `.cmd`, `.ps1`, `.msi`, `.dll`, `.so`) are always rejected.

---

## 5. Security Requirements

### 5.1 Hash Generation

Every uploaded file must have a SHA-256 hash computed and stored in the corresponding database record.

### 5.2 Malware Scanning

All uploads to sensitive buckets must be queued for malware scanning:

| Status | Description |
|---|---|
| `PENDING` | Awaiting scan |
| `CLEAN` | No threats detected |
| `INFECTED` | Threat detected — file quarantined |
| `ERROR` | Scan failed — manual review required |

Files with `INFECTED` status must be quarantined and the uploading user notified.

### 5.3 Immutable Legal Artifacts

Files in these buckets are treated as immutable legal records once finalized:

- `esign-archives`
- `contract-shield-output` (final scan results)
- `kyc-documents` (verified records)

Immutable files must not be overwritten or deleted. Version references are stored in the database.

---

## 6. Storage Metadata Contract

Every file stored in Supabase Storage must map to a database record with the following fields:

| Field | Type | Constraint | Description |
|---|---|---|---|
| `id` | `uuid` | PK | Record identifier |
| `workspaceId` | `uuid` | NOT NULL | Workspace scope |
| `bucket` | `String` | NOT NULL | Bucket name |
| `path` | `String` | NOT NULL | Full storage path |
| `originalFilename` | `String` | NOT NULL | Original upload filename |
| `mimeType` | `String` | NOT NULL | Validated MIME type |
| `byteSize` | `Int` | NOT NULL | File size in bytes |
| `sha256` | `String` | NOT NULL | SHA-256 hash |
| `uploadedBy` | `uuid` | NOT NULL | FK → `User.id` |
| `entityType` | `String` | NOT NULL | Related entity type (e.g., `DEAL`, `BUYER`, `DEALER`) |
| `entityId` | `uuid` | NOT NULL | Related entity ID |
| `retentionClass` | `String` | NOT NULL | Retention policy class |
| `isLegalRecord` | `Boolean` | NOT NULL, default `false` | Whether file is a legal record |
| `virusScanStatus` | `String` | NOT NULL, default `PENDING` | `PENDING`, `CLEAN`, `INFECTED`, `ERROR` |
| `createdAt` | `DateTime` | NOT NULL | Upload timestamp |
| `updatedAt` | `DateTime` | NOT NULL | Last update |

---

## 7. Retention by Bucket

| Bucket | Retention Class | Duration |
|---|---|---|
| `buyer-private-documents` | `COMPLIANCE_2Y` | 2 years |
| `dealer-private-documents` | `COMPLIANCE_2Y` | 2 years |
| `contract-shield-input` | `CONTRACT_10Y` | 10 years |
| `contract-shield-output` | `CONTRACT_10Y` | 10 years |
| `insurance-proof` | `FINANCIAL_7Y` | 7 years |
| `esign-archives` | `CONTRACT_10Y` | 10 years |
| `kyc-documents` | `FINANCIAL_7Y` | 7 years |
| `admin-secure-exports` | `SHORT_OPS` | 90 days |
| `public-affiliate-assets` | `COMPLIANCE_2Y` | 2 years |
| `system-generated-artifacts` | `SHORT_OPS` | 90 days |

---

## 8. Verification Checklist

- [ ] All 10 buckets are created in Supabase
- [ ] Private buckets are configured with no public access
- [ ] Signed URL generation is restricted to service-role backend
- [ ] URL TTLs are configured per bucket
- [ ] Path convention follows `workspace/{workspace_id}/...` pattern
- [ ] Content-type validation is enforced on upload
- [ ] File size limits are enforced per bucket
- [ ] Extension allowlist rejects executables
- [ ] SHA-256 hash is computed and stored for every upload
- [ ] Malware scanning hook is configured for sensitive buckets
- [ ] Immutable legal artifacts cannot be overwritten
- [ ] Storage metadata records are created for all uploads
- [ ] Retention classes are assigned per bucket
- [ ] Role-based access policies are enforced
- [ ] `public-affiliate-assets` allows public read, restricted write
