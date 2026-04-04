# Settings Inventory

> Auto-generated audit of all Settings surfaces across AutoLenis dashboards.

## Summary

| Dashboard | Settings Page | API Route | Status |
|-----------|--------------|-----------|--------|
| Buyer | `/buyer/settings` | `/api/buyer/profile`, `/api/auth/change-password`, `/api/auth/mfa/*` | ✅ Working |
| Dealer | `/dealer/settings` | `/api/dealer/settings`, `/api/auth/change-password`, `/api/auth/mfa/*` | ✅ Working |
| Affiliate | `/affiliate/portal/settings` | `/api/affiliate/settings`, `/api/auth/change-password` | ✅ Working |
| Affiliate (redirect) | `/affiliate/settings` | N/A (redirects to portal) | ✅ Working |
| Admin | `/admin/settings` | `/api/admin/settings` | ✅ Working |
| Admin | `/admin/settings/roles` | N/A (read-only UI) | ✅ Working |
| Admin | `/admin/settings/integrations` | N/A (read-only UI) | ✅ Working |
| Admin | `/admin/settings/branding` | `/api/admin/settings` | ✅ Working |

## Detailed Inventory

### Buyer Settings (`/buyer/settings`)

- **File**: `app/buyer/settings/page.tsx`
- **Owning Role**: `BUYER`
- **Auth Guard**: `ProtectedRoute` wrapper with `allowedRoles={["BUYER"]}`
- **Categories**:
  - Profile Information (first name, last name, email, phone)
  - Notification Preferences (email, SMS, marketing toggles)
  - Security (password change with validation, 2FA enable/disable with QR code)
  - Danger Zone (account deletion placeholder)
- **API Endpoints**:
  - `GET /api/auth/me` — load user info
  - `PATCH /api/buyer/profile` — update profile
  - `POST /api/auth/change-password` — change password
  - `POST /api/auth/mfa/enroll` — enroll MFA
  - `POST /api/auth/mfa/verify` — verify MFA
  - `POST /api/auth/mfa/disable` — disable MFA
- **Error Handling**: Uses `extractApiError()` utility; toast notifications for success/error
- **Loading State**: Spinner on initial load

### Dealer Settings (`/dealer/settings`)

- **File**: `app/dealer/settings/page.tsx`
- **Owning Role**: `DEALER`, `DEALER_USER`
- **Auth Guard**: Server-side role check in API route
- **Categories**:
  - Business Information (business name, phone, email, address, city, state, postal code)
  - Notification Preferences (auction invites, offer selected, contract issues, pickup reminders)
  - Security (password change with inline validation, 2FA enrollment with QR code)
- **API Endpoints**:
  - `GET /api/dealer/settings` — load dealer settings (via SWR)
  - `PATCH /api/dealer/settings` — update business info & notifications
  - `POST /api/auth/change-password` — change password
  - `POST /api/auth/mfa/enroll` — enroll MFA
  - `POST /api/auth/mfa/verify` — verify MFA
- **Error Handling**: Toast notifications; skeleton loading; error state with retry prompt
- **Loading State**: Animated skeleton cards

### Affiliate Settings (`/affiliate/portal/settings`)

- **File**: `app/affiliate/portal/settings/page.tsx`
- **Redirect**: `app/affiliate/settings/page.tsx` → client-side redirect via `router.replace()`
- **Owning Role**: `AFFILIATE`, `AFFILIATE_ONLY`, `BUYER` (with `is_affiliate`)
- **Auth Guard**: Server-side role check in API route (`getAffiliateAccess()`)
- **Categories**:
  - Profile Information (first name, last name, email, phone)
  - Notification Preferences (new referral, commission earned, payout processed, weekly report)
  - Security (password change with inline error messages)
- **API Endpoints**:
  - `GET /api/affiliate/settings` — load affiliate profile
  - `PATCH /api/affiliate/settings` — update profile (updates both `User` and `Affiliate` tables)
  - `POST /api/auth/change-password` — change password
- **Error Handling**: Uses `extractApiError()` utility; inline password errors; toast notifications
- **Loading State**: Spinner on initial load

### Admin System Settings (`/admin/settings`)

- **File**: `app/admin/settings/page.tsx`
- **Owning Role**: Admin roles (checked via `isAdminRole()`)
- **Categories**:
  - Payment Settings (deposit amount, concierge fees for two OTD tiers)
  - Auction Settings (default auction duration in hours)
  - Navigation links to sub-pages: Roles, Integrations, Branding
- **API Endpoints**:
  - `GET /api/admin/settings` — load system settings
  - `POST /api/admin/settings` — update individual setting (key/value with whitelist validation)
- **Input Validation**: Whitelist of allowed setting keys; rejection of null/undefined values
- **Structured Logging**: `settings.read`, `settings.update`, `settings.read_error`, `settings.update_error`
- **Error Handling**: Inline success/error banners; disabled button during save
- **Loading State**: Spinner with `Loader2` icon

### Admin Roles Settings (`/admin/settings/roles`)

- **File**: `app/admin/settings/roles/page.tsx`
- **Owning Role**: Admin
- **Categories**: Role Management (Super Admin, Admin, Support) — read-only display
- **Breadcrumb**: Dashboard → Settings → Roles

### Admin Integrations (`/admin/settings/integrations`)

- **File**: `app/admin/settings/integrations/page.tsx`
- **Owning Role**: Admin
- **Categories**: Integration status display (Stripe, Resend, Supabase, DocuSign)
- **Breadcrumb**: Dashboard → Settings → Integrations

### Admin Branding (`/admin/settings/branding`)

- **File**: `app/admin/settings/branding/page.tsx`
- **Owning Role**: Admin
- **Categories**: Site name, tagline, description, primary/accent colors
- **API Endpoints**: `POST /api/admin/settings` (key: `branding`, value: branding object)
- **Error Handling**: Inline success/error banners; disabled button during save
- **Breadcrumb**: Dashboard → Settings → Branding

## Navigation Links

| Source | Target | Status |
|--------|--------|--------|
| Buyer layout sidebar | `/buyer/settings` | ✅ Linked |
| Dealer layout sidebar | `/dealer/settings` | ✅ Linked |
| Affiliate portal layout | `/affiliate/portal/settings` | ✅ Linked |
| Admin layout sidebar | `/admin/settings` | ✅ Linked |
| Admin settings page cards | `/admin/settings/roles` | ✅ Linked |
| Admin settings page cards | `/admin/settings/integrations` | ✅ Linked |
| Admin settings page cards | `/admin/settings/branding` | ✅ Linked |
| Roles breadcrumb | `/admin/settings` | ✅ Linked |
| Integrations breadcrumb | `/admin/settings` | ✅ Linked |
| Branding breadcrumb | `/admin/settings` | ✅ Linked |

## Test Coverage

| Test Type | File | Settings Tests |
|-----------|------|---------------|
| Unit | `__tests__/admin-settings-validation.test.ts` | 9 tests: key whitelist, value validation |
| E2E | `e2e/admin-smoke.spec.ts` | Page loads, sub-pages, API auth, key/value validation |
| E2E | `e2e/buyer-smoke.spec.ts` | Page load, password section, MFA section, API auth |
| E2E | `e2e/dealer-smoke.spec.ts` | Page load (in route list), API auth |
| E2E | `e2e/affiliate-portal.spec.ts` | Page load, redirect, API auth |
