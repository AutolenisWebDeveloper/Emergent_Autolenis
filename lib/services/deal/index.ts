// Re-export all types
export { DealStatus, normalizeDealStatus, VALID_TRANSITIONS } from "./types"
export type { PaymentType, ConciergeFeeMethod, ConciergeFeeStatus } from "./types"

// Re-export standalone functions for direct usage
export { createOrGetSelectedDealFromBestPrice } from "./creation"
export { getSelectedDealForBuyer, getDealForDealer, getDealForAdmin } from "./retrieval"
export { updateFinancingChoice, payConciergeFeeByCard, includeConciergeFeeInLoan } from "./financing"
export { selectInsuranceQuote, uploadExternalInsuranceProof } from "./insurance"
export { advanceDealStatusIfReady, cancelDeal, adminOverrideStatus, logStatusChange, buildStatusTimeline } from "./status"

// Import sub-module functions for class composition
import { createOrGetSelectedDealFromBestPrice } from "./creation"
import { getSelectedDealForBuyer, getDealForDealer, getDealForAdmin } from "./retrieval"
import { updateFinancingChoice, payConciergeFeeByCard, includeConciergeFeeInLoan } from "./financing"
import { selectInsuranceQuote, uploadExternalInsuranceProof } from "./insurance"
import { advanceDealStatusIfReady, cancelDeal, adminOverrideStatus, logStatusChange, buildStatusTimeline } from "./status"

// Reconstruct the DealService class by delegating to sub-modules
export class DealService {
  static createOrGetSelectedDealFromBestPrice = createOrGetSelectedDealFromBestPrice
  static getSelectedDealForBuyer = getSelectedDealForBuyer
  static getDealForDealer = getDealForDealer
  static getDealForAdmin = getDealForAdmin
  static updateFinancingChoice = updateFinancingChoice
  static payConciergeFeeByCard = payConciergeFeeByCard
  static includeConciergeFeeInLoan = includeConciergeFeeInLoan
  static selectInsuranceQuote = selectInsuranceQuote
  static uploadExternalInsuranceProof = uploadExternalInsuranceProof
  static advanceDealStatusIfReady = advanceDealStatusIfReady
  static cancelDeal = cancelDeal
  static adminOverrideStatus = adminOverrideStatus
  private static logStatusChange = logStatusChange
  private static buildStatusTimeline = buildStatusTimeline
}

export const dealService = new DealService()
export default dealService
