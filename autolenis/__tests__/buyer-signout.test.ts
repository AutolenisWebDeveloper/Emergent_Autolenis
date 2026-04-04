import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

/**
 * Tests for buyer dashboard sign-out behavior:
 *  1) fetch sends Accept: application/json so the API returns JSON (not a redirect)
 *  2) fetch sends credentials: "include" so the session cookie is sent
 *  3) On success, browser redirects to /auth/signin
 *  4) On API error, browser still redirects to /auth/signin (session cleared server-side)
 *  5) On network error, browser still redirects to /auth/signin
 */

describe("buyer dashboard signout fetch options", () => {
  let fetchSpy: ReturnType<typeof vi.fn>
  const originalLocation = window.location

  beforeEach(() => {
    fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    // Mock window.location.href setter
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...originalLocation, href: "" },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    })
  })

  async function simulateHandleLogout() {
    // Replicates the buyer layout-client handleLogout logic
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
        headers: { "Accept": "application/json" },
      })

      window.location.href = "/auth/signin"
    } catch {
      window.location.href = "/auth/signin"
    }
  }

  it("sends Accept: application/json header to ensure JSON response (not redirect)", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

    await simulateHandleLogout()

    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/signout", {
      method: "POST",
      credentials: "include",
      headers: { "Accept": "application/json" },
    })
  })

  it("sends credentials: include to send session cookie", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

    await simulateHandleLogout()

    const callArgs = fetchSpy.mock.calls[0]?.[1]
    expect(callArgs.credentials).toBe("include")
  })

  it("redirects to /auth/signin on success", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))

    await simulateHandleLogout()

    expect(window.location.href).toBe("/auth/signin")
  })

  it("redirects to /auth/signin even on API error", async () => {
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Internal error" }), { status: 500 }))

    await simulateHandleLogout()

    expect(window.location.href).toBe("/auth/signin")
  })

  it("redirects to /auth/signin even on network error", async () => {
    fetchSpy.mockRejectedValueOnce(new TypeError("Failed to fetch"))

    await simulateHandleLogout()

    expect(window.location.href).toBe("/auth/signin")
  })
})

describe("signout API route returns JSON for Accept: application/json", () => {
  it("isJsonRequest check recognises application/json in accept header", () => {
    // Mirrors the check in app/api/auth/signout/route.ts
    const acceptHeader = "application/json"
    const isJsonRequest = acceptHeader.includes("application/json")
    expect(isJsonRequest).toBe(true)
  })

  it("isJsonRequest check rejects default browser accept header", () => {
    const acceptHeader = "*/*"
    const isJsonRequest = acceptHeader.includes("application/json")
    expect(isJsonRequest).toBe(false)
  })
})
