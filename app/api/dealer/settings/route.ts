import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"

export const dynamic = "force-dynamic"

// Get settings
export async function GET(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const settings = await dealerService.getDealerSettings(dealer.id)

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error("[v0] Settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Update settings
export async function PATCH(_req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const body = await _req.json()
    const settings = await dealerService.updateDealerSettings(dealer.id, body)

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error("[v0] Update settings error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
