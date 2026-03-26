// MicroBilt IBV (Instant Bank Verification) Client
// Sandbox: https://apitest.microbilt.com

import { logger } from "@/lib/logger"
import { MicroBiltAuthError, MicroBiltApiError, MicroBiltTimeoutError } from "./errors"
import type { IbvFormCreateRequest, IbvFormCreateResponse, IbvReportResponse } from "./types"

const IBV_BASE_URL = process.env["MICROBILT_IBV_BASE_URL"] ?? "https://apitest.microbilt.com/IBV"
const TOKEN_URL = process.env["MICROBILT_TOKEN_URL"] ?? "https://apitest.microbilt.com/OAuth/Token"
const REQUEST_TIMEOUT_MS = 15_000

// Shared token cache (module-level, lazy)
let _tokenCache: { accessToken: string; expiresAt: number } | null = null

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

    const data = await response.json()
    _tokenCache = { accessToken: data.access_token, expiresAt: now + data.expires_in * 1000 }
    return data.access_token
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") throw new MicroBiltTimeoutError()
    if (error instanceof MicroBiltAuthError) throw error
    throw new MicroBiltAuthError(`Failed to obtain MicroBilt access token: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Creates an IBV form session for the consumer.
 * Returns the sessionId and the URL to redirect the consumer to.
 */
export async function createIbvForm(request: IbvFormCreateRequest): Promise<IbvFormCreateResponse> {
  const accessToken = await getAccessToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${IBV_BASE_URL}/form`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        phone: request.phone,
        referenceId: request.referenceId,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new MicroBiltApiError(`IBV form creation failed with status ${response.status}`, response.status)
    }

    return await response.json()
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") throw new MicroBiltTimeoutError()
    if (error instanceof MicroBiltApiError) throw error
    throw new MicroBiltApiError(`IBV form creation error: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Retrieves the IBV report for a completed session.
 * Returns null if the session is not yet complete.
 */
export async function getIbvReport(sessionId: string): Promise<IbvReportResponse | null> {
  try {
    const accessToken = await getAccessToken()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(
        `${IBV_BASE_URL}/report/${encodeURIComponent(sessionId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          signal: controller.signal,
        }
      )

      if (response.status === 404 || response.status === 202) {
        // 202 = processing, 404 = not found
        return null
      }

      if (!response.ok) {
        throw new MicroBiltApiError(`IBV report retrieval failed with status ${response.status}`, response.status)
      }

      return await response.json()
    } finally {
      clearTimeout(timeout)
    }
  } catch (error: unknown) {
    logger.warn("[MicroBilt IBV] Failed to retrieve report", {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
