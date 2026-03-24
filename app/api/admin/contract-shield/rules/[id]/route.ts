import { type NextRequest, NextResponse } from "next/server"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { getSession, isAdminRole } from "@/lib/auth-server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const rule = await ContractShieldService.updateRule(id, body)

    return NextResponse.json({
      success: true,
      data: rule,
    })
  } catch (error) {
    console.error("[Admin Contract Shield Rule Update]", error)
    return NextResponse.json(
      { error: "Failed to update rule" },
      { status: 500 },
    )
  }
}
