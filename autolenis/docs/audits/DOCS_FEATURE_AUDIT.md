# Deal Documents Feature — Repo Audit

## Current Pages/Routes

### Buyer
| Route | Status | Notes |
|-------|--------|-------|
| `/buyer/documents` | Exists | Mock data, upload triggers NotImplementedModal |

### Dealer
| Route | Status | Notes |
|-------|--------|-------|
| `/dealer/documents` | Exists | Mock data, upload triggers NotImplementedModal |
| `/dealer/documents/[documentId]` | Exists | Static placeholder detail page |

### Admin
| Route | Status | Notes |
|-------|--------|-------|
| `/admin/documents` | Exists | Fetches from `/api/admin/documents` (returns empty []) |

### API Routes
| Route | Method | Status |
|-------|--------|--------|
| `/api/admin/documents` | GET | Stub — returns `{ success: true, data: [] }` |
| `/api/dealer/documents` | GET | Stub — returns `{ success: true, data: [] }` |
| `/api/contract/upload` | POST | Stub — DEALER only, no actual upload logic |

## DB Models Involved

### ContractDocument (existing)
- Fields: id, dealId, dealerId, documentUrl, documentType, version, uploadedAt
- Relations: SelectedDeal, Dealer, ContractShieldScan
- Purpose: Dealer contract uploads for Contract Shield scanning

### Missing Models
- **DealDocument** — General-purpose document storage for buyer uploads (ID, insurance proof, pay stubs, etc.)
- **DocumentRequest** — Workflow model for Dealer/Admin to request required documents from Buyer

## Storage Approach
- **Supabase** is the primary storage/DB backend (service role client in `lib/db.ts`)
- Prisma schema defines structure but Supabase client is used for queries
- File URLs stored in DB columns (e.g., `ContractDocument.documentUrl`, `InsurancePolicy.documentUrl`)
- File upload convention: store URL/key in DB field

## Auth/Role Utilities
- `lib/auth-server.ts` → `getSessionUser()`, `requireAuth(allowedRoles?)`, `getCurrentUser()`
- `lib/auth.ts` → JWT session creation/verification, `SessionUser` type
- `lib/auth-edge.ts` → Edge-compatible session verification (middleware)
- `middleware.ts` → Role-based route protection (BUYER→/buyer/*, DEALER→/dealer/*, ADMIN→/admin/*)
- `UserRole` enum: BUYER, DEALER, ADMIN, AFFILIATE
- `components/layout/protected-route.tsx` → Client-side role guard

## Email Infrastructure
- `lib/services/email.service.tsx` → EmailService class with Resend/Mock providers
- `emailService.sendNotification(email, subject, message, ctaText?, ctaUrl?)` — generic template
- Singleton exported as `emailService`

## Source of Truth
- Prisma schema (`prisma/schema.prisma`) is the canonical schema definition
- Supabase client (`lib/db.ts`) is the runtime query layer
- API routes use `getSessionUser()` for auth checks
- All pages fetched client-side via SWR or useEffect + fetch
