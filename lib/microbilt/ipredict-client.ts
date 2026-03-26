// MicroBilt iPredict Advantage — Real API Client
// Auth: OAuth2 Client Credentials (Basic auth header)
// Endpoint: POST /GetReport
// Request body: MBCLVRq JSON envelope
//
// SECURITY:
//   - SSN is decrypted server-side immediately before the API call
//   - SSN is NEVER logged, cached, or persisted outside the encrypted field
//   - Raw response is encrypted before storage

import { logger } from "@/lib/logger"
import { MicroBiltAuthError, MicroBiltApiError, MicroBiltTimeoutError, MicroBiltNoScoreError } from "./errors"
import { mapIpredictResponse } from "./mappers"
import type { MicroBiltTokenResponse, IpredictRequest, IpredictResponse, ParsedIpredictResult } from "./types"

const TOKEN_URL = process.env["MICROBILT_TOKEN_URL"] ?? "https://apitest.microbilt.com/OAuth/Token"
const IPREDICT_BASE_URL = process.env["MICROBILT_IPREDICT_BASE_URL"] ?? "https://apitest.microbilt.com/iPredict"
const REQUEST_TIMEOUT_MS = 15_000

// ── Token cache ──────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string
  expiresAt: number
}

let _tokenCache: CachedToken | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()

  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.accessToken
  }

  const clientId = process.env["MICROBILT_CLIENT_ID"]
  const clientSecret = process.env["MICROBILT_CLIENT_SECRET"]

  if (!clientId || !clientSecret) {
    throw new MicroBiltAuthError("MICROBILT_CLIENT_ID and MICROBILT_CLIENT_SECRET are required")
  }

  // MicroBilt uses Basic auth for the token endpoint
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new MicroBiltAuthError(`OAuth2 token request failed with status ${response.status}`)
    }

    const data: MicroBiltTokenResponse = await response.json()

    _tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + (data.expires_in || 3600) * 1000,
    }

    return _tokenCache.accessToken
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new MicroBiltTimeoutError("MicroBilt OAuth2 token request timed out")
    }
    if (error instanceof MicroBiltAuthError) throw error
    throw new MicroBiltAuthError(
      `Failed to obtain MicroBilt access token: ${error instanceof Error ? error.message : "Unknown"}`
    )
  } finally {
    clearTimeout(timeout)
  }
}

// ── Request builder ──────────────────────────────────────────────────

export interface IpredictApplicationInput {
  firstName: string
  lastName: string
  ssn: string // Full 9-digit, decrypted for this call only
  dob: string // "YYYY-MM-DD"
  address1: string
  city: string
  state: string // 2-letter
  zip: string // 5-digit
  phone: string // 10-digit
  employerName?: string
  grossMonthlyIncome: number // in dollars (will be formatted as string)
  payFrequency?: string
  applicationId: string // Used as RefNum to link response back
}

function buildRequest(input: IpredictApplicationInput): IpredictRequest {
  const request: IpredictRequest = {
    MsgRqHdr: {
      RequestType: "N",
      ReasonCode: "3",
      RefNum: input.applicationId,
    },
    PersonInfo: {
      PersonName: {
        FirstName: input.firstName.toUpperCase(),
        LastName: input.lastName.toUpperCase(),
      },
      ContactInfo: {
        PhoneNum: {
          PhoneType: "11",
          Phone: input.phone.replace(/\D/g, ""),
        },
        PostAddr: {
          Addr1: input.address1,
          City: input.city,
          StateProv: input.state,
          PostalCode: input.zip,
        },
      },
      TINInfo: {
        TINType: "1",
        TaxId: input.ssn.replace(/\D/g, ""),
      },
      BirthDt: input.dob,
    },
    IncomeInfo: {
      MonthlyIncome: {
        // grossMonthlyIncome is already in dollars per IpredictApplicationInput interface contract
        Amt: input.grossMonthlyIncome.toFixed(2),
        CurCode: "USD",
      },
    },
  }

  if (input.employerName) {
    request.PersonInfo.EmploymentHistory = {
      OrgInfo: { Name: input.employerName },
    }
  }

  if (input.payFrequency && request.IncomeInfo) {
    const freqMap: Record<string, string> = {
      weekly: "W",
      biweekly: "B",
      semimonthly: "S",
      monthly: "M",
      annual: "A",
    }
    const mapped = freqMap[input.payFrequency.toLowerCase()]
    if (mapped) {
      request.IncomeInfo.PmtFreq = mapped
    }
  }

  return request
}

// ── iPredict API call ──────────────────────────────────────────────────────

/**
 * Calls the MicroBilt iPredict Advantage API via POST /GetReport.
 * SSN must be decrypted just before this call and must not be logged.
 * Returns the raw MBCLVRs IpredictResponse for encryption + mapping.
 */
export async function callIpredict(input: IpredictApplicationInput): Promise<IpredictResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let attempt = 0
  const maxAttempts = 2

  try {
    while (attempt < maxAttempts) {
      attempt++
      const accessToken = await getAccessToken()
      const envelope = { MBCLVRq: buildRequest(input) }

      try {
        const response = await fetch(`${IPREDICT_BASE_URL}/GetReport`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(envelope),
          signal: controller.signal,
        })

        if (response.status === 401 || response.status === 403) {
          // Token may have expired mid-flight; clear cache and retry once
          _tokenCache = null
          if (attempt < maxAttempts) {
            logger.warn("[MicroBilt] iPredict auth error — refreshing token and retrying")
            continue
          }
          throw new MicroBiltAuthError(`iPredict API auth failed with status ${response.status}`)
        }

        if (!response.ok) {
          const body = await response.text()
          throw new MicroBiltApiError(
            `iPredict API returned ${response.status}`,
            response.status,
            body,
          )
        }

        const data: IpredictResponse = await response.json()

        // Detect system error in the response envelope
        const responseStatus = data.RESPONSE?.STATUS
        if (responseStatus?.type === "ERROR") {
          const errorCode = responseStatus.error?.code ?? "UNKNOWN"
          const errorMsg = responseStatus.error?.message ?? "iPredict returned an error"
          // NO_SCORE error codes per iPredict_6.yaml spec:
          //   NO_SCORE           — insufficient trade/credit history to produce a score
          //   INSUFFICIENT_DATA  — vendor alias for the same condition
          // All other vendor error codes (OFAC_BLOCKED, SYSTEM_ERROR, etc.) fall
          // through to the MicroBiltApiError thrown below, surfacing to the caller.
          if (errorCode === "NO_SCORE" || errorCode === "INSUFFICIENT_DATA") {
            throw new MicroBiltNoScoreError()
          }
          throw new MicroBiltApiError(`iPredict error ${errorCode}: ${errorMsg}`)
        }

        // Detect no-score from missing/empty SCORES array
        const scores = data.RESPONSE?.CONTENT?.DECISION?.SCORES
        if (!scores || scores.length === 0) {
          throw new MicroBiltNoScoreError()
        }

        return data
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new MicroBiltTimeoutError()
        }
        if (
          error instanceof MicroBiltAuthError ||
          error instanceof MicroBiltApiError ||
          error instanceof MicroBiltNoScoreError
        ) {
          throw error
        }
        if (attempt >= maxAttempts) throw error
        logger.warn("[MicroBilt] iPredict transient error, retrying", {
          error: error instanceof Error ? error.message : String(error),
          attempt,
        })
      }
    }
  } finally {
    clearTimeout(timeout)
  }

  throw new MicroBiltApiError("iPredict API failed after maximum retry attempts")
}

/**
 * Convenience: calls iPredict and immediately maps the response to ParsedIpredictResult.
 * Use when you do not need to encrypt or persist the raw vendor response.
 */
export async function callAndMapIpredict(input: IpredictApplicationInput): Promise<ParsedIpredictResult> {
  const raw = await callIpredict(input)
  return mapIpredictResponse(raw)
}

/**
 * Retrieves a previously archived iPredict report by its RqUID / reference number.
 * Returns null if not found or on any error.
 */
export async function retrieveIpredictArchive(rqUID: string): Promise<IpredictResponse | null> {
  try {
    const accessToken = await getAccessToken()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(
        `${IPREDICT_BASE_URL}/GetReport/${encodeURIComponent(rqUID)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        },
      )

      if (!response.ok) return null
      return await response.json()
    } finally {
      clearTimeout(timeout)
    }
  } catch (error: unknown) {
    logger.warn("[MicroBilt] Failed to retrieve iPredict archive", {
      rqUID,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

