import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { fetchAndSyncSource, fetchAllActiveSources } from "@/lib/services/inventory-fetch.service"

export const dynamic = "force-dynamic"

// POST /api/admin/inventory/sync — Trigger inventory sync
// Body: { sourceId?: string } — if sourceId provided, sync that source; otherwise sync all active
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))

    if (body.sourceId) {
      // Sync single source
      const result = await fetchAndSyncSource(body.sourceId)
      return NextResponse.json({
        success: true,
        message: `Sync completed for source ${body.sourceId}`,
        data: result,
      })
    }

    // Sync all active sources
    const result = await fetchAllActiveSources()
    return NextResponse.json({
      success: true,
      message: `Synced ${result.fetched.length} sources, ${result.errors.length} errors`,
      data: result,
    })
  } catch (error) {
    console.error("[AdminInventorySync] Error:", error)
    return NextResponse.json({
      error: "Sync failed",
    }, { status: 500 })
  }
}
