import { createAdminClient } from "@/lib/supabase/admin"
import { emailService } from "@/lib/services/email.service"
import crypto from "node:crypto"
import { logger } from "@/lib/logger"

// Roles allowed to use the public resend verification flow
const RESEND_ALLOWED_ROLES = ["BUYER", "DEALER", "AFFILIATE"] as const

// Token expiry durations
const DEFAULT_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours (signup)
const RESEND_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour (resend flow)

// In-memory idempotency store for auto-resend on sign-in (30-min window)
// Key: idempotencyKey string -> timestamp of last successful send
const verifyOnSigninSentKeys = new Map<string, number>()
const VERIFY_ON_SIGNIN_IDEMPOTENCY_WINDOW_MS = 30 * 60 * 1000 // 30 minutes

// Periodically purge expired idempotency entries (every 30 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [key, sentAt] of verifyOnSigninSentKeys.entries()) {
    if (now - sentAt >= VERIFY_ON_SIGNIN_IDEMPOTENCY_WINDOW_MS) {
      verifyOnSigninSentKeys.delete(key)
    }
  }
}, VERIFY_ON_SIGNIN_IDEMPOTENCY_WINDOW_MS)

/**
 * Helper: obtain a Supabase admin client.
 * Wrapped so the service does not throw at module-import time when env vars
 * are missing (e.g. during `next build`).
 */
function getSupabase() {
  return createAdminClient()
}

export class EmailVerificationService {
  // Generate a secure verification token
  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex")
  }

  // Hash a token with SHA-256 for secure storage
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex")
  }

  // Create verification token for a user
  async createVerificationToken(userId: string, email: string, expiresInMs?: number): Promise<string> {
    const supabase = getSupabase()
    const token = this.generateToken()
    const hashedToken = this.hashToken(token)
    const expiresAt = new Date(Date.now() + (expiresInMs ?? DEFAULT_TOKEN_EXPIRY_MS)).toISOString()

    // Delete any existing tokens for this user (invalidate prior tokens)
    try {
      const { error: delError } = await supabase
        .from("email_verification_tokens")
        .delete()
        .eq("user_id", userId)
      if (delError) {
        logger.warn("Failed to delete old verification tokens", { userId, error: delError.message })
      }
    } catch (err) {
      logger.warn("Failed to delete old verification tokens", { userId, error: (err as Error).message })
    }

    // Store hashed token
    const { error: insertError } = await supabase
      .from("email_verification_tokens")
      .insert({
        user_id: userId,
        token: hashedToken,
        expires_at: expiresAt,
      })

    if (insertError) {
      logger.error("Failed to insert verification token", { userId, error: insertError.message })
      throw new Error(`Failed to create verification token: ${insertError.message}`)
    }

    // Send verification email using the authoritative branded template.
    // On failure, remove the just-inserted token so no orphaned record is left,
    // then rethrow so callers can log and handle the error appropriately.
    try {
      await emailService.sendEmailVerification(email, token, userId)
    } catch (emailErr) {
      logger.error("Verification email send failed; removing token", { userId, email, error: (emailErr as Error).message })
      try {
        await supabase
          .from("email_verification_tokens")
          .delete()
          .eq("user_id", userId)
      } catch {
        // best-effort cleanup
      }
      throw emailErr
    }

    return token
  }

  // Verify token and mark email as verified
  async verifyEmail(token: string): Promise<{ success: boolean; message: string; userId?: string }> {
    const supabase = getSupabase()
    const hashedToken = this.hashToken(token)

    // Find the token by its hash
    let tokenRecords: { id: string; user_id: string; expires_at: string; used_at: string | null }[] | null
    try {
      const { data, error } = await supabase
        .from("email_verification_tokens")
        .select("id, user_id, expires_at, used_at")
        .eq("token", hashedToken)
        .limit(1)
      if (error) {
        logger.error("Failed to look up verification token", { error: error.message })
        return { success: false, message: "Verification failed. Please try again." }
      }
      tokenRecords = data
    } catch (err) {
      logger.error("Failed to look up verification token", { error: (err as Error).message })
      return { success: false, message: "Verification failed. Please try again." }
    }

    if (!tokenRecords || tokenRecords.length === 0) {
      return { success: false, message: "Invalid verification token" }
    }

    const tokenRecord = tokenRecords[0]

    // Check if already used
    if (tokenRecord.used_at) {
      return { success: false, message: "This verification link has already been used" }
    }

    // Check if expired
    if (new Date() > new Date(tokenRecord.expires_at)) {
      return { success: false, message: "This verification link has expired. Please request a new one." }
    }

    // Mark token as used
    try {
      const { error: updateError } = await supabase
        .from("email_verification_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("id", tokenRecord.id)
      if (updateError) {
        logger.error("Failed to mark token as used", { tokenId: tokenRecord.id, error: updateError.message })
      }
    } catch (err) {
      logger.error("Failed to mark token as used", { tokenId: tokenRecord.id, error: (err as Error).message })
    }

    // Mark user's email as verified
    try {
      const { error: verifyError } = await supabase
        .from("User")
        .update({ is_email_verified: true })
        .eq("id", tokenRecord.user_id)
      if (verifyError) {
        logger.error("Failed to mark email as verified", { userId: tokenRecord.user_id, error: verifyError.message })
        return { success: false, message: "Verification failed. Please try again." }
      }
    } catch (err) {
      logger.error("Failed to mark email as verified", { userId: tokenRecord.user_id, error: (err as Error).message })
      return { success: false, message: "Verification failed. Please try again." }
    }

    return { success: true, message: "Email verified successfully!", userId: tokenRecord.user_id }
  }

  // Public resend: accepts email, enforces role restrictions, never leaks user info.
  // Optional idempotencyKey: if provided and already used within the 30-min window,
  // the send is skipped (prevents duplicate emails on repeated sign-in attempts).
  async resendVerificationByEmail(email: string, idempotencyKey?: string): Promise<void> {
    // Idempotency check: skip if already sent within the window
    if (idempotencyKey) {
      const sentAt = verifyOnSigninSentKeys.get(idempotencyKey)
      if (sentAt !== undefined && Date.now() - sentAt < VERIFY_ON_SIGNIN_IDEMPOTENCY_WINDOW_MS) {
        return
      }
    }

    const supabase = getSupabase()
    const normalizedEmail = email.trim().toLowerCase()

    const { data: users, error: userError } = await supabase
      .from("User")
      .select("id, email, role, is_email_verified")
      .eq("email", normalizedEmail)
      .limit(1)

    if (userError) {
      logger.error("resendVerificationByEmail: user lookup failed", { error: userError.message })
      return
    }

    const user = users?.[0]
    if (!user) return

    // Silently bail if role is not allowed or already verified
    if (!(RESEND_ALLOWED_ROLES as readonly string[]).includes(user.role)) return
    if (user.is_email_verified) return

    // Generate new token with 1-hour expiry, invalidates prior tokens
    await this.createVerificationToken(user.id, user.email, RESEND_TOKEN_EXPIRY_MS)

    // Record successful send for idempotency
    if (idempotencyKey) {
      verifyOnSigninSentKeys.set(idempotencyKey, Date.now())
    }
  }

  // Resend verification email (authenticated, by userId)
  async resendVerification(userId: string): Promise<{ success: boolean; message: string }> {
    const supabase = getSupabase()

    const { data: users, error: userError } = await supabase
      .from("User")
      .select("id, email, is_email_verified")
      .eq("id", userId)
      .limit(1)

    if (userError) {
      logger.error("resendVerification: user lookup failed", { userId, error: userError.message })
      return { success: false, message: "Unable to resend verification email. Please try again." }
    }

    const user = users?.[0]

    if (!user) {
      return { success: false, message: "User not found" }
    }

    if (user.is_email_verified) {
      return { success: false, message: "Email is already verified" }
    }

    await this.createVerificationToken(user.id, user.email)

    return { success: true, message: "Verification email sent! Please check your inbox." }
  }

  // Check if user's email is verified
  async isEmailVerified(userId: string): Promise<boolean> {
    const supabase = getSupabase()

    const { data: users, error } = await supabase
      .from("User")
      .select("is_email_verified")
      .eq("id", userId)
      .limit(1)

    if (error || !users || users.length === 0) return false

    return users[0].is_email_verified === true
  }
}

export const emailVerificationService = new EmailVerificationService()
