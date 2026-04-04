# Email System Gap Report

**Generated:** 2026-02-27  
**Author:** Copilot (Principal Engineer, AutoLenis)  
**Scope:** All required auth/security emails + wired transactional emails

---

## Baseline: Required Email Types

| # | Email Type | Trigger Function | Template | Subject | Idempotency | Enum-Safe | Status |
|---|-----------|-----------------|---------|---------|-------------|-----------|--------|
| 1 | `verify_email` | `sendVerificationEmail()` | Inline HTML | "Verify Your AutoLenis Account" | `verification_{userId}_{Date.now()}` | N/A (not auth input) | ✅ |
| 2 | `set_password` | `sendSetPasswordEmail()` | Inline HTML | "Set Your Password — AutoLenis" | `set_password_{userId}` | N/A (admin trigger) | ✅ |
| 3 | `password_reset_requested` | `sendPasswordResetEmail()` | Inline HTML | "Reset Your Password — AutoLenis" | `password_reset_{userId}_{Date.now()}` | ✅ generic response | ✅ |
| 4 | `password_changed` | `sendPasswordChangedEmail()` | Inline HTML | "Your Password Was Changed — AutoLenis" | `password_changed_{userId}_{Date.now()}` | N/A | ✅ |
| 5 | `welcome` | `sendWelcomeEmail()` | Inline HTML | "Welcome to AutoLenis!" | `welcome_{userId}` | N/A | ✅ |
| 6 | `mfa_enabled` | `sendMfaEnabledEmail()` | Inline HTML | "Two-Factor Authentication Enabled — AutoLenis" | `mfa_enabled_{userId}_{Date.now()}` | N/A | ✅ |
| 7 | `mfa_disabled` | `sendMfaDisabledEmail()` | Inline HTML | "Two-Factor Authentication Disabled — AutoLenis" | `mfa_disabled_{userId}_{Date.now()}` | N/A | ✅ |
| 8 | `admin_new_device` | `sendAdminNewDeviceEmail()` | Inline HTML | "New Admin Login Detected — AutoLenis" | `admin_new_device_{userId}_{Date.now()}` | N/A | ✅ |
| 9 | `role_changed` | `sendRoleChangedEmail()` | Inline HTML | "Account Role Updated — AutoLenis" | `role_changed_{userId}_{newRole}_{Date.now()}` | N/A | ✅ |
| 10 | `break_glass` | `sendBreakGlassEmail()` | Inline HTML | "⚠️ Break-Glass Access Alert — AutoLenis" | `break_glass_{userId}_{Date.now()}` | N/A | ✅ |
| 11 | `migration_notice` | `sendMigrationNoticeEmail()` | Inline HTML | "Account Security Upgrade — AutoLenis" | `migration_notice_{userId}` | N/A | ✅ |
| 12 | `admin_notification` | `onUserCreated()` admin branch | Inline HTML | "New {ROLE} signup on AutoLenis" | via `sendEmail()` | N/A | ✅ |

---

## Trigger Wiring Audit

| Email Type | Trigger Path | Route/Function | Status |
|-----------|-------------|---------------|--------|
| `verify_email` | `app/api/auth/signup/route.ts` → `onUserCreated()` → `sendVerificationEmail()` | POST /api/auth/signup | ✅ |
| `verify_email` (resend) | `app/api/auth/resend-verification/route.ts` → `emailVerificationService.resendVerificationByEmail()` | POST /api/auth/resend-verification | ✅ |
| `set_password` | `scripts/backfill-set-password.ts` (admin script) | CLI / admin tool | ✅ |
| `password_reset_requested` | `app/api/auth/forgot-password/route.ts` → `passwordResetService.requestPasswordReset()` | POST /api/auth/forgot-password | ✅ |
| `password_changed` | `lib/services/password-reset.service.ts` → `emailService.sendPasswordChangedEmail()` | via reset confirm | ✅ |
| `welcome` | `app/api/auth/signup/route.ts` → `onUserCreated()` → `sendWelcomeEmail()` | POST /api/auth/signup | ✅ |
| `mfa_enabled` | `app/api/auth/mfa/verify/route.ts` → `sendMfaEnabledEmail()` | POST /api/auth/mfa/verify | ✅ (added) |
| `mfa_disabled` | `app/api/auth/mfa/disable/route.ts` → `sendMfaDisabledEmail()` | POST /api/auth/mfa/disable | ✅ (added) |
| `admin_new_device` | `app/api/admin/auth/signin/route.ts` (device fingerprint check) | POST /api/admin/auth/signin | ⚠️ Not yet wired to device check |
| `role_changed` | `app/api/admin/users/[userId]/role/route.ts` → `sendRoleChangedEmail()` | PATCH /api/admin/users/:id/role | ✅ (added) |
| `break_glass` | `app/api/admin/break-glass/route.ts` → `sendBreakGlassEmail()` | POST /api/admin/break-glass | ✅ (added) |
| `migration_notice` | `scripts/send-migration-notice.ts` (admin script) | CLI script | ✅ |
| `admin_notification` | `app/api/auth/signup/route.ts` → `onUserCreated()` | POST /api/auth/signup | ✅ |

---

## Idempotency Implementation

- **Mechanism:** `idempotencyKey` field passed to `sendEmail()` in `lib/email/triggers.ts`
- **Dedup check:** Before send, queries `EmailSendLog` table by `idempotency_key`; if status=`sent`, skips send and returns `deduplicated: true`
- **Persistence:** On send, upserts into `EmailSendLog` with conflict on `idempotency_key`
- **Fallback:** If `EmailSendLog` table doesn't exist, idempotency check is skipped (non-fatal)
- **Status:** ✅ All 12 required types include idempotency keys

---

## Enumeration Safety

| Endpoint | Safe? | Evidence |
|---------|-------|---------|
| POST /api/auth/forgot-password | ✅ | Returns generic `{ success: true, message: result.message }` regardless of user existence |
| POST /api/auth/resend-verification | ✅ | Returns `GENERIC_RESPONSE` regardless; silently bails if user not found |

---

## PII / Secret Logging Safety

- Tokens (`token`, `resetUrl`) are never logged — they appear only in email body
- Resend message IDs logged (not sensitive)
- Email addresses are logged as recipients (standard operational logging)
- `metadata` in `email_log` does not include raw tokens

---

## Gaps Remaining (Not in scope of this PR)

| Gap | Severity | Notes |
|-----|---------|-------|
| `admin_new_device` device fingerprint detection | ⚠️ Medium | Admin signin route exists but doesn't yet track known devices; `sendAdminNewDeviceEmail` is implemented and ready to wire once device fingerprint check is added |
| Unsubscribe links for marketing emails | ⚠️ Low | Not applicable to current email types (all transactional/security); add when marketing campaigns are added |

---

## Legend

- ✅ Implemented and working
- ⚠️ Partial / not yet wired
- ❌ Missing
