import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"
import { z } from "zod"

const schema = z.object({
  dealId: z.string(),
  scheduledAt: z.string().transform((s) => new Date(s)),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    const pickup = await pickupService.schedulePickup(data.dealId, user.id, data.scheduledAt, data.notes)

    return NextResponse.json(pickup)
  } catch (error: any) {
    console.error("[Pickup Schedule]", error)
    return NextResponse.json({ error: "Failed to schedule pickup" }, { status: 400 })
  }
}
