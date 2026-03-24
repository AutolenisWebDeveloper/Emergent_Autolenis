import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { ContractShieldService, assertCanModifyContractFix } from "@/lib/services/contract-shield.service"
import { DEALER_ROLES } from "@/lib/authz/guard"

export const dynamic = "force-dynamic"

// Resolve a fix list item
export async function POST(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const user = await getSessionUser()
    if (!user || !(DEALER_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { fixItemId, resolved, explanation, newDocumentId } = await req.json()

    if (!fixItemId || typeof fixItemId !== "string") {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "fixItemId required" }, correlationId },
        { status: 400 },
      )
    }

    // Object-level authorization: verify actor can modify this fix item
    await assertCanModifyContractFix(
      { userId: user.userId || user.id, role: user.role },
      fixItemId,
    )

    const result = await ContractShieldService.resolveFixItem(fixItemId, {
      resolved: resolved ?? true,
      explanation,
      newDocumentId,
    })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error: any) {
    if (error?.statusCode === 403) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (error?.statusCode === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    console.error("[v0] Fix resolution error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
