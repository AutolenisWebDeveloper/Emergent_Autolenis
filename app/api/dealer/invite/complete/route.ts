import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService } from "@/lib/services/sourcing.service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(["DEALER"])
    const body = await req.json()

    if (!body.inviteId) {
      return NextResponse.json({ error: "inviteId is required" }, { status: 400 })
    }

    const result = await sourcingService.completeDealerInvite(body.inviteId, session.userId)

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 401 ? "Unauthorized" : "Forbidden" }, { status: statusCode })
    }
    console.error("[DEALER_INVITE_COMPLETE]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
