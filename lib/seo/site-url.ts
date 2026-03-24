/**
 * Single source of truth for resolving the site base URL.
 *
 * Priority:
 *  1. NEXT_PUBLIC_SITE_URL (explicit override)
 *  2. NEXT_PUBLIC_APP_URL  (existing env var used throughout the app)
 *  3. Hardcoded fallback   https://www.autolenis.com
 */

const FALLBACK_URL = "https://www.autolenis.com"

export function getSiteUrl(): string {
  const url =
    process.env["NEXT_PUBLIC_SITE_URL"] ||
    process.env["NEXT_PUBLIC_APP_URL"] ||
    FALLBACK_URL

  // Strip trailing slash for consistency
  return url.replace(/\/+$/, "")
}
