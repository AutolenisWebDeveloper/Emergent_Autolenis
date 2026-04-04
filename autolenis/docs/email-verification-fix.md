# Email Verification Fix

## Root Cause

`onUserCreated` (in `lib/email/triggers.ts`) was called at signup and correctly sent the
welcome email, but **never called `emailVerificationService.createVerificationToken()`**.
As a result, no verification email was dispatched at registration time.

A secondary inconsistency existed: `createVerificationToken` used
`emailService.sendNotification` (a generic plain-text template) instead of
`emailService.sendEmailVerification` (the authoritative branded template that routes
through `sendVerificationEmail` in `triggers.ts`). This created two competing code paths
for verification email delivery.

## Architecture Decisions

### One Authoritative Verification Path

All verification emails now flow through a single path:

```
signup route
  └─ emailVerificationService.createVerificationToken()
       └─ emailService.sendEmailVerification(email, rawToken, userId)
            └─ sendVerificationEmail() in lib/email/triggers.ts
                 └─ sendEmail() → Resend SDK + EmailSendLog
```

The `resendVerificationByEmail` and `resendVerification` methods also call
`createVerificationToken`, so every verification send (signup, auto-resend on signin,
and manual resend) uses the same path.

### Signup Route Change

`app/api/auth/signup/route.ts` now fires `emailVerificationService.createVerificationToken()`
as a fire-and-forget alongside `onUserCreated`. Both are non-blocking — a failure in
either does not fail the signup HTTP response. Errors are logged via `logger.error`.

### Token Security (unchanged)

- Raw 32-byte crypto-random token → stored as SHA-256 hash in `email_verification_tokens`
- Raw token sent in verification link only; never stored in DB
- Tokens are single-use (`used_at` set on consumption)
- Prior tokens for a user are deleted before a new token is inserted

## Files Changed

| File | Change |
|------|--------|
| `app/api/auth/signup/route.ts` | Added `emailVerificationService.createVerificationToken()` call after signup |
| `lib/services/email-verification.service.ts` | `createVerificationToken` now calls `emailService.sendEmailVerification()` instead of `emailService.sendNotification()` |
| `__tests__/resend-verification.test.ts` | Updated mock from `sendNotification` to `sendEmailVerification`; updated token-security assertion to read token from argument index 1 |

## Environment Variables Required

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | Resend API key (required) |
| `FROM_EMAIL` | Verified sender address on Resend domain (required) |
| `NEXT_PUBLIC_APP_URL` | Base URL used in verification links (e.g. `https://autolenis.com`) |
| `DEV_EMAIL_TO` | Redirect all emails to this address in non-production environments |

## Verification Steps

1. Sign up a new user → check inbox for **"Verify Your AutoLenis Account"** email.
2. Click the verification link → expect redirect to `/auth/verify-email?success=true`.
3. Sign in → succeeds.
4. Sign in with an **unverified** account → expect 403 + "Resend verification email" button.
5. Click "Resend verification email" → check inbox for new link.
6. Click new link → verify success, then sign in.
7. Check `EmailSendLog` / `email_log` table for `type = "verification"` rows with `status = "sent"`.

## Rollback Plan

Revert the three changed files to their pre-fix state:

```bash
git revert HEAD   # or git checkout <prev-sha> -- app/api/auth/signup/route.ts \
                  #                               lib/services/email-verification.service.ts \
                  #                               __tests__/resend-verification.test.ts
```

No database migrations are required — this fix is entirely application-layer.
