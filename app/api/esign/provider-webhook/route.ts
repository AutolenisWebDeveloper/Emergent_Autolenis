import { type NextRequest, NextResponse } from "next/server"
import { esignService } from "@/lib/services/esign.service"
import { logger } from "@/lib/logger"

const WEBHOOK_SECRET = process.env['ESIGN_WEBHOOK_SECRET']

export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await req.text()
    const signature = req.headers.get("x-esign-signature") || ""

    // Always require signature verification — reject when secret is missing
    if (!WEBHOOK_SECRET) {
      logger.error("[E-Sign Webhook] ESIGN_WEBHOOK_SECRET is not configured")
      return NextResponse.json({ error: "Service not configured" }, { status: 503 })
    }

    const isValid = esignService.verifyWebhookSignature(rawBody, signature, WEBHOOK_SECRET)
    if (!isValid) {
      logger.error("[E-Sign Webhook] Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    // Normalize payload format (different providers may have different structures)
    const status = normalizeStatus(payload.status || payload.event || payload.data?.status)
    if (!status) {
      logger.error("[E-Sign Webhook] Unrecognised status", { raw: payload.status || payload.event })
      return NextResponse.json({ error: "Unrecognised event status" }, { status: 422 })
    }

    const normalizedPayload = {
      provider: payload.provider || "unknown",
      envelope_id: payload.envelope_id || payload.envelopeId || payload.data?.envelopeId,
      status,
      completed_at: payload.completed_at || payload.completedAt || payload.data?.completedAt,
      raw: payload,
    }

    const result = await esignService.handleWebhook(normalizedPayload)

    return NextResponse.json({ ...result, success: true })
  } catch (error) {
    logger.error("[E-Sign Webhook] Error:", error)
    // Return 200 to prevent provider retries for known errors
    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 200 })
  }
}

function normalizeStatus(status: string | undefined): "COMPLETED" | "DECLINED" | "VOIDED" | null {
  if (!status) return null
  const upper = status.toUpperCase()
  if (upper.includes("COMPLETE") || upper.includes("SIGNED")) return "COMPLETED"
  if (upper.includes("DECLINE") || upper.includes("REJECT")) return "DECLINED"
  if (upper.includes("VOID") || upper.includes("CANCEL")) return "VOIDED"
  return null // Reject unknown statuses instead of defaulting to COMPLETED
}
