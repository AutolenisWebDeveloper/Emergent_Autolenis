import { type NextRequest, NextResponse } from "next/server"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { getSession, isAdminRole } from "@/lib/auth-server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const session = await getSession()

    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { action, reason } = body

    if (!action || !reason) {
      return NextResponse.json({ error: "Action and reason are required" }, { status: 400 })
    }

    const result = await ContractShieldService.adminOverrideWithConsent(id, action, session.userId, reason)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("[Admin Contract Override] Error:", error)
    return NextResponse.json(
      { error: "Failed to create override" },
      { status: 500 },
    )
  }
}
