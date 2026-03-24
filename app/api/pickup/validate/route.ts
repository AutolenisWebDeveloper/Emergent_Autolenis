import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"
import { z } from "zod"

const schema = z.object({
  code: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== "DEALER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { code } = schema.parse(body)

    const pickup = await pickupService.validatePickupCode(code)

    return NextResponse.json(pickup)
  } catch (error: any) {
    console.error("[Pickup Validate]", error)
    return NextResponse.json({ error: "Invalid pickup code" }, { status: 400 })
  }
}
