# Auth Email Event Catalog

## Overview

All transactional emails in AutoLenis are sent via **Resend** and logged to both `email_log` (legacy) and `EmailSendLog` (idempotent). Every email includes:

- Clear subject line
- Preheader text (hidden preview text)
- Brand-consistent header (AutoLenis logo/wordmark)
- Concise value-focused body copy
- Primary CTA button
- Secondary fallback link (copy/paste URL)
- Compliance-safe disclaimers where applicable
- Complete footer (company name, support email, automated message notice)

## Idempotency

Every email send can include an `idempotencyKey`. If a key has already been successfully sent, the email is deduplicated (skipped) and the original result is returned. Keys are stored in the `EmailSendLog` table.

Key format: `{event_type}_{user_id}_{timestamp_or_unique_suffix}`

## Email Events

### A) Migration Notice (Campaign)
| Field | Value |
|-------|-------|
| **Type** | `migration_notice` |
| **Trigger** | Backfill script / admin campaign |
| **Subject** | "Account Security Upgrade — AutoLenis" |
| **CTA** | Sign In → `/auth/signin` |
| **Idempotency Key** | `migration_notice_{userId}` |
| **Function** | `sendMigrationNoticeEmail()` |

### B) Set Your Password (Backfill)
| Field | Value |
|-------|-------|
| **Type** | `set_password` |
| **Trigger** | Backfill script for users without Supabase auth |
| **Subject** | "Set Your Password — AutoLenis" |
| **CTA** | Set New Password → Supabase recovery link → `/auth/reset-password` |
| **Idempotency Key** | `set_password_{userId}` |
| **Function** | `sendSetPasswordEmail()` |

### C) Verify Email
| Field | Value |
|-------|-------|
| **Type** | `verification` |
| **Trigger** | User signup; auto-resend on sign-in attempt with unverified email (after credentials are verified) |
| **Subject** | "Verify Your AutoLenis Account" |
| **CTA** | Verify Email Address → `/auth/verify-email?token={token}` |
| **Idempotency Key** | `verify_on_signin::{userId}::{YYYY-MM-DDTHH}` (hour bucket, auto-resend on login only) |
| **Function** | `emailVerificationService.resendVerificationByEmail(email, idempotencyKey)` |
| **Notes** | Auto-resend fires only after password is verified (no enumeration risk). Within the same hour bucket, only one email is sent per user. IP-based throttle enforced by `rateLimits.signin`; user/email-level idempotency enforced in `EmailVerificationService`. |

### C2) Password Reset Requested (Forgot Password)
| Field | Value |
|-------|-------|
| **Type** | `password_reset` |
| **Trigger** | `POST /api/auth/forgot-password` |
| **Subject** | "Reset Your Password — AutoLenis" |
| **CTA** | Reset Password → `/auth/reset-password?token={token}` |
| **Idempotency Key** | `password_reset_{userId}_{timestamp}` |
| **Enum-Safe** | ✅ Returns generic `{ success: true }` regardless of user existence |
| **Function** | `sendPasswordResetEmail()` in `lib/email/triggers.ts` |

### D) Welcome (Role-Specific)
| Field | Value |
|-------|-------|
| **Type** | `welcome` |
| **Trigger** | After successful user creation (`POST /api/auth/signup`, `POST /api/admin/users`) |
| **Subject** | "Welcome to AutoLenis, {firstName}!" |
| **CTA** | Go to Dashboard → `/buyer/dashboard` (or role-specific) |
| **Idempotency Key** | `welcome_{userId}` |
| **Function** | `sendWelcomeEmail()` |

### D2) Admin Notification (New Signup)
| Field | Value |
|-------|-------|
| **Type** | `admin_notification` |
| **Trigger** | After new user signup — sent to `ADMIN_EMAIL` |
| **Subject** | "New {ROLE} signup on AutoLenis" |
| **Function** | `onUserCreated()` admin notification branch in `lib/email/triggers.ts:394` |

### E) Password Changed
| Field | Value |
|-------|-------|
| **Type** | `password_changed` |
| **Trigger** | After successful password reset or change |
| **Subject** | "Your AutoLenis Password Was Changed" |
| **CTA** | Sign In to Your Account → `/auth/signin` |
| **Idempotency Key** | `password_changed_{userId}_{timestamp}` |
| **Function** | `sendPasswordChangedEmail()` |
| **Security** | Includes alert banner + escalation instructions |

### F) MFA Enabled
| Field | Value |
|-------|-------|
| **Type** | `mfa_enabled` |
| **Trigger** | After TOTP verification succeeds during enrollment |
| **Subject** | "Two-Factor Authentication Enabled — AutoLenis" |
| **Idempotency Key** | `mfa_enabled_{userId}_{timestamp}` |
| **Function** | `sendMfaEnabledEmail()` |
| **Security** | Includes recovery code reminder |

### G) MFA Disabled
| Field | Value |
|-------|-------|
| **Type** | `mfa_disabled` |
| **Trigger** | After MFA is removed from account |
| **Subject** | "Two-Factor Authentication Disabled — AutoLenis" |
| **Idempotency Key** | `mfa_disabled_{userId}_{timestamp}` |
| **Function** | `sendMfaDisabledEmail()` |
| **Security** | Includes compromise warning |

### G) Admin New Device Login
| Field | Value |
|-------|-------|
| **Type** | `admin_new_device` |
| **Trigger** | Admin sign-in from new IP/device |
| **Subject** | "New Admin Login Detected — AutoLenis" |
| **Idempotency Key** | `admin_new_device_{userId}_{timestamp}` |
| **Function** | `sendAdminNewDeviceEmail()` |
| **Metadata** | IP address, user agent, timestamp |
| **Security** | Admin-only security notification |

### H) Role Changed
| Field | Value |
|-------|-------|
| **Type** | `role_changed` |
| **Trigger** | Admin changes a user's role |
| **Subject** | "Account Role Updated — AutoLenis" |
| **Idempotency Key** | `role_changed_{userId}_{newRole}_{timestamp}` |
| **Function** | `sendRoleChangedEmail()` |
| **Metadata** | Old role, new role |

### I) Break-Glass Use
| Field | Value |
|-------|-------|
| **Type** | `break_glass` |
| **Trigger** | Emergency override access by admin |
| **Subject** | "⚠️ Break-Glass Access Alert — AutoLenis" |
| **Idempotency Key** | `break_glass_{userId}_{timestamp}` |
| **Function** | `sendBreakGlassEmail()` |
| **Metadata** | Actor email, action, reason, timestamp |
| **Security** | Highest severity alert, requires post-incident review |

## Template Standards

All templates are:
- **Responsive**: Table-based layout, max-width 600px, mobile-friendly
- **Accessible**: Semantic HTML, role="presentation" on layout tables, sufficient color contrast
- **Dark-mode tolerant**: CSS `prefers-color-scheme: dark` media query support
- **Cross-client tested**: Gmail, Outlook, Apple Mail, iOS/Android mail apps
- **Branded**: Consistent AutoLenis header, indigo brand color (#4338ca), professional footer

## Disclaimers

Where applicable, emails include:
- "This is an automated message. Please do not reply directly to this email."
- "AutoLenis is an informational platform and does not provide legal or financial advice."
- Security escalation instructions for suspicious activity
- Compliance notes for break-glass and audit events
