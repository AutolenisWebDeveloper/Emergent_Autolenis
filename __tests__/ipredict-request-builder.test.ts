import { describe, it, expect } from "vitest"
import { buildRequest } from "@/lib/microbilt/ipredict-client"
import type { IpredictApplicationInput } from "@/lib/microbilt/ipredict-client"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides: Partial<IpredictApplicationInput> = {}): IpredictApplicationInput {
  return {
    firstName: "Jane",
    lastName: "Doe",
    ssn: "123-45-6789",
    dob: "1990-03-15",
    address1: "123 Main St",
    city: "Dallas",
    state: "TX",
    zip: "75201",
    phone: "(555) 123-4567",
    grossMonthlyIncome: 4100,
    applicationId: "app-001",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// PmtFreq mapping (D-01 fix: must use spec-compliant uppercase full strings)
// ---------------------------------------------------------------------------

describe("buildRequest — PmtFreq mapping", () => {
  it("maps 'weekly' to 'WEEKLY'", () => {
    const req = buildRequest(makeInput({ payFrequency: "weekly" }))
    expect(req.IncomeInfo?.PmtFreq).toBe("WEEKLY")
  })

  it("maps 'biweekly' to 'BIWEEKLY'", () => {
    const req = buildRequest(makeInput({ payFrequency: "biweekly" }))
    expect(req.IncomeInfo?.PmtFreq).toBe("BIWEEKLY")
  })

  it("maps 'semimonthly' to 'SEMIMONTHLY'", () => {
    const req = buildRequest(makeInput({ payFrequency: "semimonthly" }))
    expect(req.IncomeInfo?.PmtFreq).toBe("SEMIMONTHLY")
  })

  it("maps 'monthly' to 'MONTHLY'", () => {
    const req = buildRequest(makeInput({ payFrequency: "monthly" }))
    expect(req.IncomeInfo?.PmtFreq).toBe("MONTHLY")
  })

  it("maps 'annual' to 'ANNUALLY'", () => {
    const req = buildRequest(makeInput({ payFrequency: "annual" }))
    expect(req.IncomeInfo?.PmtFreq).toBe("ANNUALLY")
  })

  it("maps 'annually' to 'ANNUALLY'", () => {
    const req = buildRequest(makeInput({ payFrequency: "annually" }))
    expect(req.IncomeInfo?.PmtFreq).toBe("ANNUALLY")
  })

  it("is case-insensitive", () => {
    const req = buildRequest(makeInput({ payFrequency: "BiWeekly" }))
    expect(req.IncomeInfo?.PmtFreq).toBe("BIWEEKLY")
  })

  it("omits PmtFreq when payFrequency is undefined", () => {
    const req = buildRequest(makeInput({ payFrequency: undefined }))
    expect(req.IncomeInfo?.PmtFreq).toBeUndefined()
  })

  it("omits PmtFreq for unrecognized frequency", () => {
    const req = buildRequest(makeInput({ payFrequency: "daily" }))
    expect(req.IncomeInfo?.PmtFreq).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Basic request envelope structure
// ---------------------------------------------------------------------------

describe("buildRequest — envelope structure", () => {
  it("wraps PersonInfo with correct names (uppercased)", () => {
    const req = buildRequest(makeInput())
    expect(req.PersonInfo.PersonName.FirstName).toBe("JANE")
    expect(req.PersonInfo.PersonName.LastName).toBe("DOE")
  })

  it("strips non-digit chars from SSN", () => {
    const req = buildRequest(makeInput({ ssn: "123-45-6789" }))
    expect(req.PersonInfo.TINInfo.TaxId).toBe("123456789")
    expect(req.PersonInfo.TINInfo.TINType).toBe("1")
  })

  it("strips non-digit chars from phone", () => {
    const req = buildRequest(makeInput({ phone: "(555) 123-4567" }))
    expect(req.PersonInfo.ContactInfo.PhoneNum?.Phone).toBe("5551234567")
  })

  it("formats MonthlyIncome.Amt as a 2-decimal string", () => {
    const req = buildRequest(makeInput({ grossMonthlyIncome: 4100 }))
    expect(req.IncomeInfo?.MonthlyIncome?.Amt).toBe("4100.00")
    expect(req.IncomeInfo?.MonthlyIncome?.CurCode).toBe("USD")
  })

  it("includes EmploymentHistory when employerName is provided", () => {
    const req = buildRequest(makeInput({ employerName: "Acme Corp" }))
    expect(req.PersonInfo.EmploymentHistory?.OrgInfo?.Name).toBe("Acme Corp")
  })

  it("omits EmploymentHistory when employerName is undefined", () => {
    const req = buildRequest(makeInput({ employerName: undefined }))
    expect(req.PersonInfo.EmploymentHistory).toBeUndefined()
  })

  it("sets MsgRqHdr with RequestType N, ReasonCode 3, and applicationId as RefNum", () => {
    const req = buildRequest(makeInput({ applicationId: "app-xyz" }))
    expect(req.MsgRqHdr.RequestType).toBe("N")
    expect(req.MsgRqHdr.ReasonCode).toBe("3")
    expect(req.MsgRqHdr.RefNum).toBe("app-xyz")
  })
})
