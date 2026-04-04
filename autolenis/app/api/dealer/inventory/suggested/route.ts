import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { requireDatabase } from "@/lib/require-database"
import * as inventoryVerificationService from "@/lib/services/inventory-verification.service"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET /api/dealer/inventory/suggested — Get suggested market vehicles for dealer
export async function GET(_req: NextRequest) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const supabase = await createClient()

    // Resolve dealer ID
    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!dealer?.id) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const vehicles = await inventoryVerificationService.getSuggestedVehicles(dealer.id)

    return NextResponse.json({ success: true, data: vehicles })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status: statusCode })
    }
    console.error("[dealer-suggested] Error:", error)
    return NextResponse.json({ error: "Failed to load suggested inventory" }, { status: 500 })
  }
}
