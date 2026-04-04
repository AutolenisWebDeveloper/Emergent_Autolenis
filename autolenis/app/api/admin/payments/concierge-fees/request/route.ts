import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockActions } from "@/lib/mocks/mockStore"
import { randomUUID } from "crypto"

export async function POST(request: Request) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { buyerId, dealId, amount, notes } = body

    if (!buyerId || !dealId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "buyerId, dealId, and a positive amount are required" },
        { status: 400 },
      )
    }

    if (isTestWorkspace(user)) {
      const record = mockActions.createConciergeFeeRequest({
        buyerId,
        dealId,
        amount,
        notes,
        createdBy: user.userId,
      })
      return NextResponse.json({ success: true, data: record })
    }

    // Real implementation would:
    // 1. Create ConciergeFeeRequest record with workspaceInsert(user)
    // 2. Trigger buyer notification
    return NextResponse.json({ success: true, data: { id: randomUUID(), status: "REQUESTED" } })
  } catch (error) {
    console.error("[Admin Concierge Fee Request Error]", error)
    return NextResponse.json(
      { error: "Failed to create concierge fee request", correlationId: randomUUID() },
      { status: 500 },
    )
  }
}
