import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { dealerId } = await params
    const events = await prisma.dealerLifecycleEvent.findMany({
      where: { dealerId },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json({ events })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Dealer Lifecycle Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get lifecycle events", correlationId }, { status: 500 })
  }
}
