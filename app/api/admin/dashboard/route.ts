import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { adminService } from "@/lib/services/admin.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.adminDashboard())
    }

    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace" }, { status: 403 })
    }

    const [stats, funnel, topDealers, topAffiliates] = await Promise.all([
      adminService.getDashboardStats(wsId),
      adminService.getFunnelData(wsId),
      adminService.getTopDealers(5, wsId),
      adminService.getTopAffiliates(5, wsId),
    ])

    return NextResponse.json({ stats, funnel, topDealers, topAffiliates })
  } catch (error) {
    console.error("[Admin Dashboard Error]", error)
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 })
  }
}
