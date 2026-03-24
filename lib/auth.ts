import { SignJWT, jwtVerify } from "jose"
import type { UserRole, WorkspaceMode } from "./types"
import { logger } from "./logger"

function getJwtSecret(): Uint8Array {
  const secret = process.env['JWT_SECRET']
  if (!secret) {
    const error = "JWT_SECRET environment variable is required"
    logger.error(error)
    throw new Error(error)
  }
  return new TextEncoder().encode(secret)
}

export interface SessionUser {
  id: string // Alias for userId for convenience
  userId: string
  email: string
  role: UserRole
  is_affiliate?: boolean
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  workspace_id?: string
  workspace_mode?: WorkspaceMode
  session_version?: number
  mfa_verified?: boolean
}

export async function createSession(user: {
  userId?: string
  id?: string
  email: string
  role: string
  is_affiliate?: boolean
  workspace_id?: string
  workspace_mode?: WorkspaceMode
  session_version?: number
  mfa_verified?: boolean
}): Promise<string> {
  const userId = user.userId || user.id
  if (!userId) {
    throw new Error("User ID is required for session creation")
  }

  logger.info("Creating session", { userId, role: user.role })

  const token = await new SignJWT({
    id: userId, // Add id alias
    userId,
    email: user.email,
    role: user.role,
    is_affiliate: user.is_affiliate || false,
    workspace_id: user.workspace_id || null,
    workspace_mode: user.workspace_mode || "LIVE",
    session_version: user.session_version ?? 0,
    mfa_verified: user.mfa_verified ?? false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret())

  logger.debug("Session token created successfully")
  return token
}

export async function verifySession(token: string): Promise<SessionUser> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    const session = payload as unknown as SessionUser
    // Ensure id is always set for backward compatibility
    if (!session.id) session.id = session.userId
    // Default workspace_mode to LIVE for existing sessions without it
    if (!session.workspace_mode) session.workspace_mode = "LIVE"
    // Default session_version for tokens minted before this field existed
    if (session.session_version === undefined) session.session_version = 0
    // Default mfa_verified to false for tokens minted before this field existed
    if (session.mfa_verified === undefined) session.mfa_verified = false
    return session
  } catch (error: any) {
    logger.error("Session verification failed", { error: error.message })
    throw error
  }
}

export function getRoleBasedRedirect(role: string, isNewUser = false): string {
  if (isNewUser) {
    switch (role) {
      case "BUYER":
        return "/buyer/onboarding"
      case "DEALER":
      case "DEALER_USER":
        return "/dealer/onboarding"
      case "AFFILIATE":
      case "AFFILIATE_ONLY":
        return "/affiliate/portal/onboarding"
      case "ADMIN":
      case "SUPER_ADMIN":
        return "/admin/dashboard"
      default:
        return "/"
    }
  }

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

export function getRoleSignInPage(role?: string): string {
  switch (role) {
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin/sign-in"
    default:
      return "/auth/signin"
  }
}
