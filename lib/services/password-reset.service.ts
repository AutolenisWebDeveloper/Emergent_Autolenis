import { supabase } from "@/lib/db"
import { emailService } from "@/lib/services/email.service"
import { hashPassword } from "@/lib/auth-server"
import crypto from "crypto"

export class PasswordResetService {
  private generateToken(): string {
    return crypto.randomBytes(32).toString("hex")
  }

  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const genericMessage = "If an account exists with this email, you will receive a password reset link."

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("User")
      .select("id, email, first_name, is_email_verified")
      .eq("email", email.toLowerCase())
      .maybeSingle()

    if (userError) {
      console.error("[PasswordResetService] User lookup error:", userError.message)
      return { success: true, message: genericMessage }
    }

    if (!user) {
      return { success: true, message: genericMessage }
    }

    if (!user.is_email_verified) {
      return {
        success: false,
        message: "Your email address must be verified before requesting a password reset.",
      }
    }

    const token = this.generateToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour

    // Remove any existing tokens for this user
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("user_id", user.id)

    // Insert new token
    const { error: insertError } = await supabase.from("password_reset_tokens").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      token,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("[PasswordResetService] Failed to insert reset token:", insertError.message)
      return { success: true, message: genericMessage }
    }

    try {
      await emailService.sendPasswordResetEmail(user.email, user.first_name || "there", token)
    } catch (error) {
      console.error("[PasswordResetService] Failed to send reset email:", error)
    }

    return { success: true, message: genericMessage }
  }

  async validateToken(token: string): Promise<{ valid: boolean; userId?: string; message?: string }> {
    const { data: tokenRecord, error } = await supabase
      .from("password_reset_tokens")
      .select("id, user_id, expires_at, used_at")
      .eq("token", token)
      .maybeSingle()

    if (error || !tokenRecord) {
      return { valid: false, message: "Invalid or expired reset link" }
    }

    if (tokenRecord.used_at) {
      return { valid: false, message: "This reset link has already been used" }
    }

    if (new Date() > new Date(tokenRecord.expires_at)) {
      return { valid: false, message: "This reset link has expired. Please request a new one." }
    }

    return { valid: true, userId: tokenRecord.user_id }
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const validation = await this.validateToken(token)

    if (!validation.valid || !validation.userId) {
      return { success: false, message: validation.message || "Invalid token" }
    }

    const passwordHash = await hashPassword(newPassword)

    // Update password
    const { error: updateError } = await supabase
      .from("User")
      .update({ passwordHash, updatedAt: new Date().toISOString() })
      .eq("id", validation.userId)

    if (updateError) {
      console.error("[PasswordResetService] Failed to update password:", updateError.message)
      return { success: false, message: "Failed to reset password. Please try again." }
    }

    // Mark token as used
    await supabase
      .from("password_reset_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token)

    // Increment session_version to invalidate all existing sessions
    const { data: currentUser } = await supabase
      .from("User")
      .select("session_version")
      .eq("id", validation.userId)
      .maybeSingle()

    await supabase
      .from("User")
      .update({
        session_version: (currentUser?.session_version ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", validation.userId)

    // Send password changed confirmation email (security notification)
    try {
      const { data: user } = await supabase
        .from("User")
        .select("email, first_name")
        .eq("id", validation.userId)
        .maybeSingle()

      if (user) {
        await emailService.sendPasswordChangedEmail(user.email, user.first_name || "there", validation.userId)
      }
    } catch (error) {
      console.error("[PasswordResetService] Failed to send password changed confirmation:", error)
    }

    return { success: true, message: "Password reset successfully! You can now sign in with your new password." }
  }
}

export const passwordResetService = new PasswordResetService()
