import { describe, it, expect } from "vitest"
import { scrubResponse, mapHttpError, HTTP_ERROR_MESSAGES } from "@/lib/copilot/shared/policies"

describe("scrubResponse — prohibited patterns", () => {
  it("removes 'you are approved for a loan' language", () => {
    const result = scrubResponse("You are approved for a loan of $25,000.")
    expect(result).not.toMatch(/approved for a loan/i)
    expect(result).toMatch(/qualify|financing review/i)
  })

  it("removes 'guaranteed approval' language", () => {
    const result = scrubResponse("We offer guaranteed approval for all buyers.")
    expect(result).not.toMatch(/guaranteed approval/i)
    expect(result).toContain("potential financing options")
  })

  it("removes 'you are pre-approved' language", () => {
    const result = scrubResponse("You're pre-approved for financing.")
    expect(result).not.toMatch(/pre.?approved/i)
  })

  it("removes 'instant approval' language", () => {
    const result = scrubResponse("Get instant approval today!")
    expect(result).not.toMatch(/instant approval/i)
  })

  it("removes 'no credit check' language", () => {
    const result = scrubResponse("We offer no credit check financing.")
    expect(result).not.toMatch(/no credit check/i)
  })

  it("blocks raw DealStage enum values", () => {
    const result = scrubResponse("Your deal is in FEE_PENDING status.")
    expect(result).not.toMatch(/FEE_PENDING/)
    expect(result).toContain("[deal status]")
  })

  it("blocks all raw DealStage enums", () => {
    const stages = [
      "SELECTED", "FINANCING_PENDING", "FINANCING_APPROVED", "FEE_PENDING",
      "FEE_PAID", "INSURANCE_PENDING", "INSURANCE_COMPLETE", "CONTRACT_PENDING",
      "CONTRACT_REVIEW", "CONTRACT_MANUAL_REVIEW_REQUIRED",
      "CONTRACT_INTERNAL_FIX_IN_PROGRESS", "CONTRACT_ADMIN_OVERRIDE_APPROVED",
      "CONTRACT_APPROVED", "SIGNING_PENDING", "SIGNED", "PICKUP_SCHEDULED",
      "COMPLETED", "CANCELLED",
    ]
    for (const stage of stages) {
      const result = scrubResponse(`Your status is ${stage}.`)
      expect(result, `Stage ${stage} should be scrubbed`).not.toContain(stage)
    }
  })

  it("blocks affiliate earnings guarantee language", () => {
    const result = scrubResponse("You will earn $5,000 this month guaranteed.")
    expect(result).not.toMatch(/guaranteed/i)
  })

  it("blocks 'guaranteed income' language", () => {
    const result = scrubResponse("This offers guaranteed income potential.")
    expect(result).not.toMatch(/guaranteed income/i)
  })

  it("does not modify compliant text", () => {
    const text = "AutoLenis helps you buy a car without visiting a dealership."
    expect(scrubResponse(text)).toBe(text)
  })
})

describe("mapHttpError", () => {
  it("returns user-safe message for 400", () => {
    expect(mapHttpError(400)).toBe(HTTP_ERROR_MESSAGES[400])
  })

  it("returns 401 session expired message", () => {
    expect(mapHttpError(401)).toMatch(/session/i)
  })

  it("returns 403 permission message", () => {
    expect(mapHttpError(403)).toMatch(/permission/i)
  })

  it("returns 409 conflict message", () => {
    expect(mapHttpError(409)).toMatch(/conflict/i)
  })

  it("returns 422 validation message", () => {
    expect(mapHttpError(422)).toMatch(/details/i)
  })

  it("returns 500 generic error message", () => {
    expect(mapHttpError(500)).toMatch(/went wrong/i)
  })

  it("appends context when provided", () => {
    const result = mapHttpError(400, "bad deal id")
    expect(result).toContain("bad deal id")
  })

  it("returns fallback for unknown status codes", () => {
    const result = mapHttpError(599)
    expect(result).toMatch(/try again/i)
  })
})
