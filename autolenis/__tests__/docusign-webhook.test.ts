import { describe, it, expect } from "vitest"
import {
  verifyDocuSignHmac,
  generateEventHash,
} from "@/lib/security/webhook-hmac"
import {
  DealerAgreementStatus,
  DOCUSIGN_STATUS_MAP,
  DOCUSIGN_ENVELOPE_EVENTS,
  DEALER_AGREEMENT_VERSION,
  DEALER_AGREEMENT_NAME,
} from "@/lib/constants/docusign"

// ---------------------------------------------------------------
// DocuSign Webhook HMAC Verification
// ---------------------------------------------------------------

describe("verifyDocuSignHmac", () => {
  it("returns true for valid signature", () => {
    const crypto = require("node:crypto")
    const secret = "test-secret-key"
    const payload = '{"test": true}'
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payload, "utf8")
      .digest("base64")

    expect(verifyDocuSignHmac(payload, signature, secret)).toBe(true)
  })

  it("returns false for invalid signature", () => {
    expect(
      verifyDocuSignHmac('{"test": true}', "invalid-sig", "test-secret"),
    ).toBe(false)
  })

  it("returns false when no secret provided", () => {
    expect(verifyDocuSignHmac('{"test": true}', "some-sig", "")).toBe(false)
  })

  it("returns false when no signature provided", () => {
    expect(verifyDocuSignHmac('{"test": true}', "", "test-secret")).toBe(false)
  })
})

// ---------------------------------------------------------------
// Event Hash Generation
// ---------------------------------------------------------------

describe("generateEventHash", () => {
  it("produces deterministic hash", () => {
    const hash1 = generateEventHash("env-1", "completed", "2024-01-01T00:00:00Z")
    const hash2 = generateEventHash("env-1", "completed", "2024-01-01T00:00:00Z")
    expect(hash1).toBe(hash2)
  })

  it("produces different hashes for different inputs", () => {
    const hash1 = generateEventHash("env-1", "completed", "2024-01-01T00:00:00Z")
    const hash2 = generateEventHash("env-2", "completed", "2024-01-01T00:00:00Z")
    expect(hash1).not.toBe(hash2)
  })

  it("produces hex-encoded SHA256 hash", () => {
    const hash = generateEventHash("env-1", "sent", "2024-01-01T00:00:00Z")
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

// ---------------------------------------------------------------
// DocuSign Constants
// ---------------------------------------------------------------

describe("DocuSign Constants", () => {
  describe("DealerAgreementStatus", () => {
    it("defines all required statuses", () => {
      expect(DealerAgreementStatus.REQUIRED).toBe("REQUIRED")
      expect(DealerAgreementStatus.DRAFTED).toBe("DRAFTED")
      expect(DealerAgreementStatus.SENT).toBe("SENT")
      expect(DealerAgreementStatus.DELIVERED).toBe("DELIVERED")
      expect(DealerAgreementStatus.VIEWED).toBe("VIEWED")
      expect(DealerAgreementStatus.SIGNED).toBe("SIGNED")
      expect(DealerAgreementStatus.COMPLETED).toBe("COMPLETED")
      expect(DealerAgreementStatus.DECLINED).toBe("DECLINED")
      expect(DealerAgreementStatus.VOIDED).toBe("VOIDED")
      expect(DealerAgreementStatus.EXPIRED).toBe("EXPIRED")
      expect(DealerAgreementStatus.ERROR).toBe("ERROR")
    })

    it("has exactly 11 statuses", () => {
      expect(Object.keys(DealerAgreementStatus)).toHaveLength(11)
    })
  })

  describe("DOCUSIGN_STATUS_MAP", () => {
    it("maps sent to SENT", () => {
      expect(DOCUSIGN_STATUS_MAP["sent"]).toBe("SENT")
    })

    it("maps delivered to DELIVERED", () => {
      expect(DOCUSIGN_STATUS_MAP["delivered"]).toBe("DELIVERED")
    })

    it("maps completed to COMPLETED", () => {
      expect(DOCUSIGN_STATUS_MAP["completed"]).toBe("COMPLETED")
    })

    it("maps declined to DECLINED", () => {
      expect(DOCUSIGN_STATUS_MAP["declined"]).toBe("DECLINED")
    })

    it("maps voided to VOIDED", () => {
      expect(DOCUSIGN_STATUS_MAP["voided"]).toBe("VOIDED")
    })

    it("returns undefined for unmapped status", () => {
      expect(DOCUSIGN_STATUS_MAP["unknown"]).toBeUndefined()
    })
  })

  describe("DOCUSIGN_ENVELOPE_EVENTS", () => {
    it("includes all required events", () => {
      expect(DOCUSIGN_ENVELOPE_EVENTS).toContain("sent")
      expect(DOCUSIGN_ENVELOPE_EVENTS).toContain("delivered")
      expect(DOCUSIGN_ENVELOPE_EVENTS).toContain("completed")
      expect(DOCUSIGN_ENVELOPE_EVENTS).toContain("declined")
      expect(DOCUSIGN_ENVELOPE_EVENTS).toContain("voided")
    })
  })

  describe("Agreement Defaults", () => {
    it("has correct version", () => {
      expect(DEALER_AGREEMENT_VERSION).toBe("1.0")
    })

    it("has correct name", () => {
      expect(DEALER_AGREEMENT_NAME).toBe("AutoLenis Dealer Participation Agreement")
    })
  })
})
