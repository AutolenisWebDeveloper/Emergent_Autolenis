import { NextResponse } from "next/server"
import { getSessionUser, clearSession } from "@/lib/auth-server"
import { buildClearCookieHeader } from "@/lib/utils/cookies"

export async function POST(request: Request) {
  const hostname = request.headers.get("host") || undefined

  try {
    const user = await getSessionUser()
    const userRole = user?.role || "BUYER"

    // Clear the session with proper domain handling
    await clearSession(hostname)

    const redirectUrl = getRoleRedirectUrl(userRole)

    // Build proper Set-Cookie header for cross-domain logout
    const clearCookieHeader = buildClearCookieHeader("session", hostname)

    // Check if this is a fetch/AJAX call (expects JSON) vs a form submission (expects redirect)
    const acceptHeader = request.headers.get("accept") || ""
    const isJsonRequest = acceptHeader.includes("application/json")

    if (isJsonRequest) {
      return NextResponse.json(
        {
          success: true,
          message: "Signed out successfully",
          role: userRole,
          redirect: redirectUrl,
        },
        {
          headers: {
            "Set-Cookie": clearCookieHeader,
          },
        },
      )
    }

    // For form submissions, redirect directly
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))
    response.headers.set("Set-Cookie", clearCookieHeader)
    return response
  } catch (error) {
    console.error("[SignOut API] Error:", error)
    
    // Build proper Set-Cookie header even on error
    const clearCookieHeader = buildClearCookieHeader("session", hostname)

    const acceptHeader = request.headers.get("accept") || ""
    const isJsonRequest = acceptHeader.includes("application/json")

    if (isJsonRequest) {
      return NextResponse.json(
        {
          success: true,
          message: "Signed out",
          role: "BUYER",
          redirect: "/auth/signin",
        },
        {
          headers: {
            "Set-Cookie": clearCookieHeader,
          },
        },
      )
    }

    // Even on error, clear cookie and redirect
    const response = NextResponse.redirect(new URL("/auth/signin", request.url))
    response.headers.set("Set-Cookie", clearCookieHeader)
    return response
  }
}

export async function GET(request: Request) {
  const hostname = request.headers.get("host") || undefined

  try {
    const user = await getSessionUser()
    const userRole = user?.role || "BUYER"

    await clearSession(hostname)

    const redirectUrl = getRoleRedirectUrl(userRole)
    
    // Build proper Set-Cookie header for cross-domain logout
    const clearCookieHeader = buildClearCookieHeader("session", hostname)
    
    const response = NextResponse.redirect(new URL(redirectUrl, request.url))
    response.headers.set("Set-Cookie", clearCookieHeader)
    return response
  } catch (error) {
    console.error("[SignOut API] Error:", error)
    
    const clearCookieHeader = buildClearCookieHeader("session", hostname)
    const response = NextResponse.redirect(new URL("/auth/signin", request.url))
    response.headers.set("Set-Cookie", clearCookieHeader)
    return response
  }
}

function getRoleRedirectUrl(_role: string): string {
  return "/auth/signin"
}
