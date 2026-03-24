import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"
import { z } from "zod"

const schema = z.object({
  reason: z.string().min(1, "Reason is required"),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { appointmentId } = await params
    const body = await req.json()
    const { reason } = schema.parse(body)

    const result = await pickupService.cancelPickup(appointmentId, user.id, reason)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[Pickup] Cancel error:", error)
    return NextResponse.json({ error: "Failed to cancel pickup" }, { status: 400 })
  }
}
