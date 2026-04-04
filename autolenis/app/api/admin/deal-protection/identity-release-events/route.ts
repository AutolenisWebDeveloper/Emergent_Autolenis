import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as IdentityFirewallService from "@/lib/services/identity-firewall.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sp = request.nextUrl.searchParams
    const page = Number.parseInt(sp.get("page") || "1")

    const result = await IdentityFirewallService.getIdentityReleaseEvents({ page })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Identity Release Events Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to list identity release events", correlationId }, { status: 500 })
  }
}
