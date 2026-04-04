import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { InventoryService } from "@/lib/services/inventory.service"

// POST /api/dealer/inventory/:id/status - Change inventory status
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json({ error: "Dealer not found" }, { status: 404 })
    }

    const body = await req.json()
    const { status } = body

    if (!["AVAILABLE", "HOLD", "SOLD", "REMOVED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be AVAILABLE, HOLD, SOLD, or REMOVED" }, { status: 400 })
    }

    const inventoryItem = await InventoryService.changeStatus(id, dealer.id, status, false)

    return NextResponse.json({ success: true, inventoryItem })
  } catch (error) {
    console.error("[v0] Status change error:", error)
    return NextResponse.json({ error: "Request failed" }, { status: 400 })
  }
}
