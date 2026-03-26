// MicroBilt iPredict Advantage — OAuth2 + API Client
// Sandbox endpoint: https://apitest.microbilt.com

import { logger } from "@/lib/logger"
import { MicroBiltAuthError, MicroBiltApiError, MicroBiltTimeoutError, MicroBiltNoScoreError } from "./errors"
import type { MicroBiltTokenResponse, IpredictRequestBody, IpredictRawResponse } from "./types"

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
    throw new MicroBiltAuthError(`Failed to obtain MicroBilt access token: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    clearTimeout(timeout)
  }
}

// ── iPredict API call ──────────────────────────────────────────────────────

/**
 * Calls the MicroBilt iPredict Advantage API.
 * SSN must be decrypted just before this call and must not be logged.
 */
export async function callIpredict(requestBody: IpredictRequestBody): Promise<IpredictRawResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let attempt = 0
  const maxAttempts = 2

  try {
    while (attempt < maxAttempts) {
      attempt++
      const accessToken = await getAccessToken()

      try {
        const response = await fetch(`${IPREDICT_BASE_URL}/score`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            ssn: requestBody.ssn,
            firstName: requestBody.firstName,
            lastName: requestBody.lastName,
            dateOfBirth: requestBody.dateOfBirth,
            address: {
              street1: requestBody.address.street1,
              street2: requestBody.address.street2,
              city: requestBody.address.city,
              state: requestBody.address.state,
              zip: requestBody.address.zip,
            },
            phone: requestBody.phone,
            email: requestBody.email,
          }),
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

        const data: IpredictRawResponse = await response.json()

        if (data.status === "NO_SCORE") {
          throw new MicroBiltNoScoreError()
        }

        if (data.status === "VENDOR_DECLINE") {
          return { ...data, vendorDecline: true }
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
 * Retrieves a previously archived iPredict report by requestId.
 */
export async function retrieveIpredictArchive(requestId: string): Promise<IpredictRawResponse | null> {
  try {
    const accessToken = await getAccessToken()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${IPREDICT_BASE_URL}/archive/${encodeURIComponent(requestId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      })

      if (!response.ok) return null
      return await response.json()
    } finally {
      clearTimeout(timeout)
    }
  } catch (error: unknown) {
    logger.warn("[MicroBilt] Failed to retrieve iPredict archive", {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
