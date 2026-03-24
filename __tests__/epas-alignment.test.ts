import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"
import { ExternalPreApprovalService } from "@/lib/services/external-preapproval.service"

// ---------------------------------------------------------------------------
// EPAS Alignment Regression Tests
//
// Ensures:
//   1. No active write paths use legacy ExternalPreApproval (Prisma ORM)
//   2. EPAS writes enforce storageBucket + documentStoragePath consistency
//   3. Service uses the approved Prompt 4 canonical Supabase backend objects
//   4. Service uses canonical DB functions for status transitions
// ---------------------------------------------------------------------------

const ROOT = join(__dirname, "..")

function readServiceFile(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8")
}

describe("EPAS Alignment — Legacy ExternalPreApproval Write Guard", () => {
  const SERVICE_FILES = [
    "lib/services/deal/financing.ts",
    "lib/services/deal.service.ts",
  ]

  for (const file of SERVICE_FILES) {
    it(`${file} must not contain externalPreApproval.upsert`, () => {
      const content = readServiceFile(file)
      expect(content).not.toMatch(/externalPreApproval\.upsert/)
    })

    it(`${file} must not contain externalPreApproval.create`, () => {
      const content = readServiceFile(file)
      // Exclude ExternalPreApprovalSubmission references
      const lines = content.split("\n")
      for (const line of lines) {
        if (line.includes("externalPreApprovalSubmission")) continue
        if (line.includes("ExternalPreApprovalSubmission")) continue
        expect(line).not.toMatch(/externalPreApproval\.create/)
      }
    })

    it(`${file} must not contain externalPreApproval.update`, () => {
      const content = readServiceFile(file)
      const lines = content.split("\n")
      for (const line of lines) {
        if (line.includes("externalPreApprovalSubmission")) continue
        if (line.includes("ExternalPreApprovalSubmission")) continue
        expect(line).not.toMatch(/externalPreApproval\.update/)
      }
    })
  }

  it("deal/retrieval.ts should read from externalPreApprovalSubmission, not externalPreApproval", () => {
    const content = readServiceFile("lib/services/deal/retrieval.ts")
    expect(content).toContain("externalPreApprovalSubmission.findFirst")
    expect(content).not.toMatch(
      /externalPreApproval\.findFirst(?!Submission)/
    )
  })
})

describe("EPAS Alignment — Storage Field Validation", () => {
  it("ExternalPreApprovalService should exist as a class", () => {
    expect(ExternalPreApprovalService).toBeDefined()
    const service = new ExternalPreApprovalService()
    expect(service).toBeDefined()
  })

  it("service source code enforces storageBucket + documentStoragePath consistency", () => {
    const content = readServiceFile("lib/services/external-preapproval.service.ts")
    // Verify the storage consistency check is present
    expect(content).toContain("storageBucket and documentStoragePath must both be set or both be null")
  })

  it("EPAS write path always sets storageBucket when documentStoragePath is set", () => {
    const content = readServiceFile("lib/services/external-preapproval.service.ts")
    // Verify that storageBucket is derived from fileMetadata (not hardcoded independently)
    expect(content).toContain("storageBucket = fileMetadata?.storageBucket ?? null")
    expect(content).toContain("documentStoragePath = fileMetadata?.storagePath ?? null")
  })
})

describe("EPAS Alignment — Prompt 4 Canonical Backend Integration", () => {
  it("service uses the Prompt 4 canonical table for all writes", () => {
    const content = readServiceFile("lib/services/external-preapproval.service.ts")
    // Must reference the Prompt 4 canonical table name
    expect(content).toContain("external_preapproval_submissions")
    // Must use Supabase .insert() / .update() for the canonical table
    expect(content).toContain(".insert(")
    expect(content).toContain(".update(")
    // Must NOT use the legacy Prisma model for submission CRUD
    expect(content).not.toContain("prisma.externalPreApprovalSubmission")
  })

  it("service uses the Prompt 4 canonical DB functions for status transitions", () => {
    const content = readServiceFile("lib/services/external-preapproval.service.ts")
    expect(content).toContain("external_preapproval_approve")
    expect(content).toContain("external_preapproval_set_status")
  })

  it("service writes to the Prompt 4 canonical documents table", () => {
    const content = readServiceFile("lib/services/external-preapproval.service.ts")
    expect(content).toContain("external_preapproval_documents")
  })

  it("buyer prequal external route creates submissions via the canonical service", () => {
    const content = readServiceFile("app/api/buyer/prequal/external/route.ts")
    expect(content).toContain("externalPreApprovalService.submit")
    expect(content).not.toMatch(/externalPreApproval\.(create|upsert)/)
  })

  it("buyer prequal route uses buyer_qualification_active view", () => {
    const content = readServiceFile("app/api/buyer/prequal/route.ts")
    expect(content).toContain("buyer_qualification_active")
  })

  it("storage bucket should be buyer-docs per Prompt 4 contract", () => {
    const content = readServiceFile("app/api/buyer/prequal/external/route.ts")
    // Must import STORAGE_BUCKET from the service (which is "buyer-docs")
    expect(content).toContain("STORAGE_BUCKET")
    // Must NOT hardcode the legacy bucket name
    expect(content).not.toMatch(/STORAGE_BUCKET\s*=\s*["']external-preapprovals["']/)
  })
})

describe("EPAS Alignment — Status Transitions", () => {
  it("isValidTransition enforces the allowed state machine", () => {
    // SUBMITTED can go to IN_REVIEW, APPROVED, REJECTED, SUPERSEDED
    expect(ExternalPreApprovalService.isValidTransition("SUBMITTED", "IN_REVIEW")).toBe(true)
    expect(ExternalPreApprovalService.isValidTransition("SUBMITTED", "APPROVED")).toBe(true)
    expect(ExternalPreApprovalService.isValidTransition("SUBMITTED", "REJECTED")).toBe(true)
    expect(ExternalPreApprovalService.isValidTransition("SUBMITTED", "SUPERSEDED")).toBe(true)
    expect(ExternalPreApprovalService.isValidTransition("SUBMITTED", "EXPIRED")).toBe(false)

    // IN_REVIEW → APPROVED or REJECTED only
    expect(ExternalPreApprovalService.isValidTransition("IN_REVIEW", "APPROVED")).toBe(true)
    expect(ExternalPreApprovalService.isValidTransition("IN_REVIEW", "REJECTED")).toBe(true)
    expect(ExternalPreApprovalService.isValidTransition("IN_REVIEW", "SUBMITTED")).toBe(false)

    // Terminal states
    expect(ExternalPreApprovalService.isValidTransition("REJECTED", "APPROVED")).toBe(false)
    expect(ExternalPreApprovalService.isValidTransition("EXPIRED", "APPROVED")).toBe(false)
    expect(ExternalPreApprovalService.isValidTransition("SUPERSEDED", "APPROVED")).toBe(false)
  })
})
