// Edge-compatible JWT utilities using Web Crypto API directly
// Used by middleware - does not depend on 'jose' package

export interface SessionUser {
  userId: string
  id: string
  email: string
  role: string
  is_affiliate?: boolean
  workspace_id?: string
  workspace_mode?: string
  session_version?: number
}

function base64UrlDecode(str: string): Uint8Array {
  // Add padding if needed
  const padding = "=".repeat((4 - (str.length % 4)) % 4)
  const base64 = (str + padding).replace(/-/g, "+").replace(/_/g, "/")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// function base64UrlEncode(bytes: Uint8Array): string {
//   let binary = ""
//   for (let i = 0; i < bytes.length; i++) {
//     binary += String.fromCharCode(bytes[i])
//   }
//   return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
// }

async function getKey(): Promise<CryptoKey> {
  const secret = process.env['JWT_SECRET']
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required")
  }
  const encoder = new TextEncoder()
  return await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ])
}

export async function verifySessionEdge(token: string): Promise<SessionUser> {
  const parts = token.split(".")
  if (parts.length !== 3) {
    throw new Error("Invalid token format")
  }

  const [headerB64, payloadB64, signatureB64] = parts

  if (!headerB64 || !payloadB64 || !signatureB64) {
    throw new Error("Invalid token format")
  }

  // Verify signature
  const key = await getKey()
  const encoder = new TextEncoder()
  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const signature = base64UrlDecode(signatureB64)

  const isValid = await crypto.subtle.verify("HMAC", key, signature as unknown as BufferSource, data)
  if (!isValid) {
    throw new Error("Invalid signature")
  }

  // Decode payload
  const payloadJson = new TextDecoder().decode(base64UrlDecode(payloadB64))
  const payload = JSON.parse(payloadJson)

  // Check expiration
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired")
  }

  return {
    userId: payload.userId,
    id: payload.userId,
    email: payload.email,
    role: payload.role,
    is_affiliate: payload.is_affiliate || false,
    workspace_id: payload.workspace_id || null,
    workspace_mode: payload.workspace_mode || "LIVE",
    session_version: payload.session_version ?? 0,
  }
}
