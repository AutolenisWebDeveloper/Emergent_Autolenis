import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "DEALER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const pickup = await pickupService.completePickup(id, user.id)

    return NextResponse.json(pickup)
  } catch (error: any) {
    console.error("[Pickup Complete]", error)
    return NextResponse.json({ error: "Failed to complete pickup" }, { status: 500 })
  }
}
