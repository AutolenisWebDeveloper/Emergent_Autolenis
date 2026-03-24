import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { adminService } from "@/lib/services/admin.service"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || undefined
    const status = (searchParams.get("status") as any) || "all"
    const page = Number.parseInt(searchParams.get("page") || "1")

    if (isTestWorkspace(user)) {
      return NextResponse.json(mockSelectors.adminDealers({ search, status, page }))
    }

    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace" }, { status: 403 })
    }

    const result = await adminService.getAllDealers({ search, status, page, workspaceId: wsId })

    const res = NextResponse.json(result)
    res.headers.set("x-pathname", request.headers.get("x-pathname") ?? "")
    return res
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Dealers Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to load dealers", correlationId }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { action, dealerId, reason } = await request.json()

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, action, dealerId, reason })
    }

    const wsId = user.workspace_id
    if (!wsId) {
      return NextResponse.json({ error: "Forbidden: no workspace" }, { status: 403 })
    }

    if (action === "approve") {
      const result = await adminService.approveDealer(dealerId, user.userId, wsId)
      return NextResponse.json(result)
    } else if (action === "suspend") {
      const result = await adminService.suspendDealer(dealerId, reason, user.userId, wsId)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Dealers Action Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to process action", correlationId }, { status: 500 })
  }
}
