/**
 * Dealer Onboarding Module
 *
 * Canonical dealer onboarding system using DocuSign + Supabase.
 */

export { dealerOnboardingService, DealerOnboardingService } from "./dealer-onboarding.service"

export { docuSignService, DocuSignService } from "./docusign.service"

export {
  DealerApplicationStatus,
  DealerAccessState,
  DealerDocumentType,
  ALLOWED_STATUS_TRANSITIONS,
  getDealerDocStoragePath,
  getDealerAgreementStoragePath,
  checkActivationGate,
  checkDealerAgreementGate,
} from "./types"

export type {
  CreateApplicationInput,
  UploadDealerDocumentInput,
  ActivationGateResult,
  DealerAgreementGateResult,
} from "./types"
