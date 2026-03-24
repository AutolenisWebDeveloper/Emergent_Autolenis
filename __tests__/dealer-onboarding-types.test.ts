import { describe, it, expect } from "vitest"
import {
  DealerApplicationStatus,
  DealerAccessState,
  ALLOWED_STATUS_TRANSITIONS,
  DealerDocumentType,
  getDealerDocStoragePath,
  getDealerAgreementStoragePath,
  checkActivationGate,
} from "@/lib/services/dealer-onboarding/types"

describe("Dealer Onboarding Types", () => {
  // ---------------------------------------------------------------
  // Status Values
  // ---------------------------------------------------------------

  describe("DealerApplicationStatus", () => {
    it("defines all canonical statuses", () => {
      expect(DealerApplicationStatus.DRAFT).toBe("DRAFT")
      expect(DealerApplicationStatus.SUBMITTED).toBe("SUBMITTED")
      expect(DealerApplicationStatus.UNDER_REVIEW).toBe("UNDER_REVIEW")
      expect(DealerApplicationStatus.DOCS_REQUESTED).toBe("DOCS_REQUESTED")
      expect(DealerApplicationStatus.AGREEMENT_SENT).toBe("AGREEMENT_SENT")
      expect(DealerApplicationStatus.AGREEMENT_SIGNED).toBe("AGREEMENT_SIGNED")
      expect(DealerApplicationStatus.COMPLIANCE_REVIEW).toBe("COMPLIANCE_REVIEW")
      expect(DealerApplicationStatus.APPROVED).toBe("APPROVED")
      expect(DealerApplicationStatus.REJECTED).toBe("REJECTED")
      expect(DealerApplicationStatus.SUSPENDED).toBe("SUSPENDED")
    })

    it("has exactly 10 statuses", () => {
      expect(Object.keys(DealerApplicationStatus)).toHaveLength(10)
    })
  })

  describe("DealerAccessState", () => {
    it("defines all access states", () => {
      expect(DealerAccessState.NO_ACCESS).toBe("NO_ACCESS")
      expect(DealerAccessState.LIMITED_ACCESS).toBe("LIMITED_ACCESS")
      expect(DealerAccessState.MARKETPLACE_ENABLED).toBe("MARKETPLACE_ENABLED")
      expect(DealerAccessState.INVENTORY_ENABLED).toBe("INVENTORY_ENABLED")
      expect(DealerAccessState.FULLY_ACTIVE).toBe("FULLY_ACTIVE")
      expect(DealerAccessState.SUSPENDED).toBe("SUSPENDED")
    })

    it("has exactly 6 access states", () => {
      expect(Object.keys(DealerAccessState)).toHaveLength(6)
    })
  })

  // ---------------------------------------------------------------
  // Status Transition Machine
  // ---------------------------------------------------------------

  describe("ALLOWED_STATUS_TRANSITIONS", () => {
    it("DRAFT can only transition to SUBMITTED", () => {
      expect(ALLOWED_STATUS_TRANSITIONS.DRAFT).toEqual(["SUBMITTED"])
    })

    it("SUBMITTED can transition to UNDER_REVIEW or REJECTED", () => {
      const transitions = ALLOWED_STATUS_TRANSITIONS.SUBMITTED
      expect(transitions).toContain("UNDER_REVIEW")
      expect(transitions).toContain("REJECTED")
    })

    it("UNDER_REVIEW can transition to DOCS_REQUESTED, AGREEMENT_SENT, or REJECTED", () => {
      const transitions = ALLOWED_STATUS_TRANSITIONS.UNDER_REVIEW
      expect(transitions).toContain("DOCS_REQUESTED")
      expect(transitions).toContain("AGREEMENT_SENT")
      expect(transitions).toContain("REJECTED")
    })

    it("AGREEMENT_SENT can transition to AGREEMENT_SIGNED or REJECTED", () => {
      const transitions = ALLOWED_STATUS_TRANSITIONS.AGREEMENT_SENT
      expect(transitions).toContain("AGREEMENT_SIGNED")
      expect(transitions).toContain("REJECTED")
    })

    it("AGREEMENT_SIGNED can only transition to COMPLIANCE_REVIEW", () => {
      expect(ALLOWED_STATUS_TRANSITIONS.AGREEMENT_SIGNED).toEqual(["COMPLIANCE_REVIEW"])
    })

    it("COMPLIANCE_REVIEW can transition to APPROVED, DOCS_REQUESTED, or REJECTED", () => {
      const transitions = ALLOWED_STATUS_TRANSITIONS.COMPLIANCE_REVIEW
      expect(transitions).toContain("APPROVED")
      expect(transitions).toContain("DOCS_REQUESTED")
      expect(transitions).toContain("REJECTED")
    })

    it("APPROVED can only transition to SUSPENDED", () => {
      expect(ALLOWED_STATUS_TRANSITIONS.APPROVED).toEqual(["SUSPENDED"])
    })

    it("REJECTED can transition back to DRAFT", () => {
      expect(ALLOWED_STATUS_TRANSITIONS.REJECTED).toEqual(["DRAFT"])
    })

    it("covers every status key", () => {
      const allStatuses = Object.values(DealerApplicationStatus)
      const transitionKeys = Object.keys(ALLOWED_STATUS_TRANSITIONS)
      for (const status of allStatuses) {
        expect(transitionKeys).toContain(status)
      }
    })
  })

  // ---------------------------------------------------------------
  // Document Types
  // ---------------------------------------------------------------

  describe("DealerDocumentType", () => {
    it("defines all required document types", () => {
      expect(DealerDocumentType.DEALER_LICENSE).toBe("DEALER_LICENSE")
      expect(DealerDocumentType.W9).toBe("W9")
      expect(DealerDocumentType.INSURANCE_CERTIFICATE).toBe("INSURANCE_CERTIFICATE")
      expect(DealerDocumentType.ACH_AUTHORIZATION).toBe("ACH_AUTHORIZATION")
      expect(DealerDocumentType.DEALER_IDENTITY_DOC).toBe("DEALER_IDENTITY_DOC")
      expect(DealerDocumentType.ADDITIONAL_COMPLIANCE_DOC).toBe("ADDITIONAL_COMPLIANCE_DOC")
    })
  })

  // ---------------------------------------------------------------
  // Storage Paths
  // ---------------------------------------------------------------

  describe("getDealerDocStoragePath", () => {
    it("generates correct path for license", () => {
      expect(getDealerDocStoragePath("app-1", "DEALER_LICENSE", "license.pdf")).toBe(
        "dealer-docs/app-1/license/license.pdf",
      )
    })

    it("generates correct path for W9", () => {
      expect(getDealerDocStoragePath("app-1", "W9", "w9-form.pdf")).toBe(
        "dealer-docs/app-1/w9/w9-form.pdf",
      )
    })

    it("generates correct path for insurance", () => {
      expect(getDealerDocStoragePath("app-1", "INSURANCE_CERTIFICATE", "cert.pdf")).toBe(
        "dealer-docs/app-1/insurance/cert.pdf",
      )
    })

    it("generates correct path for ACH", () => {
      expect(getDealerDocStoragePath("app-1", "ACH_AUTHORIZATION", "ach.pdf")).toBe(
        "dealer-docs/app-1/ach/ach.pdf",
      )
    })
  })

  describe("getDealerAgreementStoragePath", () => {
    it("generates correct contracts path", () => {
      expect(getDealerAgreementStoragePath("app-1", "env-123")).toBe(
        "contracts/dealer-agreements/app-1/env-123.pdf",
      )
    })
  })

  // ---------------------------------------------------------------
  // Activation Gate
  // ---------------------------------------------------------------

  describe("checkActivationGate", () => {
    it("returns ready when all conditions met", () => {
      const result = checkActivationGate({
        status: "APPROVED",
        agreementSignedAt: new Date().toISOString(),
      })
      expect(result.ready).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    it("returns not ready when application not approved", () => {
      const result = checkActivationGate({
        status: "SUBMITTED",
        agreementSignedAt: new Date().toISOString(),
      })
      expect(result.ready).toBe(false)
      expect(result.missing).toContain("application_not_approved")
    })

    it("returns not ready when agreement not signed", () => {
      const result = checkActivationGate({
        status: "APPROVED",
        agreementSignedAt: null,
      })
      expect(result.ready).toBe(false)
      expect(result.missing).toContain("agreement_not_signed")
    })

    it("returns multiple missing when nothing is done", () => {
      const result = checkActivationGate({
        status: "DRAFT",
        agreementSignedAt: null,
      })
      expect(result.ready).toBe(false)
      expect(result.missing).toHaveLength(2)
    })
  })
})
