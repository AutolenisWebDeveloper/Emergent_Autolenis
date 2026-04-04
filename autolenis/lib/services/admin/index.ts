import {
  getDashboardStats,
  getFunnelData,
  getTopDealers,
  getTopAffiliates,
  getDealerPerformance,
} from "./analytics"

import {
  getAllBuyers,
  getBuyerDetail,
  getAllDealers,
  getAllAuctions,
  getAllDeals,
  getAllPayments,
  getAllAffiliates,
  getComplianceEvents,
  getContractShieldScans,
  getInsuranceData,
} from "./queries"

import {
  refundDeposit,
  suspendDealer,
  approveDealer,
  getSystemSettings,
  updateSystemSettings,
} from "./actions"

export class AdminService {
  getDashboardStats = getDashboardStats
  getFunnelData = getFunnelData
  getTopDealers = getTopDealers
  getTopAffiliates = getTopAffiliates
  getDealerPerformance = getDealerPerformance

  getAllBuyers = getAllBuyers
  getBuyerDetail = getBuyerDetail
  getAllDealers = getAllDealers
  getAllAuctions = getAllAuctions
  getAllDeals = getAllDeals
  getAllPayments = getAllPayments
  getAllAffiliates = getAllAffiliates
  getComplianceEvents = getComplianceEvents
  getContractShieldScans = getContractShieldScans
  getInsuranceData = getInsuranceData

  refundDeposit = refundDeposit
  suspendDealer = suspendDealer
  approveDealer = approveDealer
  getSystemSettings = getSystemSettings
  updateSystemSettings = updateSystemSettings
}

export const adminService = new AdminService()
export default adminService
