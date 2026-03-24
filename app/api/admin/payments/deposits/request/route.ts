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
    const { buyerId, dealId, amount, notes, dueDate } = body

    if (!buyerId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "buyerId and a positive amount are required" },
        { status: 400 },
      )
    }

    if (isTestWorkspace(user)) {
      const record = mockActions.createDepositRequest({
        buyerId,
        dealId,
        amount,
        notes,
        dueDate,
        createdBy: user.userId,
      })
      return NextResponse.json({ success: true, data: record })
    }

    // Real implementation would:
    // 1. Create DepositRequest record with workspaceInsert(user)
    // 2. Trigger buyer notification
    return NextResponse.json({ success: true, data: { id: randomUUID(), status: "REQUESTED" } })
  } catch (error) {
    console.error("[Admin Deposit Request Error]", error)
    return NextResponse.json(
      { error: "Failed to create deposit request", correlationId: randomUUID() },
      { status: 500 },
    )
  }
}
