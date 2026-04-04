import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { dealerPortalService } from "@/lib/services/inventory-sourcing/dealer-portal.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

const schema = z.object({
  externalDealerName: z.string().min(1).max(255),
  externalDealerSource: z.string().min(1).max(100),
  dealerId: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().max(1000).optional(),
})

/**
 * POST /api/admin/dealer-migration
 *
 * Map a scraped external dealer to an onboarded dealer record.
 * Once mapped, future invites and routing go to the onboarded dealer.
 */
export async function POST(req: NextRequest) {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])

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

    const match = await dealerPortalService.mapExternalDealer({
      ...parsed.data,
      matchedBy: session.userId,
    })

    return NextResponse.json({ success: true, data: match, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        {
          error: { code: statusCode, message: (error as Error).message },
          correlationId,
        },
        { status: statusCode },
      )
    }

    logger.error("[ADMIN_DEALER_MIGRATION]", {
      error: String(error),
      correlationId,
    })
    return NextResponse.json(
      {
        error: { code: 500, message: "Failed to map external dealer" },
        correlationId,
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/admin/dealer-migration?dealerId=xxx
 *
 * List external dealer matches for a given onboarded dealer.
 */
export async function GET(req: NextRequest) {
  const correlationId = randomUUID()
  try {
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const dealerId = req.nextUrl.searchParams.get("dealerId")
    if (!dealerId) {
      return NextResponse.json(
        {
          error: { code: 400, message: "dealerId query param required" },
          correlationId,
        },
        { status: 400 },
      )
    }

    const matches = await dealerPortalService.getExternalMatches(dealerId)

    return NextResponse.json({ success: true, data: matches, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        {
          error: { code: statusCode, message: (error as Error).message },
          correlationId,
        },
        { status: statusCode },
      )
    }

    logger.error("[ADMIN_DEALER_MIGRATION_LIST]", {
      error: String(error),
      correlationId,
    })
    return NextResponse.json(
      {
        error: { code: 500, message: "Failed to load external matches" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
