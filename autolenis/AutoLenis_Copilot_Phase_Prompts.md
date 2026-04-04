# AutoLenis — GitHub Copilot Phase Prompts
## Anchored to: AutoLenis_Production_Readiness_Plan.md
**Version:** 2.0 | **Date:** March 2026
**Authority Document:** AutoLenis_Production_Readiness_Plan.md (in this repository)

---

## HOW TO USE THESE PROMPTS

1. Confirm `AutoLenis_Production_Readiness_Plan.md` is in the repository root before running any prompt
2. Open GitHub Copilot Chat in VS Code (`Ctrl+Shift+I` / `Cmd+Shift+I`)
3. Paste the phase prompt exactly as written — do not edit it
4. Copilot will read the plan document first, then audit the codebase against it
5. Fix every blocker Copilot reports before moving to the next phase
6. Re-paste the same phase prompt to confirm all blockers are resolved
7. Never proceed to Phase N+1 until Phase N reports zero blockers

**The AutoLenis_Production_Readiness_Plan.md is the single source of truth. Every Copilot finding must be reported against the plan's checklists — not against Copilot's own interpretation.**

---
---

# PHASE 1 PROMPT — Environment & Infrastructure

```
@workspace AUTHORITATIVE REFERENCE: Before doing anything else, read the file AutoLenis_Production_Readiness_Plan.md in this repository. Find the section titled "Phase 1 — Environment & Infrastructure Configuration". That section is your complete checklist for this audit. Every step you take and every finding you report must reference a specific item from that section by its number (1.1, 1.2, 1.3, 1.4).

You are executing Phase 1 of the AutoLenis production readiness audit. Do not make assumptions. Read actual files. Report every finding as PASS, FAIL, or BLOCKER — matched to the plan item it corresponds to.

DOCUMENT-DRIVEN EXECUTION:

PLAN SECTION 1.1 — Environment Variables Audit
The plan defines a complete table of required environment variables organized by category: Auth, Supabase, Database, Stripe, Resend, DocuSign, MicroBilt, App, Admin, and Cron.

Execute the following against the actual codebase:
1. Read every file in lib/, app/, and the root that references process.env.*
2. Read .env.example, env.d.ts, or any environment type definition files that exist
3. Build the complete list of every environment variable the codebase references
4. For each variable in your discovered list, check whether it appears in the plan's required variable table
5. For each variable in the plan's required variable table, check whether it exists in the codebase
6. Flag any variable in the plan that is NOT referenced in the codebase — it may have been renamed
7. Flag any variable referenced in the codebase that is NOT in the plan's table — it may be undocumented

For each variable, classify it using the plan's risk guidance:
- CRITICAL: payment, auth, encryption, or external API base URL variables
- HIGH: feature-specific integration variables
- MEDIUM/LOW: cosmetic or non-critical variables

Specifically verify per the plan:
- PREQUAL_ENCRYPTION_KEY must support AES-256-GCM (32 bytes / 256 bits) — check the encryption call site to confirm key length is validated
- NEXT_PUBLIC_APP_URL must be set to https://autolenis.com — check where this is used (absolute URL generation, email links, webhook return URLs)
- NODE_ENV must be production — find every place NODE_ENV is checked and confirm the production branch is correct
- Any variable controlling LIVE vs SANDBOX mode (Stripe key prefix, DocuSign base URL, MicroBilt base URL) is CRITICAL

PLAN SECTION 1.2 — Database State
Per the plan:
1. Find prisma/schema.prisma — confirm it exists and report its approximate line count (plan states 4,725 lines)
2. Check for any pending migration files in prisma/migrations/ that may not have been deployed
3. Confirm DATABASE_URL is the connection string source (not hardcoded anywhere)
4. Confirm these key models exist in the schema: User, PrequalApplication, Deal, Auction, Offer, AffiliatePayout, ComplianceEvent, PrequalDecision, EmailSendLog
5. Report: is the schema consistent with the platform's described data layer?

PLAN SECTION 1.3 — Workspace Mode Verification
Per the plan:
1. Find lib/app-mode.ts — read it completely
2. List the WorkspaceMode enum values
3. List the isTestWorkspace() function logic — what conditions make it return true?
4. Find every place in the codebase where isTestWorkspace() or WorkspaceMode is checked
5. For each branch: document what TEST mode returns vs LIVE mode
6. The plan specifically flags /api/admin/reports/operations/route.ts — read this file and confirm it returns { summary: {}, lifecycle: [] } in LIVE mode (known acceptable stub) but does NOT return test mock data in production
7. Flag any route or service where TEST mode returns data that bypasses real business logic

PLAN SECTION 1.4 — Vercel Cron Jobs Verification
Per the plan, vercel.json should define exactly 6 scheduled cron routes:
- auction-close: every 5 minutes
- holds: every 10 minutes
- affiliates: hourly
- contract-shield: hourly
- sessions: every 6 hours
- prequal: daily

Execute:
1. Read vercel.json completely
2. List every cron job defined — compare against the plan's expected 6 jobs
3. For each cron job, find the corresponding route file in app/api/ — confirm it exists
4. The plan states there are 14 total cron routes — list all 14 found
5. For each cron route, check whether it has auth protection (must reject unauthenticated calls with 401/403)
6. Find the auth mechanism used for cron protection (likely a secret header check) — confirm it is present on ALL cron routes

MIDDLEWARE VERIFICATION (supporting Phase 1):
Per the plan's architecture description, the active middleware is proxy.ts (350 lines). Read it completely.
Confirm:
- CSRF double-submit cookie protection is active
- Supabase token refresh logic is present
- Role-based routing is enforced
- ?ref= affiliate parameter capture sets a 30-day httpOnly cookie
- Check whether middleware.ts.bak or middleware.ts.txt exist — the plan flags these as stale backups to be removed

REQUIRED OUTPUT FORMAT — mapped to plan sections:

Section 1.1 findings:
- Total environment variables discovered in codebase: [N]
- Variables in plan but not in codebase: [list]
- Variables in codebase but not in plan: [list]
- CRITICAL variables status: [list each with PRESENT/MISSING]
- PREQUAL_ENCRYPTION_KEY key length validation: PASS/FAIL
- LIVE vs SANDBOX variables: [list each with CONFIRMED LIVE / RISK]

Section 1.2 findings:
- Schema line count: [N] (plan expects ~4,725)
- Pending migrations: NONE / [list]
- Required models present: PASS/FAIL per model

Section 1.3 findings:
- WorkspaceMode enum values: [list]
- isTestWorkspace() condition: [describe]
- TEST/LIVE branch map: [list each location and what each mode does]
- Operations report route: CONFIRMED STUB / RISK

Section 1.4 findings:
- Cron jobs in vercel.json: [list all found vs 6 expected]
- Total cron routes found: [N] (plan expects 14)
- Auth protection: PASS/FAIL per route

Middleware findings:
- CSRF: CONFIRMED / MISSING
- Affiliate capture: CONFIRMED / MISSING
- Stale backups: FOUND [list] / CLEAN

BLOCKERS (items where the plan's requirement is not met):
[List each blocker with: plan section reference | what the plan requires | what was found | action needed]

PHASE 1 VERDICT: PASS / FAIL
```

---
---

# PHASE 2 PROMPT — Third-Party Integration Verification

```
@workspace AUTHORITATIVE REFERENCE: Before doing anything else, read the file AutoLenis_Production_Readiness_Plan.md in this repository. Find the section titled "Phase 2 — Third-Party Integration Verification". That section contains 5 integration checklists (2.1 Stripe, 2.2 DocuSign, 2.3 Resend, 2.4 MicroBilt, 2.5 Supabase). Every step you take and every finding you report must reference a specific checklist item from that section.

You are executing Phase 2 of the AutoLenis production readiness audit. Do not make assumptions. Read actual integration files. Confirm the logic in code — not just the presence of files.

DOCUMENT-DRIVEN EXECUTION:

PLAN SECTION 2.1 — Stripe Critical Path
The plan defines 9 checklist items for Stripe. Work through each:

Item: "Stripe keys are LIVE keys (prefix sk_live_, pk_live_) — not test keys"
→ Find the Stripe client initialization. Confirm the key is sourced from STRIPE_SECRET_KEY env var, not hardcoded. Confirm the codebase does not contain any hardcoded sk_test_ or sk_live_ string literals.

Item: "Embedded Checkout renders for $99 deposit with correct DEPOSIT_AMOUNT_CENTS = 9900"
→ Find the deposit checkout session creation route. Confirm the amount sent to Stripe is DEPOSIT_AMOUNT_CENTS from the environment, NOT a hardcoded value and NOT a client-supplied value from the request body.

Item: "Embedded Checkout renders for $499 concierge fee with correct PREMIUM_FEE_CENTS = 49900"
→ Find the concierge fee checkout route. Apply the same verification — server-side env constant only.

Item: "checkout.session.completed webhook fires and is received at /api/webhooks/stripe"
→ Find this route. Read it. Confirm it handles the checkout.session.completed event type.

Item: "Webhook signature verification passes"
→ Confirm stripe.webhooks.constructEvent() is called with: (1) raw request body — NOT parsed JSON, (2) the stripe-signature header value, (3) STRIPE_WEBHOOK_SECRET from env. Confirm it returns 400 for invalid signatures.

Item: "Deposit payment marks buyer record correctly in DB"
→ After checkout.session.completed is handled, trace what DB update occurs. Confirm the buyer's deposit status is updated.

Item: "Refund endpoint creates refund in Stripe and updates DB"
→ Find the refund route. Confirm it (1) checks the requesting user owns the payment, (2) calls Stripe refund API, (3) updates the DB record.

Item: "Payout route creates Stripe transfer and creates AffiliatePayout record"
→ Find the affiliate payout trigger. Confirm it requires admin role before executing. Confirm it creates a Stripe transfer. Confirm it creates an AffiliatePayout record in DB.

Item: "Idempotency via ComplianceEvent unique constraint"
→ Find the ComplianceEvent model or table. Confirm it has a unique constraint that prevents duplicate event insertion. Confirm webhook handlers write to this table.

PLAN SECTION 2.2 — DocuSign Critical Path
The plan defines 7 checklist items. Work through each:

Item: "DOCUSIGN_BASE_URL is set to production — not demo/sandbox"
→ Find every place DOCUSIGN_BASE_URL is used. Flag immediately and as a BLOCKER if any hardcoded demo.docusign.net string exists anywhere in the codebase.

Item: "JWT auth flow produces valid access token via lib/services/docusign/auth.ts"
→ Read this file. Confirm it implements JWT grant (not legacy auth). Confirm it reads DOCUSIGN_PRIVATE_KEY, DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID from environment.

Item: "Envelope creation succeeds via lib/services/docusign/envelope.ts"
→ Read this file. Confirm it constructs a valid DocuSign envelope with document and recipient structure.

Item: "Recipient view URL is generated and accessible"
→ Find lib/services/docusign/recipient-view.ts. Confirm it generates the embedded signing URL.

Item: "Webhook at /api/webhooks/docusign and /api/esign/webhook receives and processes status updates"
→ Find both routes. Read them. Confirm they handle envelope status updates and update the deal state.

Item: "Signed document is archived after completion"
→ Trace what happens after signing is complete — confirm the signed document is stored and accessible.

Item: "Void operation works when deal is cancelled"
→ Find the void logic. Confirm it exists and is callable when a deal is cancelled after e-sign initiation.

PLAN SECTION 2.3 — Resend Email Delivery
The plan states: 17 email templates in email.service.tsx (~70,678 bytes). Work through each item:

Item: "RESEND_API_KEY is live"
→ Find Resend client initialization. Confirm key is from environment.

Item: "EMAIL_FROM domain is verified"
→ Find EMAIL_FROM usage. Confirm it is environment-sourced and used as the sender in all outgoing emails.

Item: "Idempotency via EmailSendLog"
→ Find the EmailSendLog model/table. Confirm the email service checks this log before sending — a duplicate send for the same event/recipient is prevented.

Item: "17 email templates defined"
→ Read email.service.tsx. List every template/function defined. Count them. Report the actual count vs the plan's expected 17. Name every template found.

Item: "Key emails deliver" (signup verification, welcome, auction notification, dealer invitation, IBV reminder)
→ For each: find the function, confirm it is called from the correct trigger point in the codebase (signup handler, onboarding completion, auction creation, dealer invite, prequal cron).

PLAN SECTION 2.4 — MicroBilt Soft Pull
The plan defines 6 checklist items. Work through each:

Item: "MICROBILT_BASE_URL points to production endpoint"
→ Find every place MICROBILT_BASE_URL is used. Flag as BLOCKER if any hardcoded sandbox URL exists.

Item: "OAuth2 token acquisition"
→ Find the token acquisition logic in lib/microbilt/. Confirm it reads CLIENT_ID and CLIENT_SECRET from environment and calls the correct token endpoint.

Item: "HMAC-SHA256 request signing"
→ Find the signing logic. Read it in detail — confirm the signature is computed correctly (not just that a signing function exists).

Item: "Soft pull response triggers decision engine"
→ Trace the response from MicroBilt through to lib/decision/. Confirm final-decision.ts receives the credit data and produces a PrequalDecision.

Item: "SSN encrypted via AES-256-GCM before storage"
→ Find the exact line where the encrypted SSN is written to the database. Confirm the encryption using PREQUAL_ENCRYPTION_KEY occurs BEFORE the Prisma write — not after. This is non-negotiable.

Item: "PrequalDecision and PrequalAuditLog created"
→ Confirm both records are created after a successful soft pull. The plan requires both.

PLAN SECTION 2.5 — Supabase Auth and Access
Work through all 4 items:
- Confirm SUPABASE_SERVICE_ROLE_KEY is used for server-side operations (not the anon key)
- Confirm proxy.ts Supabase refresh logic is present and correctly implemented
- Confirm no Supabase dev project URLs are hardcoded (all from environment)

REQUIRED OUTPUT FORMAT — mapped to plan sections:

Section 2.1 — Stripe (9 items):
[For each item: plan item text | PASS / FAIL / BLOCKER | evidence from code]

Section 2.2 — DocuSign (7 items):
[For each item: plan item text | PASS / FAIL / BLOCKER | evidence from code]
FLAG IMMEDIATELY: if demo.docusign.net appears anywhere in the codebase — this is a launch BLOCKER

Section 2.3 — Resend (items):
[For each item: plan item text | PASS / FAIL / BLOCKER | evidence from code]
List all 17 email templates found by name.

Section 2.4 — MicroBilt (6 items):
[For each item: plan item text | PASS / FAIL / BLOCKER | evidence from code]
SSN encryption: confirm the exact file and line where encryption occurs before DB write.

Section 2.5 — Supabase (4 items):
[For each item: plan item text | PASS / FAIL | evidence from code]

BLOCKERS:
[List each blocker with: plan section + item | what the plan requires | what was found | action needed]

PHASE 2 VERDICT: PASS / FAIL
```

---
---

# PHASE 3 PROMPT — Buyer Lifecycle Gate & State Machine Verification

```
@workspace AUTHORITATIVE REFERENCE: Before doing anything else, read the file AutoLenis_Production_Readiness_Plan.md in this repository. Find the section titled "Phase 3 — End-to-End Buyer Lifecycle Verification". That section contains 12 staged verification tables (Stage 1 through Stage 12). Every finding you report must reference the specific Stage and checkpoint row from those tables.

You are executing Phase 3 of the AutoLenis production readiness audit. This is the revenue spine of the platform. Do not make assumptions. Read the actual service files and route handlers. Confirm server-side enforcement — not UI-only checks.

The plan describes the buyer lifecycle as:
Signup → Onboarding → Prequal → Search (budget-filtered) → Shortlist → Deposit → Auction → Offers → Best Price → Deal Selection → Financing → Concierge Fee → Insurance → Contract Shield → E-Sign → Pickup → Completion

The plan also defines the dependency chain that must be enforced:
- No prequal → no budget-sensitive search
- No deposit → no auction activation
- No selected offer → no deal creation
- No fee resolution → no downstream completion
- Insurance must complete before contract finalization but must NOT block shopping or auction
- CONTRACT_APPROVED required before SIGNING_PENDING
- No signed docs → no pickup finalization

DOCUMENT-DRIVEN EXECUTION:

PLAN STAGE 1 — Account Creation and Onboarding
Read the plan's Stage 1 checkpoint table. For each row:
- POST /api/auth/signup: find this route, confirm it creates user, triggers email verification, returns JWT
- Email verification: find requireEmailVerification() in lib/auth-utils.ts, confirm fail-closed behavior at signin
- app/buyer/onboarding/page.tsx: confirm it exists and references components/buyer/onboarding/
- Onboarding completion: confirm it routes to prequal or dashboard and creates the buyer profile
- Protected route: confirm non-onboarded buyers cannot bypass onboarding to reach search, shortlist, or auction

PLAN STAGE 2 — Prequalification
Read the plan's Stage 2 checkpoint table. For each row:
- Prequal steps 1–4: confirm all 9 public prequal pages exist (step-1 through step-4, ibv-intro, ibv, processing, result, welcome)
- Soft pull consent: confirm PrequalConsent model is written before MicroBilt is called
- Decision engine: confirm lib/decision/ files (final-decision.ts, ipredict-scorer.ts, ibv-scorer.ts, shopping-power.ts) all exist and are called in sequence
- PrequalDecision: confirm maxOtdAmountCents is set in the output
- Shopping power: confirm PreQualification.maxOtdAmountCents is populated in DB
- Audit log: confirm PrequalAuditLog entry is created for every prequal decision

PLAN STAGE 3 — Vehicle Search (Budget Guard — plan confirms this is VERIFIED)
The plan states: "/api/buyer/inventory/search/route.ts line 55 queries PreQualification.maxOtdAmountCents and applies budget filtering."
Read this file. Confirm:
- The exact query at approximately line 55 (or wherever it appears)
- maxOtdAmountCents is fetched for the authenticated buyer
- When budgetOnly=true (or equivalent), the query filters to vehicles at or below that amount
- If buyer has no PrequalDecision, search either returns empty or blocks — it does NOT return unfiltered inventory
- This guard is at the API level, not only in UI

PLAN STAGE 4 — Shortlist
The plan confirms: MAX_SHORTLIST_ITEMS = 5 and shortlist.service.ts is 13,403 bytes.
Read shortlist.service.ts. Confirm:
- MAX_SHORTLIST_ITEMS = 5 is enforced server-side (6th add is rejected)
- Shortlist is scoped to the authenticated buyer — cross-buyer access is blocked
- Report: what happens when a buyer tries to add a 6th item (error type, message)

PLAN STAGE 5 — Deposit and Auction Activation
The plan confirms: "auction.service.ts explicitly states: Insurance status MUST NOT block auction creation. Lender status MUST NOT block auction creation."
Read auction.service.ts. Confirm:
- These exact guard conditions are present in the auction creation logic
- The gates that DO apply: prequal (active + non-expired) + shortlist (non-empty) + deposit paid
- AUCTION_DURATION_HOURS = 48 is set
- Auction is NOT created without confirmed deposit — trace from Stripe webhook to auction creation to confirm sequence
- auction-close cron runs every 5 minutes (already confirmed in Phase 1 — cross-reference)

PLAN STAGE 6 — Dealer Offers and Best Price Engine
The plan confirms: best-price.service.ts is 29,108 bytes. Weights: OTD 35%, monthly 35%, vehicle 15%, dealer 10%, junk fee 5%.
Read best-price.service.ts. Confirm:
- All 5 weights are present with these exact values
- Three outputs are generated: Best Cash, Best Monthly, Balanced
- The weights are configurable via admin — find the admin configuration route/setting
- Offer data structure: confirm offers include OTD, tax/fee breakdown JSON, and financing options

PLAN STAGE 7 — Deal Selection and Financing
Read the relevant service. Confirm:
- financingChoiceSchema (Zod) validates CASH | FINANCED | EXTERNAL_PREAPPROVAL
- Invalid financing types are rejected at API level
- Deal transitions from SELECTED to FINANCING_PENDING correctly
- EXTERNAL_PREAPPROVAL selection checks that an external preapproval document exists

PLAN STAGE 8 — Concierge Fee Handling
The plan specifies: $499 Premium fee, $99 deposit credited, direct payment OR financed inclusion, loan impact calculator, disclosure acknowledgment stored, lender disbursement to AutoLenis when financed.
Confirm:
- PREMIUM_FEE_CENTS = 49900 is the source of truth
- $99 deposit is credited (resulting in $400 for direct payment path)
- Disclosure acknowledgment is stored in DB before fee is marked resolved
- Dealers do NOT receive or handle the AutoLenis concierge fee — confirm no route sends fee payment to a dealer account
- Deal transitions to FEE_PAID after resolution

PLAN STAGE 9 — Insurance
The plan is explicit: "Insurance MUST NOT block auction creation."
Confirm:
- The insurance completion requirement gates CONTRACT_PENDING → CONTRACT_REVIEW, NOT earlier stages
- Insurance state has no effect on: search, shortlist, deposit, auction, offer review
- InsuranceReadinessStatus transitions are defined and the valid states are documented
- External proof upload path exists as fallback
- Deal transitions to INSURANCE_COMPLETE correctly

PLAN STAGE 10 — Contract Shield (Plan confirms: IS a workflow gate)
The plan states: deal state machine enforces CONTRACT_PENDING → CONTRACT_REVIEW → CONTRACT_APPROVED → SIGNING_PENDING. E-sign CANNOT be reached without contract approval.
Read contract-shield.service.ts (plan states ~38,428 bytes). Confirm:
- PASS threshold: score ≥ 85 → CONTRACT_APPROVED
- WARNING threshold: score 70–84 → manual review queue populated
- FAIL threshold: score ≤ 69 → fix list generated, dealer notified, deal does NOT advance
- Confirm the state machine hard constraint: SIGNING_PENDING is unreachable without CONTRACT_APPROVED
- Show the exact state transition code that enforces this
- Fix list is stored in DB, associated with the contract/deal
- Admin override route exists and writes to audit log

PLAN STAGE 11 — E-Sign
Read lib/services/docusign/ files. Confirm:
- Envelope is created only after deal reaches SIGNING_PENDING (which requires CONTRACT_APPROVED)
- DocuSign webhook updates deal state to SIGNED
- Signed document is archived and accessible in buyer document list
- Deal transitions to SIGNED correctly

PLAN STAGE 12 — Pickup
The plan confirms: pickup.service.ts is 20,858 bytes, QR code via qrcode package, dealer check-in flow.
Read pickup.service.ts. Confirm:
- QR code is generated and unique to the deal/appointment
- Dealer check-in route validates deal is in SIGNED state before allowing check-in
- Deal transitions to PICKUP_SCHEDULED → COMPLETED

EVENT LEDGER (plan requires 90+ event types):
Find the event ledger. Confirm:
- At least 90 event types are defined — list them or report the count
- Events are written for each major lifecycle milestone
- Idempotency unique constraint exists

REQUIRED OUTPUT FORMAT — mapped to plan stages:

Stage 1 (Account/Onboarding): [5 checkpoint rows — PASS/FAIL each]
Stage 2 (Prequal): [7 checkpoint rows — PASS/FAIL each]
Stage 3 (Budget Guard): PASS/FAIL — show exact line/file of the budget filter query
Stage 4 (Shortlist): PASS/FAIL — show MAX_SHORTLIST_ITEMS enforcement location
Stage 5 (Deposit/Auction): PASS/FAIL — confirm insurance/lender exclusion from auction guards
Stage 6 (Best Price): PASS/FAIL — confirm exact weights (OTD 35%, monthly 35%, vehicle 15%, dealer 10%, junk 5%)
Stage 7 (Financing): PASS/FAIL — confirm Zod schema and EXTERNAL_PREAPPROVAL check
Stage 8 (Fee): PASS/FAIL — confirm dealer cannot receive AutoLenis fee
Stage 9 (Insurance): PASS/FAIL — confirm does NOT gate auction or search
Stage 10 (Contract Shield): PASS/FAIL — confirm SIGNING_PENDING hard gate
Stage 11 (E-Sign): PASS/FAIL
Stage 12 (Pickup): PASS/FAIL
Event Ledger: count found vs 90+ expected

DEPENDENCY CHAIN VERIFICATION (from plan):
For each dependency, PASS/FAIL:
- No prequal → no budget search: [PASS/FAIL]
- No deposit → no auction: [PASS/FAIL]
- No selected offer → no deal: [PASS/FAIL]
- No fee resolution → no downstream completion: [PASS/FAIL]
- Insurance gates contract only, not auction: [PASS/FAIL]
- CONTRACT_APPROVED required before SIGNING_PENDING: [PASS/FAIL]
- SIGNED required before pickup: [PASS/FAIL]

BLOCKERS:
[Each blocker: plan stage + checkpoint | plan requirement | what was found | action needed]

PHASE 3 VERDICT: PASS / FAIL
```

---
---

# PHASE 4 PROMPT — Portal Surface Verification

```
@workspace AUTHORITATIVE REFERENCE: Before doing anything else, read the file AutoLenis_Production_Readiness_Plan.md in this repository. Find the section titled "Phase 4 — Portal-Level Verification". That section contains verification checklists for 4.1 Dealer Portal, 4.2 Affiliate Portal, and 4.3 Admin Console. Every finding you report must reference the specific subsection (4.1, 4.2, 4.3) and the specific checklist item within it.

You are executing Phase 4 of the AutoLenis production readiness audit. The plan specifies: Dealer Portal = 44 pages, Affiliate Portal = 27 pages, Admin Console = 94 pages. Confirm actual counts. Read actual files. Do not assume routes exist.

DOCUMENT-DRIVEN EXECUTION:

ROUTE COUNT VERIFICATION (plan baseline: 256 total pages, 467 API routes):
Count all page.tsx files under:
- app/dealer/ → expected ~44
- app/affiliate/ → expected ~27
- app/admin/ → expected ~94
- app/ total → expected ~256

Count all route.ts files under app/api/ → expected ~467

Report actual counts vs plan expectations. Minor variance (±10) is acceptable — explain any significant gap.

PLAN SECTION 4.1 — Dealer Portal (44 pages)
Work through each checklist item from the plan:

"Onboarding / agreement flow with DocuSign dealer agreement"
→ Find the 4 dealer onboarding pages. Find dealer-agreement.service.ts (plan states ~20,613 bytes — confirm approximate size). Confirm DocuSign envelope is created during dealer agreement signing.

"Admin approval workflow: dealer not active until approved"
→ Find the dealer approval route in admin. Confirm dealers cannot access marketplace features (inventory, auctions, offers) until admin marks them approved. Trace the approval status check.

"7 inventory pages: list, detail, edit, add, bulk-upload, column-mapping, import-history"
→ List each page file found. Confirm all 7 exist.

"13 API routes under /api/dealer/inventory/ — list them"
→ List all dealer inventory API routes found. Compare count to plan's expected 13.

"Bulk upload: file parsing, column mapping, import history stored"
→ Confirm each of these 3 functions exists and is implemented (not just a page shell).

"4 auction pages: list, detail, invited, offers"
→ Confirm all 4 exist.

"Structured offer submission: OTD amount, tax/fee breakdown JSON, financing options per offer"
→ Find the offer submission route. Confirm all 3 data elements are required and stored.

"Contract upload: GET/POST /api/dealer/contracts"
→ Confirm both routes exist. Confirm upload triggers Contract Shield scan.

"Pickup: schedule, check-in, complete, cancel pages and routes"
→ Confirm all 4 pages exist and all 4 corresponding API routes exist.

"QR check-in route validates deal is in SIGNED state"
→ Find the check-in route. Confirm it checks deal state before allowing check-in.

"Thread-based messaging: dealer cannot message buyers outside active deals"
→ Find the messaging service. Confirm the scope restriction is enforced.

PLAN SECTION 4.2 — Affiliate Portal (27 pages)
Work through each checklist item from the plan:

"Public enrollment and auto-enrollment"
→ Confirm public affiliate enrollment page exists. Find POST /api/buyer/referrals/activate — confirm it exists for auto-enrollment from buyer lifecycle.

"Code generation: AL + 6 chars"
→ Find the code generation logic. Confirm the format is exactly "AL" + 6 characters. Show the code.

"30-day httpOnly cookie set from proxy.ts"
→ Cross-reference Phase 1 finding. Confirm cookie attributes: httpOnly=true, maxAge=30 days (2592000 seconds).

"First-click attribution: second ?ref= does NOT overwrite existing cookie"
→ Find the cookie-setting logic. Confirm it checks for an existing referral cookie before setting a new one.

"Commission levels: Level 1 = 15%, Level 2 = 3%, Level 3 = 2% — exactly 3 levels"
→ Find the MLM tree walk logic. Read it. Confirm the exact percentages. Confirm there is NO Level 4 or Level 5. The plan explicitly corrects an earlier error — only 3 levels exist.

"Self-referral fraud control"
→ Find the self-referral check. Confirm a buyer cannot refer themselves.

"Payout trigger requires admin role"
→ Find the payout trigger route. Confirm it checks for admin role before executing. Affiliate cannot self-trigger.

"Dashboard page exists (~31 KB)"
→ Find the dashboard page. Report its approximate file size vs plan's expected ~31 KB.

"Income planner calculator"
→ Confirm income-planner.tsx component exists and is wired into the portal.

"7 redirect pages to /affiliate/portal/*"
→ Find these redirect pages. List them. Confirm they redirect correctly.

PLAN SECTION 4.3 — Admin Console (94 pages)
Work through each checklist item from the plan:

"lib/admin-auth.ts (~597 lines)"
→ Find this file. Confirm approximate line count vs plan's expected ~597. Read the key sections.

"TOTP MFA implemented"
→ Find the TOTP verification logic. Confirm it: (1) stores TOTP secret per admin user, (2) verifies code against the current time window, (3) TOTP is required — admin cannot bypass it.

"Recovery codes: generated at MFA setup, stored hashed, single-use"
→ Find recovery code storage. Confirm they are hashed (not plaintext). Confirm single-use logic (code is invalidated after use).

"Rate limiting on admin login"
→ Find the rate limiter on the admin auth route. Confirm it tracks attempts and blocks after threshold.

"Admin sessions stored in DB"
→ Find the admin session model/table. Confirm admin sessions reference this table (not just JWT).

"7 manual review action routes — list them"
→ Find the CMA/manual review routes. List all 7.

"Contract Shield override requires admin role"
→ Find the override route. Confirm admin role check.

"E-sign void route requires admin role"
→ Find the void route. Confirm admin role check.

"38 AI module files — Gemini client — streaming chat widget"
→ Find the AI management files. Report count vs plan's expected 38. Confirm Gemini client initialization. Confirm streaming chat widget exists in components.

"Test workspace dashboard and seed/create-user API blocked in LIVE mode"
→ Find these. Confirm they are gated by isTestWorkspace() and return 404/403 in LIVE mode.

"7 admin SEO API routes — list them"
→ List all 7.

"Admin dashboard is 32.6 KB"
→ Find the admin dashboard page. Report its file size vs plan's expected 32.6 KB.

CROSS-PORTAL ACCESS CONTROL:
Find the route protection pattern used across portals (requireAuth, withAuth, or similar).
For each portal, confirm:
- Buyer routes reject dealer and affiliate tokens
- Dealer routes reject buyer and affiliate tokens
- Affiliate routes reject buyer and dealer tokens
- Admin routes reject all non-admin tokens
- Admin routes specifically verify admin role (not just authentication)

REQUIRED OUTPUT FORMAT — mapped to plan sections:

Route counts:
- Dealer pages: actual vs 44 expected
- Affiliate pages: actual vs 27 expected
- Admin pages: actual vs 94 expected
- Total pages: actual vs 256 expected
- Total API routes: actual vs 467 expected

Section 4.1 — Dealer Portal: [each checklist item — PASS/FAIL/BLOCKER]
Section 4.2 — Affiliate Portal: [each checklist item — PASS/FAIL/BLOCKER]
Commission levels confirmed: L1=15% L2=3% L3=2% — NO additional levels: [PASS/FAIL]
Section 4.3 — Admin Console: [each checklist item — PASS/FAIL/BLOCKER]
Cross-portal isolation: [PASS/FAIL per portal pair]

BLOCKERS:
[Each blocker: plan section + item | plan requirement | what was found | action needed]

PHASE 4 VERDICT: PASS / FAIL
```

---
---

# PHASE 5 PROMPT — Known Issues Resolution

```
@workspace AUTHORITATIVE REFERENCE: Before doing anything else, read the file AutoLenis_Production_Readiness_Plan.md in this repository. Find the section titled "Phase 5 — Known Issues Resolution". That section defines exactly 6 issues with their resolution requirements. Work through them in order. Every action you take must reference the specific issue number (Issue 1 through Issue 6) from the plan.

You are executing Phase 5 of the AutoLenis production readiness audit. This phase requires you to make code changes, not just audit. After all changes are made, run npx tsc --noEmit and npm run build. Report the results.

DOCUMENT-DRIVEN EXECUTION:

PLAN ISSUE 1 — Operations Report Stub (plan marks this 🔶 — pre-launch recommended)
The plan states: "/api/admin/reports/operations/route.ts returns empty { summary: {}, lifecycle: [] } in LIVE mode."

Step 1: Read /api/admin/reports/operations/route.ts completely.
Step 2: Find the admin reports page component that consumes this data. Read it to understand the expected data shape (what keys does the page expect in summary? what structure does lifecycle[] expect?).
Step 3: Choose one of the two plan-approved resolutions:

Option A — Implement real aggregation queries:
- Query Deal records grouped by status with counts
- Query average time between deal state transitions (use timestamps from deal records or event ledger)
- Return data matching the page's expected shape
- Test that the page renders with real data

Option B — Remove from admin navigation (if Option A data is not available):
- Find the admin reports navigation component
- Comment out or remove the Operations tab
- Add a code comment: "// Operations report requires lifecycle event timestamps - implement in post-launch sprint"
- The plan explicitly approves this as the launch option

Do NOT leave the route returning empty objects in LIVE mode without one of these resolutions.
Report which option was implemented and show the changed files and lines.

PLAN ISSUE 2 — Error Boundaries for Public Routes (plan marks this 🟡 — pre-launch recommended)
The plan states: "Add error boundaries to: app/auth/error.tsx, app/prequal/error.tsx, app/contact/error.tsx, app/refinance/error.tsx"

Step 1: Read app/buyer/error.tsx to understand the existing error boundary pattern and style.
Step 2: Create all 4 files following the same pattern:
- app/auth/error.tsx: recovery message appropriate to auth context, "Return to sign in" action
- app/prequal/error.tsx: recovery message appropriate to prequal context, "Try again" and "Return to home" actions
- app/contact/error.tsx: recovery message appropriate to contact context, "Return to home" action
- app/refinance/error.tsx: recovery message appropriate to refinance context, "Try again" and "Return to home" actions

Each file must:
- Export a default React error boundary component with 'use client' directive
- Accept { error, reset } props (Next.js error boundary interface)
- NOT expose internal error details to the user
- Match the visual style of the existing buyer error boundary
- Provide at least one clear recovery action

Show all 4 created files in the output.

PLAN ISSUE 3 — Console Statements in lib/ (plan marks this 🟡)
The plan states: "113 console statements in lib/ — replace with lib/logger.ts"

Step 1: Read lib/logger.ts completely to understand the logging interface (what methods exist: log, error, warn, info, debug?).
Step 2: Search lib/ for all console.log, console.error, console.warn, console.info calls. Report the total count.
Step 3: Identify the top 5 highest-risk files per the plan's priority order:
  1. Payment service files
  2. Prequal service files (handle SSN and credit data — critical: no SSN in logs)
  3. Webhook handler files
  4. Auth service files
  5. Contract Shield service files

Step 4: For these 5 files only:
- Replace each console.* call with the equivalent lib/logger.ts call
- For the prequal service specifically: confirm NO SSN, credit data, or raw financial values are being logged anywhere — remove any such log calls entirely rather than routing them through logger

Step 5: For all other files with console statements: add this comment at the top of each file:
// TODO: Replace console.* calls with lib/logger.ts — see production readiness plan Issue 3

Report: files changed, lines changed, logger calls substituted, any console calls removed entirely (rather than migrated) due to sensitive data risk.

PLAN ISSUE 4 — Stale Middleware Backups (plan marks this 🟢)
The plan states: "middleware.ts.bak and middleware.ts.txt still exist. Active middleware is proxy.ts."

Step 1: Check if these files exist at the repository root.
Step 2: If they exist, delete them.
Step 3: Confirm proxy.ts is the only middleware-related file at the root level (other than any Next.js standard middleware.ts if it exists as a thin shim forwarding to proxy.ts).
Report: files deleted or "already clean — files not found."

PLAN ISSUE 5 — Markdown Audit Files in Repo Root (plan marks this 🟢)
The plan states: "51 markdown audit files in repo root — move to /docs/audits/"

Step 1: List all .md files at the repository root.
Step 2: Identify which are audit/documentation files (not README.md, CHANGELOG.md, or other standard root-level docs).
Step 3: Create /docs/audits/ directory if it does not exist.
Step 4: Move all audit .md files to /docs/audits/.
Step 5: Confirm no scripts, CI workflows, or other files reference these .md files by their old paths.

Report: files moved, new paths, any reference updates needed.

PLAN ISSUE 6 — TypeScript `any` Types — High-Risk Files Only (plan marks this 🟡)
The plan states: "1,109 any types despite strict: true in tsconfig. Remediate payment and prequal services first."

Step 1: Search the codebase for TypeScript any type annotations. Report total count vs plan's expected 1,109.
Step 2: Focus ONLY on the plan's priority files:
  1. Payment-related service files (payment, deposit, fee, payout, refund)
  2. Webhook handler files (Stripe webhook, DocuSign webhook)
  3. Prequal service files that handle SSN or credit data

Step 3: For each priority file:
- Identify each any annotation
- Replace with the correct inferred or explicit TypeScript type
- Run npx tsc --noEmit after each file change to confirm zero new errors introduced
- If a type is genuinely unknowable (external API response), use unknown instead of any and add a type guard

Step 4: Do NOT touch other files. The plan is explicit: high-risk files only for this phase.

Report: total any count found, files remediated, specific types substituted.

BUILD VERIFICATION (required after all Issue 1–6 changes):
Run in sequence and report complete output:
1. npx tsc --noEmit → must be zero errors
2. npm run build → must complete successfully
3. npm run lint → report any new errors (pre-existing warnings acceptable)

REQUIRED OUTPUT FORMAT — mapped to plan issues:

Issue 1 (Operations Report):
- Option chosen: A (implemented) or B (removed from nav)
- Files changed: [list with line ranges]
- Plan requirement satisfied: PASS/FAIL

Issue 2 (Error Boundaries):
- Files created: [list all 4]
- Pattern followed from buyer/error.tsx: PASS/FAIL
- Plan requirement satisfied: PASS/FAIL

Issue 3 (Console Statements):
- Total console.* calls found in lib/: [N] vs plan's expected 113
- Top 5 files fixed: [list]
- Console calls migrated to logger: [N]
- Console calls removed entirely (sensitive data): [N] — list what was removed
- TODO comments added to remaining files: [N files]

Issue 4 (Middleware Backups):
- middleware.ts.bak: DELETED / NOT FOUND
- middleware.ts.txt: DELETED / NOT FOUND

Issue 5 (Audit Files):
- Files moved: [N] files to /docs/audits/
- Reference updates needed: [list or NONE]

Issue 6 (TypeScript any):
- Total any count: [N] vs plan's expected 1,109
- Priority files remediated: [list]
- tsc result after each file: [PASS per file]

Build verification:
- tsc --noEmit: PASS (0 errors) / FAIL ([N] errors)
- npm run build: PASS / FAIL
- npm run lint: PASS / [N new errors]

PHASE 5 VERDICT: PASS / FAIL
Issue 1 resolved: PASS/FAIL
Issue 2 resolved: PASS/FAIL
Build clean after all changes: PASS/FAIL
```

---
---

# PHASE 6 PROMPT — Security Hardening Verification

```
@workspace AUTHORITATIVE REFERENCE: Before doing anything else, read the file AutoLenis_Production_Readiness_Plan.md in this repository. Find the section titled "Phase 6 — Security and Compliance Hardening". That section defines 5 subsections (6.1 Authentication and Authorization, 6.2 Financial Security, 6.3 Data Protection, 6.4 API Security, 6.5 Compliance). Every finding you report must reference the specific subsection and checklist item from the plan.

You are executing Phase 6 of the AutoLenis production readiness audit. Security verification is not theoretical — read actual code. Confirm actual logic. Fix any gap found.

DOCUMENT-DRIVEN EXECUTION:

PLAN SECTION 6.1 — Authentication and Authorization
Work through each checklist item:

"All buyer routes reject unauthenticated requests (401/403)"
→ Find the route protection HOF (requireAuth, withAuth, or similar). Confirm it is applied to buyer API routes. Sample 5 buyer routes — confirm protection is present on all 5.

"All dealer routes reject non-dealer roles"
→ Sample 5 dealer routes. Confirm each checks for dealer role specifically, not just authentication.

"All admin routes reject non-admin roles"
→ Sample 5 admin routes. Confirm each checks for admin role.

"Admin routes additionally require TOTP MFA session"
→ Find the admin session check. Confirm TOTP is verified as part of the session, not just username/password.

"proxy.ts CSRF double-submit cookie active on all state-modifying routes"
→ Confirm CSRF middleware is applied to POST, PUT, PATCH, DELETE. Confirm GET is exempt. Show how bypass is prevented (empty value rejected).

"JWT 7-day TTL enforced"
→ Find JWT creation in lib/auth.ts (~132 lines — plan confirms this). Confirm expiresIn or equivalent is set to 7 days. Confirm expired tokens are rejected at the verification step.

"lib/middleware/csrf.ts — confirm CSRF cannot be bypassed"
→ Read this file. Confirm it cannot be bypassed by: (1) sending an empty string, (2) omitting the header, (3) sending the same value for both cookie and header when cookie is empty.

"isTestWorkspace() never returns true in production"
→ Cross-reference Phase 1 finding. Confirm this is documented as PASS.

"Email verification fail-closed at signin"
→ Find requireEmailVerification() in lib/auth-utils.ts. Confirm unverified users cannot sign in (fail-closed, not fail-open at signin).

PLAN SECTION 6.2 — Financial Security
Work through each checklist item:

"Stripe webhook signature verification active"
→ Cross-reference Phase 2 finding. Confirm PASS is documented.

"DocuSign webhook signature verification active"
→ Cross-reference Phase 2 finding. Confirm PASS is documented.

"All payment amounts defined server-side — client cannot override"
→ Find the deposit checkout creation route. Confirm: (1) amount is read from DEPOSIT_AMOUNT_CENTS env var, (2) request body amount field (if present) is NOT used, (3) same for PREMIUM_FEE_CENTS. This is a financial security requirement — client-supplied amounts are a critical vulnerability.

"Refund endpoint checks ownership"
→ Find the refund route. Confirm: (1) the payment being refunded is looked up by ID, (2) the buyerId on that payment is compared to the authenticated user's ID, (3) mismatched ownership returns 403.

"Affiliate payout requires admin role"
→ Cross-reference Phase 4 finding. Confirm PASS is documented.

"Commission creation is idempotent"
→ Find commission creation logic. Confirm it checks for an existing commission for the same qualifying event before creating a new one (prevent double-pay on retry).

PLAN SECTION 6.3 — Data Protection
Work through each checklist item:

"SSN encrypted at rest via AES-256-GCM"
→ Cross-reference Phase 2 finding. Confirm SSN encryption before DB write is documented as PASS.

"Prequal purge cron running"
→ Find the prequal purge cron (the plan confirms it is one of 4 prequal cron jobs). Read the purge logic — what does it delete? After how many days? Is this compliant with the platform's intended data retention policy?

"No SSN or raw credit data in logs"
→ Search the prequal service and MicroBilt integration files for any log call that interpolates SSN, credit score, or raw credit report data. Flag and remove any found.

"Document uploads stored securely — not publicly accessible without auth"
→ Find where document uploads are stored (S3, Supabase storage, or similar). Confirm the storage is not publicly accessible. Confirm document retrieval routes check authentication before returning documents.

"Admin audit log captures sensitive actions"
→ Find the event ledger write calls for: contract overrides, refunds, payout triggers, user suspensions. Confirm all 4 are logged with actor identity (which admin performed the action).

PLAN SECTION 6.4 — API Security
Work through each checklist item:

"All API routes validate ownership"
→ Find 3 buyer routes that return deal or personal data. Confirm each does a buyerId ownership check before returning data.

"Dealer can only access auctions they are invited to"
→ Find the dealer auction detail route. Confirm it checks that the dealer was invited to this specific auction before returning data.

"Rate limiting on prequal endpoints"
→ Find rate limiting on prequal submission routes. Confirm it prevents repeated soft pulls from the same user in a short window.

"Rate limiting on admin auth endpoint"
→ Cross-reference Phase 4 finding on admin auth. Confirm PASS.

"Zod schemas active on all mutation routes"
→ Sample 5 mutation routes (POST/PUT/PATCH). Confirm each parses the request body with a Zod schema and returns a validation error (400) for invalid input.

"No route returns more data than the requesting role is entitled to"
→ Find the buyer deal detail API response. Confirm it does not include dealer pricing data that the buyer is not entitled to see. Find the dealer offer response — confirm it does not include other dealers' competing offer amounts.

PLAN SECTION 6.5 — Compliance
Work through each checklist item:

"All financial disclosures acknowledged and stored before fee processing"
→ Find the concierge fee financed inclusion path. Confirm disclosure acknowledgment is stored in DB before fee is marked as resolved.

"Consent artifacts exist for prequal soft pull"
→ Find PrequalConsent model/table. Confirm a record is created with timestamp and user ID before MicroBilt is called.

"Contract Shield fix lists are audit-logged"
→ Find where fix lists are generated. Confirm an event is written to the compliance log or event ledger for each fix list created.

"All webhook events stored in ComplianceEvent with idempotency key"
→ Cross-reference Phase 2 and Phase 3 findings. Confirm PASS.

"Event ledger 90+ types capturing required events"
→ Cross-reference Phase 3 finding. Confirm PASS and count.

"Dealer agreement executed via DocuSign before dealer activation"
→ Cross-reference Phase 4 finding. Confirm PASS.

FIX ANY SECURITY GAPS FOUND:
For each security gap identified in Sections 6.1–6.5:
- Implement the fix
- Explain: what the vulnerability was, what the fix does, why it satisfies the plan requirement
- Run npx tsc --noEmit after each fix

REQUIRED OUTPUT FORMAT — mapped to plan sections:

Section 6.1 — Authentication and Authorization:
[Each item from plan: PASS / FAIL / BLOCKER]

Section 6.2 — Financial Security:
[Each item from plan: PASS / FAIL / BLOCKER]
CRITICAL: client-side amount override — PASS (server enforces) / BLOCKER (client can override)

Section 6.3 — Data Protection:
[Each item from plan: PASS / FAIL / BLOCKER]

Section 6.4 — API Security:
[Each item from plan: PASS / FAIL / BLOCKER]

Section 6.5 — Compliance:
[Each item from plan: PASS / FAIL / BLOCKER]

Security fixes applied this phase:
[List each fix: what was wrong | what was changed | files modified]

Build verification after fixes:
- npx tsc --noEmit: PASS / FAIL
- npm run build: PASS / FAIL

PHASE 6 VERDICT: PASS / FAIL
```

---
---

# PHASE 7 PROMPT — Final Production Gate

```
@workspace AUTHORITATIVE REFERENCE: Before doing anything else, read the file AutoLenis_Production_Readiness_Plan.md in this repository. Find the section titled "Phase 7 — Performance, Observability, and Pre-Launch Gate". That section defines subsections 7.1 (Build and Type Safety), 7.2 (Core Web Vitals), 7.3 (Observability Readiness), and 7.4 (Pre-Launch Final Gate Checklist). This is the final gate. Every item in Section 7.4's Pre-Launch Final Gate Checklist must be verified.

You are executing Phase 7 — the final production readiness gate for AutoLenis. All previous phases must have passed before this phase is run. This phase produces the authoritative signed-off production readiness report.

DOCUMENT-DRIVEN EXECUTION:

PLAN SECTION 7.1 — Build and Type Safety
The plan requires: "npx tsc --noEmit, npm run build, npm run lint, npm run test — all must pass clean."

Execute in this exact sequence:

Command 1: npx tsc --noEmit
Expected: zero errors
If errors exist: identify which phase introduced them, fix them, re-run before proceeding
Report: error count, error list if any

Command 2: npm run build
Expected: successful completion, no errors
Report: build success/failure, bundle summary, any warnings

Command 3: npm run lint
Expected: zero new errors (pre-existing warnings from before Phase 5/6 are acceptable — new ones are not)
Report: error count, new vs pre-existing

Command 4: npm run test (or npx vitest run)
The plan confirms: 211 test files
Expected: all pass
Report: tests run, passed, failed, skipped. If any fail: identify whether pre-existing or introduced by recent changes.

PLAN SECTION 7.2 — Core Web Vitals
The plan defines 3 targets. These cannot be verified from within the codebase — report what can be assessed statically:
- LCP < 2.5s: Identify any large images, non-optimized assets, or blocking resources on the homepage that could impact LCP
- INP < 200ms: Identify any heavy client-side JavaScript on the qualification estimate strip or buyer console preview
- CLS < 0.1: Identify any layout-shifting elements (images without dimensions, dynamic content without reserved space)

Note: Full Core Web Vitals verification requires running against the live URL in production. Flag this as requiring post-deploy verification via Vercel Analytics or PageSpeed Insights.

PLAN SECTION 7.3 — Observability Readiness
Work through each checklist item from the plan:
- Error monitoring: find Sentry or equivalent configuration. Confirm it is configured for the production environment (DSN set via env var, not hardcoded)
- Vercel logs: confirm no code suppresses or intercepts Vercel's built-in logging
- Database connection pool: find Prisma client instantiation — confirm connection pool size is configured appropriately (not using default unlimited)
- Cron execution logs: confirm cron routes write identifiable log output that can be found in Vercel cron logs
- Stripe webhook monitoring: note that this requires Vercel dashboard access — flag for manual verification
- Resend delivery monitoring: note that this requires Resend dashboard access — flag for manual verification

PLAN SECTION 7.4 — Pre-Launch Final Gate Checklist
This is the definitive checklist. The plan organizes it into 6 categories. Work through every item in every category:

INFRASTRUCTURE (5 items from plan):
- All production environment variables set and verified → cross-reference Phase 1 PASS
- Database migrations fully deployed → cross-reference Phase 1 PASS
- No pending schema drift → cross-reference Phase 1 PASS
- All 6 cron jobs scheduled and verified → cross-reference Phase 1 PASS
- Cron routes protected against unauthorized calls → cross-reference Phase 1 PASS

INTEGRATIONS (5 items from plan):
- Stripe LIVE keys active, webhooks verified → cross-reference Phase 2 PASS
- DocuSign production endpoint active, JWT auth working → cross-reference Phase 2 PASS
- Resend domain verified, email delivery confirmed → cross-reference Phase 2 PASS
- MicroBilt production endpoint active, soft pull working → cross-reference Phase 2 PASS
- Supabase production project active → cross-reference Phase 2 PASS

FLOWS (4 items from plan):
- Full buyer lifecycle completed end-to-end (Stage 1–12) → cross-reference Phase 3 PASS
- Dealer onboarding and offer submission completed → cross-reference Phase 4 PASS
- Affiliate referral attribution confirmed → cross-reference Phase 4 PASS
- Admin actions (override, refund, approve, suspend) all tested → cross-reference Phase 4 PASS

SECURITY (6 items from plan):
- All route protection verified → cross-reference Phase 6 PASS
- CSRF active → cross-reference Phase 6 PASS
- Admin MFA active → cross-reference Phase 6 PASS
- Financial amounts server-enforced → cross-reference Phase 6 PASS
- SSN encryption confirmed → cross-reference Phase 6 PASS
- Webhook signatures verified → cross-reference Phase 6 PASS

QUALITY (6 items from plan):
- TypeScript: zero errors → confirm from Section 7.1 above
- Build: clean → confirm from Section 7.1 above
- Tests: all passing → confirm from Section 7.1 above
- StatsBlock replacement deployed → search for "Buyers Served", "Avg. Saved", "Satisfaction", "Dealer Partners" — these strings must NOT appear in rendered output. Confirm "~5 Min", "1–2 Days", "$499 Flat", "$0" are present in app/page.tsx.
- Operations report: stub resolved → cross-reference Phase 5 Issue 1 PASS
- Error boundaries for public routes → cross-reference Phase 5 Issue 2 PASS

LEGAL / COMPLIANCE (5 items from plan):
- Terms of Service live and linked → confirm /legal/terms exists and is linked in footer
- Privacy Policy live and linked → confirm /legal/privacy exists and is linked in footer
- Dealer Terms live and linked → confirm /legal/dealer-terms exists and is linked in footer
- Compliance disclaimer on homepage accurate → read the disclaimer on app/page.tsx, confirm it matches the platform's actual operating model (not a lender, not a dealer, third-party approval)
- Prequal consent flow stores explicit consent before any soft pull → cross-reference Phase 6 Section 6.5 PASS

PRODUCTION READINESS SCORE:
Calculate using the plan's scoring framework:

| Area | Max Points | Points Earned | Basis |
|---|---|---|---|
| Environment Config (Phase 1) | 15 | | Phase 1 verdict |
| Integration Code (Phase 2) | 20 | | Phase 2 verdict |
| Buyer Lifecycle Gates (Phase 3) | 25 | | Phase 3 verdict |
| Portal Completeness (Phase 4) | 15 | | Phase 4 verdict |
| Security Controls (Phase 6) | 15 | | Phase 6 verdict |
| Known Issues Resolved (Phase 5) | 5 | | Phase 5 verdict |
| Build/Tests Passing (Phase 7.1) | 5 | | Phase 7.1 results |
| TOTAL | 100 | | |

Scoring guidance:
- A phase that passed with zero blockers earns full points
- A phase that passed with minor warnings earns 80% of points
- A phase that had blockers that were fixed earns 90% of points
- A phase with unresolved blockers earns 0 points for that area

REQUIRED FINAL OUTPUT — The Signed Production Readiness Report:

═══════════════════════════════════════════════════════
AUTOLENIS PRODUCTION READINESS REPORT
═══════════════════════════════════════════════════════
Platform: AutoLenis
Audit Authority: AutoLenis_Production_Readiness_Plan.md
Audit Date: [date]
Phases Completed: 1 through 7

SECTION 1 — BUILD STATUS
TypeScript errors: [0 / N]
Build result: [PASS / FAIL]
Test results: [N passed / N failed / N skipped of 211 files]
Lint result: [PASS / N new errors]

SECTION 2 — PLATFORM INVENTORY
Total pages: [actual] vs 256 expected → [MATCH / VARIANCE: explain]
Total API routes: [actual] vs 467 expected → [MATCH / VARIANCE: explain]
Email templates: [actual] vs 17 expected → [MATCH / VARIANCE: explain]
AI module files: [actual] vs 38 expected → [MATCH / VARIANCE: explain]
Cron routes: [actual] vs 14 expected → [MATCH / VARIANCE: explain]

SECTION 3 — LIFECYCLE GATE STATUS
No prequal → no budget search: [CONFIRMED / FAILED]
No deposit → no auction: [CONFIRMED / FAILED]
No selected offer → no deal: [CONFIRMED / FAILED]
No fee resolution → no downstream: [CONFIRMED / FAILED]
Insurance gates contract only: [CONFIRMED / FAILED]
CONTRACT_APPROVED before SIGNING_PENDING: [CONFIRMED / FAILED]
SIGNED before pickup: [CONFIRMED / FAILED]

SECTION 4 — SECURITY CONTROL STATUS
Route protection enforced: [CONFIRMED / FAILED]
CSRF active: [CONFIRMED / FAILED]
Admin TOTP MFA active: [CONFIRMED / FAILED]
Financial amounts server-enforced: [CONFIRMED / FAILED]
SSN encrypted before DB write: [CONFIRMED / FAILED]
Webhook signatures verified: [CONFIRMED / FAILED]
Ownership checks on all data routes: [CONFIRMED / FAILED]

SECTION 5 — KNOWN ISSUES STATUS (per plan)
Issue 1 — Operations Report: [IMPLEMENTED / REMOVED FROM NAV / OUTSTANDING]
Issue 2 — Error Boundaries: [4 FILES CREATED / OUTSTANDING]
Issue 3 — Console Statements: [TOP 5 FILES MIGRATED / OUTSTANDING]
Issue 4 — Middleware Backups: [DELETED / NOT FOUND / OUTSTANDING]
Issue 5 — Audit Files: [MOVED TO /docs/audits/ / OUTSTANDING]
Issue 6 — any Types: [HIGH-RISK FILES REMEDIATED / OUTSTANDING]

SECTION 6 — PRE-LAUNCH CHECKLIST STATUS (plan Section 7.4)
Infrastructure: [5/5 PASS / N/5 with details]
Integrations: [5/5 PASS / N/5 with details]
Flows: [4/4 PASS / N/4 with details]
Security: [6/6 PASS / N/6 with details]
Quality: [6/6 PASS / N/6 with details]
Legal/Compliance: [5/5 PASS / N/5 with details]

SECTION 7 — PRODUCTION READINESS SCORE
Environment Config: [N]/15
Integration Code: [N]/20
Buyer Lifecycle Gates: [N]/25
Portal Completeness: [N]/15
Security Controls: [N]/15
Known Issues: [N]/5
Build/Tests: [N]/5
TOTAL: [N]/100

SECTION 8 — VERDICT
[PRODUCTION READY — Score: N/100. All blockers resolved. Platform cleared for launch.]
OR
[NOT READY — Score: N/100. Unresolved blockers listed below.]

SECTION 9 — UNRESOLVED BLOCKERS (if any)
[List each unresolved blocker with: plan section | requirement | current state | action needed | estimated effort]

SECTION 10 — RECOMMENDED NEXT STEP
[If PRODUCTION READY]: Deploy to production. Execute Post-Launch Sprint per plan's 7-item post-launch checklist within 30 days.
[If NOT READY]: Resolve blockers listed in Section 9. Re-run Phase [N] prompt(s) for affected phases. Re-run Phase 7 after all blockers are resolved.
═══════════════════════════════════════════════════════
```

---
---

## PHASE EXECUTION TRACKER

Update this table after each phase completes. Do not proceed to the next phase until the current phase shows PASS with zero blockers.

| Phase | Plan Section | Focus | Status | Blockers Found | Blockers Resolved |
|---|---|---|---|---|---|
| 1 | §1 | Environment & Infrastructure | ☐ | | |
| 2 | §2 | Third-Party Integrations | ☐ | | |
| 3 | §3 | Buyer Lifecycle Gates | ☐ | | |
| 4 | §4 | Portal Surface Verification | ☐ | | |
| 5 | §5 | Known Issues Resolution | ☐ | | |
| 6 | §6 | Security Hardening | ☐ | | |
| 7 | §7 | Final Production Gate | ☐ | | |

**Platform is production-ready when Phase 7 scores ≥ 95/100 and Section 9 of the report is empty.**

---

## RULES FOR USING THESE PROMPTS

1. `AutoLenis_Production_Readiness_Plan.md` must be in the repository before running any prompt — Copilot reads it as its authority document
2. Paste each prompt exactly as written — do not summarize or shorten it
3. One phase per Copilot session — never combine phases
4. If Copilot reports blockers, fix them and re-run the same phase prompt before advancing
5. After Phase 5 and Phase 6 make code changes: `npx tsc --noEmit` and `npm run build` must pass before Phase 7
6. Phase 7's scored report is the authoritative launch decision document
