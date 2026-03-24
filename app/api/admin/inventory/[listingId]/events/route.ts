import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getSupabase } from "@/lib/db"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ listingId: string }> },
) {
  try {
    const user = await getSessionUser()

    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { listingId } = await params
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("inventory_admin_events")
      .select("*")
      .eq("listing_id", listingId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: "Failed to load events", details: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ items: data || [] })
  } catch (error) {
    console.error("[AdminInventoryEvents] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
