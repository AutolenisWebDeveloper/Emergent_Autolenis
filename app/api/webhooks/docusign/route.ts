import { type NextRequest, NextResponse } from "next/server"
import { dealerAgreementService } from "@/lib/services/dealer-agreement.service"
import { verifyWebhookSignature, parseWebhookPayload } from "@/lib/services/docusign/webhook.service"
import type { DocuSignConnectPayload } from "@/lib/types/docusign"
import { logger } from "@/lib/logger"

/**
 * POST /api/webhooks/docusign
 *
 * @deprecated Use /api/docusign/connect instead.
 * Legacy DocuSign webhook handler — kept for backward compatibility.
 * Delegates to both legacy onboarding service and new agreement service.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()

    // Verify webhook signature (canonical — rejects in production if secret not set)
    const signature = req.headers.get("x-docusign-signature-1") || ""
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn("DocuSign webhook signature verification failed")
      return NextResponse.json(
        { error: { code: "INVALID_SIGNATURE", message: "Invalid webhook signature" } },
        { status: 401 },
      )
    }

    const payload: DocuSignConnectPayload = JSON.parse(rawBody)
    const { envelopeId, envelopeStatus, eventTime } = parseWebhookPayload(payload)

    if (!envelopeId) {
      return NextResponse.json(
        { error: { code: "MISSING_ENVELOPE_ID", message: "Missing envelope ID" } },
        { status: 400 },
      )
    }

    logger.info("DocuSign webhook (legacy) received", { event: envelopeStatus, envelopeId })

    // Route through the canonical dealer agreement service
    const result = await dealerAgreementService.processWebhookEvent(
      envelopeId,
      envelopeStatus || "",
      eventTime,
      payload as unknown as Record<string, unknown>,
    )

    return NextResponse.json({ received: true, ...result })
  } catch (err) {
    logger.error("DocuSign webhook (legacy) processing error", { error: err })
    return NextResponse.json(
      { error: { code: "WEBHOOK_ERROR", message: "Internal server error" } },
      { status: 500 },
    )
  }
}
