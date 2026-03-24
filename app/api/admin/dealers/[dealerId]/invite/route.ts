import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as DealerInviteService from "@/lib/services/dealer-invite.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { dealerId } = await params
    const body = await request.json()
    const invite = await DealerInviteService.createInvite({
      dealerId,
      invitedBy: user.userId,
      ...body,
    })
    return NextResponse.json(invite, { status: 201 })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Dealer Invite Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to create invite", correlationId }, { status: 500 })
  }
}
