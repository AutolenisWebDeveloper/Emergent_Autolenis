/**
 * DocuSign Envelope Service
 *
 * Handles envelope CRUD operations: creation from template,
 * status queries, voiding, and document downloads.
 */

import { logger } from "@/lib/logger"
import {
  getDocuSignAuthConfig,
  isDocuSignConfigured,
  getDocuSignAccessToken,
} from "./auth.service"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateEnvelopeInput {
  templateId?: string
  signerEmail: string
  signerName: string
  signerTitle?: string
  clientUserId: string
  legalBusinessName: string
  dealershipName?: string
  dealerLicenseNumber: string
  licenseState?: string
  dealerId: string
  agreementId: string
}

export interface EnvelopeResult {
  envelopeId: string
  status: string
  uri: string
}

// ---------------------------------------------------------------------------
// Envelope Operations
// ---------------------------------------------------------------------------

/**
 * Create a DocuSign envelope from the dealer agreement template.
 * The signer is configured as an embedded recipient (captive signer)
 * via the clientUserId parameter.
 */
export async function createEnvelopeFromTemplate(
  input: CreateEnvelopeInput,
): Promise<EnvelopeResult> {
  if (!isDocuSignConfigured()) {
    throw new Error("DocuSign is not configured. Set DOCUSIGN_* environment variables.")
  }

  const config = getDocuSignAuthConfig()
  const accessToken = await getDocuSignAccessToken()

  const templateId =
    input.templateId ||
    (process.env.DOCUSIGN_DEALER_TEMPLATE_ID
      ? process.env.DOCUSIGN_DEALER_TEMPLATE_ID.trim()
      : "")

  if (!templateId) {
    throw new Error(
      "DocuSign dealer template ID is not configured. Set DOCUSIGN_DEALER_TEMPLATE_ID or provide templateId in CreateEnvelopeInput.",
    )
  }

  const url = `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes`

  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL.trim()
    : ""

  if (!rawAppUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not configured. It must be an absolute URL for DocuSign Connect webhooks.",
    )
  }

  let webhookBaseUrl: string
  try {
    const parsed = new URL(rawAppUrl)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("invalid protocol")
    }
    // Normalise to remove any trailing slash
    webhookBaseUrl = rawAppUrl.replace(/\/$/, "")
  } catch {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is invalid. It must be an absolute http(s) URL for DocuSign Connect webhooks.",
    )
  }

  const webhookUrl = `${webhookBaseUrl}/api/docusign/connect`

  const body: Record<string, unknown> = {
    templateId,
    templateRoles: [
      {
        email: input.signerEmail,
        name: input.signerName,
        roleName: "dealer_signer",
        clientUserId: input.clientUserId,
        tabs: {
          textTabs: [
            { tabLabel: "DealerLegalName", value: input.legalBusinessName },
            { tabLabel: "DealershipName", value: input.dealershipName || input.legalBusinessName },
            { tabLabel: "DealerLicenseNumber", value: input.dealerLicenseNumber },
            { tabLabel: "LicenseState", value: input.licenseState },
            { tabLabel: "SignerTitle", value: input.signerTitle || "" },
            { tabLabel: "SignerEmail", value: input.signerEmail },
          ],
        },
      },
    ],
    status: "sent",
    emailSubject: `AutoLenis Dealer Participation Agreement — ${input.legalBusinessName}`,
    customFields: {
      textCustomFields: [
        { name: "dealerId",    value: input.dealerId },
        { name: "agreementId", value: input.agreementId },
      ],
    },
    eventNotification: {
      url: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.autolenis.com"}/api/docusign/connect`,
      requireAcknowledgment: "true",
      loggingEnabled: "true",
      envelopeEvents: [
        { envelopeEventStatusCode: "sent" },
        { envelopeEventStatusCode: "delivered" },
        { envelopeEventStatusCode: "completed" },
        { envelopeEventStatusCode: "declined" },
        { envelopeEventStatusCode: "voided" },
      ],
    },
  }

  // Add brand ID if configured
  const brandId = process.env.DOCUSIGN_BRAND_ID
  if (brandId) {
    body.brandId = brandId
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error("DocuSign envelope creation failed", {
      status: response.status,
      dealerId:    input.dealerId,
      agreementId: input.agreementId,
    })
    throw new Error(`DocuSign API error: ${response.status} — ${errorText}`)
  }

  const data = await response.json()

  return {
    envelopeId: data.envelopeId,
    status: data.status,
    uri: data.uri || "",
  }
}

/**
 * Get the current status of a DocuSign envelope.
 */
export async function getEnvelopeStatus(envelopeId: string) {
  if (!isDocuSignConfigured()) {
    throw new Error("DocuSign is not configured.")
  }

  const config = getDocuSignAuthConfig()
  const accessToken = await getDocuSignAccessToken()

  const url = `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`DocuSign status check failed: ${response.status}`)
  }

  return response.json()
}

/**
 * Void a DocuSign envelope with a reason.
 */
export async function voidEnvelope(envelopeId: string, reason: string) {
  if (!isDocuSignConfigured()) {
    throw new Error("DocuSign is not configured.")
  }

  const config = getDocuSignAuthConfig()
  const accessToken = await getDocuSignAccessToken()

  const url = `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}`

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status: "voided",
      voidedReason: reason,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DocuSign void failed: ${response.status} — ${errorText}`)
  }

  return response.json()
}

/**
 * Download the completed signed PDF from DocuSign.
 * Returns the PDF as a Buffer.
 */
export async function downloadSignedDocument(envelopeId: string): Promise<Buffer> {
  if (!isDocuSignConfigured()) {
    throw new Error("DocuSign is not configured.")
  }

  const config = getDocuSignAuthConfig()
  const accessToken = await getDocuSignAccessToken()

  const url = `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}/documents/combined`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/pdf",
    },
  })

  if (!response.ok) {
    throw new Error(`DocuSign document download failed: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Download the certificate of completion for an envelope.
 */
export async function downloadCertificate(envelopeId: string): Promise<Buffer> {
  if (!isDocuSignConfigured()) {
    throw new Error("DocuSign is not configured.")
  }

  const config = getDocuSignAuthConfig()
  const accessToken = await getDocuSignAccessToken()

  const url = `${config.basePath}/v2.1/accounts/${config.accountId}/envelopes/${envelopeId}/documents/certificate`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/pdf",
    },
  })

  if (!response.ok) {
    throw new Error(`DocuSign certificate download failed: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
