import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getRoleBasedRedirect } from "@/lib/auth"

/**
 * Supabase Auth callback handler.
 * Handles redirect-based auth flows (email verification, password recovery, magic link).
 * Exchanges the code for a session and redirects the user to their role-based dashboard.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (!error) {
        // Determine redirect: if "next" is a same-origin relative path, use it
        const isRelative = next.startsWith("/") && !next.startsWith("//")
        const redirectTo = isRelative ? `${origin}${next}` : origin
        return NextResponse.redirect(redirectTo)
      }
    } catch (err) {
      console.error("[auth/callback] Error exchanging code:", err)
    }
  }

  // Fallback: redirect to sign-in on failure
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_callback_failed`)
}
