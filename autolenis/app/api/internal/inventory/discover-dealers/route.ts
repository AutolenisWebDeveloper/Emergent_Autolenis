import { type NextRequest, NextResponse } from "next/server"
import * as dealerDiscoveryService from "@/lib/services/dealer-discovery.service"
import { timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"

// POST /api/internal/inventory/discover-dealers
// Internal job route: Discover new dealer prospects
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")
    const expectedKey = process.env["INTERNAL_API_KEY"]
    if (expectedKey) {
      const expected = `Bearer ${expectedKey}`
      if (
        !authHeader ||
        authHeader.length !== expected.length ||
        !timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const body = await req.json().catch(() => ({}))
    const zip = body.zip ?? "00000"
    const radiusMiles = body.radiusMiles ?? 50

    const result = await dealerDiscoveryService.discoverDealers({
      zip,
      radiusMiles,
      keywords: body.keywords,
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[job:discover-dealers] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
