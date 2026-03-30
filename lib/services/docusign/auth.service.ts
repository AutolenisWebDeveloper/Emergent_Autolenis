/**
 * DocuSign Auth Service — JWT Grant Authentication
 *
 * Implements the canonical DocuSign JWT Grant flow for server-to-server
 * access. Uses RSA private key to generate JWT assertion tokens.
 *
 * Includes token caching for efficiency: tokens are reused until
 * they are within 5 minutes of expiration.
 */

import crypto from "node:crypto"
import { logger } from "@/lib/logger"

// ---------------------------------------------------------------------------
// Token Cache
// ---------------------------------------------------------------------------

let cachedToken: string | null = null
let cachedTokenExpiresAt = 0

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function getDocuSignAuthConfig() {
  return {
    integrationKey: process.env.DOCUSIGN_INTEGRATION_KEY || "",
    userId: process.env.DOCUSIGN_USER_ID || "",
    accountId: process.env.DOCUSIGN_ACCOUNT_ID || "",
    authServer: process.env.DOCUSIGN_AUTH_SERVER || "account-d.docusign.com",
    privateKeyBase64: process.env.DOCUSIGN_PRIVATE_KEY_BASE64 || "",
    basePath: process.env.DOCUSIGN_BASE_PATH || process.env.DOCUSIGN_BASE_URL || "https://demo.docusign.net/restapi",
    // Legacy fallback for secret-key-based auth (client_credentials)
    secretKey: process.env.DOCUSIGN_SECRET_KEY || "",
    oauthBaseUrl: process.env.DOCUSIGN_OAUTH_BASE_URL || "https://account-d.docusign.com",
  }
}

export function isDocuSignConfigured(): boolean {
  const c = getDocuSignAuthConfig()
  const hasJwt = !!(c.integrationKey && c.userId && c.privateKeyBase64 && c.accountId)
  const hasLegacy = !!(c.integrationKey && c.secretKey && c.accountId)
  return hasJwt || hasLegacy
}

/**
 * Assert that all required DocuSign configuration is present.
 * Call this at application startup or before the first DocuSign operation.
 * Throws an Error with a descriptive message listing every missing variable.
 */
export function assertDocuSignConfig(): void {
  const c = getDocuSignAuthConfig()
  const missing: string[] = []

  if (!c.integrationKey) missing.push("DOCUSIGN_INTEGRATION_KEY")
  if (!c.accountId)      missing.push("DOCUSIGN_ACCOUNT_ID")
  if (!c.basePath)       missing.push("DOCUSIGN_BASE_PATH or DOCUSIGN_BASE_URL")

  // JWT Grant is the required auth path
  if (!c.userId)           missing.push("DOCUSIGN_USER_ID")
  if (!c.privateKeyBase64) missing.push("DOCUSIGN_PRIVATE_KEY_BASE64")

  if (!process.env.DOCUSIGN_DEALER_TEMPLATE_ID) missing.push("DOCUSIGN_DEALER_TEMPLATE_ID")

  if (missing.length > 0) {
    throw new Error(
      `DocuSign configuration incomplete. Missing: ${missing.join(", ")}. ` +
        "Run scripts/create-dealer-agreement-template.ts to provision the template " +
        "and set the returned ID as DOCUSIGN_DEALER_TEMPLATE_ID.",
    )
  }

  // Production sandbox guard — warn when demo/sandbox URLs detected in production
  if (process.env.NODE_ENV === "production") {
    try {
      if (new URL(c.basePath).hostname === "demo.docusign.net") {
        logger.warn("[DocuSign] SANDBOX basePath detected in production — set DOCUSIGN_BASE_PATH or DOCUSIGN_BASE_URL env var to production endpoint (e.g. https://na4.docusign.net/restapi)")
      }
    } catch { /* basePath may not be a full URL */ }
    if (c.authServer === "account-d.docusign.com") {
      logger.warn("[DocuSign] SANDBOX authServer detected in production — set DOCUSIGN_AUTH_SERVER env var to account.docusign.com")
    }
    try {
      if (new URL(c.oauthBaseUrl).hostname === "account-d.docusign.com") {
        logger.warn("[DocuSign] SANDBOX oauthBaseUrl detected in production — set DOCUSIGN_OAUTH_BASE_URL env var to https://account.docusign.com")
      }
    } catch { /* malformed URL — will fail at runtime */ }
  }
}

// ---------------------------------------------------------------------------
// JWT Grant Auth
// ---------------------------------------------------------------------------

function base64url(buffer: Buffer): string {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Construct and sign a DocuSign JWT assertion using the RSA private key.
 */
function buildJwtAssertion(
  integrationKey: string,
  userId: string,
  authServer: string,
  privateKeyPem: string,
): string {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600 // 1 hour validity

  const header = { typ: "JWT", alg: "RS256" }
  const payload = {
    iss: integrationKey,
    sub: userId,
    aud: authServer,
    iat: now,
    exp,
    scope: "signature impersonation",
  }

  const headerB64 = base64url(Buffer.from(JSON.stringify(header)))
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)))
  const signingInput = `${headerB64}.${payloadB64}`

  const sign = crypto.createSign("RSA-SHA256")
  sign.update(signingInput)
  const signature = base64url(sign.sign(privateKeyPem))

  return `${signingInput}.${signature}`
}

/**
 * Request an access token from DocuSign using JWT Grant.
 *
 * Falls back to client_credentials grant if no RSA private key is available
 * (legacy configuration).
 */
export async function getDocuSignAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5-minute buffer)
  if (cachedToken && Date.now() < cachedTokenExpiresAt - 300_000) {
    return cachedToken
  }

  const config = getDocuSignAuthConfig()

  // Prefer JWT Grant when RSA key is available
  if (config.privateKeyBase64 && config.userId) {
    return getTokenViaJwtGrant(config)
  }

  // Fallback: client_credentials with secret key
  if (config.secretKey) {
    return getTokenViaClientCredentials(config)
  }

  throw new Error("DocuSign authentication not configured. Set DOCUSIGN_PRIVATE_KEY_BASE64 + DOCUSIGN_USER_ID, or DOCUSIGN_SECRET_KEY.")
}

async function getTokenViaJwtGrant(config: ReturnType<typeof getDocuSignAuthConfig>): Promise<string> {
  const privateKeyPem = Buffer.from(config.privateKeyBase64, "base64").toString("utf-8")

  const assertion = buildJwtAssertion(
    config.integrationKey,
    config.userId,
    config.authServer,
    privateKeyPem,
  )

  const tokenUrl = `https://${config.authServer}/oauth/token`

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  })

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error("DocuSign JWT Grant token request failed", { status: response.status })
    throw new Error(`DocuSign JWT Grant error: ${response.status} — ${errorText}`)
  }

  const data = await response.json()

  cachedToken = data.access_token
  cachedTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000

  return data.access_token
}

async function getTokenViaClientCredentials(config: ReturnType<typeof getDocuSignAuthConfig>): Promise<string> {
  const url = `${config.oauthBaseUrl}/oauth/token`

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.integrationKey,
    client_secret: config.secretKey,
    scope: "signature",
  })

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error("DocuSign client_credentials token request failed", { status: response.status })
    throw new Error(`DocuSign OAuth error: ${response.status} — ${errorText}`)
  }

  const data = await response.json()

  cachedToken = data.access_token
  cachedTokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000

  return data.access_token
}

/**
 * Clear the cached token (useful for testing or forced re-auth).
 */
export function clearTokenCache(): void {
  cachedToken = null
  cachedTokenExpiresAt = 0
}

/**
 * Validate that all required DocuSign configuration is present.
 * Call at startup to surface misconfigurations early.
 * Returns an array of configuration issues (empty = all good).
 */
export function validateDocuSignConfig(): string[] {
  const issues: string[] = []
  const config = getDocuSignAuthConfig()

  if (!config.integrationKey) issues.push("DOCUSIGN_INTEGRATION_KEY is not set")
  if (!config.accountId) issues.push("DOCUSIGN_ACCOUNT_ID is not set")

  const hasJwt = !!(config.privateKeyBase64 && config.userId)
  const hasLegacy = !!config.secretKey

  if (!hasJwt && !hasLegacy) {
    issues.push("No auth method configured: set DOCUSIGN_PRIVATE_KEY_BASE64 + DOCUSIGN_USER_ID, or DOCUSIGN_SECRET_KEY")
  }

  if (!process.env.DOCUSIGN_DEALER_TEMPLATE_ID) {
    issues.push("DOCUSIGN_DEALER_TEMPLATE_ID is not set — provision a template in DocuSign and set this value")
  }

  if (process.env.NODE_ENV === "production") {
    if (!process.env.DOCUSIGN_CONNECT_SECRET && !process.env.DOCUSIGN_WEBHOOK_SECRET) {
      issues.push("DOCUSIGN_CONNECT_SECRET is not set — production webhooks will be rejected")
    }
  }

  return issues
}
