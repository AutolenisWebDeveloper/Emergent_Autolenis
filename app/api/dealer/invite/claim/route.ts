import { type NextRequest, NextResponse } from "next/server"
import { sourcingService } from "@/lib/services/sourcing.service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 },
      )
    }

    const invite = await sourcingService.validateDealerInvite(token)

    return NextResponse.json({
      success: true,
      data: {
        inviteId: invite.id,
        dealerEmail: invite.dealerEmail,
        dealerName: invite.dealerName,
        caseId: invite.caseId,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid or expired invite" },
      { status: 400 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token } = body
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 },
      )
    }

    const invite = await sourcingService.claimDealerInvite(token)

    return NextResponse.json({
      success: true,
      data: {
        inviteId: invite.id,
        dealerName: invite.dealerName,
        dealerEmail: invite.dealerEmail,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid or expired invite" },
      { status: 400 },
    )
  }
}
