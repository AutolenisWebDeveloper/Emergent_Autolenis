/**
 * DocuSign Webhook Service
 *
 * Handles DocuSign Connect webhook processing:
 * - HMAC signature verification
 * - Payload parsing
 * - Idempotent event deduplication via event hash
 */

import { verifyDocuSignHmac, generateEventHash } from "@/lib/security/webhook-hmac"
import type { DocuSignConnectPayload } from "@/lib/types/docusign"
import { logger } from "@/lib/logger"

/**
 * Verify the authenticity of a DocuSign Connect webhook payload.
 *
 * Uses the DOCUSIGN_CONNECT_SECRET first, with fallback to DOCUSIGN_WEBHOOK_SECRET.
 * Returns true if the signature is valid, or if no secret is configured (dev mode).
 */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
): boolean {
  const secret = process.env.DOCUSIGN_CONNECT_SECRET || process.env.DOCUSIGN_WEBHOOK_SECRET || ""

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      logger.error("DocuSign webhook secret not configured in production; rejecting request")
      return false
    }
    logger.warn("DocuSign webhook secret not configured; skipping signature verification")
    return true
  }

  if (!signatureHeader) {
    logger.warn("DocuSign webhook: missing X-DocuSign-Signature-1 header")
    return false
  }

  return verifyDocuSignHmac(rawBody, signatureHeader, secret)
}

/**
 * Parse a DocuSign Connect payload and extract envelope details.
 *
 * Returns normalized fields for downstream processing.
 */
export function parseWebhookPayload(payload: DocuSignConnectPayload) {
  const envelopeId = payload.data?.envelopeId || ""
  const envelopeStatus = payload.data?.envelopeSummary?.status || ""
  const eventTime = payload.generatedDateTime || new Date().toISOString()

  return {
    envelopeId,
    envelopeStatus,
    eventTime,
    eventHash: envelopeId && envelopeStatus && eventTime
      ? generateEventHash(envelopeId, envelopeStatus, eventTime)
      : null,
  }
}
