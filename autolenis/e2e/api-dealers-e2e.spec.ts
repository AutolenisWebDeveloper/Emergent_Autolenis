import { test, expect } from "@playwright/test"
import { SignJWT } from "jose"

/**
 * End-to-end tests for the admin dealers API.
 *
 * These tests create a real JWT (TEST workspace, ADMIN role), send it as
 * a session cookie, and hit the running Next.js dev/preview server.
 * Because workspace_mode is "TEST", the API handlers return mock data
 * without requiring a live database — while still exercising the full
 * middleware → route-handler pipeline (including x-pathname injection).
 */

const JWT_SECRET = process.env["JWT_SECRET"]

/** Create a valid admin session JWT for the TEST workspace. */
async function createTestAdminToken(): Promise<string> {
  if (!JWT_SECRET) throw new Error("JWT_SECRET env var is required to run e2e API tests")

  const secret = new TextEncoder().encode(JWT_SECRET)
  return new SignJWT({
    id: "e2e-admin-001",
    userId: "e2e-admin-001",
    email: "e2e-admin@autolenis.test",
    role: "ADMIN",
    is_affiliate: false,
    workspace_id: "ws-test-e2e",
    workspace_mode: "TEST",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret)
}

test.describe("Admin Dealers API – E2E", () => {
  // Skip the entire suite when no JWT_SECRET is available (e.g. on a
  // contributor's machine without .env).  CI must set it.
  test.beforeAll(() => {
    if (!JWT_SECRET) {
      test.skip(true, "JWT_SECRET not set – skipping e2e API tests")
    }
  })

  test("GET /api/admin/dealers returns 200 with dealers list and x-pathname header", async ({
    request,
  }) => {
    const token = await createTestAdminToken()

    const response = await request.get("/api/admin/dealers?page=1&limit=25", {
      headers: { cookie: `session=${token}` },
    })

    // --- Status ---
    expect(response.status()).toBe(200)

    // --- Body ---
    const body = await response.json()
    expect(body).toHaveProperty("dealers")
    expect(Array.isArray(body.dealers)).toBe(true)
    expect(body.dealers.length).toBeGreaterThan(0)

    // Verify pagination metadata
    expect(body).toHaveProperty("total")
    expect(body).toHaveProperty("totalPages")
    expect(body).toHaveProperty("page")

    // --- x-pathname header (echoed by the route handler) ---
    const xPathname = response.headers()["x-pathname"]
    expect(xPathname).toBe("/api/admin/dealers")
  })

  test("GET /api/admin/dealers/:dealerId returns 200 with dealer detail and x-pathname header", async ({
    request,
  }) => {
    const token = await createTestAdminToken()

    // Use a known mock dealer ID from the TEST workspace mock store
    const dealerId = "dealer_gold_001"

    const response = await request.get(`/api/admin/dealers/${dealerId}`, {
      headers: { cookie: `session=${token}` },
    })

    // --- Status ---
    expect(response.status()).toBe(200)

    // --- Body ---
    const body = await response.json()
    expect(body).toHaveProperty("dealer")
    expect(body.dealer).toBeTruthy()
    expect(body.dealer).toHaveProperty("id", dealerId)
    expect(body.dealer).toHaveProperty("_count")

    // --- x-pathname header ---
    const xPathname = response.headers()["x-pathname"]
    expect(xPathname).toBe(`/api/admin/dealers/${dealerId}`)
  })

  test("GET /api/admin/dealers returns 401 without session cookie", async ({ request }) => {
    const response = await request.get("/api/admin/dealers?page=1&limit=25")
    expect(response.status()).toBe(401)
  })

  test("GET /api/admin/dealers/:dealerId returns 404 for unknown dealer", async ({ request }) => {
    const token = await createTestAdminToken()

    const response = await request.get("/api/admin/dealers/nonexistent-dealer-id", {
      headers: { cookie: `session=${token}` },
    })

    expect(response.status()).toBe(404)
    const body = await response.json()
    expect(body).toHaveProperty("error", "Dealer not found")
  })
})
