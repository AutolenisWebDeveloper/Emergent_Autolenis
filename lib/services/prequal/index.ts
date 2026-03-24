/**
 * PreQual Module — Public API
 *
 * Re-exports all provider interfaces, adapters, and services.
 */

// Provider interface + normalization
export {
  type PreQualProvider,
  type PreQualProviderRequest,
  type PreQualProviderResponse,
  type NormalizedPreQualResult,
  type NormalizedCreditTier,
  normalizeCreditTier,
  normalizeProviderResponse,
} from "./provider-interface"

// Provider adapters
export { InternalPreQualProvider, internalProvider } from "./internal-provider"
export { MicroBiltProvider, microBiltProvider } from "./microbilt-provider"
export { IPredictProvider, iPredictProvider } from "./ipredict-provider"

// Provider registry
export { ProviderRegistry, providerRegistry } from "./provider-registry"

// Consent artifacts
export {
  ConsentArtifactService,
  consentArtifactService,
} from "./consent-artifact.service"

// Forwarding authorization
export {
  ForwardingAuthorizationService,
  ForwardingNotAuthorizedError,
  forwardingAuthorizationService,
} from "./forwarding-authorization.service"
