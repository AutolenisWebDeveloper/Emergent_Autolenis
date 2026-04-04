# Reproduction Steps — AutoLenis Platform

> Generated: 2026-02-19 | Full-stack validation audit.

---

## Issue 1: Silent DB failure when Supabase env vars are missing

**Severity:** Critical
**Category:** Configuration / Runtime

### Steps to reproduce

1. Deploy the application WITHOUT setting `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Attempt any authenticated action (sign in, view dashboard, etc.)
3. Observe API calls

### Expected

Application fails fast with a clear error message indicating missing configuration.

### Actual

Application initializes with a placeholder Supabase client (`https://placeholder.supabase.co`). All DB operations fail silently or return unexpected errors without clear root cause indication.

### Root cause

`lib/db.ts` (lines ~21, ~38) returns a client with placeholder credentials instead of throwing an error.

### File reference

- Source: `lib/db.ts`, lines ~21 and ~38

---

## Issue 2: Admin registration publicly accessible

**Severity:** High
**Category:** Security / Access Control

### Steps to reproduce

1. Navigate to `https://<app-url>/admin/signup` (or click "Admin Sign Up" in footer)
2. Fill out the registration form
3. Submit

### Expected

Admin registration should be restricted (invite-only, or behind a bootstrap secret).

### Actual

The route exists and is linked from the public footer. Access control depends on `ADMIN_BOOTSTRAP_SECRET` being properly configured, but the link's public visibility invites probing.

### Root cause

- `components/layout/public-footer.tsx` exposes `/admin/sign-in` and `/admin/signup` links
- The endpoint exists at `app/admin/signup/page.tsx`

### File reference

- Footer: `components/layout/public-footer.tsx`, lines ~120–128
- Page: `app/admin/signup/page.tsx`

---

## Issue 3: AI per-user disable is a no-op

**Severity:** Medium
**Category:** Feature completeness

### Steps to reproduce

1. As admin, attempt to disable AI for a specific user (if such UI exists)
2. Switch to that user's session
3. Interact with AI features

### Expected

AI features should be disabled for that specific user.

### Actual

AI features remain active. The `isAiDisabledForUser()` function always returns `false`.

### Root cause

`lib/ai/gemini-client.ts`, line ~167: `TODO: Wire to database or admin configuration table` — the function is a stub.

### File reference

- Source: `lib/ai/gemini-client.ts`, line ~167

---

## Issue 4: Unhandled fetch errors can crash UI

**Severity:** High
**Category:** Error handling

### Steps to reproduce

1. Sign in as any user role (buyer, dealer, admin)
2. Navigate to a data-heavy page (e.g., `/buyer/search`, `/dealer/leads`, `/admin/seo/pages`)
3. Simulate network interruption (DevTools → Network → Offline)
4. Observe the page behavior

### Expected

Page shows an error state or fallback UI gracefully.

### Actual

Unhandled promise rejection; page may show blank content, loading spinner forever, or crash with a React error boundary.

### Root cause

~100+ `fetch()` calls use `.then(res => res.json())` without `.catch()` handlers.

### File reference

- Example: `app/buyer/search/page.tsx`, `app/dealer/leads/page.tsx`, `app/admin/seo/pages/page.tsx`

---

## Issue 5: Empty catch blocks hide failures

**Severity:** Medium
**Category:** Observability

### Steps to reproduce

1. Trigger any flow that involves email sending (e.g., sign up, password reset)
2. Configure email service to fail (invalid RESEND_API_KEY)
3. Attempt the flow
4. Check application logs

### Expected

Clear error logged indicating email send failure.

### Actual

No error logged. The catch block swallows the exception silently.

### Root cause

`lib/email/triggers.ts` has 9 catch blocks that swallow errors. `lib/services/email.service.tsx` lines 118–120: `.catch(() => { // swallow })`.

### File reference

- `lib/email/triggers.ts`
- `lib/services/email.service.tsx`, lines 118–120

---

## Issue 6: Dealer registration endpoint lacks input validation

**Severity:** High
**Category:** Security / Input validation

### Steps to reproduce

1. Send a POST request to `/api/dealer/register` with malformed or empty JSON body
2. Observe the response

### Expected

400 response with validation errors listing required fields.

### Actual

Likely 500 error due to unhandled exception when accessing missing fields from the body.

### Root cause

`app/api/dealer/register/route.ts`, line ~13: `const body = await req.json()` with no Zod schema or field validation.

### File reference

- Source: `app/api/dealer/register/route.ts`, line ~13
