import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get dealer
    const { data: dealer, error: dealerError } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (dealerError || !dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    // Get import logs
    const { data: imports, error: importsError } = await supabase
      .from("inventory_import_log")
      .select("*")
      .eq("dealer_id", dealer.id)
      .order("created_at", { ascending: false })

    if (importsError) {
      console.error("[Import History] Error:", importsError)
      return NextResponse.json({ error: "Failed to fetch import history" }, { status: 500 })
    }

    return NextResponse.json({ success: true, imports: imports || [] })
  } catch (error) {
    console.error("[Import History] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
