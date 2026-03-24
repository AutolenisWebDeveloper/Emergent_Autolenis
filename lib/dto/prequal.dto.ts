/**
 * Canonical PreQualification DTOs and normalizer.
 *
 * All buyer-facing prequal responses MUST use NormalizedPrequalResult.
 * This eliminates mixed snake_case/camelCase fallback logic and
 * ensures all role surfaces (buyer, dealer, admin) consume the
 * same contract.
 */

import type {
  NormalizedPrequalResult,
  CreditTier,
} from "@/lib/types"

// ─── Local type aliases for normalizer internals ───────────────

type NormalizedPrequalStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "REVOKED" | "FAILED"
type NormalizedPrequalSourceType = "providerBacked" | "manualExternal" | "internalHeuristic"
type NormalizedPrequalProvider = "MICROBILT_EXPERIAN" | "IPREDICT" | "MANUAL_EXTERNAL" | "INTERNAL"

// ─── Source mapping ────────────────────────────────────────────

const SOURCE_TYPE_MAP: Record<string, NormalizedPrequalSourceType> = {
  INTERNAL: "internalHeuristic",
  EXTERNAL_MANUAL: "manualExternal",
  PROVIDER_BACKED: "providerBacked",
}

const PROVIDER_MAP: Record<string, NormalizedPrequalProvider> = {
  AutoLenisPrequal: "INTERNAL",
  MICROBILT_EXPERIAN: "MICROBILT_EXPERIAN",
  IPREDICT: "IPREDICT",
  MANUAL_EXTERNAL: "MANUAL_EXTERNAL",
}

// ─── Raw record shape (from Prisma or Supabase query) ──────────

export interface RawPrequalRecord {
  id: string
  status?: string | null
  source?: string | null
  providerName?: string | null
  creditTier?: string | null
  maxOtd?: number | null
  maxOtdAmountCents?: number | null
  estimatedMonthlyMin?: number | null
  estimatedMonthlyMax?: number | null
  minMonthlyPaymentCents?: number | null
  maxMonthlyPaymentCents?: number | null
  dtiRatio?: number | null
  expiresAt?: string | Date | null
  consentGiven?: boolean | null
  consentArtifactId?: string | null
  consumerAuthorizationArtifactId?: string | null
  createdAt: string | Date
}

// ─── Normalizer ────────────────────────────────────────────────

/**
 * Normalize a raw PreQualification record into the canonical
 * buyer-facing DTO. All cents values are converted to dollar
 * amounts for display.
 */
export function normalizePrequal(raw: RawPrequalRecord): NormalizedPrequalResult {
  const status = toNormalizedStatus(raw.status)
  const sourceType = SOURCE_TYPE_MAP[raw.source || "INTERNAL"] ?? "internalHeuristic"
  const provider = resolveProvider(raw.providerName, raw.source)

  return {
    id: raw.id,
    status,
    sourceType,
    provider,
    creditTier: (raw.creditTier as CreditTier) ?? null,
    maxOtd: raw.maxOtdAmountCents != null ? raw.maxOtdAmountCents / 100 : raw.maxOtd ?? null,
    estimatedMonthlyMin:
      raw.minMonthlyPaymentCents != null
        ? raw.minMonthlyPaymentCents / 100
        : raw.estimatedMonthlyMin ?? null,
    estimatedMonthlyMax:
      raw.maxMonthlyPaymentCents != null
        ? raw.maxMonthlyPaymentCents / 100
        : raw.estimatedMonthlyMax ?? null,
    expiresAt: raw.expiresAt ? toISOString(raw.expiresAt) : null,
    disclosuresAccepted: !!(raw.consentGiven || raw.consentArtifactId),
    forwardingAuthorized: !!raw.consumerAuthorizationArtifactId,
    createdAt: toISOString(raw.createdAt),
  }
}

// ─── Helpers ───────────────────────────────────────────────────

const VALID_STATUSES: NormalizedPrequalStatus[] = ["PENDING", "ACTIVE", "EXPIRED", "REVOKED", "FAILED"]

function toNormalizedStatus(status: string | null | undefined): NormalizedPrequalStatus {
  if (status && VALID_STATUSES.includes(status as NormalizedPrequalStatus)) {
    return status as NormalizedPrequalStatus
  }
  return "PENDING"
}

function resolveProvider(
  providerName: string | null | undefined,
  source: string | null | undefined,
): NormalizedPrequalProvider {
  if (providerName && PROVIDER_MAP[providerName]) {
    return PROVIDER_MAP[providerName]
  }
  if (source === "EXTERNAL_MANUAL") return "MANUAL_EXTERNAL"
  if (source === "PROVIDER_BACKED") return "MICROBILT_EXPERIAN"
  return "INTERNAL"
}

function toISOString(value: string | Date): string {
  if (typeof value === "string") return value
  return value.toISOString()
}
