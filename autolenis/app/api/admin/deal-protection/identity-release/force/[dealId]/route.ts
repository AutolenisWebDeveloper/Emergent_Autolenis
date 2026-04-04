import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as IdentityFirewallService from "@/lib/services/identity-firewall.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { dealId } = await params
    const body = await request.json().catch(() => ({}))
    const result = await IdentityFirewallService.forceIdentityRelease(dealId, user.userId, body.reason)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Force Identity Release Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to force identity release", correlationId }, { status: 500 })
  }
}
