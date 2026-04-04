import { type NextRequest, NextResponse } from "next/server"
import * as inventoryFetchService from "@/lib/services/inventory-fetch.service"
import { timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"

// POST /api/internal/inventory/fetch-source
// Internal job route: Fetch raw inventory data from a dealer source
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

    if (body.sourceId) {
      const result = await inventoryFetchService.fetchSource(body.sourceId)
      return NextResponse.json({ success: true, data: result })
    }

    // Fetch all active sources that are due
    const result = await inventoryFetchService.fetchAllActiveSources()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[job:fetch-source] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
