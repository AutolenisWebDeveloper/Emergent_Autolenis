import type { UserRole } from "@/lib/types"

/**
 * Centralized role detection utilities.
 * Derives role from JWT claims or user profile data.
 */

export function isBuyer(role: UserRole | undefined): boolean {
  return role === "BUYER"
}

export function isDealer(role: UserRole | undefined): boolean {
  return role === "DEALER" || role === "DEALER_USER"
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export function isAffiliate(role: UserRole | undefined, isAffiliateFlag?: boolean): boolean {
  return role === "AFFILIATE" || role === "AFFILIATE_ONLY" || (role === "BUYER" && isAffiliateFlag === true)
}

/**
 * Check if a user can write (insert/update) to a given entity.
 */
export function canWriteFinancingOffer(role: UserRole | undefined): boolean {
  return isBuyer(role)
}

export function canWriteContractDocument(role: UserRole | undefined): boolean {
  return isDealer(role)
}

export function canWriteESignEnvelope(role: UserRole | undefined): boolean {
  return isAdmin(role)
}

export function canWriteInsurancePolicy(role: UserRole | undefined): boolean {
  return isAdmin(role)
}
