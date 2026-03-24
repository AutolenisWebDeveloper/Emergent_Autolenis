import "server-only"
import { cookies, headers } from "next/headers"
import { isDatabaseConfigured, prisma } from "@/lib/db"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger } from "./logger"
import { getAdminSessionCookieOptions, getClearCookieOptions } from "./utils/cookies"
import { getCacheAdapter, assertProductionCacheReady, ProductionCacheUnavailableError, type CacheAdapter, RedisCacheAdapter } from "@/lib/cache/redis-adapter"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LOGIN_ATTEMPTS = 5
const MAX_MFA_ATTEMPTS = 3
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 15 * 60 * 1000 // 15 minutes
const SESSION_TTL = 24 * 60 * 60 * 1000 // 24 hours
const IS_PRODUCTION = process.env["NODE_ENV"] === "production"

// ---------------------------------------------------------------------------
// Admin Security State Error
// ---------------------------------------------------------------------------

export class AdminSecurityStateUnavailableError extends Error {
  constructor(message = "Secure rate-limiting state is unavailable. Auth rate limiting requires Redis in production.") {
    super(message)
    this.name = "AdminSecurityStateUnavailableError"
  }
}

/**
 * Ensure secure cache is available for auth rate-limiting operations.
 * In production, this requires Redis; throws if unavailable.
 */
function ensureSecureCache(): void {
  try {
    assertProductionCacheReady()
  } catch (err) {
    if (err instanceof ProductionCacheUnavailableError) {
      throw new AdminSecurityStateUnavailableError(
        `Auth rate limiting requires Redis in production: ${err.message}`
      )
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Cache-key helpers
// ---------------------------------------------------------------------------

function loginKey(id: string) { return `admin:login:${id}` }
function mfaKey(id: string) { return `admin:mfa:${id}` }

/**
 * Get the cache adapter with a production-safety check.
 * In production, the adapter MUST be Redis-backed and ready.
 * This prevents auth rate limiting from silently falling back to in-memory.
 */
function getSessionCache(): CacheAdapter {
  const cache = getCacheAdapter()
  if (IS_PRODUCTION && cache instanceof RedisCacheAdapter && !cache.isReady()) {
    throw new Error(
      "[AdminAuth] Redis is configured but not ready. " +
      "Auth rate limiting requires a working Redis connection in production."
    )
  }
  return cache
}

// ---------------------------------------------------------------------------
// Admin session type
// ---------------------------------------------------------------------------

interface AdminSessionData {
  userId: string
  email: string
  role: string
  mfaVerified: boolean
  mfaEnrolled: boolean
  requiresPasswordReset: boolean
  factorId?: string
}

export interface AdminUser {
  id: string
  email: string
  role: string
  passwordHash: string
}

export async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean
  attemptsRemaining?: number
  lockedUntil?: number
}> {
  // Fail closed: refuse admin login attempts without secure cache in production
  ensureSecureCache()

  const cache = getCacheAdapter()
  const key = loginKey(identifier)

  // Check lockout first
  const lockVal = await cache.get<string>(`${key}:lock`)
  if (lockVal) {
    const lockedUntil = parseInt(lockVal, 10)
    if (Date.now() < lockedUntil) {
      return { allowed: false, lockedUntil }
    }
    // Lock expired – clean up
    await cache.delete(`${key}:lock`)
  }

  // Check attempt count
  const countStr = await cache.get<string>(key)
  const count = countStr ? parseInt(countStr, 10) : 0

  if (count >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION
    await cache.set(`${key}:lock`, String(lockedUntil), LOCKOUT_DURATION)
    return { allowed: false, lockedUntil }
  }

  return { allowed: true, attemptsRemaining: MAX_LOGIN_ATTEMPTS - count }
}

export async function recordLoginAttempt(identifier: string, success: boolean): Promise<void> {
  ensureSecureCache()

  const cache = getCacheAdapter()
  const key = loginKey(identifier)

  if (success) {
    await cache.delete(key)
    await cache.delete(`${key}:lock`)
    return
  }

  const count = await cache.increment(key, ATTEMPT_WINDOW)
  if (count >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCKOUT_DURATION
    await cache.set(`${key}:lock`, String(lockedUntil), LOCKOUT_DURATION)
  }
}

export async function checkMfaRateLimit(identifier: string): Promise<{ allowed: boolean; attemptsRemaining?: number }> {
  // Fail closed: refuse MFA attempts without secure cache in production
  ensureSecureCache()

  const cache = getCacheAdapter()
  const key = mfaKey(identifier)
  const countStr = await cache.get<string>(key)
  const count = countStr ? parseInt(countStr, 10) : 0

  if (count >= MAX_MFA_ATTEMPTS) {
    return { allowed: false, attemptsRemaining: 0 }
  }

  return { allowed: true, attemptsRemaining: MAX_MFA_ATTEMPTS - count }
}

export async function recordMfaAttempt(identifier: string, success: boolean): Promise<void> {
  // Fail closed: refuse MFA recording without secure cache in production
  ensureSecureCache()

  const cache = getCacheAdapter()
  const key = mfaKey(identifier)

  if (success) {
    await cache.delete(key)
    return
  }

  await cache.increment(key, ATTEMPT_WINDOW)
}

export async function getAdminUser(email: string): Promise<AdminUser | null> {
  if (!isDatabaseConfigured()) {
    logger.warn("getAdminUser: database not configured")
    return null
  }

  try {
    const supabase = createAdminClient()

    // Allowed admin-level roles that may sign in through the admin portal
    const adminRoles = ["ADMIN", "SUPER_ADMIN"]

    // First verify the user exists and holds an admin-level role before a second
    // targeted query. This lets us distinguish "user not found" from "wrong role"
    // without leaking role information to the caller.
    const { data: anyUser } = await supabase
      .from("User")
      .select("id, email, passwordHash, role")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (anyUser && !adminRoles.includes(anyUser.role)) {
      return null
    }

    const { data, error } = await supabase
      .from("User")
      .select("id, email, passwordHash, role")
      .eq("email", email.toLowerCase())
      .in("role", adminRoles)
      .maybeSingle()

    if (error || !data) {
      return null
    }

    return data as AdminUser
  } catch (error) {
    logger.error("Error fetching admin user", { error })
    return null
  }
}

export async function setAdminSession(
  sessionId: string,
  data: {
    userId: string
    email: string
    role: string
    mfaVerified: boolean
    mfaEnrolled: boolean
    requiresPasswordReset: boolean
    factorId?: string
  },
  hostname?: string,
): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL)

  await prisma.adminSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      userId: data.userId,
      email: data.email,
      role: data.role,
      mfaVerified: data.mfaVerified,
      mfaEnrolled: data.mfaEnrolled,
      requiresPasswordReset: data.requiresPasswordReset,
      factorId: data.factorId ?? null,
      expiresAt,
    },
    update: {
      userId: data.userId,
      email: data.email,
      role: data.role,
      mfaVerified: data.mfaVerified,
      mfaEnrolled: data.mfaEnrolled,
      requiresPasswordReset: data.requiresPasswordReset,
      factorId: data.factorId ?? null,
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  
  // Get hostname from headers if not provided
  let host = hostname
  if (!host) {
    const headerStore = await headers()
    host = headerStore.get("host") || undefined
  }

  const options = getAdminSessionCookieOptions(host)
  cookieStore.set("admin_session", sessionId, options)
}

export async function getAdminSession(): Promise<AdminSessionData | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("admin_session")?.value

  if (!sessionId) {
    return null
  }

  try {
    const row = await prisma.adminSession.findUnique({
      where: { id: sessionId },
    })

    if (!row) return null

    // Reject expired sessions
    if (new Date() >= row.expiresAt) {
      // Clean up the expired row asynchronously
      prisma.adminSession.delete({ where: { id: sessionId } }).catch((err: unknown) => {
        logger.warn("Failed to delete expired admin session", { sessionId, error: err instanceof Error ? err.message : "unknown" })
      })
      return null
    }

    return {
      userId: row.userId,
      email: row.email,
      role: row.role,
      mfaVerified: row.mfaVerified,
      mfaEnrolled: row.mfaEnrolled,
      requiresPasswordReset: row.requiresPasswordReset,
      factorId: row.factorId ?? undefined,
    }
  } catch {
    return null
  }
}

export async function updateAdminSession(
  updates: Partial<{
    mfaVerified: boolean
    mfaEnrolled: boolean
    requiresPasswordReset: boolean
    factorId: string
  }>,
): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("admin_session")?.value

  if (!sessionId) {
    return
  }

  try {
    await prisma.adminSession.update({
      where: { id: sessionId },
      data: updates,
    })
  } catch {
    // Session not found or update failed – ignore
  }
}

export async function clearAdminSession(hostname?: string): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("admin_session")?.value

  if (sessionId) {
    try {
      await prisma.adminSession.delete({ where: { id: sessionId } })
    } catch {
      // Session may already be deleted – ignore
    }
  }

  // Get hostname from headers if not provided
  let host = hostname
  if (!host) {
    const headerStore = await headers()
    host = headerStore.get("host") || undefined
  }

  const options = getClearCookieOptions(host)
  
  // Clear both admin_session and session cookies with proper domain
  cookieStore.set("admin_session", "", options)
  cookieStore.set("session", "", options)
  
  // Also try deleting without domain for backwards compatibility
  cookieStore.delete("admin_session")
  cookieStore.delete("session")
}

/**
 * Delete all expired admin sessions from the database.
 * Called by the session-cleanup cron job.
 */
export async function cleanupExpiredAdminSessions(): Promise<number> {
  const result = await prisma.adminSession.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}

export function generateSessionId(): string {
  return crypto.randomUUID()
}

// TOTP implementation
export function generateTotpSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let secret = ""
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(bytes[i] % chars.length)
  }
  return secret
}

export function generateTotpUri(secret: string, email: string): string {
  const issuer = "AutoLenis Admin"
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

export function verifyTotp(secret: string, code: string): boolean {
  // Simple TOTP implementation
  const time = Math.floor(Date.now() / 30000)

  // Check current and adjacent time windows (to account for clock drift)
  for (let i = -1; i <= 1; i++) {
    const expectedCode = generateTotpCode(secret, time + i)
    if (expectedCode === code) {
      return true
    }
  }

  return false
}

function generateTotpCode(secret: string, time: number): string {
  // Base32 decode the secret
  const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const char of secret.toUpperCase()) {
    const val = base32Chars.indexOf(char)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, "0")
  }

  const keyBytes = new Uint8Array(Math.floor(bits.length / 8))
  for (let i = 0; i < keyBytes.length; i++) {
    keyBytes[i] = Number.parseInt(bits.substr(i * 8, 8), 2)
  }

  // Time counter (big-endian 8 bytes)
  const timeBytes = new Uint8Array(8)
  let t = time
  for (let i = 7; i >= 0; i--) {
    timeBytes[i] = t & 0xff
    t = Math.floor(t / 256)
  }

  // HMAC-SHA1 (simplified implementation)
  // Uses a deterministic code based on secret and time
  const combined = new Uint8Array(keyBytes.length + timeBytes.length)
  combined.set(keyBytes)
  combined.set(timeBytes, keyBytes.length)

  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    const byte = combined[i]
    if (byte !== undefined) {
      hash = ((hash << 5) - hash + byte) | 0
    }
  }

  // Generate 6-digit code
  const code = Math.abs(hash % 1000000)
  return code.toString().padStart(6, "0")
}

export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  // Use local qrcode library — no external API calls
  try {
    const QRCode = await import("qrcode")
    return await QRCode.toDataURL(uri, { width: 200, margin: 1, errorCorrectionLevel: "M" })
  } catch {
    // Fallback: return the otpauth URI itself so the user can copy-paste it
    return uri
  }
}

export async function logAdminAction(action: string, details: Record<string, any>): Promise<void> {
  logger.info("Admin audit action", { action, details })

  // Save to audit log table for compliance and security
  if (isDatabaseConfigured()) {
    const supabase = createAdminClient()
    const { error } = await supabase.from("AdminAuditLog").insert({
      action,
      details,
      userId: details.userId || null,
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
      createdAt: new Date().toISOString(),
    })
    if (error) {
      logger.error("Failed to persist audit log", { error, action, details })
      throw new Error(`Audit log persistence failed: ${error.message}`)
    }
  }
}

export async function saveMfaSecret(userId: string, secret: string, factorId: string): Promise<void> {
  if (!isDatabaseConfigured()) {
    throw new Error("Database not configured")
  }

  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from("User")
      .update({
        mfaSecret: secret,
        mfaFactorId: factorId,
        mfaEnrolled: true,
      })
      .eq("id", userId)

    if (error) {
      logger.error("Error saving MFA secret", { error, userId })
      throw new Error("Failed to save MFA secret")
    }

    logger.info("MFA secret saved", { userId })
  } catch (error) {
    logger.error("Error in saveMfaSecret", { error, userId })
    throw error
  }
}

// ─── MFA Recovery Codes ───────────────────────────────────────────────────────

/**
 * Generate 10 recovery codes. Each code is 8 hex characters.
 * Returns plaintext codes to display to the user ONCE.
 */
export function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < 10; i++) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    codes.push(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""))
  }
  return codes
}

/**
 * Hash a single recovery code for safe storage.
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(code.toLowerCase().replace(/\s/g, ""))
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Store hashed recovery codes in the User record.
 */
export async function saveRecoveryCodes(userId: string, plaintextCodes: string[]): Promise<void> {
  if (!isDatabaseConfigured()) throw new Error("Database not configured")

  const hashed = await Promise.all(plaintextCodes.map(hashRecoveryCode))

  const supabase = createAdminClient()
  const { error } = await supabase
    .from("User")
    .update({ mfa_recovery_codes_hash: JSON.stringify(hashed) })
    .eq("id", userId)

  if (error) {
    logger.error("Failed to save recovery codes", { error, userId })
    throw new Error("Failed to save recovery codes")
  }
}

/**
 * Verify a recovery code against stored hashes. If valid, removes
 * the used code from the stored set (single-use).
 * Returns true if a matching code was found and consumed.
 */
export async function verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false

  const supabase = createAdminClient()
  const { data: user, error } = await supabase
    .from("User")
    .select("mfa_recovery_codes_hash")
    .eq("id", userId)
    .maybeSingle()

  if (error || !user?.mfa_recovery_codes_hash) return false

  let hashes: string[]
  try {
    hashes = JSON.parse(user.mfa_recovery_codes_hash)
  } catch {
    return false
  }

  const inputHash = await hashRecoveryCode(code)
  const idx = hashes.indexOf(inputHash)
  if (idx === -1) return false

  // Consume the code
  hashes.splice(idx, 1)
  await supabase
    .from("User")
    .update({ mfa_recovery_codes_hash: JSON.stringify(hashes) })
    .eq("id", userId)

  return true
}
