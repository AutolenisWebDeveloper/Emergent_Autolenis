import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { pickupService } from "@/lib/services/pickup.service"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || undefined
    const dealerId = searchParams.get("dealer_id") || undefined
    const dateFrom = searchParams.get("date_from") ? new Date(searchParams.get("date_from")!) : undefined
    const dateTo = searchParams.get("date_to") ? new Date(searchParams.get("date_to")!) : undefined

    const pickups = await pickupService.listPickupsForAdmin({
      status,
      dealerId,
      dateFrom,
      dateTo,
    })

    return NextResponse.json({ success: true, pickups })
  } catch (error: any) {
    console.error("[Admin Pickups] List error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
