import { type NextRequest, NextResponse } from "next/server"
import * as inventoryDedupeService from "@/lib/services/inventory-dedupe.service"
import { timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"

// POST /api/internal/inventory/dedupe
// Internal job route: Run deduplication across market vehicles
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

    const result = await inventoryDedupeService.runDeduplication()
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[job:dedupe] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
