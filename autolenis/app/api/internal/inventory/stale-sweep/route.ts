import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { timingSafeEqual } from "node:crypto"

export const dynamic = "force-dynamic"

// POST /api/internal/inventory/stale-sweep
// Internal job route: Mark stale market vehicles and expire old invites
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

    const now = new Date()

    // Mark market vehicles as stale if staleAfter has passed
    const staleResult = await prisma.inventoryMarketVehicle.updateMany({
      where: {
        status: "ACTIVE" as never,
        staleAfter: { lt: now },
      },
      data: { status: "STALE" as never },
    })

    // Expire old invites
    const expiredInvites = await prisma.dealerIntelligenceInvite.updateMany({
      where: {
        tokenExpiresAt: { lt: now },
        status: "sent",
        respondedAt: null,
      },
      data: { status: "expired" },
    })

    return NextResponse.json({
      success: true,
      data: {
        staleVehicles: staleResult.count,
        expiredInvites: expiredInvites.count,
      },
    })
  } catch (error) {
    console.error("[job:stale-sweep] Error:", error)
    return NextResponse.json({ error: "Job failed" }, { status: 500 })
  }
}
