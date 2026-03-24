import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService, BuyerProfileMissingError } from "@/lib/services/sourcing.service"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const url = new URL(request.url)
    const marketZip = url.searchParams.get("marketZip")
    const radius = url.searchParams.get("radius")

    if (!marketZip) {
      return NextResponse.json({ error: "marketZip is required" }, { status: 400 })
    }

    const radiusMiles = radius ? parseInt(radius, 10) : 50
    if (isNaN(radiusMiles) || radiusMiles < 1 || radiusMiles > 500) {
      return NextResponse.json({ error: "radius must be 1-500" }, { status: 400 })
    }

    // Resolve canonical BuyerProfile.id from session User.id
    let buyerProfileId: string
    try {
      buyerProfileId = await sourcingService.resolveBuyerProfileId(session.userId)
    } catch (profileError) {
      if (profileError instanceof BuyerProfileMissingError) {
        // No buyer profile yet — cannot have coverage gap data
        return NextResponse.json({ success: true, data: { isGap: false, reasonCode: null, signalId: null } })
      }
      throw profileError
    }

    const result = await sourcingService.checkDealerCoverage(
      buyerProfileId,
      marketZip,
      radiusMiles,
      session.workspace_id,
    )

    return NextResponse.json({
      success: true,
      data: {
        isGap: !result.hasCoverage,
        reasonCode: result.signal?.reasonCode ?? null,
        signalId: result.signal?.id ?? null,
      },
    })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 401 ? "Unauthorized" : "Forbidden" }, { status: statusCode })
    }
    console.error("[BUYER_COVERAGE_GAP]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
