# Settings Verification

> Verification steps and commands for all Settings surfaces.

## Build & Lint

```bash
# Lint all files
pnpm lint

# Type checking
pnpm typecheck

# Production build
pnpm build
```

Expected: All three commands exit with code 0.

## Unit Tests

```bash
# Run all unit tests
pnpm test

# Run settings-specific unit tests
npx vitest run __tests__/admin-settings-validation.test.ts
```

Expected output:
```
✓ __tests__/admin-settings-validation.test.ts (9 tests)
Test Files  1 passed (1)
     Tests  9 passed (9)
```

## E2E Tests

```bash
# Run all Playwright e2e tests
pnpm test:e2e

# Run specific settings smoke tests
pnpm exec playwright test e2e/admin-smoke.spec.ts
pnpm exec playwright test e2e/buyer-smoke.spec.ts
pnpm exec playwright test e2e/dealer-smoke.spec.ts
pnpm exec playwright test e2e/affiliate-portal.spec.ts
```

### Settings-specific E2E tests included:

**Admin** (`e2e/admin-smoke.spec.ts`):
- `admin settings page loads without 500`
- `admin settings sub-pages load without 500` (roles, integrations, branding)
- `admin settings API requires authentication`
- `admin settings API rejects invalid keys`
- `admin settings API rejects null values`

**Buyer** (`e2e/buyer-smoke.spec.ts`):
- `settings page has password change section`
- `settings page has MFA section`
- `change password API validates input`
- `MFA enroll API requires authentication`

**Dealer** (`e2e/dealer-smoke.spec.ts`):
- `dealer settings API requires authentication`

**Affiliate** (`e2e/affiliate-portal.spec.ts`):
- `affiliate settings page loads`
- `affiliate settings API requires authentication`
- `affiliate settings redirect works`

## Manual Verification Checklist

### Admin Settings (`/admin/settings`)

- [ ] Page loads with spinner, then displays current settings values from API
- [ ] Navigation cards link to Roles, Integrations, and Branding sub-pages
- [ ] Edit deposit amount → click Save → success feedback shown
- [ ] Reload page → updated value persists
- [ ] Save with invalid (negative) value → error feedback shown
- [ ] Non-admin users receive 401 from `/api/admin/settings`

### Admin Settings — Roles (`/admin/settings/roles`)

- [ ] Page renders with breadcrumb navigation
- [ ] Breadcrumb "Settings" link navigates back to `/admin/settings`
- [ ] Role cards display correctly (Super Admin, Admin, Support)

### Admin Settings — Integrations (`/admin/settings/integrations`)

- [ ] Page renders with breadcrumb navigation
- [ ] Integration cards show connection status badges

### Admin Settings — Branding (`/admin/settings/branding`)

- [ ] Page renders with breadcrumb navigation
- [ ] Edit site name → click Save Changes → success feedback shown
- [ ] Non-admin users cannot access

### Buyer Settings (`/buyer/settings`)

- [ ] Page loads user profile via `/api/auth/me`
- [ ] Profile edit (name, email, phone) persists via `/api/buyer/profile`
- [ ] Password change works via `/api/auth/change-password`
- [ ] MFA enroll/disable works
- [ ] Non-buyer users are redirected (ProtectedRoute)

### Dealer Settings (`/dealer/settings`)

- [ ] Page loads dealer settings via SWR with skeleton loading
- [ ] Business info update persists
- [ ] Notification toggles save correctly
- [ ] Password change and 2FA enrollment work
- [ ] Non-dealer users receive 401

### Affiliate Settings (`/affiliate/portal/settings`)

- [ ] `/affiliate/settings` redirects to `/affiliate/portal/settings`
- [ ] Profile loads from `/api/affiliate/settings`
- [ ] Profile updates persist
- [ ] Password change works with inline error messages
- [ ] Non-affiliate users receive 401

## API Authorization Tests

| Endpoint | Method | Role Required | Unauthenticated Response |
|----------|--------|--------------|-------------------------|
| `/api/admin/settings` | GET | Admin | 401 |
| `/api/admin/settings` | POST | Admin | 401 |
| `/api/dealer/settings` | GET | DEALER, DEALER_USER | 401 |
| `/api/dealer/settings` | PATCH | DEALER, DEALER_USER | 401 |
| `/api/affiliate/settings` | GET | AFFILIATE, AFFILIATE_ONLY, BUYER+affiliate | 401 |
| `/api/affiliate/settings` | PATCH | AFFILIATE, AFFILIATE_ONLY, BUYER+affiliate | 401 |
| `/api/buyer/profile` | GET | BUYER | 401 |
| `/api/buyer/profile` | PATCH | BUYER | 401 |

## Input Validation Tests

### Admin Settings API (`POST /api/admin/settings`)

- Invalid key → 400 with `INVALID_KEY` error code
- Missing/null value → 400 with `INVALID_VALUE` error code
- Valid key + value → 200 with `{ success: true }`
- Only whitelisted keys accepted (14 keys + branding)
