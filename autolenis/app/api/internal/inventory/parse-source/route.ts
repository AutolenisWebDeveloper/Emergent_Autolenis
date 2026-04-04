import { type NextRequest, NextResponse } from "next/server"
import * as inventoryParseService from "@/lib/services/inventory-parse.service"
import { timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"

// POST /api/internal/inventory/parse-source
// Internal job route: Parse raw inventory snapshots into structured sightings
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
    if (!body.snapshotId) {
      return NextResponse.json({ error: "snapshotId is required" }, { status: 400 })
    }

    const result = await inventoryParseService.parseSnapshot(body.snapshotId)
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error("[job:parse-source] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
