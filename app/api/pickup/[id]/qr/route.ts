import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const result = await pickupService.generateQRCode(id)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("[Pickup QR]", error)
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 })
  }
}
