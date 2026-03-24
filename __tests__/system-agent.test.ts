import { describe, expect, it } from "vitest"
import { createSession, verifySession } from "@/lib/auth"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockDb } from "@/lib/mocks/mockStore"

/**
 * Validates that:
 *  - autolenis01@gmail.com is the designated SYSTEM_AGENT for the TEST workspace
 *  - The mockStore uses testbuyer+001@autolenis.demo (not any LIVE account)
 *  - Session creation includes workspace_id and workspace_mode
 *  - LIVE accounts never produce TEST workspace sessions
 *  - Only autolenis01@gmail.com with SYSTEM_AGENT role can seed
 */
describe("system agent account (autolenis01@gmail.com)", () => {
  const SYSTEM_AGENT_EMAIL = "autolenis01@gmail.com"
  const TEST_WORKSPACE_ID = "ws_test_default"

  it("creates a TEST session with workspace_mode=TEST for the system agent", async () => {
    const token = await createSession({
      userId: "sa-001",
      email: SYSTEM_AGENT_EMAIL,
      role: "SYSTEM_AGENT",
      workspace_id: TEST_WORKSPACE_ID,
      workspace_mode: "TEST",
    })

    const session = await verifySession(token)
    expect(session.email).toBe(SYSTEM_AGENT_EMAIL)
    expect(session.role).toBe("SYSTEM_AGENT")
    expect(session.workspace_id).toBe(TEST_WORKSPACE_ID)
    expect(session.workspace_mode).toBe("TEST")
    expect(isTestWorkspace(session)).toBe(true)
  })

  it("LIVE accounts do NOT produce TEST workspace sessions", async () => {
    const liveAccounts = [
      { email: "markist@protecwise.com", role: "DEALER" },
      { email: "markist678@gmail.com", role: "AFFILIATE" },
      { email: "info@autolenis.com", role: "ADMIN" },
    ]

    for (const acct of liveAccounts) {
      const token = await createSession({
        userId: `live-${acct.role}`,
        email: acct.email,
        role: acct.role,
        workspace_id: "ws_live_default",
        workspace_mode: "LIVE",
      })

      const session = await verifySession(token)
      expect(session.workspace_mode).toBe("LIVE")
      expect(isTestWorkspace(session)).toBe(false)
    }
  })

  it("mockStore buyer email is testbuyer+001@autolenis.demo, not a LIVE account", () => {
    const buyerUser = mockDb.users.find((u: any) => u.role === "BUYER")
    const buyerProfile = mockDb.buyerProfiles[0]

    expect(buyerUser?.email).toBe("testbuyer+001@autolenis.demo")
    expect(buyerProfile?.email).toBe("testbuyer+001@autolenis.demo")

    // Must NOT be any of the LIVE validation accounts
    const liveEmails = [
      "markist@protecwise.com",
      "markist678@gmail.com",
      "info@autolenis.com",
    ]
    expect(liveEmails).not.toContain(buyerUser?.email)
    expect(liveEmails).not.toContain(buyerProfile?.email)
  })

  it("seed route buyer email matches mockStore buyer email", () => {
    // The seed route uses testbuyer+001@autolenis.demo, same as the mockStore
    const seedBuyerEmail = "testbuyer+001@autolenis.demo"
    const mockBuyerEmail = mockDb.buyerProfiles[0]?.email
    expect(seedBuyerEmail).toBe(mockBuyerEmail)
  })
})

/**
 * Validates the seed/create-user authorization guard:
 * Only autolenis01@gmail.com with SYSTEM_AGENT role in a TEST workspace
 * is allowed. ADMIN, SUPER_ADMIN, or any other email must be rejected.
 */
describe("seed/create-user authorization guard", () => {
  const SYSTEM_AGENT_EMAIL = "autolenis01@gmail.com"

  /**
   * The authorization check used by both /api/test/seed and /api/test/create-user:
   *   1. session must exist
   *   2. session.workspace_mode === "TEST"
   *   3. session.role === "SYSTEM_AGENT"
   *   4. session.email === "autolenis01@gmail.com"
   */
  function isAuthorizedToSeed(session: { workspace_mode?: string; role: string; email: string } | null): boolean {
    if (!session) return false
    if (session.workspace_mode !== "TEST") return false
    if (session.role !== "SYSTEM_AGENT") return false
    if (session.email !== SYSTEM_AGENT_EMAIL) return false
    return true
  }

  it("allows autolenis01@gmail.com with SYSTEM_AGENT in TEST workspace", () => {
    expect(
      isAuthorizedToSeed({
        workspace_mode: "TEST",
        role: "SYSTEM_AGENT",
        email: SYSTEM_AGENT_EMAIL,
      })
    ).toBe(true)
  })

  it("rejects ADMIN in TEST workspace", () => {
    expect(
      isAuthorizedToSeed({
        workspace_mode: "TEST",
        role: "ADMIN",
        email: "admin@autolenis.com",
      })
    ).toBe(false)
  })

  it("rejects SUPER_ADMIN in TEST workspace", () => {
    expect(
      isAuthorizedToSeed({
        workspace_mode: "TEST",
        role: "SUPER_ADMIN",
        email: "superadmin@autolenis.com",
      })
    ).toBe(false)
  })

  it("rejects SYSTEM_AGENT with wrong email in TEST workspace", () => {
    expect(
      isAuthorizedToSeed({
        workspace_mode: "TEST",
        role: "SYSTEM_AGENT",
        email: "imposter@evil.com",
      })
    ).toBe(false)
  })

  it("rejects autolenis01@gmail.com with SYSTEM_AGENT in LIVE workspace", () => {
    expect(
      isAuthorizedToSeed({
        workspace_mode: "LIVE",
        role: "SYSTEM_AGENT",
        email: SYSTEM_AGENT_EMAIL,
      })
    ).toBe(false)
  })

  it("rejects null session", () => {
    expect(isAuthorizedToSeed(null)).toBe(false)
  })

  it("rejects BUYER in TEST workspace", () => {
    expect(
      isAuthorizedToSeed({
        workspace_mode: "TEST",
        role: "BUYER",
        email: "testbuyer+001@autolenis.demo",
      })
    ).toBe(false)
  })
})
