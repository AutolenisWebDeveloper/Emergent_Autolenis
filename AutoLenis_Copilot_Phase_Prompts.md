# AutoLenis — Production Readiness: GitHub Copilot Phase Prompts
**Version:** 1.0 | **Date:** March 2026
**Purpose:** Paste each phase prompt directly into GitHub Copilot Chat (@workspace). Complete phases in order. Do not skip. Do not combine.

---

## HOW TO USE THESE PROMPTS

1. Open your AutoLenis repository in VS Code
2. Open GitHub Copilot Chat (Ctrl+Shift+I / Cmd+Shift+I)
3. Paste the Phase prompt exactly as written
4. Wait for Copilot to complete its full inspection and report
5. Fix every blocker it identifies before moving to the next phase
6. Re-run the same phase prompt to confirm all blockers are resolved
7. Only then proceed to the next phase

**Never proceed to Phase N+1 until Phase N reports zero blockers.**

---

---

# PHASE 1 PROMPT — Environment & Infrastructure Audit

Paste this entire block into Copilot Chat:

---

```
@workspace You are performing a production readiness audit for the AutoLenis platform. This is Phase 1: Environment and Infrastructure. Do not make assumptions. Inspect actual files.

TASK: Audit all environment variable definitions, configuration files, and infrastructure settings to confirm the platform is correctly configured for live production operation.

STEP 1 — Environment Variable Discovery
Search the codebase for all environment variable references:
- Scan all files under lib/, app/, and the root for process.env.* references
- Scan any .env.example, .env.template, env.d.ts, or environment type definition files
- Build a complete list of every unique environment variable the codebase references
- For each variable, identify: (a) where it is referenced, (b) what it controls, (c) whether it has a fallback or default

Report the complete list. Do not summarize — list every variable.

STEP 2 — Production Risk Classification
For each discovered variable, classify it:
- CRITICAL: if missing or wrong, live transactions fail silently (payments, auth, email, credit pull, e-sign)
- HIGH: if missing or wrong, a major feature fails or returns errors
- MEDIUM: if missing or wrong, a non-critical feature degrades
- LOW: cosmetic or non-functional impact

Pay special attention to:
- Any variable that controls LIVE vs SANDBOX/TEST mode (Stripe keys, DocuSign base URL, MicroBilt base URL)
- PREQUAL_ENCRYPTION_KEY — must be correct length for AES-256-GCM (32 bytes / 256 bits)
- NEXT_PUBLIC_APP_URL — must be set to https://autolenis.com in production
- NODE_ENV — must be production

STEP 3 — Workspace Mode Audit
Find lib/app-mode.ts. Read it completely.
- Identify the WorkspaceMode enum values
- Identify the isTestWorkspace() function logic
- Identify every place in the codebase where isTestWorkspace() or WorkspaceMode is checked
- For each branch: what does TEST mode return vs LIVE mode?
- Flag any route or service where TEST mode returns mock/stub data that LIVE mode does not

STEP 4 — Vercel Configuration Audit
Find vercel.json. Read it completely.
- List all cron job definitions: route, schedule, and what service it triggers
- Confirm the cron routes exist in app/api/ and are not 404
- Identify whether cron routes have auth protection (they must reject unauthenticated calls)
- List any build configuration, redirects, or headers defined

STEP 5 — Middleware / Proxy Audit
Find proxy.ts (the active middleware, 350 lines). Read it completely.
- Confirm CSRF protection is active
- Confirm Supabase token refresh logic is present
- Confirm role-based routing is enforced
- Confirm ?ref= affiliate parameter capture is present and sets a 30-day httpOnly cookie
- Check if middleware.ts.bak or middleware.ts.txt exist — these are stale backups and should be flagged

STEP 6 — Database Configuration
Find the Prisma schema (prisma/schema.prisma — 4,725 lines). Do not read every line, but confirm:
- DATABASE_URL is the connection string source (not hardcoded)
- The schema has a generator and datasource block
- Key models exist: User, PrequalApplication, Deal, Auction, Offer, AffiliatePayout, ComplianceEvent

REQUIRED OUTPUT FORMAT:
Report must include:
A) Complete environment variable list with risk classification
B) Workspace mode branch map — what changes between TEST and LIVE
C) Cron job inventory — all 6 jobs, routes confirmed to exist, auth status
D) Middleware confirmed capabilities (CSRF, role routing, affiliate capture)
E) BLOCKERS — list every configuration issue that must be resolved before launch, ordered by severity
F) WARNINGS — list every medium/low risk item
G) PASS/FAIL verdict for Phase 1

Do not mark Phase 1 as PASS unless: all CRITICAL variables are accounted for, workspace mode is correctly branched, all 6 cron jobs exist and are protected, and middleware is fully operational.
```

---

---

# PHASE 2 PROMPT — Third-Party Integration Code Verification

Paste this entire block into Copilot Chat:

---

```
@workspace You are performing a production readiness audit for the AutoLenis platform. This is Phase 2: Third-Party Integration Code Verification. Do not make assumptions. Read the actual integration files.

TASK: Verify that every third-party integration is correctly implemented in code — correctly authenticated, correctly calling production endpoints, correctly handling responses and errors, and correctly wired into the service layer.

STEP 1 — Stripe Integration Audit
Find all Stripe-related files. Start with:
- Any file in lib/ containing Stripe references
- /api/webhooks/stripe (or similar webhook handler)
- Stripe Embedded Checkout usage (search for EmbeddedCheckout or stripe.confirmPayment)

For each, verify:
- Stripe client is initialized using STRIPE_SECRET_KEY (not hardcoded)
- DEPOSIT_AMOUNT_CENTS = 9900 is the source of truth for the $99 deposit (not hardcoded as 9900 inline)
- PREMIUM_FEE_CENTS = 49900 is the source of truth for the $499 fee
- Webhook handler at /api/webhooks/stripe: reads stripe-signature header, calls stripe.webhooks.constructEvent(), rejects invalid signatures with 400
- checkout.session.completed event is handled and updates the correct DB record
- Idempotency: show how duplicate webhook events are prevented (ComplianceEvent unique constraint or equivalent)
- Refund route: confirm it checks that the requesting user owns the payment being refunded

STEP 2 — DocuSign Integration Audit
Find lib/services/docusign/ — should contain 6 files: auth, envelope, template, recipient-view, webhook, and one more.
Read each file. For each, verify:
- auth.ts: uses JWT auth (not legacy auth), reads DOCUSIGN_PRIVATE_KEY, DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID
- DOCUSIGN_BASE_URL is read from environment (not hardcoded to demo.docusign.net — that would be sandbox)
- envelope.ts: creates envelope with correct document and recipient structure
- recipient-view.ts: generates recipient view URL bound to the correct envelope
- webhook handler: receives envelope status updates, verifies authenticity, updates deal state
- Void operation: envelope can be voided when deal is cancelled

STEP 3 — Resend Email Integration Audit
Find email.service.tsx (should be ~70,678 bytes — the largest file in the codebase).
Verify:
- Resend client initialized with RESEND_API_KEY
- EMAIL_FROM is read from environment
- EmailSendLog pattern: confirm idempotency — the service checks if an email for a given event/recipient has already been sent before sending again
- List all 17 email templates defined in this file
- Confirm each template has: correct recipient routing, correct subject, correct content type

STEP 4 — MicroBilt Integration Audit
Find lib/microbilt/. Verify:
- OAuth2 token acquisition: reads MICROBILT_CLIENT_ID and MICROBILT_CLIENT_SECRET, calls token endpoint
- HMAC-SHA256 request signing: implemented correctly (not just present — read the signing logic)
- MICROBILT_BASE_URL is read from environment (not hardcoded to a sandbox URL)
- Response parsing: credit bureau data is correctly extracted and passed to the decision engine
- SSN handling: SSN is encrypted via AES-256-GCM using PREQUAL_ENCRYPTION_KEY BEFORE being written to the database — confirm the encryption happens before any Prisma write

STEP 5 — Decision Engine Audit
Find lib/decision/. Should contain: final-decision.ts, ipredict-scorer.ts, ibv-scorer.ts, shopping-power.ts
For each file, confirm:
- final-decision.ts: takes MicroBilt response + IBV data, produces PrequalDecision with maxOtdAmountCents
- shopping-power.ts: calculates affordability band from income, housing, down payment, credit tier
- The decision output is written to PrequalDecision and PreQualification models in DB
- The output sets maxOtdAmountCents which is later used by inventory search budget filtering

STEP 6 — Insurance Integration Audit
Find insurance-related service files (insurance.service.ts or similar provider adapter).
Verify:
- Provider adapter pattern is implemented (not hardcoded to a single provider)
- External proof upload path exists as a fallback when live quote API is unavailable
- InsuranceReadinessStatus transitions are defined and enforced
- Insurance completion does NOT gate auction creation (this is a critical product rule — confirm it is not in the auction creation guard logic)

STEP 7 — Webhook Security Summary
For every webhook endpoint in the codebase (/api/webhooks/stripe, /api/webhooks/docusign, /api/esign/webhook, any others):
- Confirm each verifies the incoming signature before processing
- Confirm each returns 400 for invalid signatures (not 200 — returning 200 on invalid signatures is a security vulnerability)
- Confirm each is idempotent

REQUIRED OUTPUT FORMAT:
A) Stripe: PASS/FAIL with specific findings per sub-check
B) DocuSign: PASS/FAIL with specific findings per sub-check — FLAG if DOCUSIGN_BASE_URL contains demo.docusign.net
C) Resend: PASS/FAIL — list all 17 email templates found, flag any missing
D) MicroBilt: PASS/FAIL — confirm SSN encryption happens BEFORE DB write
E) Decision Engine: PASS/FAIL — confirm maxOtdAmountCents is set in DB output
F) Insurance: PASS/FAIL — confirm insurance does NOT block auction
G) Webhook Security: list all webhook endpoints, PASS/FAIL per endpoint
H) BLOCKERS — everything that must be fixed before launch
I) Phase 2 PASS/FAIL verdict

Do not mark Phase 2 PASS unless all webhook signatures are verified, all base URLs are environment-sourced, SSN is encrypted before DB write, and insurance does not block auction.
```

---

---

# PHASE 3 PROMPT — Buyer Lifecycle Gate & State Machine Verification

Paste this entire block into Copilot Chat:

---

```
@workspace You are performing a production readiness audit for the AutoLenis platform. This is Phase 3: Buyer Lifecycle Gate and State Machine Verification. This is the most critical phase — it covers the revenue spine of the platform. Do not make assumptions. Read the actual service and route files.

TASK: Verify that every lifecycle gate, every state machine transition, and every API guard in the buyer journey is correctly implemented and enforced at the server side.

STEP 1 — PreQual Budget Guard (Gate 1)
Find /api/buyer/inventory/search/route.ts.
Read it completely. Confirm:
- Line ~55 (or wherever it appears): the route queries PreQualification.maxOtdAmountCents for the authenticated buyer
- When budgetOnly=true (or equivalent param), results are filtered to vehicles at or below maxOtdAmountCents
- If the buyer has no active PrequalDecision, the search either returns empty results or returns an error — it does not return unfiltered inventory
- The guard is enforced at the API level, not just the UI level

STEP 2 — Shortlist Guard (Gate 2)
Find shortlist.service.ts (~13,403 bytes).
Confirm:
- MAX_SHORTLIST_ITEMS = 5 is enforced — attempts to add a 6th item are rejected with a clear error
- Shortlist requires the buyer to have an active, non-expired PrequalDecision (or confirm the guard is upstream in the auction gate)
- Shortlist items are associated with the authenticated buyer only — no cross-buyer access

STEP 3 — Deposit Guard (Gate 3)
Find the auction creation route and auction.service.ts.
Read the auction creation logic. Confirm:
- Auction creation checks that the buyer's deposit is confirmed paid (not just initiated)
- Deposit confirmation comes from the Stripe webhook (checkout.session.completed), not from the client
- Auction is NOT created if deposit is not confirmed
- The service comment/logic explicitly states: "Insurance status MUST NOT block auction creation. Lender status MUST NOT block auction creation." — confirm this is present

STEP 4 — Deal State Machine (Core Revenue Flow)
Find deal.service.ts (~36,961 bytes) and the lib/services/deal/ subdirectory (7 files).
Map the complete state machine. Confirm these transitions exist and are enforced:
SELECTED → FINANCING_PENDING → FINANCING_APPROVED → FEE_PENDING → FEE_PAID
→ INSURANCE_PENDING → INSURANCE_COMPLETE → CONTRACT_PENDING → CONTRACT_REVIEW
→ CONTRACT_APPROVED → SIGNING_PENDING → SIGNED → PICKUP_SCHEDULED → COMPLETED

For each transition:
- Is it enforced server-side (not just tracked in UI)?
- Is the transition logged to the event ledger?
- Can a state be skipped? (It must not be possible to reach SIGNING_PENDING without CONTRACT_APPROVED)

STEP 5 — Contract Shield Gate (Critical Compliance Gate)
Find contract-shield.service.ts (~38,428 bytes) and the lib/services/deal/ subdirectory.
Confirm:
- PASS threshold: score ≥ 85 → CONTRACT_APPROVED
- WARNING threshold: score 70–84 → manual review queue populated
- FAIL threshold: score ≤ 69 → fix list generated, dealer notified, deal does NOT advance
- E-sign (SIGNING_PENDING) is unreachable without CONTRACT_APPROVED status — confirm this is a hard state machine constraint, not just a UI check
- Fix list is stored in DB and associated with the contract/deal
- Admin override path exists and is logged

STEP 6 — Best Price Engine Weights
Find best-price.service.ts (~29,108 bytes).
Confirm:
- Ranking weights are: OTD 35%, monthly payment 35%, vehicle quality/score 15%, dealer score 10%, junk fee penalty 5%
- Three outputs are generated: Best Cash, Best Monthly, Balanced
- These weights are configurable via admin (find the admin configuration route/setting)
- Decline-and-replace logic: when buyer declines all offers, a replacement candidate set is generated without breaking eligibility constraints

STEP 7 — Financing Choice Validation
Find the financing choice handler. Confirm:
- financingChoiceSchema (Zod) validates the enum: CASH | FINANCED | EXTERNAL_PREAPPROVAL
- Invalid financing types are rejected at the API level
- EXTERNAL_PREAPPROVAL path checks that an external preapproval document exists before allowing this selection
- The financing choice is stored in the Deal record

STEP 8 — Fee Handling Separation
Find the concierge fee handling routes/service.
Confirm:
- AutoLenis fee ($499) is clearly separated from dealer vehicle pricing in the data model
- The $99 deposit is credited against the $499 fee (resulting in $400 due for direct payment)
- Financed inclusion: loan impact calculator exists, disclosure acknowledgment is stored before fee is marked resolved
- Dealers do NOT receive or handle the AutoLenis concierge fee — confirm there is no route that sends fee payment to a dealer

STEP 9 — Pickup and QR Flow
Find pickup.service.ts (~20,858 bytes).
Confirm:
- QR code is generated using the qrcode package
- QR code is unique to the deal/appointment
- Dealer check-in route: reads QR data, confirms deal is in SIGNED state before allowing check-in
- Deal transitions to PICKUP_SCHEDULED → COMPLETED after check-in

STEP 10 — Event Ledger Coverage
Find the event ledger service/module. Confirm:
- At least 90 event types are defined
- Events are written for: prequal decisions, deposit payments, auction creation, offer submission, deal state transitions, contract shield results, e-sign completion, pickup completion, affiliate commission creation
- Idempotency: events have a unique constraint preventing duplicate entries for the same event

REQUIRED OUTPUT FORMAT:
A) Gate 1 (Budget Guard): PASS/FAIL — show the exact line/logic that enforces the filter
B) Gate 2 (Shortlist Max): PASS/FAIL — show MAX_SHORTLIST_ITEMS enforcement
C) Gate 3 (Deposit): PASS/FAIL — confirm auction cannot be created without confirmed deposit
D) State Machine: list all confirmed transitions, flag any gaps or skippable states
E) Contract Shield Gate: PASS/FAIL — confirm SIGNING_PENDING is unreachable without CONTRACT_APPROVED
F) Best Price Engine: PASS/FAIL — confirm weights match spec (OTD 35%, monthly 35%, vehicle 15%, dealer 10%, junk fee 5%)
G) Fee Separation: PASS/FAIL — confirm dealers cannot receive AutoLenis fee
H) BLOCKERS — any gate that is not properly enforced server-side
I) Phase 3 PASS/FAIL verdict

Do not mark Phase 3 PASS unless every gate is server-side enforced, CONTRACT_APPROVED is a hard prerequisite to SIGNING_PENDING, and fee separation is confirmed.
```

---

---

# PHASE 4 PROMPT — Portal Surface Verification (Dealer, Affiliate, Admin)

Paste this entire block into Copilot Chat:

---

```
@workspace You are performing a production readiness audit for the AutoLenis platform. This is Phase 4: Portal Surface Verification. Inspect actual files. Do not assume routes exist — confirm them.

TASK: Verify that the Dealer Portal (44 pages), Affiliate Portal (27 pages), and Admin Console (94 pages) are correctly implemented, wired, and protected.

STEP 1 — Route Inventory
Using the file system, list all page files under:
- app/dealer/ (expect ~44 pages)
- app/affiliate/ (expect ~27 pages)
- app/admin/ (expect ~94 pages)

For each portal, report the actual page count found. Flag any discrepancy from the expected counts.

STEP 2 — Dealer Portal Verification
Find and confirm each of the following exists and is properly implemented:

Onboarding:
- Dealer onboarding flow (4 pages)
- DocuSign dealer agreement integration (dealer-agreement.service.ts ~20,613 bytes)
- Admin approval workflow: dealer cannot access marketplace features until admin approves

Inventory Management:
- 7 inventory pages: list, detail, edit, add, bulk-upload, column-mapping, import-history
- 13 API routes under /api/dealer/inventory/ (or similar) — list them
- Bulk upload: file parsing, column mapping, import history stored

Auction Participation:
- Auction list, detail, invited, offers pages
- Structured offer submission: OTD amount, tax/fee breakdown JSON, financing options per offer
- Offer cannot be submitted without all required fields

Contract Upload and Remediation:
- GET/POST /api/dealer/contracts
- Contract upload stores document and triggers Contract Shield scan
- Dealer receives fix list and can re-upload corrected contract

Pickup:
- Schedule, check-in, complete, cancel pages and routes
- QR check-in route exists and validates deal state before confirming

Messaging:
- Thread-based messaging between buyer and dealer
- Dealer cannot message buyers outside their active deals

STEP 3 — Affiliate Portal Verification
Find and confirm:

Enrollment:
- Public affiliate enrollment page
- Auto-enrollment from buyer lifecycle (POST /api/buyer/referrals/activate or equivalent)
- Code generation: "AL" + 6 random chars — confirm the format in code

Attribution:
- proxy.ts captures ?ref= param — already confirmed in Phase 1, cross-reference here
- 30-day httpOnly cookie is set
- First-click attribution: if a buyer already has a referral cookie, a second ?ref= param does NOT overwrite it

Commission Structure:
- Find the MLM tree walk logic
- Confirm: Level 1 = 15%, Level 2 = 3%, Level 3 = 2% (total 20%)
- Confirm: only 3 levels — no Level 4 or Level 5
- Self-referral fraud control: buyer cannot be their own affiliate

Payouts:
- Payout list and detail pages exist
- Payout trigger requires admin role (affiliate cannot self-trigger)
- Payout creates Stripe transfer to affiliate's connected account

Dashboard:
- Dashboard page exists (~31 KB — confirm approximate size)
- Shows: referral count, conversion count, commission earned, payout history

STEP 4 — Admin Console Verification
Find and confirm:

Authentication:
- Admin auth is in lib/admin-auth.ts (~597 lines — confirm approximate size)
- TOTP MFA is implemented (not just referenced — find the TOTP verification logic)
- Recovery codes are generated and stored (hashed) at MFA setup
- Rate limiting on admin login: find the rate limiter logic
- Admin sessions are stored in DB (not just JWT) — find the session creation/validation logic

Review Queues and Overrides:
- 7 manual review action routes exist — list them (they handle prequal CMA decisions)
- Contract Shield override route exists and requires admin role
- E-sign void route exists and requires admin role

Financial Operations:
- Refund creation route
- Affiliate payout trigger route
- Deposit management routes
- Concierge fee management routes
- Financial reporting routes

AI Management:
- 38 AI module files exist — list their names/paths
- Gemini client is initialized (find the client initialization)
- Streaming chat widget exists in components

QA and Test Tools:
- Test workspace dashboard exists
- Seed/create-user API exists for test environment only (confirm it is blocked in LIVE mode)

SEO Management:
- 7 admin SEO API routes exist — list them
- robots.txt and sitemap.xml are dynamically generated

System Health:
- Health page renders real system data (not hardcoded)
- Incident management routes exist
- Job management routes exist

STEP 5 — Cross-Portal Access Control Verification
For each portal, confirm that:
- Buyer routes reject dealer and affiliate tokens
- Dealer routes reject buyer and affiliate tokens
- Affiliate routes reject buyer and dealer tokens
- Admin routes reject all non-admin tokens
- Admin routes specifically check for admin role (not just authenticated)

Find the route protection pattern (likely in a middleware helper or HOF used by API routes) and confirm it is applied consistently across all three portals.

REQUIRED OUTPUT FORMAT:
A) Route inventory: actual page counts for dealer/affiliate/admin vs expected (44/27/94)
B) Dealer Portal: PASS/FAIL per sub-system (onboarding, inventory, auction, contracts, pickup, messaging)
C) Affiliate Portal: PASS/FAIL per sub-system (enrollment, attribution, commissions, payouts, fraud control)
D) Admin Console: PASS/FAIL per sub-system (auth/MFA, review queues, financial ops, AI, SEO, health)
E) Cross-portal access control: PASS/FAIL — confirm role isolation is enforced
F) BLOCKERS — any portal feature that is missing, unprotected, or incorrectly implemented
G) Phase 4 PASS/FAIL verdict

Do not mark Phase 4 PASS unless: admin TOTP MFA is confirmed working in code, commission levels are exactly 15/3/2 with no additional levels, and cross-portal role isolation is confirmed at the API level.
```

---

---

# PHASE 5 PROMPT — Known Issues Resolution

Paste this entire block into Copilot Chat:

---

```
@workspace You are performing a production readiness audit for the AutoLenis platform. This is Phase 5: Known Issues Resolution. There are 6 known issues from the verified codebase audit. Address each one now.

ISSUE 1 — Operations Report Stub (ACTION REQUIRED)
Find /api/admin/reports/operations/route.ts.
Read it completely.
Current state: returns { summary: {}, lifecycle: [] } in LIVE mode. Only returns real data in TEST mode.

ACTION: Implement real aggregation queries. Replace the LIVE mode stub with:
1. A query that groups Deal records by status and counts them
2. A query that calculates average time spent in each deal stage (use createdAt/updatedAt or lifecycle event timestamps)
3. A query that produces a lifecycle array showing deal progression counts by stage

The output schema must match what the admin reports page expects. Find the admin reports page component to confirm the expected data shape before writing the queries.

If the data model does not support stage-duration tracking (no lifecycle event timestamps stored), then:
- Remove the Operations tab from the admin reports navigation instead of showing empty data
- Add a TODO comment explaining what data infrastructure is needed to implement this properly

Do NOT leave the stub returning empty objects in LIVE mode. Either implement it or remove it from navigation.

ISSUE 2 — Error Boundaries for Public Routes (ACTION REQUIRED)
Current state: Error boundaries exist for buyer, dealer, admin, affiliate portal roots. Public routes (/auth/*, /prequal/*, /contact, /refinance) have no error boundaries.

ACTION: Create the following error boundary files:
- app/auth/error.tsx
- app/prequal/error.tsx  
- app/contact/error.tsx
- app/refinance/error.tsx

Each file should:
- Export a default React error boundary component
- Show a user-friendly message appropriate to the context (auth error ≠ prequal error)
- Provide a clear recovery action (try again button, return to homepage link)
- NOT expose internal error details to the user
- Match the existing error boundary style in app/buyer/error.tsx (read that file first for the pattern)

ISSUE 3 — Console Statements in lib/ (DOCUMENT AND BEGIN REMEDIATION)
Find lib/logger.ts. Read it completely to understand the logging interface.
Then search for console.log, console.error, and console.warn calls across all files in lib/.

ACTION:
1. Report the exact count of console.* calls found in lib/
2. Identify the top 5 highest-risk locations (payment service, prequal service, webhook handlers, auth service, contract shield service)
3. Replace console.* calls in those top 5 files with lib/logger.ts calls
4. For all remaining files: add a TODO comment at the top of each file noting it needs logger migration
5. Do NOT attempt to fix all 113 at once — fix the 5 highest-risk files and document the rest

ISSUE 4 — Stale Middleware Backups (ACTION REQUIRED — simple)
Check if these files exist:
- middleware.ts.bak
- middleware.ts.txt

If they exist: delete them. The active middleware is proxy.ts. These backups serve no purpose and confuse contributors.

After deletion, confirm proxy.ts is the only middleware file at the root level.

ISSUE 5 — Audit Files in Repo Root (ACTION REQUIRED — simple)
Check the repository root for .md files that are audit/documentation files (not README.md).

If any exist:
1. Create /docs/audits/ directory
2. Move all audit .md files there
3. Keep README.md in the root
4. Confirm the move does not break any scripts or CI references to those files

ISSUE 6 — TypeScript `any` Types — High-Risk Files Only (PARTIAL REMEDIATION)
Search for TypeScript `any` type annotations across the codebase.
Report the total count.

Then focus ONLY on the highest-risk files:
1. Any payment-related service files (payment, deposit, fee, payout, refund)
2. Any webhook handler files (stripe webhook, docusign webhook)
3. Any prequal service files that handle SSN or credit data

For these files only:
- Replace `any` with the correct inferred or explicit TypeScript type
- Run npx tsc --noEmit after each file change to confirm no new errors
- Do NOT touch other files yet

REQUIRED OUTPUT FORMAT:
A) Issue 1 (Operations Report): what was implemented OR what was removed from navigation, with file paths and changed lines
B) Issue 2 (Error Boundaries): list all 4 new files created, with brief description of each boundary's recovery UX
C) Issue 3 (Console Statements): count found, files fixed (5 files), logger calls substituted
D) Issue 4 (Middleware Backups): files deleted or "not found — already clean"
E) Issue 5 (Audit Files): files moved, new directory confirmed
F) Issue 6 (any types): total count found, files remediated, tsc result after changes
G) Build verification: run npx tsc --noEmit and npm run build after all changes — report results
H) Phase 5 PASS/FAIL verdict

Do not mark Phase 5 PASS unless: the operations report stub is resolved (implemented or removed), all 4 error boundary files are created, and the build is clean after all changes.
```

---

---

# PHASE 6 PROMPT — Security Hardening Verification

Paste this entire block into Copilot Chat:

---

```
@workspace You are performing a production readiness audit for the AutoLenis platform. This is Phase 6: Security Hardening Verification. This phase must confirm that every security control is correctly implemented in code — not assumed, not inferred from presence of files, but confirmed by reading the actual logic.

TASK: Verify all authentication, authorization, financial security, data protection, and API security controls are production-ready.

STEP 1 — CSRF Protection Verification
Find lib/middleware/csrf.ts. Read it completely.
Confirm:
- Double-submit cookie pattern is implemented (cookie value compared to header value)
- CSRF check is applied to all state-modifying methods (POST, PUT, PATCH, DELETE)
- GET requests are exempt (correct)
- The CSRF check cannot be bypassed by sending a specific header or empty value
- Find at least 3 API routes that use this CSRF middleware and confirm it is wired in

STEP 2 — Route Protection Pattern Verification
Find the route protection HOF or middleware helper used by API routes (likely requireAuth(), withAuth(), or similar in lib/auth.ts or lib/middleware/).
Read it completely.
Confirm:
- It verifies the JWT token is valid (not expired, not tampered)
- It extracts the user role from the token
- It rejects requests where the role does not match the required role for that route
- Find examples of: a buyer-only route, a dealer-only route, an admin-only route — confirm the guard is applied to each

STEP 3 — Admin Authentication Hardening
Find lib/admin-auth.ts (~597 lines). Read the key sections.
Confirm:
- TOTP MFA: the TOTP secret is stored per admin user, verification compares TOTP code against time-window
- Recovery codes: generated at MFA setup, stored hashed (not plaintext), each code is single-use
- Rate limiting: admin login attempts are rate-limited (find the rate limiter — confirm it tracks by IP or by username, not just by session)
- Admin sessions stored in DB: confirm there is a session table/model and admin sessions reference it
- Admin session invalidation: sessions can be revoked (important for compromised admin accounts)

STEP 4 — Financial Amount Server-Side Enforcement
This is a critical security check. Confirm the client CANNOT override payment amounts.

For the $99 deposit:
- Find the Stripe checkout session creation route
- Confirm the amount sent to Stripe is DEPOSIT_AMOUNT_CENTS from the environment, not from the request body
- If the request body contains an amount field, confirm it is ignored and the env constant is used instead

For the $499 concierge fee:
- Find the concierge fee payment route
- Apply the same check — confirm PREMIUM_FEE_CENTS from env is used, not a client-supplied value

For refunds:
- Confirm the refund amount is derived from the original charge record (DB lookup), not from the client request

STEP 5 — Ownership Authorization Checks
Verify that users can only access their own data:

Buyer deal access:
- Find the route that returns deal details for a buyer
- Confirm it checks that the deal's buyerId matches the authenticated user's ID
- Confirm a buyer CANNOT access another buyer's deal by guessing the deal ID

Dealer offer access:
- Find the route that returns offers for a dealer
- Confirm it checks that the offer belongs to an auction the dealer was invited to

Affiliate payout access:
- Find the payout list route
- Confirm it filters by the authenticated affiliate's ID

Admin override scope:
- Admin routes have access to all records — confirm this is intentional and that admin role is strictly verified before any cross-user data access

STEP 6 — SSN and Sensitive Data Protection
Find the prequal service where SSN is handled.
Confirm:
- SSN is encrypted using AES-256-GCM with PREQUAL_ENCRYPTION_KEY before any database write
- The raw SSN is never logged (search for console.log and logger calls in the same file — confirm SSN is not interpolated into any log message)
- The raw SSN is never returned in any API response (confirm the prequal API response does not include the SSN field)
- Prequal purge cron: confirm it exists and deletes or anonymizes sensitive prequal data after the retention period

STEP 7 — Webhook Security (Final Confirmation)
This was partially checked in Phase 2. Confirm for each webhook:

/api/webhooks/stripe:
- stripe.webhooks.constructEvent() is called with the raw request body (not parsed JSON) and STRIPE_WEBHOOK_SECRET
- Returns 400 on invalid signature, does NOT process the event
- Returns 200 only after successful processing

/api/webhooks/docusign (and /api/esign/webhook):
- DocuSign webhook signature/HMAC is verified
- Returns 400 on invalid signature

Any other webhook endpoints found:
- Apply same verification check

STEP 8 — Workspace Isolation (Production Safety)
Final confirmation from Phase 1.
Find every location where WorkspaceMode or isTestWorkspace() is checked.
For each location:
- What does TEST mode do? (mock data, reduced validation, seed behavior)
- What does LIVE mode do?
- Confirm that in a production environment (NODE_ENV=production), the LIVE branch is always taken

Specifically check: does any test/seed endpoint exist that could be called in production? These must be protected by isTestWorkspace() check that returns 404 or 403 in LIVE mode.

STEP 9 — Fix Any Security Issues Found
For each security issue identified in Steps 1–8:
- Implement the fix
- Write a brief explanation of the vulnerability and the fix applied
- Run npx tsc --noEmit after each fix

REQUIRED OUTPUT FORMAT:
A) CSRF: PASS/FAIL — show the double-submit cookie logic confirmation
B) Route Protection: PASS/FAIL — list the 3 example protected routes confirmed
C) Admin Auth: PASS/FAIL — confirm TOTP, recovery codes (hashed), rate limiting, DB sessions
D) Financial Amounts: PASS/FAIL — confirm server-side enforcement for deposit, fee, and refunds
E) Ownership Checks: PASS/FAIL — confirm buyer/dealer/affiliate isolation
F) SSN Protection: PASS/FAIL — confirm encryption before DB write, not in logs, not in API responses
G) Webhook Security: PASS/FAIL per webhook endpoint
H) Workspace Isolation: PASS/FAIL — confirm test endpoints blocked in LIVE mode
I) Fixes Applied: list every security fix made in this phase
J) Build verification: npx tsc --noEmit and npm run build results
K) Phase 6 PASS/FAIL verdict

Do not mark Phase 6 PASS unless: financial amounts are server-enforced, SSN is confirmed encrypted before DB write, all webhook signatures are verified, and admin TOTP is confirmed working in code.
```

---

---

# PHASE 7 PROMPT — Final Production Gate

Paste this entire block into Copilot Chat:

---

```
@workspace You are performing the final production readiness gate for the AutoLenis platform. This is Phase 7: Final Production Gate. All previous phases must have passed before running this phase. This is the last check before go-live.

TASK: Run the complete final verification suite and produce a signed-off production readiness report.

STEP 1 — Full Build and Type Safety Verification
Run the following commands in sequence and report the complete output of each:

1. npx tsc --noEmit
   Expected: zero errors
   If errors exist: fix them before proceeding

2. npm run build
   Expected: successful build with no errors
   Report: bundle size summary, any warnings

3. npm run lint
   Expected: zero errors (warnings acceptable if pre-existing)
   If new errors introduced by Phase 5/6 changes: fix them

4. npm run test (or npx vitest run)
   Expected: all 211 test files pass
   Report: total tests run, passed, failed, skipped
   If any tests fail: identify whether the failure is pre-existing or introduced by recent changes

STEP 2 — Route Inventory Final Confirmation
Confirm final page counts:
- app/page.tsx (public site root) — exists
- app/buyer/ — count all page.tsx files
- app/dealer/ — count all page.tsx files
- app/affiliate/ — count all page.tsx files
- app/admin/ — count all page.tsx files

Report total: should be ~256 pages across all portals as per verified audit.

STEP 3 — Stats Block Deployment Confirmation
Confirm that StatsBlock.tsx has been implemented in the homepage:
- Search for "Buyers Served", "Avg. Saved", "Satisfaction", "Dealer Partners" in the codebase
- These strings must NOT appear in any rendered output (they have been replaced)
- Confirm "~5 Min", "1–2 Days", "$499 Flat", "$0" appear in the stats section of app/page.tsx

STEP 4 — Cron Job Final Confirmation
Find vercel.json. List all cron jobs.
For each cron route, confirm:
- The route file exists in app/api/
- The route has auth protection (rejects unauthenticated requests)
- The route calls the correct service function

STEP 5 — Email Template Final Count
Find email.service.tsx. Count the number of email templates defined.
Expected: 17 templates.
List all template names/functions found.

STEP 6 — Prisma Schema Final Confirmation
Run: npx prisma migrate status
Expected output: "Database schema is up to date" or equivalent no-pending-migrations message.
If any pending migrations: run npx prisma migrate deploy and re-confirm.

STEP 7 — API Route Count Verification
Count all route.ts files under app/api/.
Expected: ~467 API routes as per verified audit.
Report the actual count. Minor variance (±20) is acceptable. Significant variance requires investigation.

STEP 8 — Critical Flow Summary Verification
Confirm that each of the following lifecycle dependencies is enforced (cross-reference Phase 3 findings):
- No prequal → no budget-sensitive search ✓/✗
- No prequal → no shortlist (or auction guard covers this) ✓/✗
- No deposit → no auction creation ✓/✗
- No selected offer → no deal creation ✓/✗
- No fee resolution → no downstream completion ✓/✗
- Insurance blocks contract completion, not shopping/auction ✓/✗
- CONTRACT_APPROVED required before SIGNING_PENDING ✓/✗
- SIGNED required before PICKUP_SCHEDULED ✓/✗

STEP 9 — Known Issue Final Status
Confirm final status of all 6 known issues:
1. Operations Report: implemented OR removed from navigation ✓/✗
2. Error Boundaries: 4 new files created (auth, prequal, contact, refinance) ✓/✗
3. Console Statements: top 5 risk files migrated to logger ✓/✗
4. Middleware Backups: deleted ✓/✗
5. Audit Files: moved to /docs/audits/ ✓/✗
6. `any` Types: high-risk files remediated ✓/✗

STEP 10 — Production Readiness Score
Calculate the final platform readiness score:

| Area | Max Points | Points Earned | Notes |
|---|---|---|---|
| Environment Config | 15 | | All vars present, LIVE endpoints |
| Integration Code | 20 | | Stripe, DocuSign, Resend, MicroBilt |
| Buyer Lifecycle Gates | 25 | | All gates enforced server-side |
| Portal Completeness | 15 | | Dealer, Affiliate, Admin |
| Security Controls | 15 | | Auth, financial, data protection |
| Known Issues Resolved | 5 | | All 6 addressed |
| Build/Tests Passing | 5 | | Zero TS errors, clean build, tests pass |
| TOTAL | 100 | | |

Platform is production-ready when score ≥ 95/100.

REQUIRED FINAL OUTPUT:
Produce a signed production readiness report containing:

1. PLATFORM: AutoLenis
2. AUDIT DATE: [today's date]
3. PHASES COMPLETED: 1 through 7
4. BUILD STATUS: TypeScript errors / Build result / Test results
5. TOTAL PAGE COUNT: actual vs expected (256)
6. TOTAL API ROUTE COUNT: actual vs expected (467)
7. LIFECYCLE GATES: all 8 confirmed ✓ or list failures
8. SECURITY CONTROLS: all 8 confirmed ✓ or list failures
9. KNOWN ISSUES: all 6 resolved ✓ or list outstanding
10. PRODUCTION READINESS SCORE: X/100
11. VERDICT: PRODUCTION READY / NOT READY — BLOCKERS REMAIN
12. BLOCKERS (if any): list every unresolved blocker preventing launch
13. RECOMMENDED LAUNCH DATE: [based on remaining work, if any]

This report is the authoritative sign-off document for AutoLenis production launch.
```

---

---

## PHASE EXECUTION TRACKER

Use this table to track your progress. Check off each phase only after Copilot reports PASS with zero blockers.

| Phase | Focus | Status | Blockers Found | Blockers Resolved |
|---|---|---|---|---|
| Phase 1 | Environment & Infrastructure | ☐ | | |
| Phase 2 | Third-Party Integration Code | ☐ | | |
| Phase 3 | Buyer Lifecycle Gates | ☐ | | |
| Phase 4 | Portal Surface Verification | ☐ | | |
| Phase 5 | Known Issues Resolution | ☐ | | |
| Phase 6 | Security Hardening | ☐ | | |
| Phase 7 | Final Production Gate | ☐ | | |

**Platform is production-ready when all 7 boxes are checked and Phase 7 scores ≥ 95/100.**

---

## RULES FOR USING THESE PROMPTS

1. One phase at a time. Never combine phases in a single Copilot session.
2. If Copilot reports blockers, fix them before moving forward. Re-run the same phase prompt to confirm fixes.
3. After Phase 5 and Phase 6 make code changes, always run `npx tsc --noEmit` and `npm run build` before proceeding.
4. Copilot may miss things on first pass. If a step returns "not found" for something you know exists, provide the file path and ask Copilot to re-inspect.
5. Phase 7 is the final gate — its readiness score is the authoritative verdict.
