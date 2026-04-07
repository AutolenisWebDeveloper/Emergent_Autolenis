import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionEdge } from "@/lib/auth-edge"
import { validateCsrf, ensureCsrfCookie } from "@/lib/middleware/csrf"
import { updateSession } from "@/utils/supabase/middleware"

export async function proxy(request: NextRequest) {
  // CSRF validation for state-changing requests using cookie auth
  const csrfError = validateCsrf(request)
  if (csrfError) {
    return NextResponse.json(
      { error: { code: "CSRF_INVALID", message: csrfError } },
      { status: 403 }
    )
  }

  // Refresh Supabase auth session cookies so Server Components always have
  // a fresh session. Skipped when Supabase is not configured (e.g., test env).
  // Errors are non-fatal — the proxy continues even if the refresh fails.
  const supabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)
  const supabaseSessionResponse = supabaseConfigured
    ? await updateSession(request).catch((err: unknown) => {
        console.error("[proxy] Supabase session refresh failed", err)
        return null
      })
    : null

  // Forward any refreshed Supabase cookies onto an outgoing page response.
  // Not applied to API responses or redirects — those don't need session cookies.
  const withSupabaseCookies = (res: NextResponse): NextResponse => {
    supabaseSessionResponse?.cookies.getAll().forEach((cookie) => {
      res.cookies.set(cookie.name, cookie.value, cookie)
    })
    return res
  }

  const ref = request.nextUrl.searchParams.get("ref")
  if (ref && request.nextUrl.pathname === "/") {
    const response = NextResponse.next()
    response.cookies.set("affiliate_ref", ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
      httpOnly: true,
      secure: process.env['NODE_ENV'] === "production",
      sameSite: "lax",
    })
    fetch(`${request.nextUrl.origin}/api/affiliate/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: ref }),
    }).catch(() => {})
    return withSupabaseCookies(response)
  }

  let { pathname } = request.nextUrl
  const rawHost = request.headers.get("host") || request.nextUrl.hostname || ""
  const hostname = extractHostname(rawHost)
  const adminSubdomainEnabled = process.env.ADMIN_SUBDOMAIN_ENABLED === "true"

  let shouldRewriteAdmin = false
  let rewrittenPath = pathname

  if (hostname.startsWith("admin.") && !pathname.startsWith("/admin")) {
    shouldRewriteAdmin = true
    rewrittenPath = `/admin${pathname === "/" ? "/dashboard" : pathname}`
    pathname = rewrittenPath
  }

  if (
    process.env["NODE_ENV"] === "production" &&
    adminSubdomainEnabled &&
    !hostname.startsWith("admin.") &&
    pathname.startsWith("/admin") &&
    !pathname.startsWith("/admin/sign-in") &&
    !pathname.startsWith("/admin/signup") &&
    !pathname.startsWith("/admin/mfa")
  ) {
    const adminSubdomain = hostname.replace(/^(www\.)?/, "admin.")
    const redirectUrl = new URL(pathname.replace("/admin", ""), `https://${adminSubdomain}`)
    redirectUrl.search = request.nextUrl.search
    return NextResponse.redirect(redirectUrl)
  }

  const adminPublicRoutes = [
    "/admin/sign-in",
    "/admin/signup",
    "/admin/mfa/enroll",
    "/admin/mfa/challenge",
    "/admin/login",
  ]
  const isAdminPublicRoute = adminPublicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )

  const publicRoutes = [
    "/",
    "/how-it-works",
    "/pricing",
    "/contact",
    "/dealer-application",
    "/affiliate",
    "/refinance",
    "/auth",
    "/legal",
    "/about",
    "/privacy",
    "/terms",
    "/faq",
    "/contract-shield",
    "/insurance",
    "/for-dealers",
    "/ref",
    "/dealer/invite",
  ]
  const isPublicRoute =
    (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/")) ||
    isAdminPublicRoute) &&
    !pathname.startsWith("/affiliate/portal")

  if (isPublicRoute || pathname.startsWith("/_next/")) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-pathname", pathname)

    if (shouldRewriteAdmin) {
      const adminUrl = new URL(rewrittenPath, request.url)
      adminUrl.search = request.nextUrl.search
      return withSupabaseCookies(
        ensureCsrfCookie(
          request,
          NextResponse.rewrite(adminUrl, { request: { headers: requestHeaders } })
        )
      )
    }

    return withSupabaseCookies(
      ensureCsrfCookie(request, NextResponse.next({ request: { headers: requestHeaders } }))
    )
  }

  // Gateway-level session check for sensitive API prefixes — defense in depth
  // Route handlers still run their own withAuth() — this is an additional layer
  const SENSITIVE_API_PREFIXES = [
    "/api/buyer/",
    "/api/dealer/",
    "/api/admin/",
    "/api/affiliate/",
  ]

  // Auth endpoints within sensitive prefixes are public by design — they must be
  // reachable without a session token so users can authenticate.
  const SENSITIVE_API_AUTH_EXCEPTIONS = [
    "/api/admin/auth/signin",
    "/api/admin/auth/signup",
    "/api/admin/auth/signout",
    "/api/dealer/invite/claim",
    "/api/dealer/invite/complete",
  ]

  const isSensitiveApi =
    SENSITIVE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
    !SENSITIVE_API_AUTH_EXCEPTIONS.some(
      (exception) => pathname === exception || pathname.startsWith(exception + "/")
    )

  if (isSensitiveApi) {
    // Gateway-level token presence check — defense in depth.
    // This does NOT validate the token. Full authentication and authorization
    // is performed by withAuth() in each route handler. This layer only prevents
    // completely unauthenticated requests from reaching sensitive handlers.
    const authHeader = request.headers.get("authorization")
    const sessionToken =
      request.cookies.get("session")?.value ??
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined)

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Authentication required", correlationId: crypto.randomUUID() },
        { status: 401 }
      )
    }
    // Let the request continue — full validation happens inside withAuth() in the handler
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-pathname", pathname)
    return ensureCsrfCookie(request, NextResponse.next({ request: { headers: requestHeaders } }))
  }

  const token =
    request.cookies.get("session")?.value ??
    getCookieValue(request.headers.get("cookie"), "session")

  if (!token) {
    if (pathname.startsWith("/admin")) {
      const signInUrl = shouldRewriteAdmin
        ? new URL("/sign-in", request.url)
        : new URL("/admin/sign-in", request.url)
      return NextResponse.redirect(signInUrl)
    }
    const signinUrl = new URL("/auth/signin", request.url)
    signinUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(signinUrl)
  }

  try {
    const session = await verifySessionEdge(token)

    const requestHeaders = new Headers(request.headers)
    requestHeaders.set("x-pathname", pathname)

    if (pathname.startsWith("/test")) {
      if (session.workspace_mode !== "TEST") {
        return new NextResponse("Not Found", { status: 404 })
      }
      const mockRole = getMockRoleFromPath(pathname.replace(/^\/test/, ""))
      if (mockRole) {
        const response = NextResponse.next({ request: { headers: requestHeaders } })
        response.cookies.set("mock_role", mockRole, { path: "/", sameSite: "strict", httpOnly: true, secure: process.env['NODE_ENV'] === "production" })
        return withSupabaseCookies(response)
      }
      return withSupabaseCookies(NextResponse.next({ request: { headers: requestHeaders } }))
    }

    const hasMockRole = request.cookies.get("mock_role")?.value
    if (hasMockRole) {
      const response = NextResponse.next({ request: { headers: requestHeaders } })
      response.cookies.delete("mock_role")
      return withSupabaseCookies(response)
    }

    if (pathname.startsWith("/buyer") && session.role !== "BUYER") {
      return NextResponse.redirect(new URL(getRoleRedirect(session.role), request.url))
    }

    if (pathname.startsWith("/dealer") && !["DEALER", "DEALER_USER"].includes(session.role)) {
      return NextResponse.redirect(new URL(getRoleRedirect(session.role), request.url))
    }

    if (pathname.startsWith("/admin")) {
      if (!["ADMIN", "SUPER_ADMIN"].includes(session.role)) {
        return NextResponse.redirect(new URL("/auth/access-denied", request.url))
      }
    }

    if (pathname.startsWith("/affiliate/portal")) {
      const isAffiliate =
        session.role === "AFFILIATE" ||
        session.role === "AFFILIATE_ONLY" ||
        (session.role === "BUYER" && session.is_affiliate === true)

      if (!isAffiliate) {
        return NextResponse.redirect(new URL("/affiliate?signin=required", request.url))
      }
    }

    if (shouldRewriteAdmin) {
      const adminUrl = new URL(rewrittenPath, request.url)
      adminUrl.search = request.nextUrl.search
      return withSupabaseCookies(
        ensureCsrfCookie(
          request,
          NextResponse.rewrite(adminUrl, { request: { headers: requestHeaders } })
        )
      )
    }

    return withSupabaseCookies(
      ensureCsrfCookie(request, NextResponse.next({ request: { headers: requestHeaders } }))
    )
  } catch {
    if (pathname.startsWith("/admin")) {
      const signInUrl = shouldRewriteAdmin
        ? new URL("/sign-in", request.url)
        : new URL("/admin/sign-in", request.url)
      const response = NextResponse.redirect(signInUrl)
      response.cookies.delete("session")
      response.cookies.delete("admin_session")
      return response
    }

    const signinUrl = new URL("/auth/signin", request.url)
    signinUrl.searchParams.set("redirect", pathname)
    const response = NextResponse.redirect(signinUrl)
    response.cookies.delete("session")
    return response
  }
}

function getRoleRedirect(role: string): string {
  switch (role) {
    case "BUYER":
      return "/buyer/dashboard"
    case "DEALER":
    case "DEALER_USER":
      return "/dealer/dashboard"
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin/dashboard"
    case "AFFILIATE":
    case "AFFILIATE_ONLY":
      return "/affiliate/portal/dashboard"
    default:
      return "/"
  }
}

function getMockRoleFromPath(pathname: string): string | null {
  if (pathname.startsWith("/admin")) return "ADMIN"
  if (pathname.startsWith("/dealer")) return "DEALER"
  if (pathname.startsWith("/affiliate")) return "AFFILIATE"
  if (pathname.startsWith("/buyer")) return "BUYER"
  return null
}

export function getCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const prefix = `${name}=`
  const cookie = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(prefix))
  if (!cookie) return undefined
  const value = cookie.slice(prefix.length)
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function extractHostname(rawHost: string): string {
  if (rawHost.startsWith("[")) {
    const idx = rawHost.indexOf("]")
    if (idx === -1) return rawHost
    const remainder = rawHost.slice(idx + 1)
    if (remainder && !remainder.startsWith(":")) return rawHost
    return rawHost.slice(1, idx)
  }
  if (rawHost.includes("]")) return rawHost
  return rawHost.split(":")[0]
}

export default proxy

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
}
