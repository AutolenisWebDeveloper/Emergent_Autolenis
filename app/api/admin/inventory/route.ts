import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getSupabase } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/admin/inventory — Get inventory summary/counts
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = getSupabase()

    // Get total counts by status
    const [availableRes, holdRes, soldRes, removedRes, totalRes] = await Promise.all([
      supabase.from("InventoryItem").select("id", { count: "exact", head: true }).eq("status", "AVAILABLE"),
      supabase.from("InventoryItem").select("id", { count: "exact", head: true }).eq("status", "HOLD"),
      supabase.from("InventoryItem").select("id", { count: "exact", head: true }).eq("status", "SOLD"),
      supabase.from("InventoryItem").select("id", { count: "exact", head: true }).eq("status", "REMOVED"),
      supabase.from("InventoryItem").select("id", { count: "exact", head: true }),
    ])

    // Get counts by source type
    const { data: sourceData } = await supabase
      .from("InventoryItem")
      .select("source")
      .not("source", "is", null)

    const sourceCounts: Record<string, number> = {}
    for (const row of (sourceData || []) as Array<{ source: string }>) {
      sourceCounts[row.source] = (sourceCounts[row.source] || 0) + 1
    }

    // Get dealer source sync status
    const { data: dealerSources } = await supabase
      .from("DealerSource")
      .select("id, sourceType, status, feedUrl, sourceUrl, lastFetchedAt, errorCount, lastErrorMessage, dealerId")
      .order("createdAt", { ascending: false })
      .limit(20)

    return NextResponse.json({
      success: true,
      counts: {
        total: totalRes.count || 0,
        available: availableRes.count || 0,
        hold: holdRes.count || 0,
        sold: soldRes.count || 0,
        removed: removedRes.count || 0,
      },
      sourceCounts,
      dealerSources: dealerSources || [],
    })
  } catch (error) {
    console.error("[AdminInventory] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
