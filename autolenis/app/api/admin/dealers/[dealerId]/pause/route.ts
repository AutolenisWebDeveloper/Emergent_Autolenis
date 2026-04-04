import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dealerId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { dealerId } = await params
    const body = await request.json().catch(() => ({}))
    const event = await prisma.dealerLifecycleEvent.create({
      data: {
        dealerId,
        eventType: "PAUSED",
        performedBy: user.userId,
        metadata: body.reason ? { reason: body.reason } : undefined,
      },
    })
    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Dealer Pause Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to pause dealer", correlationId }, { status: 500 })
  }
}
