import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("User")
      .select("id, email, role, first_name, last_name, emailVerified, createdAt")
      .order("createdAt", { ascending: false })
      .limit(200)

    if (error) {
      console.error("[Admin Users List] DB error:", error)
      return NextResponse.json({ error: "Failed to load users" }, { status: 500 })
    }

    const users = (data || []).map((u: any) => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(" ") || u.email,
      email: u.email,
      role: u.role,
      verified: !!u.emailVerified,
      createdAt: u.createdAt
        ? new Date(u.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "",
    }))

    return NextResponse.json({ success: true, users })
  } catch (error: any) {
    console.error("[Admin Users List] Error:", error?.message || error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
