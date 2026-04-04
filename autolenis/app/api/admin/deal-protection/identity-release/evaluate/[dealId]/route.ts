import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as IdentityFirewallService from "@/lib/services/identity-firewall.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { dealId } = await params
    const result = await IdentityFirewallService.evaluateIdentityRelease(dealId)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Identity Release Evaluate Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to evaluate identity release", correlationId }, { status: 500 })
  }
}
