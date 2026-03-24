import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { adminService } from "@/lib/services/admin.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || undefined
    const page = Number.parseInt(searchParams.get("page") || "1")

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.adminBuyers({ search, page }))
    }

    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace" }, { status: 403 })
    }

    const result = await adminService.getAllBuyers({ search, page, workspaceId: wsId })
    return NextResponse.json(result)
  } catch (error) {
    console.error("[Admin Buyers Error]", error)
    return NextResponse.json({ error: "Failed to load buyers" }, { status: 500 })
  }
}
