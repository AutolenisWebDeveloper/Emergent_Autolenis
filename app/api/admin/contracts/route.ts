import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { adminService } from "@/lib/services/admin.service"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") || "all"
    const page = Number.parseInt(searchParams.get("page") || "1")

    const result = await adminService.getContractShieldScans({ status, page })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[Admin Contracts Error]", error)
    return NextResponse.json({ error: "Failed to load contract scans" }, { status: 500 })
  }
}
