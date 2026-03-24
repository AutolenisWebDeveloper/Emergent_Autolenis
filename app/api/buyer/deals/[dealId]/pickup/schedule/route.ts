import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"
import { z } from "zod"

const schema = z.object({
  scheduled_at: z.string().transform((s) => new Date(s)),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ dealId: string }> }) {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { dealId } = await params
    const body = await req.json()
    const { scheduled_at, notes } = schema.parse(body)

    const result = await pickupService.schedulePickup(dealId, user.id, scheduled_at, notes)

    return NextResponse.json({ success: true, appointment: result })
  } catch (error) {
    console.error("[Pickup] Schedule error:", error)
    return NextResponse.json({ error: "Failed to schedule pickup" }, { status: 500 })
  }
}
