import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { ContractShieldService, assertCanAccessDealContract } from "@/lib/services/contract-shield.service"
import { DEALER_ROLES } from "@/lib/authz/guard"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId },
        { status: 401 },
      )
    }

    // Only dealers and admins can list contracts
    if (!(DEALER_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const dealId = searchParams.get("dealId")

    if (!dealId) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "dealId required" }, correlationId },
        { status: 400 },
      )
    }

    // Object-level authorization: verify actor can access this deal
    await assertCanAccessDealContract(
      { userId: user.userId || user.id, role: user.role },
      dealId,
    )

    const documents = await ContractShieldService.getDocumentsByDealId(dealId)

    return NextResponse.json({
      success: true,
      data: { contracts: documents },
    })
  } catch (error: any) {
    if (error?.statusCode === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error?.statusCode === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("[v0] Contract list error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
