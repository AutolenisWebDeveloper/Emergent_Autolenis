/**
 * Buyer Package Service
 *
 * Thin wrapper around the canonical Supabase RPC functions for package and
 * billing lifecycle.  All billing-critical mutations MUST flow through these
 * helpers — never write directly to package/billing columns from application
 * code.
 *
 * Canonical RPCs called:
 *   - initialize_buyer_package_registration
 *   - upgrade_buyer_to_premium
 *   - mark_buyer_deposit_paid / failed / refunded
 *   - record_premium_fee_payment
 *
 * Canonical tables read:
 *   - BuyerProfile  (package_tier, package_selected_at, …)
 *   - buyer_package_billing
 *   - buyer_package_history
 *   - buyer_payment_ledger
 */

import { createAdminClient } from "@/lib/supabase/admin"
import type { BuyerPackageTier } from "@/lib/constants/buyer-packages"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PackageSelectionSource = "REGISTRATION" | "DASHBOARD_UPGRADE" | "ADMIN" | "SUPPORT"

export interface BuyerPackageBilling {
  buyer_id: string
  deposit_required: boolean
  deposit_amount_cents: number
  deposit_status: string
  deposit_credit_treatment: string
  deposit_paid_at: string | null
  premium_fee_total_cents: number
  premium_fee_credit_from_deposit_cents: number
  premium_fee_remaining_cents: number
  premium_fee_status: string
  created_at: string
  updated_at: string
}

export interface BuyerPackageHistoryEntry {
  id: string
  buyer_id: string
  old_tier: string | null
  new_tier: string
  change_source: string
  change_reason: string | null
  changed_at: string
}

export interface BuyerPaymentLedgerEntry {
  id: string
  buyer_id: string
  payment_type: string
  direction: string
  amount_cents: number
  external_payment_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Initialisation (called at registration)
// ---------------------------------------------------------------------------

/**
 * Call the canonical `initialize_buyer_package_registration` RPC after the
 * BuyerProfile row has been created.  The RPC populates `buyer_package_billing`,
 * writes a history entry, and sets the package columns on BuyerProfile.
 */
export async function initializeBuyerPackage(
  buyerId: string,
  packageTier: BuyerPackageTier,
  source: PackageSelectionSource = "REGISTRATION",
  version = "v1",
) {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("initialize_buyer_package_registration", {
    p_buyer_id: buyerId,
    p_package: packageTier,
    p_source: source,
    p_version: version,
  })
  if (error) {
    console.error("[BuyerPackageService] initialize_buyer_package_registration failed", error)
    throw new Error(`Failed to initialize buyer package: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Upgrade
// ---------------------------------------------------------------------------

export async function upgradeBuyerToPremium(
  buyerId: string,
  source: PackageSelectionSource = "DASHBOARD_UPGRADE",
  reason: string | null = null,
) {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("upgrade_buyer_to_premium", {
    p_buyer_id: buyerId,
    p_change_source: source,
    p_reason: reason,
  })
  if (error) {
    console.error("[BuyerPackageService] upgrade_buyer_to_premium failed", error)
    throw new Error(`Failed to upgrade buyer to premium: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Deposit lifecycle
// ---------------------------------------------------------------------------

export async function markDepositPaid(
  buyerId: string,
  externalPaymentId: string | null = null,
  amount = 99.0,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("mark_buyer_deposit_paid", {
    p_buyer_id: buyerId,
    p_external_payment_id: externalPaymentId,
    p_amount: amount,
    p_metadata: metadata,
  })
  if (error) {
    console.error("[BuyerPackageService] mark_buyer_deposit_paid failed", error)
    throw new Error(`Failed to mark deposit paid: ${error.message}`)
  }
}

export async function markDepositFailed(
  buyerId: string,
  externalPaymentId: string | null = null,
  amount = 99.0,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("mark_buyer_deposit_failed", {
    p_buyer_id: buyerId,
    p_external_payment_id: externalPaymentId,
    p_amount: amount,
    p_metadata: metadata,
  })
  if (error) {
    console.error("[BuyerPackageService] mark_buyer_deposit_failed failed", error)
    throw new Error(`Failed to mark deposit failed: ${error.message}`)
  }
}

export async function markDepositRefunded(
  buyerId: string,
  externalPaymentId: string | null = null,
  amount = 99.0,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("mark_buyer_deposit_refunded", {
    p_buyer_id: buyerId,
    p_external_payment_id: externalPaymentId,
    p_amount: amount,
    p_metadata: metadata,
  })
  if (error) {
    console.error("[BuyerPackageService] mark_buyer_deposit_refunded failed", error)
    throw new Error(`Failed to mark deposit refunded: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Premium fee payment
// ---------------------------------------------------------------------------

export async function recordPremiumFeePayment(
  buyerId: string,
  amount: number,
  externalPaymentId: string | null = null,
  metadata: Record<string, unknown> = {},
) {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc("record_premium_fee_payment", {
    p_buyer_id: buyerId,
    p_amount: amount,
    p_external_payment_id: externalPaymentId,
    p_metadata: metadata,
  })
  if (error) {
    console.error("[BuyerPackageService] record_premium_fee_payment failed", error)
    throw new Error(`Failed to record premium fee payment: ${error.message}`)
  }
}

// ---------------------------------------------------------------------------
// Read helpers (dashboard / admin)
// ---------------------------------------------------------------------------

/** Fetch the billing row for a buyer from `buyer_package_billing`. */
export async function getBuyerPackageBilling(buyerId: string): Promise<BuyerPackageBilling | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("buyer_package_billing")
    .select("*")
    .eq("buyer_id", buyerId)
    .maybeSingle()
  if (error) {
    console.error("[BuyerPackageService] getBuyerPackageBilling failed", error)
    return null
  }
  return data as BuyerPackageBilling | null
}

/** Fetch package change history for a buyer from `buyer_package_history`. */
export async function getBuyerPackageHistory(buyerId: string): Promise<BuyerPackageHistoryEntry[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("buyer_package_history")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("changed_at", { ascending: false })
  if (error) {
    console.error("[BuyerPackageService] getBuyerPackageHistory failed", error)
    return []
  }
  return (data || []) as BuyerPackageHistoryEntry[]
}

/** Fetch the payment ledger for a buyer from `buyer_payment_ledger`. */
export async function getBuyerPaymentLedger(buyerId: string): Promise<BuyerPaymentLedgerEntry[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("buyer_payment_ledger")
    .select("*")
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })
  if (error) {
    console.error("[BuyerPackageService] getBuyerPaymentLedger failed", error)
    return []
  }
  return (data || []) as BuyerPaymentLedgerEntry[]
}

/** Read the package + billing snapshot from BuyerProfile for the dashboard. */
export async function getBuyerPackageState(buyerId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("BuyerProfile")
    .select("package_tier, package_selected_at, package_selection_source, package_upgraded_at, package_version")
    .eq("id", buyerId)
    .maybeSingle()
  if (error) {
    console.error("[BuyerPackageService] getBuyerPackageState failed", error)
    return null
  }
  return data
}
