/**
 * Authoritative iPredict Adapter
 *
 * Implements PreQualProvider by delegating to the REAL MicroBilt iPredict
 * integration in `lib/microbilt/ipredict-client.ts`.
 *
 * This adapter bridges the PreQualProvider interface (used by provider-registry
 * and prequal.service.ts) to the authoritative callIpredict() function which
 * uses OAuth2 + POST /GetReport against the real MicroBilt API.
 *
 * SSN handling:
 *  - Requires `ssnEncrypted` on the request for LIVE execution
 *  - Decrypts SSN just-in-time before the API call (never logged)
 *  - Follows the same security pattern as app/api/prequal/ipredict/route.ts
 *
 * This replaces the deprecated stub adapters:
 *  - lib/services/prequal/ipredict-provider.ts  (fabricated /predict/qualify)
 *  - lib/services/prequal/microbilt-provider.ts  (fabricated /credit/prequalify)
 */

import type {
  PreQualProvider,
  PreQualProviderRequest,
  PreQualProviderResponse,
} from "./provider-interface"
import { callIpredict, type IpredictApplicationInput } from "@/lib/microbilt/ipredict-client"
import { scoreIpredict } from "@/lib/decision/ipredict-scorer"
import { decryptSsn } from "@/lib/prequal/encryption"
import { logger } from "@/lib/logger"
import { MicroBiltTimeoutError, MicroBiltNoScoreError } from "@/lib/microbilt/errors"
import { IPREDICT_THRESHOLDS } from "@/lib/prequal/constants"

/**
 * Maps an iPredict band (PASS/BORDERLINE/FAIL) + score to a canonical credit tier string.
 */
function bandToCreditTier(band: string, scoreRaw?: number): string {
  if (band === "FAIL") return "DECLINED"
  if (band === "BORDERLINE") return "FAIR"

  // PASS — further differentiate by score
  if (scoreRaw != null) {
    if (scoreRaw >= 750) return "EXCELLENT"
    if (scoreRaw >= IPREDICT_THRESHOLDS.PASS_MIN) return "GOOD"
  }
  return "GOOD"
}

/**
 * Estimates shopping power amounts from iPredict score + income data.
 * The public prequal flow defers this to the finalize step; for the buyer
 * provider-interface path we provide conservative estimates so the
 * PreQualProviderResponse contract is fully populated.
 */
function estimateShoppingPower(
  band: string,
  monthlyIncomeCents: number,
  monthlyHousingCents: number,
): { approvedAmountCents: number; maxMonthlyPaymentCents: number; minMonthlyPaymentCents: number; dtiRatio: number } {
  if (band === "FAIL") {
    return { approvedAmountCents: 0, maxMonthlyPaymentCents: 0, minMonthlyPaymentCents: 0, dtiRatio: 0 }
  }

  const monthlyIncome = monthlyIncomeCents / 100
  const monthlyHousing = monthlyHousingCents / 100
  const dtiRatio = monthlyIncome > 0 ? (monthlyHousing / monthlyIncome) * 100 : 100

  const rateMultiplier = band === "PASS" ? 0.9 : 0.7
  const availableMonthly = monthlyIncome * 0.43 - monthlyHousing
  const maxMonthlyPayment = Math.max(0, Math.floor(availableMonthly * rateMultiplier))

  const avgApr = band === "PASS" ? 0.055 : 0.085
  const termMonths = 60
  const monthlyRate = avgApr / 12
  const approvedAmount =
    monthlyRate > 0
      ? maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate)
      : maxMonthlyPayment * termMonths

  return {
    approvedAmountCents: Math.floor(approvedAmount) * 100,
    maxMonthlyPaymentCents: maxMonthlyPayment * 100,
    minMonthlyPaymentCents: Math.floor(maxMonthlyPayment * 0.5) * 100,
    dtiRatio: Math.round(dtiRatio * 100) / 100,
  }
}

export class AuthoritativeIpredictAdapter implements PreQualProvider {
  readonly providerName = "MicroBilt-iPredict"
  readonly supportsLive = true

  isConfigured(): boolean {
    return Boolean(
      process.env["MICROBILT_CLIENT_ID"] && process.env["MICROBILT_CLIENT_SECRET"],
    )
  }

  /**
   * Executes prequalification via the authoritative MicroBilt iPredict API.
   *
   * Requires `ssnEncrypted` on the request for real vendor execution.
   * If SSN is missing, returns a clear error (iPredict requires full SSN).
   */
  async prequalify(
    request: PreQualProviderRequest,
  ): Promise<PreQualProviderResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        errorMessage:
          "MicroBilt iPredict is not configured. Set MICROBILT_CLIENT_ID and MICROBILT_CLIENT_SECRET.",
      }
    }

    if (!request.ssnEncrypted) {
      return {
        success: false,
        errorMessage:
          "Full SSN (encrypted) is required for LIVE iPredict prequalification. " +
          "Use the public /prequal flow or provide ssnEncrypted in the request.",
      }
    }

    // Decrypt SSN just-in-time — never log or persist in plain text
    let ssnPlain: string
    try {
      ssnPlain = decryptSsn(request.ssnEncrypted)
    } catch {
      return {
        success: false,
        errorMessage: "Failed to decrypt SSN for iPredict call",
      }
    }

    const input: IpredictApplicationInput = {
      firstName: request.firstName,
      lastName: request.lastName,
      ssn: ssnPlain,
      dob: request.dateOfBirth,
      address1: request.addressLine1,
      city: request.city,
      state: request.state,
      zip: request.postalCode,
      phone: request.phone || "",
      employerName: request.employerName,
      grossMonthlyIncome: request.monthlyIncomeCents / 100,
      applicationId: request.applicationId || `buyer-prequal-${Date.now()}`,
    }

    try {
      const callResult = await callIpredict(input)
      const scoringResult = scoreIpredict(callResult.parsed)

      const creditTier = bandToCreditTier(scoringResult.band, scoringResult.scoreRaw)
      const shoppingPower = estimateShoppingPower(
        scoringResult.band,
        request.monthlyIncomeCents,
        request.monthlyHousingCents,
      )

      return {
        success: scoringResult.band !== "FAIL",
        creditTier,
        approvedAmountCents: shoppingPower.approvedAmountCents,
        maxMonthlyPaymentCents: shoppingPower.maxMonthlyPaymentCents,
        minMonthlyPaymentCents: shoppingPower.minMonthlyPaymentCents,
        dtiRatio: shoppingPower.dtiRatio,
        providerReferenceId: callResult.vendorRequestId ?? undefined,
        errorMessage: scoringResult.band === "FAIL"
          ? `iPredict hard-fail: ${scoringResult.hardFailReason ?? "score below threshold"}`
          : undefined,
      }
    } catch (error: unknown) {
      if (error instanceof MicroBiltTimeoutError) {
        // Retry once at adapter level (callIpredict already retries internally on auth errors)
        try {
          const retryResult = await callIpredict(input)
          const retryScoring = scoreIpredict(retryResult.parsed)
          const creditTier = bandToCreditTier(retryScoring.band, retryScoring.scoreRaw)
          const shoppingPower = estimateShoppingPower(
            retryScoring.band,
            request.monthlyIncomeCents,
            request.monthlyHousingCents,
          )

          return {
            success: retryScoring.band !== "FAIL",
            creditTier,
            approvedAmountCents: shoppingPower.approvedAmountCents,
            maxMonthlyPaymentCents: shoppingPower.maxMonthlyPaymentCents,
            minMonthlyPaymentCents: shoppingPower.minMonthlyPaymentCents,
            dtiRatio: shoppingPower.dtiRatio,
            providerReferenceId: retryResult.vendorRequestId ?? undefined,
            errorMessage: retryScoring.band === "FAIL"
              ? `iPredict hard-fail: ${retryScoring.hardFailReason ?? "score below threshold"}`
              : undefined,
          }
        } catch (retryError: unknown) {
          logger.error("[AuthoritativeIpredictAdapter] iPredict timeout after retry", {
            error: retryError instanceof Error ? retryError.message : String(retryError),
          })
          return {
            success: false,
            errorMessage: "Credit assessment service temporarily unavailable (timeout)",
          }
        }
      }

      if (error instanceof MicroBiltNoScoreError) {
        return {
          success: false,
          creditTier: "DECLINED",
          errorMessage: "Insufficient credit history to produce a score",
        }
      }

      const message = error instanceof Error ? error.message : "Unknown iPredict error"
      logger.error("[AuthoritativeIpredictAdapter] iPredict error", { error: message })
      return {
        success: false,
        errorMessage: `iPredict provider error: ${message}`,
      }
    }
  }
}

// Singleton
export const authoritativeIpredictAdapter = new AuthoritativeIpredictAdapter()
