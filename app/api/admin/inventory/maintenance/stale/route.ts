import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getSupabase } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()

    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()
    const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()

    const { data, error } = await supabase
      .from("InventoryItem")
      .update({
        status: "REMOVED",
        updatedAt: new Date().toISOString(),
      })
      .lt("lastSyncedAt", cutoff)
      .eq("status", "AVAILABLE")
      .select("id")

    if (error) {
      return NextResponse.json(
        { error: "Failed to mark stale listings", details: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
    })
  } catch (error) {
    console.error("[AdminInventoryStale] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
