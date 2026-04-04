import { type NextRequest, NextResponse } from "next/server"
import { ContractShieldService } from "@/lib/services/contract-shield.service"
import { getSession } from "@/lib/auth-server"

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== "BUYER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { overrideId, comment } = body

    if (!overrideId) {
      return NextResponse.json({ error: "Override ID is required" }, { status: 400 })
    }

    const override = await ContractShieldService.buyerAcknowledgeOverride(overrideId, session.userId, comment)

    return NextResponse.json({
      success: true,
      data: override,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to acknowledge override" },
      { status: 500 },
    )
  }
}
