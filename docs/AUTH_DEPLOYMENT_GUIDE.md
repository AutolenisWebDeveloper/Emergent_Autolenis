# Auth Cross-Domain Fix - Deployment & Verification Guide

## Summary

This fix addresses authentication and session persistence issues across different deployment environments (v0 preview, Vercel previews, and autolenis.com production).

## Root Causes Identified

### 1. Session Isolation by Domain
**Problem**: Browser cookies are domain-scoped, so sessions created on one domain don't transfer to another.
- v0 preview (`*.v0.dev`) ≠ Vercel preview (`*.vercel.app`) ≠ Production (`autolenis.com`)

**Solution**: 
- ✅ Existing cookie configuration already handles this correctly
- Host-only cookies for preview environments (no cross-domain sharing)
- Domain-scoped cookies (`.autolenis.com`) for production subdomain sharing

### 2. Missing Runtime Validation
**Problem**: Environment variable issues only discovered after deployment when auth fails.

**Solution**: 
- ✅ NEW: Runtime validation (`lib/auth-runtime-validation.ts`)
- Validates JWT_SECRET strength (32+ characters)
- Checks Supabase connection variables
- Provides actionable error messages in server logs

### 3. No Monitoring/Debugging Tools
**Problem**: Hard to diagnose auth issues in deployed environments.

**Solution**:
- ✅ NEW: `/api/auth/health` endpoint for safe diagnostics
- ✅ NEW: SessionStatusBanner explains cross-domain behavior to users
- ✅ NEW: AuthDebugDrawer for developer troubleshooting

## Implementation Changes

### Backend (Auth Infrastructure)

#### 1. Runtime Environment Validation
**File**: `lib/auth-runtime-validation.ts`

Validates critical auth environment variables at runtime:
```typescript
export function validateAuthEnvironment(): AuthRuntimeCheck {
  // Validates:
  // - JWT_SECRET exists and is 32+ characters
  // - NEXT_PUBLIC_SUPABASE_URL is set
  // - SUPABASE_SERVICE_ROLE_KEY is set
  // - Production-specific checks
}
```

#### 2. Auth Health Endpoint
**File**: `app/api/auth/health/route.ts`

Returns safe diagnostic information:
```bash
GET /api/auth/health
```

Response includes:
- Environment type (localhost, preview, production)
- Cookie configuration (domain, secure, sameSite)
- Auth providers status (JWT, Supabase)
- Expected behavior explanation
- Common issues for the current domain

**Security**: No secrets exposed - only configuration metadata.

### Frontend (UX Components)

#### 1. SessionStatusBanner
**File**: `components/auth/session-status-banner.tsx`

Displays at top of all dashboards:
- **Unauthenticated**: Shows warning with "Sign in again" + "Open AutoLenis.com" buttons
- **Authenticated**: Subtle "Signed in as {email}" status

#### 2. AuthDebugDrawer
**File**: `components/auth/auth-debug-drawer.tsx`

Developer-only tool (visible when `NEXT_PUBLIC_ENV_BADGE=true`):
- Shows hostname, portal, path
- Displays cookie status, storage availability
- Explains cross-domain limitations
- Links to full auth health report

#### 3. ProtectedPageEmptyState
**File**: `components/auth/protected-page-empty-state.tsx`

Polished empty state for protected pages:
- Clear "Sign in required" message
- Explains cross-domain session behavior
- Provides sign-in and "Open AutoLenis.com" CTAs

### Layout Integration

All dashboard layouts updated:
- `app/buyer/layout-client.tsx`
- `app/dealer/layout-client.tsx`
- `app/admin/layout-client.tsx`
- `app/affiliate/portal/layout-client.tsx`

Each includes:
```typescript
<SessionStatusBanner portal="buyer|dealer|admin|affiliate" />
{children}
<AuthDebugDrawer portal="buyer|dealer|admin|affiliate" />
```

## Vercel Environment Variables

### Required in ALL Environments (Preview + Production)

```bash
# Auth - JWT Secret (CRITICAL)
JWT_SECRET=<generate a secure 32+ character random string>

# Supabase Connection (CRITICAL)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Service role key
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Anon key
```

### Recommended (for proper CORS and callbacks)

```bash
# Application URL
NEXT_PUBLIC_APP_URL=<deployment url>
```

**How to set in Vercel:**
- Preview: Let Vercel auto-set to preview URL, OR set explicitly if needed
- Production: Set to `https://autolenis.com`

### Optional (Development/Debugging)

```bash
# Enable debug drawer
NEXT_PUBLIC_ENV_BADGE=true
```

## Deployment Steps

### 1. Install Dependencies
```bash
pnpm install --frozen-lockfile
```

### 2. Build Verification
```bash
pnpm build
```

Expected output:
```
✓ Compiled successfully in ~18s
✓ Collecting page data
✓ Generating static pages
✓ Collecting build traces
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
├ ○ /                                    ...      ...
├ ○ /api/auth/health                     ...      ...
...
```

### 3. Set Vercel Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables:

1. Add all required variables (see above)
2. Select appropriate environments:
   - ✅ Production
   - ✅ Preview
   - ⬜ Development (local only)

3. Re-deploy after adding variables

### 4. Verify Deployment

#### A. Check Auth Health Endpoint

```bash
# For production
curl https://autolenis.com/api/auth/health

# For preview
curl https://your-preview.vercel.app/api/auth/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-07T...",
  "host": {
    "hostname": "autolenis.com",
    "protocol": "https",
    "baseUrl": "https://autolenis.com"
  },
  "environment": {
    "type": "production",
    "isProduction": true
  },
  "cookieMode": {
    "domain": ".autolenis.com",
    "secure": true,
    "sameSite": "lax",
    "httpOnly": true
  },
  "providers": {
    "customJWT": true,
    "supabase": true
  },
  "validation": {
    "passed": true,
    "errors": [],
    "warnings": []
  }
}
```

If `status: "degraded"`, check `validation.errors` for issues.

#### B. Manual Testing Checklist

**Test on Production (autolenis.com):**
1. [ ] Navigate to `/auth/signin`
2. [ ] Sign in with valid credentials
3. [ ] Verify redirect to correct dashboard (/buyer/dashboard, /admin/dashboard, etc.)
4. [ ] Refresh page - session should persist
5. [ ] Open DevTools → Application → Cookies
   - Cookie name: `session`
   - Domain: `.autolenis.com`
   - HttpOnly: ✓
   - Secure: ✓
   - SameSite: Lax
6. [ ] Navigate between dashboard pages - no re-authentication
7. [ ] Deep link test: Open `/buyer/dashboard` in new incognito tab
   - Should redirect to `/auth/signin?redirect=/buyer/dashboard`
   - After sign-in, should return to `/buyer/dashboard`

**Test on Vercel Preview:**
1. [ ] Navigate to preview URL `/auth/signin`
2. [ ] Sign in with valid credentials
3. [ ] Verify session persists on refresh
4. [ ] Check cookies in DevTools:
   - Domain: (empty/host-only)
   - HttpOnly: ✓
   - Secure: ✓
5. [ ] SessionStatusBanner shows "Signed in as {email}"
6. [ ] If `NEXT_PUBLIC_ENV_BADGE=true`, AuthDebugDrawer button visible

**Expected Cross-Domain Behavior:**
- ✅ Session on autolenis.com does NOT transfer to preview URL
- ✅ Session on preview-123.vercel.app does NOT transfer to preview-456.vercel.app
- ✅ SessionStatusBanner explains this with helpful CTAs

## Troubleshooting

### Issue: "Auth environment validation FAILED" in logs

**Check:**
1. Verify all required env vars are set in Vercel
2. Ensure `JWT_SECRET` is 32+ characters
3. Check `/api/auth/health` endpoint for specific errors

### Issue: Session lost on refresh

**Check:**
1. Cookies in DevTools - verify session cookie exists
2. Cookie attributes match expected (see above)
3. Check browser console for errors
4. Verify `/api/auth/health` shows `status: "healthy"`

### Issue: Redirect loop on protected routes

**Check:**
1. Middleware configuration in `proxy.ts`
2. Public routes list includes sign-in pages
3. Session cookie is being set correctly
4. Check server logs for auth validation errors

### Issue: CORS errors

**Check:**
1. `NEXT_PUBLIC_APP_URL` matches deployment URL
2. OPTIONS handlers exist in API routes
3. CORS headers in `next.config.mjs` are correct

## Testing in Local Development

```bash
# Set environment variables in .env.local
JWT_SECRET=your-local-dev-secret-32-chars-min
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ENV_BADGE=true  # Enable debug drawer

# Run development server
pnpm dev

# Visit http://localhost:3000/api/auth/health
# Should show status: "healthy"
```

## Security Considerations

### What's Safe to Expose

✅ **Auth Health Endpoint** (`/api/auth/health`):
- Environment type
- Cookie configuration
- Whether providers are configured
- Validation status

### What's NOT Exposed

❌ Never exposed:
- JWT_SECRET value
- Supabase keys
- Session token contents
- User passwords
- Specific error details with sensitive info

### Best Practices

1. **JWT_SECRET**: Generate with `openssl rand -base64 32` or similar
2. **Rotate Secrets**: If compromised, rotate immediately in Vercel settings
3. **Monitor Logs**: Check server logs for suspicious auth activity
4. **Rate Limiting**: Already implemented on auth endpoints
5. **HTTPS Only**: Secure cookies only sent over HTTPS in production

## Rollback Plan

If issues arise after deployment:

1. **Revert PR** in GitHub
2. **Redeploy** previous working version in Vercel
3. **Environment Variables**: Previous values remain (no action needed)
4. **Report Issue**: Include logs from `/api/auth/health` and browser console

## Support

For deployment issues:
1. Check `/api/auth/health` endpoint
2. Review server logs in Vercel dashboard
3. Enable `NEXT_PUBLIC_ENV_BADGE=true` and use AuthDebugDrawer
4. Refer to this deployment guide

## Success Criteria

✅ Deployment is successful when:
1. `pnpm build` passes
2. `/api/auth/health` returns `status: "healthy"`
3. Login works on production domain
4. Login works on preview deployments
5. Sessions persist on page refresh
6. Deep links redirect correctly after authentication
7. No auth-related errors in server logs
