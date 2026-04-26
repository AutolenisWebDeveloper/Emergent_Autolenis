import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"

export const dynamic = "force-dynamic"

/** POST /api/dealer/notifications/read-all — mark all as read */
export async function POST(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { data: dealerRow } = await supabase
      .from("Dealer")
      .select("workspaceId")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!dealerRow) {
      return NextResponse.json({ success: true, updated: 0 })
    }

    const { error } = await supabase
      .from("AdminNotification")
      .update({ isRead: true, readAt: new Date().toISOString() })
      .eq("workspaceId", dealerRow.workspaceId)
      .eq("isRead", false)

    if (error) {
      console.error("[Dealer Notifications] mark-all-read error:", error)
      return NextResponse.json({ error: "Failed to mark all as read" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const errWithCode = error as { statusCode?: number }
    const status =
      errWithCode.statusCode && Number.isInteger(errWithCode.statusCode)
        ? errWithCode.statusCode
        : 500
    console.error("[Dealer Notifications] read-all error:", error)
    return NextResponse.json(
      { error: status === 401 ? "Unauthorized" : "Failed to update notifications" },
      { status },
    )
  }
}
