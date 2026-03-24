import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import {
  convertSourcingCase,
  getConversion,
  getConversionEvents,
} from "@/lib/services/inventory-sourcing/conversion.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/sourcing/cases/[caseId]/convert
 *
 * Triggers the Phase 7 conversion of a sourcing case into the core deal
 * pipeline. Idempotent — re-calling for an already-completed conversion
 * returns the existing result.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])
    const { caseId } = await params

    const result = await convertSourcingCase({
      sourcingCaseId: caseId,
      actorUserId: session.userId,
    })

    return NextResponse.json({
      success: true,
      data: result,
      correlationId,
    })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        {
          error: {
            code: statusCode,
            message: (error as Error).message,
          },
          correlationId,
        },
        { status: statusCode },
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    logger.error("[ADMIN_SOURCING_CONVERT]", { error: message, correlationId })
    return NextResponse.json(
      {
        error: {
          code: 500,
          message: message.includes("not found") || message.includes("must be")
            ? message
            : "Unable to convert sourcing case. Please try again.",
        },
        correlationId,
      },
      {
        status:
          message.includes("not found")
            ? 404
            : message.includes("must be") || message.includes("No ACCEPTED")
              ? 422
              : 500,
      },
    )
  }
}

/**
 * GET /api/admin/sourcing/cases/[caseId]/convert
 *
 * Returns the current conversion status and event timeline.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const correlationId = randomUUID()
  try {
    // Session validated by requireAuth
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { caseId } = await params

    const conversion = await getConversion(caseId)
    if (!conversion) {
      return NextResponse.json(
        {
          error: { code: 404, message: "No conversion found for this case" },
          correlationId,
        },
        { status: 404 },
      )
    }

    const events = await getConversionEvents(conversion.id)

    return NextResponse.json({
      success: true,
      data: { conversion, events },
      correlationId,
    })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        {
          error: {
            code: statusCode,
            message: (error as Error).message,
          },
          correlationId,
        },
        { status: statusCode },
      )
    }
    const message = error instanceof Error ? error.message : String(error)
    logger.error("[ADMIN_SOURCING_CONVERT_GET]", { error: message, correlationId })
    return NextResponse.json(
      {
        error: { code: 500, message: "Unable to fetch conversion status." },
        correlationId,
      },
      { status: 500 },
    )
  }
}
