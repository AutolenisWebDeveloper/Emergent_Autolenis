/**
 * DocuSign Service Module — Barrel Export
 *
 * Canonical entry point for all DocuSign service operations.
 * Individual service files handle specific concerns:
 *
 * - auth.service.ts       — JWT Grant authentication + token caching
 * - envelope.service.ts   — Envelope CRUD (create, status, void, download)
 * - template.service.ts   — Template verification
 * - recipient-view.service.ts — Embedded signing URL generation
 * - webhook.service.ts    — Webhook verification and payload parsing
 */

export {
  getDocuSignAccessToken,
  getDocuSignAuthConfig,
  isDocuSignConfigured,
  assertDocuSignConfig,
  validateDocuSignConfig,
  clearTokenCache,
} from "./auth.service"

export {
  createEnvelopeFromTemplate,
  getEnvelopeStatus,
  voidEnvelope,
  downloadSignedDocument,
  downloadCertificate,
} from "./envelope.service"

export type { CreateEnvelopeInput, EnvelopeResult } from "./envelope.service"

export { verifyDealerTemplate, createDealerAgreementTemplate } from "./template.service"

export {
  createRecipientView,
} from "./recipient-view.service"

export type { RecipientViewInput } from "./recipient-view.service"

export {
  verifyWebhookSignature,
  parseWebhookPayload,
} from "./webhook.service"
