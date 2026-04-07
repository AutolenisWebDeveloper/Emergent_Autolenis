import { type NextRequest, NextResponse } from "next/server"
import { sourcingService } from "@/lib/services/sourcing.service"
import * as DealerInviteService from "@/lib/services/dealer-invite.service"

export const dynamic = "force-dynamic"

/**
 * Validates a dealer invite token.
 * Supports both sourcing-specific DealerInvite and general DealerIntelligenceInvite.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 },
      )
    }

    // Try sourcing-specific DealerInvite first
    try {
      const invite = await sourcingService.validateDealerInvite(token)
      return NextResponse.json({
        success: true,
        data: {
          type: "sourcing",
          inviteId: invite.id,
          dealerEmail: invite.dealerEmail,
          dealerName: invite.dealerName,
          caseId: invite.caseId,
        },
      })
    } catch {
      // Not a sourcing invite — fall through
    }

    // Try general network DealerIntelligenceInvite
    try {
      const invite = await DealerInviteService.validateToken(token)
      return NextResponse.json({
        success: true,
        data: {
          type: "network",
          inviteId: invite.id,
          dealerEmail: invite.dealerEmail,
          dealerName: invite.dealerName,
        },
      })
    } catch {
      // Not a network invite either
    }

    return NextResponse.json(
      { success: false, error: "Invalid or expired invite" },
      { status: 400 },
    )
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid or expired invite" },
      { status: 400 },
    )
  }
}

/**
 * Claims (accepts) a dealer invite token.
 * Supports both sourcing-specific DealerInvite and general DealerIntelligenceInvite.
 */
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

    // Try sourcing-specific DealerInvite first
    try {
      const invite = await sourcingService.claimDealerInvite(token)
      return NextResponse.json({
        success: true,
        data: {
          type: "sourcing",
          inviteId: invite.id,
          dealerName: invite.dealerName,
          dealerEmail: invite.dealerEmail,
        },
      })
    } catch {
      // Not a sourcing invite — fall through
    }

    // Try general network DealerIntelligenceInvite
    try {
      const invite = await DealerInviteService.markResponded(token)
      return NextResponse.json({
        success: true,
        data: {
          type: "network",
          inviteId: invite.id,
          dealerName: invite.dealerName,
          dealerEmail: invite.dealerEmail,
        },
      })
    } catch {
      // Not a network invite either
    }

    return NextResponse.json(
      { success: false, error: "Invalid or expired invite" },
      { status: 400 },
    )
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid or expired invite" },
      { status: 400 },
    )
  }
}
