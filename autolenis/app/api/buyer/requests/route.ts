import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService, BuyerProfileMissingError, type CreateCaseInput } from "@/lib/services/sourcing.service"
import { emailService } from "@/lib/services/email.service"
import { logger } from "@/lib/logger"
import { createCarRequestSchema } from "@/lib/validators/car-request"
import { isPrismaReady, isPrismaConfigured } from "@/lib/prisma-status"

export const dynamic = "force-dynamic"

/** Build a JSON error response with correlationId for tracing. */
function errorResponse(
  msg: string,
  status: number,
  correlationId: string,
  errorCode?: string,
) {
  return NextResponse.json(
    { error: { code: errorCode ?? String(status), message: msg }, correlationId },
    { status },
  )
}

/**
 * Extract Prisma error code from an unknown error.
 * PrismaClientKnownRequestError uses `.code` (e.g. "P2002").
 * PrismaClientInitializationError uses `.errorCode` (e.g. "P1001").
 */
function getPrismaErrorCode(error: unknown): string | undefined {
  return (
    (error as { code?: string }).code ??
    (error as { errorCode?: string }).errorCode
  )
}

const PRISMA_UNAVAILABLE_MSG = "Prisma client not available"

/**
 * Map Prisma / DB errors to user-facing responses.
 * Returns null if the error is not a recognised Prisma error.
 *
 * Separates *transient* infrastructure issues (→ 503) from
 * *permanent* configuration/data issues (→ 500 / 422) so that
 * the frontend can show the right guidance to the user.
 */
function handlePrismaError(
  error: unknown,
  logPrefix: string,
  correlationId: string,
): NextResponse | null {
  const prismaCode = getPrismaErrorCode(error)

  // Database connection errors — genuinely transient
  if (prismaCode === "P1001" || prismaCode === "P1002" || prismaCode === "P1017") {
    logger.error(`${logPrefix} Database connection error`, { prismaCode, error: String(error), correlationId })
    return errorResponse(
      "Service temporarily unavailable. Please try again in a moment.",
      503,
      correlationId,
      "DB_CONNECTION",
    )
  }

  // Foreign-key constraint
  if (prismaCode === "P2003") {
    logger.error(`${logPrefix} Foreign-key constraint failed`, { prismaCode, error: String(error), correlationId })
    return errorResponse(
      "Your account configuration is invalid. Please sign out and sign back in, or contact support.",
      422,
      correlationId,
      "FK_CONSTRAINT",
    )
  }

  // Unique constraint
  if (prismaCode === "P2002") {
    logger.error(`${logPrefix} Unique constraint failed`, { prismaCode, error: String(error), correlationId })
    return errorResponse("A duplicate request already exists. Please refresh and try again.", 409, correlationId, "DUPLICATE")
  }

  const errName = (error as { name?: string }).name

  // PrismaClientValidationError (wrong field types / missing required fields) — no code
  if (errName === "PrismaClientValidationError") {
    logger.error(`${logPrefix} Prisma validation error`, { error: String(error), correlationId })
    return errorResponse(
      "Unable to create your request due to a data validation issue. Please try again.",
      422,
      correlationId,
      "VALIDATION",
    )
  }

  // PrismaClientInitializationError without a recognised code (e.g. missing env var)
  if (errName === "PrismaClientInitializationError") {
    logger.error(`${logPrefix} Prisma initialization error`, { error: String(error), correlationId })
    return errorResponse(
      "Unable to process your request right now. Our team has been notified. Please try again later.",
      500,
      correlationId,
      "DB_INIT",
    )
  }

  // Prisma proxy throws a plain Error when the client failed to load
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes(PRISMA_UNAVAILABLE_MSG)) {
    logger.error(`${logPrefix} Prisma client unavailable`, { error: message, correlationId })
    return errorResponse(
      "Unable to process your request right now. Our team has been notified. Please try again later.",
      500,
      correlationId,
      "DB_UNAVAILABLE",
    )
  }

  return null
}

export async function GET() {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["BUYER"])
    
    // Gracefully handle missing user session data
    if (!session.userId) {
      logger.warn("[BUYER_REQUESTS_LIST] Session missing userId", { correlationId })
      return NextResponse.json({ success: true, data: [] })
    }

    // Early guard: verify Prisma is available before attempting DB operations
    if (!isPrismaReady()) {
      logger.error("[BUYER_REQUESTS_LIST] Prisma not available", {
        configured: isPrismaConfigured(),
        correlationId,
      })
      return errorResponse(
        "Unable to load requests right now. Our team has been notified. Please try again later.",
        isPrismaConfigured() ? 503 : 500,
        correlationId,
        isPrismaConfigured() ? "DB_CONNECTION" : "DB_UNAVAILABLE",
      )
    }

    // Resolve canonical BuyerProfile.id from session User.id
    let buyerProfileId: string
    try {
      buyerProfileId = await sourcingService.resolveBuyerProfileId(session.userId)
    } catch (profileError) {
      if (profileError instanceof BuyerProfileMissingError) {
        // Valid buyer with no profile yet — return empty list, not an error
        return NextResponse.json({ success: true, data: [] })
      }
      throw profileError
    }
    
    const data = await sourcingService.listCasesForBuyer(buyerProfileId, session.workspace_id)
    return NextResponse.json({ success: true, data: data ?? [] })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return errorResponse(
        statusCode === 401 ? "Unauthorized" : "Forbidden",
        statusCode,
        correlationId,
      )
    }

    const prismaResp = handlePrismaError(error, "[BUYER_REQUESTS_LIST]", correlationId)
    if (prismaResp) return prismaResp
    
    const message = error instanceof Error ? error.message : String(error)
    logger.error("[BUYER_REQUESTS_LIST] Unhandled error", { error: message, correlationId })
    return errorResponse("Unable to load requests. Please try again.", 500, correlationId)
  }
}

// Track in-flight idempotency keys with TTL to prevent duplicate submissions.
// This is a per-instance guard; the DB unique constraint provides cluster-wide protection.
const IDEMPOTENCY_TTL_MS = 60_000 // 60 seconds
const inFlightKeys = new Map<string, number>()

/** Clean up expired idempotency keys to prevent memory leaks */
function cleanupExpiredKeys() {
  const now = Date.now()
  for (const [key, expiresAt] of inFlightKeys) {
    if (now >= expiresAt) inFlightKeys.delete(key)
  }
}

export async function POST(request: Request) {
  const correlationId = randomUUID()
  try {
    logger.info("[BUYER_REQUESTS_CREATE] Submit started", { correlationId })

    const session = await requireAuth(["BUYER"])

    // Validate session has required user information
    if (!session.userId) {
      logger.error("[BUYER_REQUESTS_CREATE] Session missing userId", { correlationId })
      return errorResponse(
        "Your session is invalid. Please sign out and sign back in.",
        401,
        correlationId,
      )
    }

    // Early guard: verify Prisma is available before attempting DB operations
    if (!isPrismaReady()) {
      logger.error("[BUYER_REQUESTS_CREATE] Prisma not available", {
        configured: isPrismaConfigured(),
        correlationId,
      })
      return errorResponse(
        "Unable to process your request right now. Our team has been notified. Please try again later.",
        isPrismaConfigured() ? 503 : 500,
        correlationId,
        isPrismaConfigured() ? "DB_CONNECTION" : "DB_UNAVAILABLE",
      )
    }

    // --- Idempotency key check ---
    const idempotencyKey = request.headers.get("x-idempotency-key")
    if (idempotencyKey) {
      cleanupExpiredKeys()
      if (inFlightKeys.has(idempotencyKey)) {
        return errorResponse(
          "This request is already being processed. Please wait.",
          409,
          correlationId,
        )
      }
      inFlightKeys.set(idempotencyKey, Date.now() + IDEMPOTENCY_TTL_MS)
    }

    try {
      // Resolve canonical BuyerProfile.id from session User.id
      let buyerProfileId: string
      try {
        buyerProfileId = await sourcingService.resolveBuyerProfileId(session.userId)
      } catch (profileError) {
        if (profileError instanceof BuyerProfileMissingError) {
          return errorResponse(
            profileError.message,
            404,
            correlationId,
            "BUYER_PROFILE_MISSING",
          )
        }
        throw profileError
      }

      let rawBody: unknown
      try {
        rawBody = await request.json()
      } catch {
        return errorResponse("Invalid request format. Please try again.", 400, correlationId)
      }

      const parsed = createCarRequestSchema.safeParse(rawBody)
      if (!parsed.success) {
        // Log the full Zod error detail server-side for debugging
        logger.warn("[BUYER_REQUESTS_CREATE] Validation failed", {
          errors: parsed.error.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
          correlationId,
        })

        const firstError = parsed.error.errors[0]
        let message = firstError?.message ?? "Please check your input and try again."

        // Map common validation errors to user-friendly messages
        const path = firstError?.path ?? []
        if (path.includes("marketZip")) {
          message = "Please enter a valid 5-digit ZIP code."
        } else if (path.includes("make")) {
          message = "Please select a vehicle make."
        } else if (path.includes("yearMin") || path.includes("yearMax")) {
          message = "Please enter a valid model year (1900–2040)."
        } else if (path.includes("items") && typeof path[1] === "number") {
          message = `Vehicle ${(path[1] as number) + 1}: ${firstError?.message ?? "Invalid value."}`
        }

        return errorResponse(message, 422, correlationId)
      }
      const body = parsed.data

      // Map validated data to CreateCaseInput, providing required-field defaults for
      // fields the UI treats as optional but the DB schema requires.
      const currentYear = new Date().getFullYear()
      const serviceInput: CreateCaseInput = {
        ...body,
        items: body.items.map((item) => ({
          ...item,
          yearMin: item.yearMin ?? 1900,
          yearMax: item.yearMax ?? (currentYear + 2),
          // Legacy budgetTargetCents is no longer written — set to 0 as migration default
          budgetTargetCents: 0,
          maxTotalOtdBudgetCents: item.maxTotalOtdBudgetCents ?? null,
          maxMonthlyPaymentCents: item.maxMonthlyPaymentCents ?? null,
          desiredDownPaymentCents: item.desiredDownPaymentCents ?? null,
        })),
      }

      let created
      try {
        created = await sourcingService.createCase(buyerProfileId, serviceInput, session.workspace_id)
      } catch (createError) {
        logger.error("[BUYER_REQUESTS_CREATE] Failed to create case", { error: String(createError), correlationId })
        throw createError
      }

      let submitted
      try {
        submitted = await sourcingService.submitCase(created.id, buyerProfileId, session.userId)
      } catch (submitError) {
        logger.error("[BUYER_REQUESTS_CREATE] Failed to submit case", { 
          caseId: created.id, 
          error: String(submitError),
          correlationId,
        })
        // Return the created case even if submit fails - user can retry submission
        return NextResponse.json({ 
          success: true, 
          data: created,
          warning: "Request created but not yet submitted. Please try again or contact support.",
          correlationId,
        }, { status: 201 })
      }

      // Fire-and-forget email notifications (never block the response)
      const buyerName = [session.first_name, session.last_name].filter(Boolean).join(" ") || "Customer"
      const buyerEmail = session.email

      // 1. Buyer confirmation email
      emailService
        .sendVehicleRequestConfirmation(buyerEmail, buyerName, session.userId)
        .catch((err) => logger.error("[BUYER_REQUESTS] Buyer confirmation email failed", { error: String(err), correlationId }))

      // 2. Admin notification email
      const vehicles = serviceInput.items.map((it) => ({
        make: it.make,
        model: it.model,
        yearMin: it.yearMin,
        yearMax: it.yearMax,
        condition: it.condition,
        budgetType: it.budgetType,
        maxTotalOtdBudgetCents: it.maxTotalOtdBudgetCents,
        maxMonthlyPaymentCents: it.maxMonthlyPaymentCents,
        desiredDownPaymentCents: it.desiredDownPaymentCents,
      }))
      emailService
        .sendVehicleRequestAdminNotification(
          buyerName,
          buyerEmail,
          body.location?.zip ?? body.marketZip ?? "",
          vehicles,
        )
        .catch((err) => logger.error("[BUYER_REQUESTS] Admin notification email failed", { error: String(err), correlationId }))

      logger.info("[BUYER_REQUESTS_CREATE] Submit succeeded", { caseId: submitted.id, correlationId })
      return NextResponse.json({ success: true, data: submitted, correlationId }, { status: 201 })
    } finally {
      // Always clean up the in-flight key
      if (idempotencyKey) inFlightKeys.delete(idempotencyKey)
    }
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return errorResponse(
        statusCode === 401 ? "Unauthorized" : "Forbidden",
        statusCode,
        correlationId,
      )
    }

    const prismaResp = handlePrismaError(error, "[BUYER_REQUESTS_CREATE]", correlationId)
    if (prismaResp) return prismaResp

    const message = error instanceof Error ? error.message : String(error)
    logger.error("[BUYER_REQUESTS_CREATE] Unhandled error", { error: message, correlationId })
    return errorResponse("Unable to create your request. Please try again.", 500, correlationId)
  }
}
