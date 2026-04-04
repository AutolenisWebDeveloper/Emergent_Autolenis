import { type NextRequest, NextResponse } from "next/server"
import { affiliateService } from "@/lib/services/affiliate.service"
import { logger } from "@/lib/logger"
import crypto from "crypto"
import { z } from "zod"

const bodySchema = z.object({
  serviceFeePaymentId: z.string().min(1, "serviceFeePaymentId is required"),
  action: z.enum(["CREATE", "REFUND"]).optional(),
})

// This can be called from Stripe webhook or internal payment completion
export async function POST(request: NextRequest) {
  try {
    // Verify internal API key or Stripe signature
    const authHeader = request.headers.get("x-api-key")
    const expectedKey = process.env['CRON_SECRET'] || process.env['INTERNAL_API_KEY']

    // Reject when no key is configured server-side
    if (!expectedKey) {
      logger.error("[Commission Trigger API] No API key configured")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Reject when no key is provided by caller
    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Use timing-safe comparison to prevent timing attacks
    const isValid =
      authHeader.length === expectedKey.length &&
      crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedKey))

    if (!isValid) {
      logger.warn("[Commission Trigger API] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rawBody = await request.json()
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { serviceFeePaymentId, action } = parsed.data

    if (action === "REFUND") {
      // Cancel commissions on refund
      const cancelledCount = await affiliateService.cancelCommissionsForPayment(serviceFeePaymentId, "Payment refunded")
      return NextResponse.json({
        success: true,
        action: "CANCELLED",
        cancelledCount,
      })
    }

    // Create commissions for paid service fee
    const result = await affiliateService.createCommissionsForPayment(serviceFeePaymentId)

    return NextResponse.json({
      success: result.created,
      reason: result.reason,
      commissionsCreated: result.commissions?.length || 0,
    })
  } catch (error) {
    logger.error("[Commission Trigger API] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
