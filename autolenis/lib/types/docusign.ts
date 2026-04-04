/**
 * DocuSign Types — Typed API interfaces
 *
 * Canonical TypeScript interfaces for DocuSign API requests,
 * responses, and webhook payloads.
 */

// ---------------------------------------------------------------------------
// DocuSign Configuration
// ---------------------------------------------------------------------------

export interface DocuSignConfig {
  accountId: string
  integrationKey: string
  userId: string
  authServer: string
  privateKeyBase64: string
  basePath: string
  dealerTemplateId: string
  connectSecret: string
  returnUrl: string
  env: "sandbox" | "production"
}

// ---------------------------------------------------------------------------
// JWT Token
// ---------------------------------------------------------------------------

export interface DocuSignTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface CreateEnvelopeFromTemplateInput {
  dealerId: string
  agreementId: string
  signerEmail: string
  signerName: string
  signerTitle?: string
  clientUserId: string
  legalBusinessName: string
  dealerLicenseNumber: string
  licenseState: string
}

export interface EnvelopeCreationResult {
  envelopeId: string
  status: string
  uri: string
}

export interface EnvelopeStatusResponse {
  envelopeId: string
  status: string
  sentDateTime?: string
  deliveredDateTime?: string
  completedDateTime?: string
  declinedDateTime?: string
  voidedDateTime?: string
  statusChangedDateTime?: string
}

// ---------------------------------------------------------------------------
// Recipient View (Embedded Signing)
// ---------------------------------------------------------------------------

export interface RecipientViewRequest {
  envelopeId: string
  signerEmail: string
  signerName: string
  clientUserId: string
  returnUrl: string
}

export interface RecipientViewResponse {
  url: string
}

// ---------------------------------------------------------------------------
// Connect Webhook
// ---------------------------------------------------------------------------

export interface DocuSignConnectPayload {
  event: string
  apiVersion: string
  uri: string
  retryCount: number
  configurationId: number
  generatedDateTime: string
  data: {
    accountId: string
    userId: string
    envelopeId: string
    envelopeSummary?: {
      status: string
      documentsUri: string
      recipientsUri: string
      envelopeUri: string
      emailSubject: string
      envelopeId: string
      sentDateTime?: string
      deliveredDateTime?: string
      completedDateTime?: string
      declinedDateTime?: string
      voidedDateTime?: string
      statusChangedDateTime?: string
    }
  }
}
