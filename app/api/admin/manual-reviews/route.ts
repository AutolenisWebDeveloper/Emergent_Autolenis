import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth-server"
import { listManualReviews } from "@/lib/services/contract-shield"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Admin role required" } },
        { status: 401 },
      )
    }

    const url = new URL(request.url)
    const status = url.searchParams.get("status") as any
    const dealId = url.searchParams.get("dealId") || undefined

    const reviews = await listManualReviews({
      status: status || undefined,
      dealId,
      workspaceId: session.workspace_id || undefined,
    })

    return NextResponse.json({ success: true, data: reviews })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list manual reviews"
    return NextResponse.json(
      { error: { code: "CMA_ERROR", message } },
      { status: 500 },
    )
  }
}
