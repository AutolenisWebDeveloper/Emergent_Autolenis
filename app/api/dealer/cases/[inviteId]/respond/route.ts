import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { dealerPortalService } from "@/lib/services/inventory-sourcing/dealer-portal.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const schema = z.object({
  action: z.enum(["VIEWED", "DECLINED", "ACCEPTED"]),
})

/**
 * POST /api/dealer/cases/[inviteId]/respond
 *
 * Allows a dealer to mark an invite as viewed, accept, or decline it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  const correlationId = randomUUID()
  try {
    const user = await getSessionUser()

    if (!user || !["DEALER", "DEALER_USER"].includes(user.role)) {
      return NextResponse.json(
        { error: { code: 401, message: "Unauthorized" }, correlationId },
        { status: 401 },
      )
    }

    const dealer = await dealerService.getDealerByUserId(user.id)
    if (!dealer) {
      return NextResponse.json(
        { error: { code: 404, message: "Dealer not found" }, correlationId },
        { status: 404 },
      )
    }

    const { inviteId } = await params
    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: { code: 400, message: "Invalid request" },
          details: parsed.error.flatten(),
          correlationId,
        },
        { status: 400 },
      )
    }

    const updated = await dealerPortalService.respondToInvite(
      inviteId,
      dealer.id,
      parsed.data.action,
    )

    return NextResponse.json({ success: true, data: updated, correlationId })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to respond to invite"

    if (
      message.includes("not found") ||
      message.includes("Cannot transition")
    ) {
      return NextResponse.json(
        { error: { code: 400, message }, correlationId },
        { status: 400 },
      )
    }

    logger.error("[DEALER_INVITE_RESPOND]", {
      error: String(error),
      correlationId,
    })
    return NextResponse.json(
      {
        error: { code: 500, message: "Failed to respond to invite" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
