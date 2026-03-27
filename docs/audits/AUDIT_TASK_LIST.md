# AutoLenis - Developer Task List
**Priority-Ordered Fixes for Production Readiness**

---

## 🔴 P0: CRITICAL - BUILD BLOCKERS (Must Fix First)

### Task 1: Fix SessionUser Interface
- **Priority:** P0
- **Effort:** 2 hours
- **Files:** `lib/auth.ts` + 115 API routes
- **Acceptance Criteria:**
  - [ ] SessionUser interface includes all required properties (id, userId, firstName, lastName, first_name, last_name)
  - [ ] All API routes using session.user compile without TS2339 errors
  - [ ] No breaking changes to existing auth flow

**Implementation:**
```typescript
// lib/auth.ts
export interface SessionUser {
  id: string
  userId: string  // Keep for backwards compat
  email: string
  role: UserRole
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  is_affiliate?: boolean
  is_email_verified?: boolean
}
```

---

### Task 2: Fix Environment Variable Access
- **Priority:** P0
- **Effort:** 1 hour
- **Files:** 187 occurrences across app/api and lib
- **Acceptance Criteria:**
  - [ ] All TS4111 errors resolved
  - [ ] Build compiles without env var errors
  - [ ] No runtime errors from env access

**Implementation:**
```bash
# Run mass find-replace
find app/api lib -type f -name "*.ts" -exec sed -i 's/process\.env\.\([A-Z_]*\)/process.env[""]/g' {} \;
```

**Manual Review Required:**
- app/api/admin/health/route.ts
- app/api/auth/diagnostics/route.ts
- app/api/auth/health/route.ts

---

### Task 3: Fix Supabase Client Promise Resolution
- **Priority:** P0
- **Effort:** 2 hours
- **Files:** 7 buyer API routes
- **Acceptance Criteria:**
  - [ ] All supabase.from() calls work correctly
  - [ ] No TS2339 "Property 'from' does not exist" errors
  - [ ] Buyer auction and billing flows functional

**Files to Fix:**
1. app/api/buyer/auction/decline/route.ts
2. app/api/buyer/billing/route.ts
3. app/api/buyer/deal/complete/route.ts
4. app/api/buyer/deal/route.ts
5. app/api/buyer/deal/select/route.ts
6. app/api/buyer/shortlist/items/[shortlistItemId]/primary/route.ts
7. app/api/buyer/shortlist/items/[shortlistItemId]/route.ts

**Pattern:**
```typescript
// BEFORE
const supabase = createClient(...)  // Returns Promise
const result = supabase.from('table')  // ERROR

// AFTER
const supabase = await createClient(...)
const result = supabase.from('table')  // OK
```

---

### Task 4: Install and Configure ESLint
- **Priority:** P0
- **Effort:** 1 hour
- **Files:** package.json, eslint.config.mjs (new)
- **Acceptance Criteria:**
  - [ ] `pnpm run lint` executes successfully
  - [ ] ESLint config follows Next.js best practices
  - [ ] Auto-fixable issues resolved

**Implementation:**
```bash
pnpm add -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin eslint-config-next @eslint/eslintrc
```

Create `eslint.config.mjs`:
```javascript
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    }
  }
];

export default eslintConfig;
```

---

### Task 5: Fix NextAuth Configuration
- **Priority:** P0
- **Effort:** 10 minutes
- **Files:** app/api/auth/[...nextauth]/route.ts
- **Acceptance Criteria:**
  - [ ] No TS2353 error on pages config
  - [ ] Auth flow functional
  - [ ] Signin redirects work correctly

**Implementation:**
```typescript
// Line 56 - REMOVE signUp
pages: {
  signIn: "/auth/signin",
  // signUp: "/auth/signup",  // NOT VALID - remove this
}
```

---

### Task 6: Add Missing AlertCircle Import
- **Priority:** P0
- **Effort:** 5 minutes
- **Files:** app/affiliate/payouts/[payoutId]/page.tsx
- **Acceptance Criteria:**
  - [ ] Page compiles without TS2304 error
  - [ ] Error state displays correctly

**Implementation:**
```typescript
// Line 7 - Add AlertCircle
import { DollarSign, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react"
```

---

### Task 7: Remove Unused Imports
- **Priority:** P0
- **Effort:** 1 hour
- **Files:** 121 files with TS6133 errors
- **Acceptance Criteria:**
  - [ ] All unused import warnings resolved
  - [ ] No breaking changes from removals
  - [ ] Build size reduced

**Implementation:**
```bash
# Auto-fix with ESLint
pnpm run lint -- --fix

# Manual cleanup for:
# - app/admin/reports/finance/page.tsx (Badge, TrendingUp, TrendingDown)
# - app/admin/reports/funnel/page.tsx (TrendingDown)
# - app/admin/reports/page.tsx (BarChart3, Users)
# - app/affiliate/earnings/page.tsx (TrendingUp, Award)
```

---

### Task 8: Add Null Safety Checks
- **Priority:** P0
- **Effort:** 3 hours
- **Files:** 138 TS18048 errors
- **Acceptance Criteria:**
  - [ ] No "possibly undefined" errors
  - [ ] Proper error handling added
  - [ ] User-friendly error messages

**Priority Files:**
1. app/api/auth/reset-password/route.ts
2. app/api/dealer/inventory/bulk-upload/route.ts
3. app/api/payments/create-checkout/route.ts
4. lib/services/best-price.service.ts

**Pattern:**
```typescript
// BEFORE
const result = await someAsyncFunc()
result.property  // ERROR: possibly undefined

// AFTER
const result = await someAsyncFunc()
if (!result) {
  return NextResponse.json({ error: "Not found" }, { status: 404 })
}
return NextResponse.json({ data: result.property })
```

---

### Task 9: Create Error and Not-Found Pages
- **Priority:** P0
- **Effort:** 2 hours
- **Files:** 6 new files
- **Acceptance Criteria:**
  - [ ] Root error.tsx handles global errors
  - [ ] Root not-found.tsx handles 404s
  - [ ] Dashboard-specific error pages exist
  - [ ] Error pages match brand styling

**Files to Create:**
1. app/error.tsx
2. app/not-found.tsx
3. app/buyer/error.tsx
4. app/dealer/error.tsx
5. app/admin/error.tsx
6. app/affiliate/error.tsx

---

### Task 10: Fix Unused Variable Warnings in API Routes
- **Priority:** P0
- **Effort:** 30 minutes
- **Files:** 20+ API routes
- **Acceptance Criteria:**
  - [ ] No TS6133 warnings for unused parameters
  - [ ] Code cleanliness improved

**Pattern:**
```typescript
// BEFORE
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // id unused - warning!
  return NextResponse.json({ success: true })
}

// AFTER
export async function GET(request: Request) {
  // Removed unused params
  return NextResponse.json({ success: true })
}
```

---

## 🟠 P1: MAJOR - FUNCTIONALITY GAPS

### Task 11: Implement Missing AffiliateService Methods
- **Priority:** P1
- **Effort:** 4 hours
- **Files:** lib/services/affiliate.service.ts
- **Acceptance Criteria:**
  - [ ] trackReferral() implemented with Click tracking
  - [ ] completeDealReferral() calculates commissions
  - [ ] API routes calling these methods work
  - [ ] Tests pass

**Methods to Implement:**
1. `trackReferral(affiliateId, referredUserId, level)` - Create Referral record
2. `completeDealReferral(dealId, buyerId)` - Mark referral complete, create commission

---

### Task 12: Implement Missing PreQualService Methods
- **Priority:** P1
- **Effort:** 6 hours
- **Files:** lib/services/prequal.service.ts
- **Acceptance Criteria:**
  - [ ] startPreQual() creates PreQualification
  - [ ] refreshPreQual() updates existing
  - [ ] getBuyerProfile() returns profile data
  - [ ] updateBuyerProfile() saves changes
  - [ ] Buyer pre-qual flow functional

**Methods to Implement:**
1. `startPreQual(buyerId, data)` - Create PreQualification
2. `refreshPreQual(buyerId)` - Refresh soft pull
3. `getBuyerProfile(userId)` - Get BuyerProfile
4. `updateBuyerProfile(userId, data)` - Update profile

---

### Task 13: Implement Missing InsuranceService Methods
- **Priority:** P1
- **Effort:** 4 hours
- **Files:** lib/services/insurance.service.ts
- **Acceptance Criteria:**
  - [ ] getQuotes() returns insurance quotes for deal
  - [ ] selectPolicy() creates InsurancePolicy
  - [ ] Insurance flow functional in buyer deal
  - [ ] Third-party API integration works (if applicable)

**Methods to Implement:**
1. `getQuotes(dealId)` - Fetch or generate quotes
2. `selectPolicy(dealId, quoteId)` - Bind selected policy

---

### Task 14: Implement All Missing EmailService Methods
- **Priority:** P1
- **Effort:** 8 hours (1 hour per email)
- **Files:** lib/services/email.service.tsx
- **Acceptance Criteria:**
  - [ ] All 8 email templates designed
  - [ ] Email sending works via Resend
  - [ ] Emails render correctly in previews
  - [ ] Unsubscribe links included

**Methods to Implement:**
1. sendWelcomeEmail(to, name)
2. sendAuctionStartedEmail(to, auctionId)
3. sendNewOfferEmail(to, offer)
4. sendAuctionWonEmail(to, auction)
5. sendContractShieldEmail(to, scanResults)
6. sendPaymentConfirmationEmail(to, payment)
7. sendDealCompleteEmail(to, deal)
8. sendReferralCommissionEmail(to, commission)

---

### Task 15: Implement ContractShieldService.uploadContract
- **Priority:** P1
- **Effort:** 3 hours
- **Files:** lib/services/contract-shield.service.ts
- **Acceptance Criteria:**
  - [ ] File upload to S3/storage
  - [ ] ContractDocument created in DB
  - [ ] Scan triggered automatically
  - [ ] API route functional

---

### Task 16: Implement ESignService.getEnvelopeStatus
- **Priority:** P1
- **Effort:** 2 hours
- **Files:** lib/services/esign.service.ts
- **Acceptance Criteria:**
  - [ ] Fetches status from DocuSign/HelloSign API
  - [ ] Returns ESignStatus enum
  - [ ] Handles API errors gracefully

---

### Task 17: Fix TODO in Dealer Offers Page
- **Priority:** P1
- **Effort:** 30 minutes
- **Files:** app/dealer/offers/new/page.tsx
- **Acceptance Criteria:**
  - [ ] requestId extracted from URL params
  - [ ] Redirects if requestId missing
  - [ ] Offer creation works

**Implementation:**
```typescript
const searchParams = useSearchParams()
const requestId = searchParams.get('requestId')

if (!requestId) {
  redirect('/dealer/requests')
}
```

---

## 🟡 P2: UX - REPLACE NOT IMPLEMENTED MODALS

### Task 18: Implement Buyer Offer Actions
- **Priority:** P2
- **Effort:** 6 hours
- **Files:** app/buyer/offers/[offerId]/page.tsx, /api/buyer/offers/[offerId]/*
- **Acceptance Criteria:**
  - [ ] Accept offer creates SelectedDeal
  - [ ] Negotiate offer opens modal with counter-offer form
  - [ ] Decline offer updates status
  - [ ] User redirected to deal flow on accept

**API Routes to Create:**
- POST /api/buyer/offers/[offerId]/accept
- POST /api/buyer/offers/[offerId]/negotiate
- POST /api/buyer/offers/[offerId]/decline

---

### Task 19: Implement Dealer Offer Actions
- **Priority:** P2
- **Effort:** 4 hours
- **Files:** app/dealer/offers/[offerId]/page.tsx
- **Acceptance Criteria:**
  - [ ] Edit offer updates AuctionOffer
  - [ ] Withdraw offer sets status to WITHDRAWN
  - [ ] Optimistic UI updates

**API Routes to Create:**
- PUT /api/dealer/offers/[offerId]
- POST /api/dealer/offers/[offerId]/withdraw

---

### Task 20: Implement Profile Update
- **Priority:** P2
- **Effort:** 3 hours
- **Files:** app/dealer/profile/page.tsx, app/buyer/profile/page.tsx
- **Acceptance Criteria:**
  - [ ] Dealer profile save persists to DB
  - [ ] Buyer profile save persists to DB
  - [ ] Form validation on client and server
  - [ ] Success message shown

---

### Task 21: Implement Document Upload
- **Priority:** P2
- **Effort:** 6 hours
- **Files:** app/buyer/documents/page.tsx, app/dealer/documents/page.tsx
- **Acceptance Criteria:**
  - [ ] File upload to S3/Cloudflare R2
  - [ ] Multiple file types supported (PDF, JPG, PNG)
  - [ ] File size validation (max 10MB)
  - [ ] Document list refreshes after upload
  - [ ] Download links functional

---

### Task 22: Implement Messaging System
- **Priority:** P2
- **Effort:** 12 hours
- **Files:** app/buyer/messages/*, app/dealer/messages/*
- **Acceptance Criteria:**
  - [ ] Message thread UI functional
  - [ ] Send message API route works
  - [ ] Messages persist to database (new MessageThread, Message models)
  - [ ] Real-time updates (optional: Pusher/Ably)
  - [ ] Unread count badge

**DB Models to Add:**
```prisma
model MessageThread {
  id String @id @default(cuid())
  buyerId String?
  dealerId String?
  subject String
  messages Message[]
  createdAt DateTime @default(now())
}

model Message {
  id String @id @default(cuid())
  threadId String
  thread MessageThread @relation(fields: [threadId], references: [id])
  senderId String
  senderRole UserRole
  content String @db.Text
  createdAt DateTime @default(now())
}
```

---

### Task 23: Implement Lead Detail Actions
- **Priority:** P2
- **Effort:** 4 hours
- **Files:** app/dealer/leads/[leadId]/page.tsx
- **Acceptance Criteria:**
  - [ ] Contact lead button sends email
  - [ ] Archive lead button updates status
  - [ ] Add notes saves to database
  - [ ] Lead status updates reflected

---

## 🔵 P3: SECURITY HARDENING

### Task 24: Add Rate Limiting to Auth Endpoints
- **Priority:** P3
- **Effort:** 2 hours
- **Files:** middleware.ts, app/api/auth/*
- **Acceptance Criteria:**
  - [ ] Max 5 login attempts per IP per 15 minutes
  - [ ] Max 3 signup attempts per IP per hour
  - [ ] Max 5 password reset requests per IP per hour
  - [ ] 429 status returned when rate limit exceeded

**Implementation:**
```bash
pnpm add @upstash/ratelimit @upstash/redis
```

---

### Task 25: Configure CORS
- **Priority:** P3
- **Effort:** 1 hour
- **Files:** middleware.ts
- **Acceptance Criteria:**
  - [ ] CORS headers set on API routes
  - [ ] Allowed origins from env var
  - [ ] Preflight requests handled

---

### Task 26: Add Admin Action Audit Logging
- **Priority:** P3
- **Effort:** 4 hours
- **Files:** app/api/admin/*, app/admin/audit-logs/page.tsx
- **Acceptance Criteria:**
  - [ ] All admin mutations logged to ComplianceEvent
  - [ ] Audit log UI shows admin actions
  - [ ] Searchable by user, date, action type

---

### Task 27: Add Error Tracking (Sentry)
- **Priority:** P3
- **Effort:** 2 hours
- **Files:** app/error.tsx, instrumentation.ts
- **Acceptance Criteria:**
  - [ ] Sentry configured in production
  - [ ] Errors automatically reported
  - [ ] Source maps uploaded
  - [ ] User context included

---

### Task 28: Create .env.example
- **Priority:** P3
- **Effort:** 1 hour
- **Files:** .env.example
- **Acceptance Criteria:**
  - [ ] All env vars documented
  - [ ] Example values provided
  - [ ] Setup instructions in README

---

## 🟢 P4: POLISH & OPTIMIZATION

### Task 29: Add Input Validation (Zod)
- **Priority:** P4
- **Effort:** 8 hours
- **Files:** All API routes
- **Acceptance Criteria:**
  - [ ] Zod schemas for all POST/PUT request bodies
  - [ ] Client-side form validation with react-hook-form
  - [ ] Error messages user-friendly

---

### Task 30: Mobile Responsive Testing
- **Priority:** P4
- **Effort:** 6 hours
- **Files:** All pages
- **Acceptance Criteria:**
  - [ ] All pages tested on 390px, 768px, 1024px
  - [ ] Tables scroll horizontally on mobile
  - [ ] Forms usable on mobile
  - [ ] Touch targets minimum 44x44px

---

### Task 31: Performance Optimization
- **Priority:** P4
- **Effort:** 4 hours
- **Files:** next.config.mjs, components
- **Acceptance Criteria:**
  - [ ] Code splitting enabled
  - [ ] Images optimized
  - [ ] Lighthouse score > 90
  - [ ] Bundle size < 500KB gzipped

---

### Task 32: Add Analytics
- **Priority:** P4
- **Effort:** 3 hours
- **Files:** app/layout.tsx
- **Acceptance Criteria:**
  - [ ] PostHog or GA4 integrated
  - [ ] Key events tracked (signup, deal created, etc.)
  - [ ] Conversion funnels set up

---

### Task 33: Documentation
- **Priority:** P4
- **Effort:** 6 hours
- **Files:** docs/*, README.md
- **Acceptance Criteria:**
  - [ ] API documentation complete
  - [ ] Deployment guide written
  - [ ] User guides for each role
  - [ ] Developer onboarding doc

---

## Summary

**Total Tasks:** 33  
**Total Estimated Effort:** 109 hours (~3 weeks)

### By Priority:
- **P0 (Critical):** 10 tasks, ~13 hours
- **P1 (Major):** 7 tasks, ~28 hours
- **P2 (UX):** 6 tasks, ~35 hours
- **P3 (Security):** 5 tasks, ~10 hours
- **P4 (Polish):** 5 tasks, ~27 hours

### Execution Order:
1. **Week 1:** Tasks 1-10 + 11-17 (P0 + P1)
2. **Week 2:** Tasks 18-23 + 24-28 (P2 + P3)
3. **Week 3:** Tasks 29-33 (P4)

---

**READY TO START DEVELOPMENT**
