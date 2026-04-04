import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"
import { z } from "zod"

const schema = z.object({
  qr_code_value: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { qr_code_value } = schema.parse(body)

    const result = await pickupService.checkInByQR(qr_code_value, user.id)

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error("[Pickup] Check-in error:", error)
    return NextResponse.json({ error: "Failed to check in" }, { status: 400 })
  }
}
