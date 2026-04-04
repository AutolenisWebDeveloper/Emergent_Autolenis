// Prequal session management — cookie-based (anonymous consumers)

import { cookies } from "next/headers"
import { randomBytes } from "crypto"
import { PREQUAL_SESSION_COOKIE, PREQUAL_SESSION_MAX_AGE_SECONDS } from "./constants"

/**
 * Generates a cryptographically random session token.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Sets the prequal session cookie in the response.
 */
export async function setPrequalSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(PREQUAL_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env["NODE_ENV"] === "production",
    sameSite: "lax",
    maxAge: PREQUAL_SESSION_MAX_AGE_SECONDS,
    path: "/",
  })
}

/**
 * Reads the prequal session token from cookies.
 * Returns null if not found.
 */
export async function getPrequalSessionToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(PREQUAL_SESSION_COOKIE)?.value ?? null
}

/**
 * Clears the prequal session cookie.
 */
export async function clearPrequalSessionCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(PREQUAL_SESSION_COOKIE)
}
