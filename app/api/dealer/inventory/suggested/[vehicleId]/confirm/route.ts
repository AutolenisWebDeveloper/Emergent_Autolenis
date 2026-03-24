import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { requireDatabase } from "@/lib/require-database"
import * as inventoryVerificationService from "@/lib/services/inventory-verification.service"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// POST /api/dealer/inventory/suggested/[vehicleId]/confirm — Confirm & promote to verified
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> },
) {
  try {
    const user = await requireAuth(["DEALER", "DEALER_USER"])
    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    const { vehicleId } = await params
    const supabase = await createClient()

    const { data: dealer } = await supabase
      .from("Dealer")
      .select("id")
      .eq("userId", user.userId)
      .maybeSingle()

    if (!dealer?.id) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const result = await inventoryVerificationService.confirmSuggestedVehicle(vehicleId, dealer.id)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: (error as Error).message }, { status: statusCode })
    }
    console.error("[dealer-confirm] Error:", error)
    return NextResponse.json({ error: "Failed to confirm vehicle" }, { status: 500 })
  }
}
