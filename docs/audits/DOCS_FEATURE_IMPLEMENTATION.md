# Deal Documents Feature — Implementation Guide

## Overview

The Deal Documents feature provides a complete document management workflow for buyers, dealers, and admins within the AutoLenis platform.

## Database Models

### DealDocument
General-purpose document storage for buyer uploads.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| ownerUserId | String | User who uploaded the document |
| dealId | String? | Associated deal (nullable for general docs) |
| type | String | ID, INSURANCE_PROOF, PAY_STUB, BANK_STATEMENT, TRADE_IN_TITLE, OTHER |
| fileName | String | Original filename |
| mimeType | String? | MIME type |
| fileSize | Int? | File size in bytes |
| fileUrl | String | URL to the stored file |
| status | DocumentStatus | UPLOADED, PENDING_REVIEW, APPROVED, REJECTED |
| rejectionReason | String? | Reason for rejection |
| requestId | String? | Link to DocumentRequest if satisfying a request |

### DocumentRequest
Workflow model for Dealer/Admin to request required documents from Buyer.

| Field | Type | Description |
|-------|------|-------------|
| id | String (cuid) | Primary key |
| dealId | String | Associated deal |
| buyerId | String | Target buyer user ID |
| requestedByUserId | String | Who created the request |
| requestedByRole | String | DEALER or ADMIN |
| type | String | Document type requested |
| required | Boolean | Whether the document is required |
| notes | String? | Instructions for the buyer |
| dueDate | DateTime? | Optional deadline |
| status | DocumentRequestStatus | REQUESTED, UPLOADED, APPROVED, REJECTED |
| decidedByUserId | String? | Who approved/rejected |
| decidedByRole | String? | Role of approver |
| decisionNotes | String? | Notes from decision |
| decidedAt | DateTime? | When decision was made |

## API Routes

### Canonical (role-agnostic with role checks)
| Method | Route | Description | Roles |
|--------|-------|-------------|-------|
| GET | `/api/documents` | List documents (role-filtered) | BUYER, DEALER, ADMIN |
| POST | `/api/documents` | Upload a document | BUYER |
| GET | `/api/documents/[documentId]` | Get single document | BUYER, DEALER, ADMIN |
| PATCH | `/api/documents/[documentId]` | Approve/reject document | DEALER, ADMIN |
| GET | `/api/document-requests` | List requests (role-filtered) | BUYER, DEALER, ADMIN |
| POST | `/api/document-requests` | Create a request | DEALER, ADMIN |
| GET | `/api/document-requests/[requestId]` | Get single request | BUYER, DEALER, ADMIN |
| PATCH | `/api/document-requests/[requestId]` | Approve/reject request | DEALER, ADMIN |

### Role-specific (reuse canonical logic)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/admin/documents` | Admin document list |
| GET | `/api/dealer/documents` | Dealer deal-scoped document list |

## Pages

| Route | Role | Features |
|-------|------|----------|
| `/buyer/documents` | BUYER | View docs, upload, see requests, satisfy requests |
| `/dealer/documents` | DEALER | View buyer docs, create requests, approve/reject |
| `/admin/documents` | ADMIN | View all docs, create requests, approve/reject, stats |
| `/dealer/documents/[documentId]` | DEALER | Document detail (existing) |

## Permission Model

### Access Rules
- **Buyer**: Can view/upload their own documents only
- **Dealer**: Can view buyer documents only for deals they are associated with (via `SelectedDeal.dealerId`)
- **Admin**: Can view all documents

### Enforcement Layers
1. **UI level**: Pages wrapped in ProtectedRoute/role checks
2. **API level**: `getSessionUser()` + role validation in every route handler
3. **DB query level**: Scoped filters (e.g., `eq("ownerUserId", user.userId)` for buyers)

## Document Request Workflow

```
Dealer/Admin creates request → REQUESTED
    ↓
Buyer uploads document → UPLOADED
    ↓
Dealer/Admin reviews → APPROVED or REJECTED (with reason)
```

### Notifications (via emailService)
- Buyer notified when a request is created
- Buyer notified when document is approved/rejected

## Email Templates
Uses `emailService.sendNotification()` generic template for:
- Document request created
- Document approved/rejected
