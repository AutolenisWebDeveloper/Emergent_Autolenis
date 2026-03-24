import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { dealId } = await params
    const result = await pickupService.getPickupForDealer(dealId, user.id)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[Pickup] Dealer get error:", error)
    return NextResponse.json({ error: "Failed to get pickup details" }, { status: 400 })
  }
}
