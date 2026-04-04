import { NextResponse } from "next/server"
import { clearAdminSession, logAdminAction, getAdminSession } from "@/lib/admin-auth"
import { clearSession } from "@/lib/auth-server"
import { buildClearCookieHeader } from "@/lib/utils/cookies"

export async function POST(request: Request) {
  const hostname = request.headers.get("host") || undefined

  try {
    // Get admin session for logging
    const adminSession = await getAdminSession()
    
    if (adminSession) {
      await logAdminAction("LOGOUT", { 
        email: adminSession.email, 
        userId: adminSession.userId 
      })
    }

    // Clear both admin session and regular session
    await clearAdminSession(hostname)
    await clearSession(hostname)

    // Build clear cookie headers for both cookies
    const clearSessionHeader = buildClearCookieHeader("session", hostname)
    const clearAdminHeader = buildClearCookieHeader("admin_session", hostname)

    return NextResponse.json(
      {
        success: true,
        message: "Admin signed out successfully",
        redirect: "/auth/signin",
      },
      {
        headers: {
          // Set multiple cookies by using array format
          "Set-Cookie": [clearSessionHeader, clearAdminHeader].join(", "),
        },
      },
    )
  } catch (error) {
    console.error("[Admin SignOut API] Error:", error)
    
    const clearSessionHeader = buildClearCookieHeader("session", hostname)
    const clearAdminHeader = buildClearCookieHeader("admin_session", hostname)

    // Even on error, return success so user can be redirected
    return NextResponse.json(
      {
        success: true,
        message: "Signed out",
        redirect: "/auth/signin",
      },
      {
        headers: {
          "Set-Cookie": [clearSessionHeader, clearAdminHeader].join(", "),
        },
      },
    )
  }
}

export async function GET(request: Request) {
  const hostname = request.headers.get("host") || undefined

  try {
    const adminSession = await getAdminSession()
    
    if (adminSession) {
      await logAdminAction("LOGOUT", { 
        email: adminSession.email, 
        userId: adminSession.userId 
      })
    }

    await clearAdminSession(hostname)
    await clearSession(hostname)

    const clearSessionHeader = buildClearCookieHeader("session", hostname)
    const clearAdminHeader = buildClearCookieHeader("admin_session", hostname)

    const response = NextResponse.redirect(new URL("/auth/signin", request.url))
    response.headers.append("Set-Cookie", clearSessionHeader)
    response.headers.append("Set-Cookie", clearAdminHeader)
    return response
  } catch (error) {
    console.error("[Admin SignOut API] Error:", error)
    
    const clearSessionHeader = buildClearCookieHeader("session", hostname)
    const response = NextResponse.redirect(new URL("/auth/signin", request.url))
    response.headers.append("Set-Cookie", clearSessionHeader)
    return response
  }
}
