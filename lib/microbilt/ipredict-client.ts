// MicroBilt iPredict Advantage — OAuth2 + API Client
// Real API uses POST /GetReport with MBCLVRq envelope
// Sandbox: https://apitest.microbilt.com/iPredict/GetReport
// Production: https://api.microbilt.com/iPredict/GetReport

import { logger } from "@/lib/logger"
import { MicroBiltAuthError, MicroBiltApiError, MicroBiltTimeoutError, MicroBiltNoScoreError } from "./errors"
import type {
  MicroBiltTokenResponse,
  IpredictRequestBody,
  IpredictRequest,
  IpredictResponse,
} from "./types"

const TOKEN_URL = process.env["MICROBILT_TOKEN_URL"] ?? "https://apitest.microbilt.com/OAuth/Token"
const IPREDICT_BASE_URL = process.env["MICROBILT_IPREDICT_BASE_URL"] ?? "https://apitest.microbilt.com/iPredict"
const REQUEST_TIMEOUT_MS = 15_000

// ── Token cache ────────────────────────────────────────────────────────────

interface CachedToken {
  accessToken: string
  expiresAt: number // Unix ms
}

let _tokenCache: CachedToken | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()

  // Return cached token if still valid (with 60s buffer)
  if (_tokenCache && _tokenCache.expiresAt > now + 60_000) {
    return _tokenCache.accessToken
  }

  const clientId = process.env["MICROBILT_CLIENT_ID"]
  const clientSecret = process.env["MICROBILT_CLIENT_SECRET"]

  if (!clientId || !clientSecret) {
    throw new MicroBiltAuthError("MICROBILT_CLIENT_ID and MICROBILT_CLIENT_SECRET are required")
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new MicroBiltAuthError(`OAuth2 token request failed with status ${response.status}`)
    }

    const data: MicroBiltTokenResponse = await response.json()

    _tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    }

    return data.access_token
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new MicroBiltTimeoutError("MicroBilt OAuth2 token request timed out")
    }
    if (error instanceof MicroBiltAuthError) throw error
    throw new MicroBiltAuthError(
      `Failed to obtain MicroBilt access token: ${error instanceof Error ? error.message : String(error)}`,
    )
  } finally {
    clearTimeout(timeout)
  }
}

// ── MBCLVRq envelope builder ───────────────────────────────────────────────

/**
 * Builds the real MicroBilt MBCLVRq request envelope from our flat IpredictRequestBody.
 * The SSN must already be decrypted before this call. It must NOT be logged.
 */
function buildMBCLVRq(params: IpredictRequestBody, refNum: string): { MBCLVRq: IpredictRequest } {
  const envelope: IpredictRequest = {
    MsgRqHdr: {
      RequestType: "N",
      ReasonCode: "FPP", // Firm Pre-qualification (permissible purpose)
      RefNum: refNum,
    },
    PersonInfo: {
      PersonName: {
        FirstName: params.firstName,
        LastName: params.lastName,
      },
      ContactInfo: {
        PostAddr: {
          Addr1: params.address.street1,
          ...(params.address.street2 ? { Addr2: params.address.street2 } : {}),
          City: params.address.city,
          StateProv: params.address.state,
          PostalCode: params.address.zip,
        },
        ...(params.phone
          ? {
              PhoneNum: {
                PhoneType: "CELL",
                Phone: params.phone,
              },
            }
          : {}),
      },
      TINInfo: {
        TINType: "1",
        TaxId: params.ssn,
      },
      BirthDt: params.dateOfBirth,
    },
  }

  return { MBCLVRq: envelope }
}

// ── iPredict API call ──────────────────────────────────────────────────────

/**
 * Calls the MicroBilt iPredict Advantage API via POST /GetReport.
 * Internally builds the MBCLVRq envelope from the flat IpredictRequestBody.
 * SSN must be decrypted just before this call and must not be logged.
 * Returns the raw MBCLVRs IpredictResponse for encryption + mapping.
 */
export async function callIpredict(requestBody: IpredictRequestBody): Promise<IpredictResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  // Deterministic reference number based on timestamp — not PII
  const refNum = `AL-${Date.now()}`

  let attempt = 0
  const maxAttempts = 2

  try {
    while (attempt < maxAttempts) {
      attempt++
      const accessToken = await getAccessToken()
      const envelope = buildMBCLVRq(requestBody, refNum)

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
          // Additional vendor error codes (OFAC_BLOCKED, SYSTEM_ERROR, etc.) are
          // treated as hard API errors and surface to the caller as MicroBiltApiError.
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
