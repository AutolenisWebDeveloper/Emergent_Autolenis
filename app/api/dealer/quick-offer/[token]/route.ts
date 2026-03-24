import { type NextRequest, NextResponse } from "next/server"
import * as dealerQuickOfferService from "@/lib/services/dealer-quick-offer.service"
import * as dealerInviteService from "@/lib/services/dealer-invite.service"

export const dynamic = "force-dynamic"

// GET /api/dealer/quick-offer/[token] — Validate token and return offer context
// This route is PUBLIC (no auth required) — accessed via invite link
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Validate the token first
    try {
      await dealerInviteService.validateToken(token)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid token"
      return NextResponse.json({
        success: false,
        error: message,
        state: message.includes("expired") ? "expired" : message.includes("already been used") ? "consumed" : "invalid",
      }, { status: 400 })
    }

    // Mark as viewed
    await dealerInviteService.markViewed(token)

    // Get offer context (anonymous buyer readiness)
    const context = await dealerQuickOfferService.getOfferContext(token)

    return NextResponse.json({ success: true, data: context })
  } catch (error) {
    console.error("[quick-offer] Context fetch error:", error)
    return NextResponse.json({ error: "Failed to load offer context" }, { status: 500 })
  }
}
