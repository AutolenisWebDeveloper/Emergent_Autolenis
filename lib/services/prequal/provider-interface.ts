/**
 * PreQual Provider Interface & Normalization Layer
 *
 * Defines the contract that all pre-qualification providers must implement.
 * Providers return raw responses that are normalized into a canonical result.
 */

import type { WorkspaceMode } from "@/lib/types"

// ─── Canonical Provider Request ─────────────────────────────────────────────

export interface PreQualProviderRequest {
  firstName: string
  lastName: string
  dateOfBirth: string // YYYY-MM-DD
  addressLine1: string
  city: string
  state: string
  postalCode: string
  monthlyIncomeCents: number
  monthlyHousingCents: number
  ssnLast4?: string
}

// ─── Canonical Provider Response ────────────────────────────────────────────

export interface PreQualProviderResponse {
  success: boolean
  creditTier?: string
  approvedAmountCents?: number
  maxMonthlyPaymentCents?: number
  minMonthlyPaymentCents?: number
  dtiRatio?: number
  providerReferenceId?: string
  errorMessage?: string
  rawResponse?: unknown
}

// ─── Normalized Result (post-normalization) ─────────────────────────────────

export type NormalizedCreditTier = "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "DECLINED"

export interface NormalizedPreQualResult {
  success: boolean
  creditTier: NormalizedCreditTier
  approvedAmountCents: number
  maxMonthlyPaymentCents: number
  minMonthlyPaymentCents: number
  dtiRatio: number
  providerReferenceId: string
  providerName: string
  rawResponse?: unknown
  errorMessage?: string
}

// ─── Provider Interface ─────────────────────────────────────────────────────

export interface PreQualProvider {
  /** Unique provider identifier */
  readonly providerName: string

  /** Whether this provider is available for LIVE workspaces */
  readonly supportsLive: boolean

  /** Whether the provider is configured (has required env vars, etc.) */
  isConfigured?(): boolean

  /** Execute pre-qualification */
  prequalify(
    request: PreQualProviderRequest,
    session?: { workspace_mode?: WorkspaceMode } | null,
  ): Promise<PreQualProviderResponse>
}

// ─── Credit Tier Normalization ──────────────────────────────────────────────

const VALID_CREDIT_TIERS: NormalizedCreditTier[] = [
  "EXCELLENT",
  "GOOD",
  "FAIR",
  "POOR",
  "DECLINED",
]

/**
 * Maps provider-specific credit tier strings to canonical Prisma CreditTier.
 * Handles: PRIME → GOOD, NEAR_PRIME → FAIR, SUBPRIME → POOR
 */
export function normalizeCreditTier(
  tier: string | undefined | null,
): NormalizedCreditTier {
  if (!tier) return "POOR"

  const upper = tier.toUpperCase()

  // Direct match
  if (VALID_CREDIT_TIERS.includes(upper as NormalizedCreditTier)) {
    return upper as NormalizedCreditTier
  }

  // Provider-specific mappings
  const TIER_MAP: Record<string, NormalizedCreditTier> = {
    PRIME: "GOOD",
    NEAR_PRIME: "FAIR",
    SUBPRIME: "POOR",
    SUB_PRIME: "POOR",
    SUPER_PRIME: "EXCELLENT",
    DEEP_SUBPRIME: "DECLINED",
  }

  return TIER_MAP[upper] ?? "POOR"
}

// ─── Response Normalization ─────────────────────────────────────────────────

/**
 * Normalizes a raw provider response into a canonical result.
 * Ensures all fields have safe defaults.
 */
export function normalizeProviderResponse(
  providerName: string,
  response: PreQualProviderResponse,
): NormalizedPreQualResult {
  if (!response.success) {
    return {
      success: false,
      creditTier: "DECLINED",
      approvedAmountCents: 0,
      maxMonthlyPaymentCents: 0,
      minMonthlyPaymentCents: 0,
      dtiRatio: 0,
      providerReferenceId: "",
      providerName,
      rawResponse: response.rawResponse,
      errorMessage:
        response.errorMessage || "Pre-qualification failed",
    }
  }

  return {
    success: true,
    creditTier: normalizeCreditTier(response.creditTier),
    approvedAmountCents: response.approvedAmountCents ?? 0,
    maxMonthlyPaymentCents: response.maxMonthlyPaymentCents ?? 0,
    minMonthlyPaymentCents: response.minMonthlyPaymentCents ?? 0,
    dtiRatio: response.dtiRatio ?? 0,
    providerReferenceId: response.providerReferenceId ?? "",
    providerName,
    rawResponse: response.rawResponse,
  }
}
