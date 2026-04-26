import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

/**
 * GET  /api/dealer/notifications        — list dealer notifications
 * POST /api/dealer/notifications/read   — handled by sub-route
 *
 * This route returns AdminNotification records scoped to the dealer's
 * workspace, filtered to deal/auction activity relevant to the dealer.
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Resolve workspaceId via dealer record
    const { data: dealerRow } = await supabase
      .from("Dealer")
      .select("id, workspaceId")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!dealerRow) {
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    const { data: notifications, error } = await supabase
      .from("AdminNotification")
      .select("*")
      .eq("workspaceId", dealerRow.workspaceId)
      .order("createdAt", { ascending: false })
      .limit(50)

    if (error) {
      console.error("[Dealer Notifications] Error:", error)
      return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

    const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length

    return NextResponse.json({
      success: true,
      notifications: notifications ?? [],
      unreadCount,
    })
  } catch (error: unknown) {
    const errWithCode = error as { statusCode?: number }
    const status =
      errWithCode.statusCode && Number.isInteger(errWithCode.statusCode)
        ? errWithCode.statusCode
        : 500
    console.error("[Dealer Notifications] GET error:", error)
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to load notifications" },
      { status },
    )
  }
}
