/**
 * Cookie configuration utilities for cross-domain auth persistence
 * Handles cookie domain, security settings, and environment detection
 */

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: "strict" | "lax" | "none"
  maxAge?: number
  path?: string
  domain?: string
}

/**
 * Get the root domain for cookie sharing across subdomains
 * Returns undefined for localhost and Vercel preview deployments (no subdomain sharing needed)
 */
export function getCookieDomain(hostname?: string): string | undefined {
  // Use provided hostname or default to empty string
  const host = hostname || ""

  // Never set domain for localhost
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    return undefined
  }

  // Don't set domain for Vercel preview deployments (*.vercel.app)
  // Each preview has unique subdomain, no need for sharing
  if (host.includes(".vercel.app")) {
    return undefined
  }

  // Don't set domain for v0.dev preview
  if (host.includes(".v0.dev") || host.includes("vusercontent.net")) {
    return undefined
  }

  // For production domain (autolenis.com), set root domain for subdomain sharing
  if (host.includes("autolenis.com")) {
    return ".autolenis.com"
  }

  // For any other custom domain, extract root domain
  const parts = host.split(".")
  if (parts.length >= 2) {
    // Return last two parts as root domain with leading dot
    return "." + parts.slice(-2).join(".")
  }

  return undefined
}

/**
 * Determine if secure cookies should be used
 */
export function shouldUseSecureCookies(): boolean {
  // Always use secure cookies in production
  if (process.env['NODE_ENV'] === "production") {
    return true
  }

  // Check if running on HTTPS in development
  const appUrl = process.env['NEXT_PUBLIC_APP_URL'] || ""
  return appUrl.startsWith("https://")
}

/**
 * Get standard session cookie options with proper cross-domain support
 */
export function getSessionCookieOptions(hostname?: string): CookieOptions {
  const domain = getCookieDomain(hostname)

  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    ...(domain && { domain }),
  }
}

/**
 * Get admin session cookie options (stricter settings)
 */
export function getAdminSessionCookieOptions(hostname?: string): CookieOptions {
  const domain = getCookieDomain(hostname)

  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
    ...(domain && { domain }),
  }
}

/**
 * Get cookie clear options (for logout)
 */
export function getClearCookieOptions(hostname?: string): CookieOptions {
  const domain = getCookieDomain(hostname)

  return {
    httpOnly: true,
    secure: shouldUseSecureCookies(),
    sameSite: "lax",
    maxAge: 0,
    path: "/",
    ...(domain && { domain }),
  }
}

/**
 * Build Set-Cookie header string for manual cookie setting
 */
export function buildSetCookieHeader(
  name: string,
  value: string,
  options: CookieOptions
): string {
  const parts = [`${name}=${value}`]

  if (options.path) parts.push(`Path=${options.path}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
  if (options.httpOnly) parts.push("HttpOnly")
  if (options.secure) parts.push("Secure")
  if (options.sameSite) parts.push(`SameSite=${options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1)}`)

  return parts.join("; ")
}

/**
 * Build clear cookie header string
 */
export function buildClearCookieHeader(name: string, hostname?: string): string {
  const options = getClearCookieOptions(hostname)
  return buildSetCookieHeader(name, "", options)
}
