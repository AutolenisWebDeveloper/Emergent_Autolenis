import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [marketCount, verifiedCount, activeSources, staleCutoff] = await Promise.all([
      prisma.inventoryMarketVehicle.count(),
      prisma.inventoryVerifiedVehicle.count(),
      prisma.dealerSource.count({ where: { status: "ACTIVE" } }),
      prisma.inventoryMarketVehicle.count({
        where: { lastSeenAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      }),
    ])

    return NextResponse.json({
      marketVehicles: marketCount,
      verifiedVehicles: verifiedCount,
      activeSources,
      staleMarketVehicles: staleCutoff,
      staleRate: marketCount > 0 ? +(staleCutoff / marketCount).toFixed(4) : 0,
    })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Inventory Health Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get health metrics", correlationId }, { status: 500 })
  }
}
