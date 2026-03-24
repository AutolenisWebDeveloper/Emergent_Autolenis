/**
 * DocuSign Recipient View Service
 *
 * Generates embedded signing URLs for the dealer portal.
 * Uses the DocuSign recipient view API to create a signing session
 * that appears within the AutoLenis dealer portal UI.
 */

import { logger } from "@/lib/logger"
import {
  getDocuSignAuthConfig,
  isDocuSignConfigured,
  getDocuSignAccessToken,
} from "./auth.service"

export interface RecipientViewInput {
  envelopeId: string
  signerEmail: string
  signerName: string
  clientUserId: string
  returnUrl: string
}

/**
 * Generate an embedded signing URL using DocuSign recipient view.
 *
 * The signer must be an embedded recipient (captive signer) in the envelope —
 * which requires a clientUserId to have been set during envelope creation.
 */
export async function createRecipientView(
  input: RecipientViewInput,
): Promise<{ url: string }> {
  if (!isDocuSignConfigured()) {
    throw new Error("DocuSign is not configured.")
  }

  const config = getDocuSignAuthConfig()
  const accessToken = await getDocuSignAccessToken()

  const url = `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes/${input.envelopeId}/views/recipient`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.signerEmail,
      userName: input.signerName,
      clientUserId: input.clientUserId,
      returnUrl: input.returnUrl,
      authenticationMethod: "none",
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error("DocuSign recipient view failed", {
      status: response.status,
      envelopeId: input.envelopeId,
    })
    throw new Error(`DocuSign recipient view error: ${response.status} — ${errorText}`)
  }

  const data = await response.json()
  return { url: data.url }
}
