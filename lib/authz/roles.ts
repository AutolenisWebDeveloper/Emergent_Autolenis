/**
 * Canonical Role Definitions for AutoLenis
 *
 * All role checks across the app MUST reference these constants.
 * Never use raw role strings outside of this module.
 *
 * This module is the **single source of truth** for role constants
 * and role-checking helpers.  Other modules (e.g. `auth-server.ts`,
 * `guard.ts`) re-export from here to avoid duplication.
 */

export const Roles = {
  BUYER: "BUYER",
  DEALER: "DEALER",
  DEALER_USER: "DEALER_USER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
  COMPLIANCE_ADMIN: "COMPLIANCE_ADMIN",
  AFFILIATE: "AFFILIATE",
  AFFILIATE_ONLY: "AFFILIATE_ONLY",
  SYSTEM_AGENT: "SYSTEM_AGENT",
} as const

export type Role = (typeof Roles)[keyof typeof Roles]

// ─── Pure role-group constants ───────────────────────────────────────────────
// These arrays contain ONLY the roles belonging to the group itself.
// For API-guard arrays that also include admin overrides, see `guard.ts`.

/** Roles that have admin-level access */
export const ADMIN_ROLES: readonly Role[] = [Roles.ADMIN, Roles.SUPER_ADMIN, Roles.COMPLIANCE_ADMIN] as const

/** Roles that may perform CMA approval actions */
export const CMA_APPROVER_ROLES: readonly Role[] = [Roles.COMPLIANCE_ADMIN, Roles.SUPER_ADMIN] as const

/** Roles that may access the dealer portal */
export const DEALER_ROLES: readonly Role[] = [Roles.DEALER, Roles.DEALER_USER] as const

/** Roles that may access affiliate features */
export const AFFILIATE_ROLES: readonly Role[] = [Roles.AFFILIATE, Roles.AFFILIATE_ONLY] as const

/** Roles that may access the buyer portal */
export const BUYER_ROLES: readonly Role[] = [Roles.BUYER] as const

/** All roles that can sign in through the public auth flow */
export const PUBLIC_SIGNIN_ROLES: readonly Role[] = [
  Roles.BUYER,
  Roles.DEALER,
  Roles.DEALER_USER,
  Roles.AFFILIATE,
  Roles.AFFILIATE_ONLY,
] as const

// ─── Role check helpers (string-based) ───────────────────────────────────────

/** Returns true if `role` is ADMIN, SUPER_ADMIN, or COMPLIANCE_ADMIN. */
export function isAdminRole(role: string | undefined): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role ?? "")
}

/** Returns true if `role` is COMPLIANCE_ADMIN or SUPER_ADMIN (CMA approver). */
export function isCmaApprover(role: string | undefined): boolean {
  return (CMA_APPROVER_ROLES as readonly string[]).includes(role ?? "")
}

/** Returns true if `role` is DEALER or DEALER_USER. */
export function isDealerRole(role: string | undefined): boolean {
  return (DEALER_ROLES as readonly string[]).includes(role ?? "")
}

/** Returns true if `role` is AFFILIATE or AFFILIATE_ONLY (string-only check). */
export function isAffiliateRole(role: string | undefined): boolean {
  return (AFFILIATE_ROLES as readonly string[]).includes(role ?? "")
}

/** Returns true if `role` is BUYER. */
export function isBuyerRole(role: string | undefined): boolean {
  return (BUYER_ROLES as readonly string[]).includes(role ?? "")
}

// ─── User-object-aware helpers ───────────────────────────────────────────────

/**
 * Returns true if the user has affiliate access.
 *
 * Unlike `isAffiliateRole(role)` which only checks the role string, this
 * function also recognises **buyer-affiliates** — users whose primary role
 * is BUYER but who have the `is_affiliate` flag set.
 *
 * This is the **canonical** check; all affiliate-access gates should use it.
 */
export function isUserAffiliate(user: { role?: string; is_affiliate?: boolean } | null): boolean {
  if (!user) return false
  return (
    user.role === Roles.AFFILIATE ||
    user.role === Roles.AFFILIATE_ONLY ||
    (user.role === Roles.BUYER && user.is_affiliate === true)
  )
}

/** Returns the portal path prefix for a given role */
export function portalForRole(role: string): string {
  if (isAdminRole(role)) return "/admin"
  if (isDealerRole(role)) return "/dealer"
  if (isAffiliateRole(role)) return "/affiliate/portal"
  if (isBuyerRole(role)) return "/buyer"
  return "/"
}
