---
applyTo: "proxy.ts|middleware.ts|lib/auth*.ts|lib/admin-auth.ts|app/api/auth/**|app/api/admin/auth/**"
---
# Auth + RBAC (Non-Negotiable)

## Role Isolation
- Do NOT widen role access. Preserve strict buyer/dealer/affiliate/admin isolation.
- Role constants and guards live in `lib/authz/roles.ts` — always use `isAdminRole()`, `isDealerRole()`, `isAffiliateRole()` helpers; never compare role strings directly.
- The role hierarchy is: `SUPER_ADMIN > COMPLIANCE_ADMIN > ADMIN > DEALER > DEALER_USER > AFFILIATE > AFFILIATE_ONLY > BUYER`. Never grant lower roles access to higher-role resources.

## Authentication Invariants
- Email verification enforcement must remain intact for all roles.
- Session tokens are HS256 JWTs signed with `JWT_SECRET`; verify with `verifySession()` from `lib/auth.ts`.
- JWT payload must include: `id`, `userId`, `email`, `role`, `workspace_id`, `workspace_mode`, `session_version`, `mfa_verified`.
- Session version checks must be performed on sensitive operations to detect revoked sessions.

## MFA Requirements
- Admin auth must preserve MFA requirements if present — `mfa_verified` must be `true` for admin-level mutations.
- MFA enrollment flow must not leak factor secrets in logs or error responses.
- MFA bypass must be impossible without a valid factor verification.

## Defense in Depth
- Every API route handler must independently verify auth even if middleware has already checked — never rely solely on middleware.
- Never derive roles or permissions from client-supplied headers or cookies beyond the session token.
- Password reset tokens must be single-use and time-limited.

## Testing Requirements
- Add negative tests for:
  - Wrong-role access to protected routes (e.g., BUYER accessing admin endpoints).
  - Missing/expired session returning 401 with correct error shape.
  - Forbidden access returning 403 with correct error shape.
  - Session version mismatch (revoked session) returning 401.
  - MFA-required routes rejecting non-MFA-verified sessions.
