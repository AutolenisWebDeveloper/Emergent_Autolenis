import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { appointmentId } = await params
    const result = await pickupService.completePickup(appointmentId, user.id)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[Pickup] Complete error:", error)
    return NextResponse.json({ error: "Failed to complete pickup" }, { status: 400 })
  }
}
