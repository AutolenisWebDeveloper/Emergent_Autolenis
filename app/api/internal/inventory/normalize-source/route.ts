import { type NextRequest, NextResponse } from "next/server"
import * as inventoryNormalizeService from "@/lib/services/inventory-normalize.service"
import { timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"

// POST /api/internal/inventory/normalize-source
// Internal job route: Normalize parsed sightings into market vehicles
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
    if (!body.sighting) {
      return NextResponse.json({ error: "sighting data is required" }, { status: 400 })
    }

    const normalized = inventoryNormalizeService.normalizeSighting(body.sighting)
    if (!normalized) {
      return NextResponse.json({ success: true, data: { skipped: true, reason: "Normalization failed" } })
    }

    const result = await inventoryNormalizeService.upsertMarketVehicle(
      normalized,
      body.sourceId ?? null,
      body.prospectId,
    )
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[job:normalize-source] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
