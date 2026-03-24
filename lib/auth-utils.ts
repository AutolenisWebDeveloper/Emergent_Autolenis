import { redirect } from "next/navigation"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Checks if a user's email is verified and redirects to verification page if not.
 * This should be called in protected route layouts.
 * 
 * SECURITY NOTE: This function fails-open (continues on error) for availability.
 * The primary email verification enforcement is at sign-in (fail-closed).
 * This layout check is a defense-in-depth measure that prevents:
 * - Users who had sessions before this requirement was implemented
 * - Edge cases where verification state changes after sign-in
 * 
 * Database errors here won't block access because:
 * 1. Email verification is already enforced at sign-in (primary control)
 * 2. Failing closed here could cause availability issues for verified users
 * 3. Transient DB errors shouldn't lock out legitimate users
 * 
 * @param userId - The user ID to check
 * @param context - Context for logging (e.g., "BuyerLayout", "DealerLayout")
 * @returns Promise<void> - Redirects if email not verified, otherwise returns normally
 */
export async function requireEmailVerification(userId: string, context: string): Promise<void> {
  try {
    const supabase = createAdminClient()
    const { data: userData } = await supabase
      .from("User")
      .select("is_email_verified")
      .eq("id", userId)
      .limit(1)
      .single()

    if (userData && !userData.is_email_verified) {
      redirect("/auth/verify-email?pending=true")
    }
  } catch (error) {
    console.error(`[${context}] Failed to check email verification`, error)
    // Fail-open: Continue on error to maintain availability for verified users.
    // Primary email verification enforcement is at sign-in (fail-closed).
    // This is a defense-in-depth measure, not the primary security control.
  }
}
