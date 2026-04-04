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
      const deposits = mockSelectors.adminDepositRequests()
      return NextResponse.json({ success: true, data: deposits })
    }

    // Real implementation would query DepositRequest table with workspace scoping
    return NextResponse.json({ success: true, data: [] })
  } catch (error) {
    console.error("[Admin Deposits GET Error]", error)
    return NextResponse.json(
      { error: "Failed to load deposits", correlationId: randomUUID() },
      { status: 500 },
    )
  }
}
