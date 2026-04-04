import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
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

    if (isTestWorkspace(user)) {
      const refunds = mockSelectors.adminRefundRecords()
      return NextResponse.json({ success: true, data: refunds })
    }

    // Real implementation would query Refund table with workspace scoping
    return NextResponse.json({ success: true, data: [] })
  } catch (error) {
    console.error("[Admin Refunds GET Error]", error)
    return NextResponse.json(
      { error: "Failed to load refunds", correlationId: randomUUID() },
      { status: 500 },
    )
  }
}
