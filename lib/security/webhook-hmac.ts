/**
 * Webhook HMAC Verification — DocuSign Connect
 *
 * Timing-safe HMAC-SHA256 signature verification for DocuSign
 * Connect webhook payloads.
 */

import crypto from "node:crypto"

/**
 * Verify a DocuSign Connect webhook HMAC signature.
 *
 * @param payload  - Raw request body string
 * @param signature - Value of X-DocuSign-Signature-1 header
 * @param secret   - HMAC secret configured in DocuSign Connect
 * @returns true if signature is valid
 */
export function verifyDocuSignHmac(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret || !signature) {
    return false
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("base64")

    const expectedBuffer = Buffer.from(expectedSignature, "base64")
    const receivedBuffer = Buffer.from(signature, "base64")

    if (expectedBuffer.length !== receivedBuffer.length) {
      return false
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  } catch {
    return false
  }
}

/**
 * Generate an idempotency hash for a webhook event payload.
 * Used for deduplication in docusign_connect_events table.
 */
export function generateEventHash(
  envelopeId: string,
  eventType: string,
  eventTime: string,
): string {
  return crypto
    .createHash("sha256")
    .update(`${envelopeId}:${eventType}:${eventTime}`)
    .digest("hex")
}
