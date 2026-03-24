# Error Log — AutoLenis Platform

> Generated: 2026-02-19 | Full-stack validation audit.

---

## 1. TypeScript Type-Check Output

```
$ npx tsc --noEmit
(no errors)
Exit code: 0
```

✅ TypeScript compilation passes with zero errors.

---

## 2. ESLint Output

```
$ npx eslint . --max-warnings=999

components/auth/auth-debug-drawer.tsx
  32:5  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/set-state-in-effect')

components/guards/deal-visibility-guard.tsx
  42:5  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/set-state-in-effect')

components/layout/public-nav.tsx
  19:5  warning  Unused eslint-disable directive (no problems were reported from 'react-hooks/set-state-in-effect')

✖ 3 problems (0 errors, 3 warnings)
  0 errors and 3 warnings potentially fixable with the `--fix` option.

Exit code: 0
```

✅ 0 errors, 3 minor warnings (unused eslint-disable directives).

---

## 3. Unit Test Output (Vitest)

```
$ npx vitest run --reporter=verbose

 Test Files  43 passed (43)
      Tests  993 passed (993)
   Start at  07:53:53
   Duration  30.04s

Exit code: 0
```

✅ All 993 tests pass across 43 test files.

**Stderr notes** (non-fatal, expected):
```
[SEO] Supabase client unavailable — returning static fallback sitemap
```
(3 instances from `__tests__/seo.test.ts` — expected behavior when running without DB)

---

## 4. Critical Code Risks

### 🔴 CRITICAL

#### 4.1 Placeholder Supabase credentials on env failure

- **File:** `lib/db.ts`, lines ~21, ~38
- **Issue:** When environment variables are missing, the code returns a Supabase client initialized with `https://placeholder.supabase.co` and `placeholder-key` instead of throwing an error.
- **Impact:** Silent data-layer failure in production. All DB operations would fail quietly or return unexpected results.
- **Risk:** Data loss, silent auth bypass, incorrect state.

#### 4.2 Unhandled Promise Rejections in fetch calls (~100+ instances)

- **Files:** `app/dealer/leads/page.tsx`, `app/buyer/search/page.tsx`, `app/admin/seo/pages/page.tsx`, and 50+ more
- **Pattern:** `const fetcher = (url: string) => fetch(url).then((res) => res.json())` — no `.catch()` handler
- **Impact:** Network failures cause unhandled promise rejections → UI crashes or silent data loss.

#### 4.3 TODO: AI disable feature not wired to database

- **File:** `lib/ai/gemini-client.ts`, line ~167
- **Comment:** `TODO: Wire to database or admin configuration table`
- **Issue:** `isAiDisabledForUser()` always returns `false` — the per-user AI disable feature is a stub.
- **Impact:** Security/compliance feature is non-functional.

#### 4.4 Empty catch blocks (~30 instances)

- **Files:**
  - `components/ai/admin-ai-panel.tsx`
  - `components/layout/logout-button.tsx`
  - `proxy.ts`
  - `lib/ai/persistence.ts`
  - `lib/services/email.service.tsx` (lines 118–120)
  - `lib/email/triggers.ts` (9 catch blocks)
- **Pattern:** `} catch (err) { }` or `} catch (error) { /* swallow */ }`
- **Impact:** Errors silently swallowed; failed operations invisible to monitoring.

#### 4.5 Missing request body validation on public endpoints

- **File:** `app/api/dealer/register/route.ts`, line ~13
- **Pattern:** `const body = await req.json()` with no schema validation
- **Impact:** Malformed JSON or missing fields → unhandled exceptions → 500 errors. DoS risk.

### ⚠️ HIGH

#### 4.6 `catch (error: any)` bypasses TypeScript safety (~15 instances)

- **Files:** `app/api/webhooks/stripe/route.ts:23`, `app/api/auth/signin/route.ts`, and others
- **Impact:** Type-unsafe error handling; unpredictable error messages in responses.

#### 4.7 Missing optional chaining on API response fields

- **File:** `app/api/affiliate/dashboard/route.ts`, line ~50
- **Pattern:** `affiliate.referralLink` without null check
- **Impact:** Runtime crash if `affiliate` is null/undefined.

#### 4.8 Hardcoded external service URLs

| URL | File | Risk |
|-----|------|------|
| `https://api.qrserver.com/v1/create-qr-code/` | `lib/admin-auth.ts:192` | 3rd-party dependency, no fallback |
| `https://esign.autolenis.com/sign/` | `lib/services/esign.service.ts` | Hardcoded production URL |
| `https://openroadlending.com/apply` | `app/api/refinance/check-eligibility/route.ts` | External partner URL |

#### 4.9 Incomplete error logging in email service

- **File:** `lib/services/email.service.tsx`, lines 118–120
- **Pattern:** `.catch(() => { // swallow - logging must never throw })`
- **Impact:** Failed email sends are invisible; no alerting possible.

#### 4.10 Race conditions in parallel database queries

- **File:** `app/api/affiliate/dashboard/route.ts`, lines 80+
- **Issue:** Multiple parallel Supabase queries without proper error aggregation (Promise.all with no catch).
- **Impact:** Partial failures silently ignored; dashboard may show stale/incorrect data.

---

## 5. TODO / FIXME Markers

| File | Line | Comment |
|------|------|---------|
| `lib/ai/gemini-client.ts` | ~167 | `TODO: Wire to database or admin configuration table` |

Only 1 TODO/FIXME found related to core features.

---

## 6. Navigation Check

All 101 navigation links verified — 0 broken links found. The `/buyer/onboarding` page exists at `app/buyer/onboarding/page.tsx`.

---

## 7. Schema / Code Mismatches

| Issue | Details |
|-------|---------|
| `contact_messages` table | Created in SQL migration 96 but NOT in Prisma schema |
| `_connection_canary` table | Created in SQL migration 95 but NOT in Prisma schema |
| Legacy DealStatus values | Code has normalizer for removed enum values (PENDING_FINANCING, etc.) |
| Prisma vs Supabase | Prisma schema defines DDL; runtime uses Supabase client — no Prisma Client at runtime |

---

## 8. Admin Links Exposed in Public Footer

- **File:** `components/layout/public-footer.tsx`, lines ~120–128
- **Issue:** `/admin/sign-in` and `/admin/signup` links visible to all visitors
- **Risk:** Information disclosure; invites unauthorized admin registration attempts

---

## Summary

| Category | Count |
|----------|-------|
| TypeScript errors | 0 |
| ESLint errors | 0 |
| ESLint warnings | 3 |
| Test failures | 0 / 993 |
| Critical code risks | 5 |
| High code risks | 5 |
| TODOs on core features | 1 |
| Broken nav links | 0 |
| Schema mismatches | 4 |
