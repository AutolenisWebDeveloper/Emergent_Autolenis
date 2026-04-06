# AutoLenis Test Credentials

## Buyer Test Account
- **Email:** autolenis01@gmail.com
- **Password:** Louis101$
- **Role:** BUYER
- **User ID:** cmie2i2wh0000ju04613b8x03
- **Login Endpoint:** POST /api/auth/signin

## Admin Test Account (RBAC Validation)
- **Email:** rbac_admin@autolenis-test.com
- **Password:** TestPass123$
- **Role:** ADMIN
- **User ID:** 7d129d9e-1fb1-4769-92f0-59a2ecc5ab08
- **Login Endpoint:** POST /api/admin/auth/signin

## Dealer Test Account (RBAC Validation)
- **Email:** rbac_dealer@autolenis-test.com
- **Password:** TestPass123$
- **Role:** DEALER
- **User ID:** 7fdff8fe-891f-4b2c-9c96-b181164c4fd8
- **Dealer Entity ID:** b7e777aa-5ebe-4213-b168-f6bc8f6f8dac
- **Login Endpoint:** POST /api/auth/signin

## Auth Flow
- Buyer/Dealer: Login at /auth/signin (UI) or POST /api/auth/signin (API)
- Admin: Login at /admin/sign-in (UI) or POST /api/admin/auth/signin (API)
- Session stored in httpOnly `session` cookie
- Admin session stored in httpOnly `admin_session` cookie

## Database Connection
- Supabase URL: https://vpwnjibcrqujclqalkgy.supabase.co
- Connection verified: Yes

## RBAC Validation Status (2026-04-06)
- Buyer → Dealer pages: Blocked (redirect)
- Buyer → Admin pages: Blocked (access denied)
- Dealer → Buyer pages: Blocked (redirect)
- Dealer → Admin pages: Blocked (access denied)
- Admin → Buyer pages: Blocked (redirect)
- Admin → Dealer pages: Blocked (redirect)
- Cross-role API calls: Blocked (401/403)
