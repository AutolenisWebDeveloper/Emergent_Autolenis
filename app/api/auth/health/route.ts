import { NextResponse, type NextRequest } from "next/server"
import { validateAuthEnvironment } from "@/lib/auth-runtime-validation"
import { getCookieDomain, shouldUseSecureCookies } from "@/lib/utils/cookies"
import { getSession, isAdminRole } from "@/lib/auth-server"

export const dynamic = "force-dynamic"

/**
 * Auth Health Check Endpoint
 * Returns safe summary of auth configuration without exposing secrets.
 * Protected: requires admin auth or internal API key — never publicly accessible.
 */
export async function GET(request: NextRequest) {
  try {
  // Require admin auth or internal API key
  const internalKey = process.env["INTERNAL_API_KEY"]
  const authHeader = request.headers.get("x-internal-key")

  if (internalKey && authHeader === internalKey) {
    // Internal key auth — proceed
  } else {
    const session = await getSession()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const hostname = request.headers.get("host") || "unknown"
  const protocol = request.headers.get("x-forwarded-proto") || "http"

  // Validate environment
  const envCheck = validateAuthEnvironment()

  // Get expected cookie configuration for current host
  const expectedCookieDomain = getCookieDomain(hostname)
  const expectSecureCookies = shouldUseSecureCookies()

  // Determine environment type
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1")
  const isVercelPreview = hostname.includes(".vercel.app")
  const isV0Preview = hostname.includes(".v0.dev") || hostname.includes("vusercontent.net")
  const isProduction = hostname.includes("autolenis.com")

  // Build safe response
  const response = {
    status: envCheck.isValid ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    
    host: {
      hostname,
      protocol,
      baseUrl: process.env['NEXT_PUBLIC_APP_URL'] || "(not set)",
    },

    environment: {
      type: process.env['NODE_ENV'],
      isLocalhost,
      isVercelPreview,
      isV0Preview,
      isProduction,
    },

    cookieMode: {
      domain: expectedCookieDomain || "(none - host-only cookies)",
      secure: expectSecureCookies,
      sameSite: "lax",
      httpOnly: true,
    },

    providers: {
      customJWT: !!process.env['JWT_SECRET'],
      supabase: !!process.env['NEXT_PUBLIC_SUPABASE_URL'] && !!process.env['SUPABASE_SERVICE_ROLE_KEY'],
    },

    validation: {
      passed: envCheck.isValid,
      errors: envCheck.errors,
      warnings: envCheck.warnings,
    },

    // Helpful info for debugging
    debugInfo: {
      expectedBehavior: getExpectedBehavior(hostname),
      commonIssues: getCommonIssues(hostname),
    },
  }

  const statusCode = envCheck.isValid ? 200 : 503

  return NextResponse.json(response, { status: statusCode })
  } catch (error) {
    console.error("[AuthHealth] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function getExpectedBehavior(hostname: string): string {
  if (hostname.includes("localhost")) {
    return "Localhost: Host-only cookies (no domain), secure=false on http"
  }
  if (hostname.includes(".vercel.app")) {
    return "Vercel Preview: Host-only cookies (no domain), secure=true (https)"
  }
  if (hostname.includes(".v0.dev") || hostname.includes("vusercontent.net")) {
    return "v0 Preview: Host-only cookies (no domain), secure=true (https)"
  }
  if (hostname.includes("autolenis.com")) {
    return "Production: Cookies with domain=.autolenis.com (shared across subdomains), secure=true"
  }
  return "Custom domain: Domain-scoped cookies for subdomain sharing, secure=true"
}

function getCommonIssues(hostname: string): string[] {
  const issues: string[] = []

  if (hostname.includes(".vercel.app")) {
    issues.push("Sessions don't transfer between different preview URLs")
    issues.push("Each preview deployment has unique domain - cookies are isolated")
  }

  if (hostname.includes(".v0.dev") || hostname.includes("vusercontent.net")) {
    issues.push("v0 preview sessions don't transfer to Vercel deployments")
    issues.push("v0 preview sessions don't transfer to autolenis.com")
    issues.push("Use 'Open AutoLenis.com' button to access production with new session")
  }

  if (hostname.includes("autolenis.com")) {
    issues.push("Sessions from preview deployments don't transfer here")
    issues.push("Must sign in separately on production domain")
  }

  return issues
}
