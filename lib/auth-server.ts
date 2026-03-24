// Server-side auth utilities - Only use in Server Components, Route Handlers, and Server Actions
import { cookies, headers } from "next/headers"
import { verifySession, type SessionUser } from "./auth"
import bcrypt from "bcryptjs"
import { logger } from "./logger"
import { getSessionCookieOptions, getClearCookieOptions } from "./utils/cookies"
import { isTestWorkspace } from "./app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value

  if (!token) {
    logger.debug("No session token found in cookies")
    return null
  }

  try {
    const session = await verifySession(token)
    logger.debug("Session verified", { userId: session.userId })
    return session
  } catch (error: any) {
    logger.error("Session verification failed", { error: error.message })
    return null
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await getSession()
    if (!session) return null

    // Only return mock session data for TEST workspace users
    if (isTestWorkspace(session)) {
      const headerStore = await headers()
      const pathname = headerStore.get("x-pathname") || ""
      const cookieStore = await cookies()
      const mockRole = cookieStore.get("mock_role")?.value?.toUpperCase()
      // Defence-in-depth: if x-pathname is missing (e.g. middleware didn't
      // run), fall back to the authenticated session's own role so the mock
      // selector still picks the correct persona.
      const effectiveRole = mockRole || (pathname ? undefined : session.role)
      return mockSelectors.sessionUser(pathname, effectiveRole)
    }

    return session
  } catch (error) {
    return null
  }
}

export async function setSessionCookie(token: string, hostname?: string) {
  const cookieStore = await cookies()
  
  // Get hostname from headers if not provided
  let host = hostname
  if (!host) {
    const headerStore = await headers()
    host = headerStore.get("host") || undefined
  }

  logger.debug("Setting session cookie", { host })

  const options = getSessionCookieOptions(host)
  cookieStore.set("session", token, options)

  logger.debug("Session cookie set successfully", { domain: options.domain })
}

export async function clearSession(hostname?: string) {
  const cookieStore = await cookies()
  
  // Get hostname from headers if not provided
  let host = hostname
  if (!host) {
    const headerStore = await headers()
    host = headerStore.get("host") || undefined
  }

  const options = getClearCookieOptions(host)
  
  // Delete session cookie with proper domain
  cookieStore.set("session", "", options)
  
  // Also try deleting without domain for backwards compatibility
  cookieStore.delete("session")
}

export async function requireAuth(allowedRoles?: string[]): Promise<SessionUser> {
  const session = await getSession()

  if (!session) {
    const error = new Error("Unauthorized") as Error & { statusCode: number }
    error.statusCode = 401
    throw error
  }

  // For TEST workspace, use mock session data
  if (isTestWorkspace(session)) {
    const cookieStore = await cookies()
    const mockRole = cookieStore.get("mock_role")?.value?.toUpperCase()
    const pathname = (await headers()).get("x-pathname") || ""
    // Defence-in-depth: if x-pathname is missing, fall back to the
    // session's own role from the JWT.
    const effectiveRole = mockRole || (pathname ? undefined : session.role)
    const mockUser = mockSelectors.sessionUser(pathname, effectiveRole)
    if (allowedRoles && !allowedRoles.includes(mockUser.role)) {
      const error = new Error("Forbidden") as Error & { statusCode: number }
      error.statusCode = 403
      throw error
    }
    return mockUser
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    // Return a more structured error for forbidden access
    const error = new Error("Forbidden") as Error & { statusCode: number }
    error.statusCode = 403
    throw error
  }

  return session
}

export async function getCurrentUser() {
  try {
    const session = await getSession()

    if (!session) {
      return null
    }

    return {
      id: session.userId,
      userId: session.userId,
      email: session.email,
      role: session.role,
      first_name: session.first_name,
      last_name: session.last_name,
      workspace_id: session.workspace_id,
      workspace_mode: session.workspace_mode,
    }
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Re-export canonical role helpers so existing callers
// (`import { isAdminRole } from "@/lib/auth-server"`) keep working
// without 80+ import-path changes.
//
// The **canonical source** of truth is `lib/authz/roles.ts`.
export { isAdminRole, isCmaApprover, isUserAffiliate as isAffiliateRole } from "@/lib/authz/roles"
