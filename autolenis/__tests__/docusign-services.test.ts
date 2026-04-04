import { describe, it, expect, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// DocuSign Auth Service Tests
// ---------------------------------------------------------------------------

describe("DocuSign Auth Service", () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  describe("getDocuSignAuthConfig", () => {
    it("returns config from environment variables", async () => {
      vi.stubEnv("DOCUSIGN_INTEGRATION_KEY", "test-key")
      vi.stubEnv("DOCUSIGN_USER_ID", "test-user")
      vi.stubEnv("DOCUSIGN_ACCOUNT_ID", "test-account")
      vi.stubEnv("DOCUSIGN_AUTH_SERVER", "account-d.docusign.com")
      vi.stubEnv("DOCUSIGN_PRIVATE_KEY_BASE64", "dGVzdA==")
      vi.stubEnv("DOCUSIGN_BASE_PATH", "https://demo.docusign.net/restapi")

      const { getDocuSignAuthConfig } = await import("@/lib/services/docusign/auth.service")
      const config = getDocuSignAuthConfig()

      expect(config.integrationKey).toBe("test-key")
      expect(config.userId).toBe("test-user")
      expect(config.accountId).toBe("test-account")
      expect(config.authServer).toBe("account-d.docusign.com")
      expect(config.privateKeyBase64).toBe("dGVzdA==")
      expect(config.basePath).toBe("https://demo.docusign.net/restapi")
    })

    it("returns defaults when env vars not set", async () => {
      const { getDocuSignAuthConfig } = await import("@/lib/services/docusign/auth.service")
      const config = getDocuSignAuthConfig()

      expect(config.authServer).toBe("account-d.docusign.com")
      expect(config.basePath).toContain("docusign.net")
    })
  })

  describe("isDocuSignConfigured", () => {
    it("returns true when JWT credentials are set", async () => {
      vi.stubEnv("DOCUSIGN_INTEGRATION_KEY", "test-key")
      vi.stubEnv("DOCUSIGN_USER_ID", "test-user")
      vi.stubEnv("DOCUSIGN_ACCOUNT_ID", "test-account")
      vi.stubEnv("DOCUSIGN_PRIVATE_KEY_BASE64", "dGVzdA==")

      const { isDocuSignConfigured } = await import("@/lib/services/docusign/auth.service")
      expect(isDocuSignConfigured()).toBe(true)
    })

    it("returns true when legacy credentials are set", async () => {
      vi.stubEnv("DOCUSIGN_INTEGRATION_KEY", "test-key")
      vi.stubEnv("DOCUSIGN_ACCOUNT_ID", "test-account")
      vi.stubEnv("DOCUSIGN_SECRET_KEY", "test-secret")

      const { isDocuSignConfigured } = await import("@/lib/services/docusign/auth.service")
      expect(isDocuSignConfigured()).toBe(true)
    })

    it("returns false when no credentials set", async () => {
      vi.stubEnv("DOCUSIGN_INTEGRATION_KEY", "")
      vi.stubEnv("DOCUSIGN_USER_ID", "")
      vi.stubEnv("DOCUSIGN_ACCOUNT_ID", "")
      vi.stubEnv("DOCUSIGN_PRIVATE_KEY_BASE64", "")
      vi.stubEnv("DOCUSIGN_SECRET_KEY", "")

      const { isDocuSignConfigured } = await import("@/lib/services/docusign/auth.service")
      expect(isDocuSignConfigured()).toBe(false)
    })
  })

  describe("clearTokenCache", () => {
    it("clears the cached token", async () => {
      const { clearTokenCache } = await import("@/lib/services/docusign/auth.service")
      // Should not throw
      expect(() => clearTokenCache()).not.toThrow()
    })
  })
})

// ---------------------------------------------------------------------------
// DocuSign Webhook Service Tests
// ---------------------------------------------------------------------------

describe("DocuSign Webhook Service", () => {
  describe("verifyWebhookSignature", () => {
    it("returns true when no secret configured (dev mode)", async () => {
      vi.stubEnv("DOCUSIGN_CONNECT_SECRET", "")
      vi.stubEnv("DOCUSIGN_WEBHOOK_SECRET", "")

      const { verifyWebhookSignature } = await import("@/lib/services/docusign/webhook.service")
      expect(verifyWebhookSignature("{}", "any-sig")).toBe(true)
    })

    it("returns false when signature header is missing and secret is set", async () => {
      vi.stubEnv("DOCUSIGN_CONNECT_SECRET", "my-secret")

      const { verifyWebhookSignature } = await import("@/lib/services/docusign/webhook.service")
      expect(verifyWebhookSignature("{}", "")).toBe(false)
    })
  })

  describe("parseWebhookPayload", () => {
    it("extracts envelope details from payload", async () => {
      const { parseWebhookPayload } = await import("@/lib/services/docusign/webhook.service")

      const payload = {
        event: "envelope-completed",
        apiVersion: "v2.1",
        uri: "/test",
        retryCount: 0,
        configurationId: 1,
        generatedDateTime: "2026-03-15T00:00:00Z",
        data: {
          accountId: "acc-1",
          userId: "user-1",
          envelopeId: "env-123",
          envelopeSummary: {
            status: "completed",
            documentsUri: "/docs",
            recipientsUri: "/recipients",
            envelopeUri: "/envelope",
            emailSubject: "Test",
            envelopeId: "env-123",
          },
        },
      }

      const result = parseWebhookPayload(payload)

      expect(result.envelopeId).toBe("env-123")
      expect(result.envelopeStatus).toBe("completed")
      expect(result.eventTime).toBe("2026-03-15T00:00:00Z")
      expect(result.eventHash).toBeTruthy()
    })

    it("handles missing envelope summary", async () => {
      const { parseWebhookPayload } = await import("@/lib/services/docusign/webhook.service")

      const payload = {
        event: "test",
        apiVersion: "v2.1",
        uri: "/test",
        retryCount: 0,
        configurationId: 1,
        generatedDateTime: "2026-03-15T00:00:00Z",
        data: {
          accountId: "acc-1",
          userId: "user-1",
          envelopeId: "env-456",
        },
      }

      const result = parseWebhookPayload(payload)
      expect(result.envelopeId).toBe("env-456")
      expect(result.envelopeStatus).toBe("")
    })
  })
})

// ---------------------------------------------------------------------------
// Dealer Agreement Enforcement Gate Tests
// ---------------------------------------------------------------------------

describe("checkDealerAgreementGate", () => {
  it("returns allowed when agreement not required", async () => {
    const { checkDealerAgreementGate } = await import("@/lib/services/dealer-onboarding/types")

    const result = checkDealerAgreementGate({
      agreementRequired: false,
      agreementCompleted: false,
      docusignBlocked: false,
      accessState: "NO_ACCESS",
    })

    expect(result.allowed).toBe(true)
    expect(result.blockers).toEqual([])
  })

  it("blocks when agreement required but not completed", async () => {
    const { checkDealerAgreementGate } = await import("@/lib/services/dealer-onboarding/types")

    const result = checkDealerAgreementGate({
      agreementRequired: true,
      agreementCompleted: false,
      docusignBlocked: false,
    })

    expect(result.allowed).toBe(false)
    expect(result.blockers).toContain("AGREEMENT_INCOMPLETE")
  })

  it("allows when agreement required and completed", async () => {
    const { checkDealerAgreementGate } = await import("@/lib/services/dealer-onboarding/types")

    const result = checkDealerAgreementGate({
      agreementRequired: true,
      agreementCompleted: true,
      docusignBlocked: false,
    })

    expect(result.allowed).toBe(true)
    expect(result.blockers).toEqual([])
  })

  it("blocks when docusign is blocked", async () => {
    const { checkDealerAgreementGate } = await import("@/lib/services/dealer-onboarding/types")

    const result = checkDealerAgreementGate({
      agreementRequired: true,
      agreementCompleted: true,
      docusignBlocked: true,
    })

    expect(result.allowed).toBe(false)
    expect(result.blockers).toContain("DOCUSIGN_BLOCKED")
  })

  it("blocks when dealer is suspended", async () => {
    const { checkDealerAgreementGate } = await import("@/lib/services/dealer-onboarding/types")

    const result = checkDealerAgreementGate({
      agreementRequired: false,
      agreementCompleted: true,
      docusignBlocked: false,
      accessState: "SUSPENDED",
    })

    expect(result.allowed).toBe(false)
    expect(result.blockers).toContain("DEALER_SUSPENDED")
  })

  it("accumulates multiple blockers", async () => {
    const { checkDealerAgreementGate } = await import("@/lib/services/dealer-onboarding/types")

    const result = checkDealerAgreementGate({
      agreementRequired: true,
      agreementCompleted: false,
      docusignBlocked: true,
      accessState: "SUSPENDED",
    })

    expect(result.allowed).toBe(false)
    expect(result.blockers).toHaveLength(3)
    expect(result.blockers).toContain("AGREEMENT_INCOMPLETE")
    expect(result.blockers).toContain("DOCUSIGN_BLOCKED")
    expect(result.blockers).toContain("DEALER_SUSPENDED")
  })
})

// ---------------------------------------------------------------------------
// DocuSign Constants & Status Map Tests (additional coverage)
// ---------------------------------------------------------------------------

describe("DocuSign Status Map (canonical coverage)", () => {
  it("maps all canonical DocuSign events", async () => {
    const { DOCUSIGN_STATUS_MAP, DealerAgreementStatus } = await import("@/lib/constants/docusign")

    expect(DOCUSIGN_STATUS_MAP["sent"]).toBe(DealerAgreementStatus.SENT)
    expect(DOCUSIGN_STATUS_MAP["delivered"]).toBe(DealerAgreementStatus.DELIVERED)
    expect(DOCUSIGN_STATUS_MAP["completed"]).toBe(DealerAgreementStatus.COMPLETED)
    expect(DOCUSIGN_STATUS_MAP["declined"]).toBe(DealerAgreementStatus.DECLINED)
    expect(DOCUSIGN_STATUS_MAP["voided"]).toBe(DealerAgreementStatus.VOIDED)
  })

  it("returns undefined for unknown events", async () => {
    const { DOCUSIGN_STATUS_MAP } = await import("@/lib/constants/docusign")
    expect(DOCUSIGN_STATUS_MAP["unknown_event"]).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// DocuSign Module Barrel Export Tests
// ---------------------------------------------------------------------------

describe("DocuSign module barrel exports", () => {
  it("exports all expected functions from index", async () => {
    const docusign = await import("@/lib/services/docusign")

    // Auth
    expect(typeof docusign.getDocuSignAccessToken).toBe("function")
    expect(typeof docusign.getDocuSignAuthConfig).toBe("function")
    expect(typeof docusign.isDocuSignConfigured).toBe("function")
    expect(typeof docusign.clearTokenCache).toBe("function")
    expect(typeof docusign.validateDocuSignConfig).toBe("function")

    // Envelope
    expect(typeof docusign.createEnvelopeFromTemplate).toBe("function")
    expect(typeof docusign.getEnvelopeStatus).toBe("function")
    expect(typeof docusign.voidEnvelope).toBe("function")
    expect(typeof docusign.downloadSignedDocument).toBe("function")
    expect(typeof docusign.downloadCertificate).toBe("function")

    // Template
    expect(typeof docusign.verifyDealerTemplate).toBe("function")

    // Recipient view
    expect(typeof docusign.createRecipientView).toBe("function")

    // Webhook
    expect(typeof docusign.verifyWebhookSignature).toBe("function")
    expect(typeof docusign.parseWebhookPayload).toBe("function")
  })
})
