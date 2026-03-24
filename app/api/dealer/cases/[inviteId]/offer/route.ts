import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { getSessionUser } from "@/lib/auth-server"
import { dealerService } from "@/lib/services/dealer.service"
import { dealerPortalService } from "@/lib/services/inventory-sourcing/dealer-portal.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const offerSchema = z.object({
  listingUrl: z.string().url().optional(),
  vin: z.string().max(17).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  make: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  trim: z.string().max(100).optional(),
  mileage: z.number().int().min(0).optional(),
  priceCents: z.number().int().min(0).optional(),
  feesCents: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
})

/**
 * POST /api/dealer/cases/[inviteId]/offer
 *
 * Submit a structured offer for a sourcing case the dealer was invited to.
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
    const parsed = offerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: { code: 400, message: "Invalid offer data" },
          details: parsed.error.flatten(),
          correlationId,
        },
        { status: 400 },
      )
    }

    const offer = await dealerPortalService.submitOffer(
      inviteId,
      dealer.id,
      parsed.data,
    )

    return NextResponse.json({ success: true, data: offer, correlationId })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit offer"

    if (
      message.includes("not found") ||
      message.includes("Cannot submit")
    ) {
      return NextResponse.json(
        { error: { code: 400, message }, correlationId },
        { status: 400 },
      )
    }

    logger.error("[DEALER_SUBMIT_OFFER]", {
      error: String(error),
      correlationId,
    })
    return NextResponse.json(
      {
        error: { code: 500, message: "Failed to submit offer" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
