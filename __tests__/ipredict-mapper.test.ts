import { describe, it, expect } from "vitest"
import { mapIpredictResponse } from "@/lib/microbilt/mappers"
import type { IpredictResponse } from "@/lib/microbilt/types"

// ---------------------------------------------------------------------------
// Helpers — build minimal IpredictResponse fixtures
// ---------------------------------------------------------------------------

function makeResponse(overrides: Partial<IpredictResponse> = {}): IpredictResponse {
  return {
    MsgRsHdr: { RqUID: "test-req-001" },
    RESPONSE: {
      STATUS: { type: "SUCCESS" },
      CONTENT: {
        DECISION: {
          decision: { Value: "APPROVE", code: "A" },
          SCORES: [],
          REASONS: [],
        },
        SERVICEDETAILS: {},
      },
    },
    ...overrides,
  } as IpredictResponse
}

// ---------------------------------------------------------------------------
// Bug 1: Score extraction — must use CLV:INQ, not first Score entry
// ---------------------------------------------------------------------------

describe("mapIpredictResponse — score extraction", () => {
  it("extracts CLV:INQ score when multiple score types are present", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.DECISION!.SCORES = [
      { type: "CLV:CVI", Value: "20" },
      { type: "CLV:INQ", model: "STL_v3", performsLikeScore: "580", profitabilityLift: "NPL", Value: "580" },
      { type: "CLV:IDV", Value: "682" },
    ]

    const result = mapIpredictResponse(raw)

    expect(result.primaryScore).toBe(580)
    expect(result.performsLikeScore).toBe(580)
    expect(result.scoreModel).toBe("STL_v3")
  })

  it("does NOT extract CLV:CVI (20) as the primary score", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.DECISION!.SCORES = [
      { type: "CLV:CVI", Value: "20" },
      { type: "CLV:INQ", Value: "580" },
      { type: "CLV:IDV", Value: "682" },
    ]

    const result = mapIpredictResponse(raw)

    // The old bug would have returned 20 here
    expect(result.primaryScore).not.toBe(20)
    expect(result.primaryScore).toBe(580)
  })

  it("falls back to the first score with a performsLikeScore when CLV:INQ is absent", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.DECISION!.SCORES = [
      { type: "CLV:CVI", Value: "20" },
      { type: "UNKNOWN", performsLikeScore: "600", Value: "600" },
    ]

    const result = mapIpredictResponse(raw)

    expect(result.primaryScore).toBe(600)
    expect(result.performsLikeScore).toBe(600)
  })

  it("falls back to the first score with any Value as a last resort", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.DECISION!.SCORES = [
      { type: "CLV:CVI", Value: "20" },
    ]

    const result = mapIpredictResponse(raw)

    expect(result.primaryScore).toBe(20)
  })

  it("returns null scores when SCORES array is empty", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.DECISION!.SCORES = []

    const result = mapIpredictResponse(raw)

    expect(result.primaryScore).toBeNull()
    expect(result.performsLikeScore).toBeNull()
    expect(result.scoreModel).toBeNull()
    expect(result.noScore).toBe(true)
  })

  it("returns null scores when SCORES is undefined", () => {
    const raw = makeResponse()
    delete raw.RESPONSE!.CONTENT!.DECISION!.SCORES

    const result = mapIpredictResponse(raw)

    expect(result.primaryScore).toBeNull()
    expect(result.noScore).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Bug 2: OFAC detection — must check IDV.OFACAlert too
// ---------------------------------------------------------------------------

describe("mapIpredictResponse — OFAC detection", () => {
  it("detects OFAC from IDV.OFACAlert = Y (real response format)", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.SERVICEDETAILS = {
      IDV: { OFACAlert: "Y" },
    }

    const result = mapIpredictResponse(raw)

    expect(result.ofacMatch).toBe(true)
  })

  it("detects OFAC from iPreView.WatchListAttributes.OFACIndicator = Y (legacy format)", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.SERVICEDETAILS = {
      iPreView: {
        WatchListAttributes: { OFACIndicator: "Y" },
      },
    }

    const result = mapIpredictResponse(raw)

    expect(result.ofacMatch).toBe(true)
  })

  it("does NOT flag OFAC when IDV.OFACAlert = N and no iPreView", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.SERVICEDETAILS = {
      IDV: { OFACAlert: "N" },
    }

    const result = mapIpredictResponse(raw)

    expect(result.ofacMatch).toBe(false)
  })

  it("does NOT flag OFAC when both sources are absent", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.SERVICEDETAILS = {}

    const result = mapIpredictResponse(raw)

    expect(result.ofacMatch).toBe(false)
  })

  it("flags OFAC when both IDV and iPreView report Y", () => {
    const raw = makeResponse()
    raw.RESPONSE!.CONTENT!.SERVICEDETAILS = {
      IDV: { OFACAlert: "Y" },
      iPreView: {
        WatchListAttributes: { OFACIndicator: "Y" },
      },
    }

    const result = mapIpredictResponse(raw)

    expect(result.ofacMatch).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Full real-response regression test
// ---------------------------------------------------------------------------

describe("mapIpredictResponse — full real-response regression", () => {
  it("correctly maps a realistic sandbox response", () => {
    const raw: IpredictResponse = {
      MsgRsHdr: { RqUID: "sandbox-001" },
      RESPONSE: {
        STATUS: { type: "SUCCESS" },
        CONTENT: {
          DECISION: {
            decision: { Value: "APPROVE", code: "A" },
            SCORES: [
              { type: "CLV:CVI", Value: "20" },
              { type: "CLV:INQ", model: "STL_v3", performsLikeScore: "580", profitabilityLift: "NPL", Value: "580" },
              { type: "CLV:IDV", Value: "682" },
            ],
            REASONS: [{ code: "R01", Value: "Low inquiry count" }],
          },
          SERVICEDETAILS: {
            PDA: {
              summary: {
                inquiries: "5",
                recentinquiries: "2",
                loans: "3",
                loanscurrent: "1",
                badloans: "0",
                loanscollections: "0",
                loanspastdue: "0",
                loanswrittenoff: "0",
              },
            },
            PUBLICRECORDS: {
              SUMMARY: { bankruptcies: "0", evictionsliensjudgments: "0" },
            },
            IDV: {
              ssnValidCode: "Y",
              deceasedIndicator: "N",
              fraudWarning: "N",
              highRiskAddress: "N",
              bankruptcyFlag: "N",
              OFACAlert: "N",
            },
          },
        },
      },
    } as IpredictResponse

    const result = mapIpredictResponse(raw)

    // Score extraction (Bug 1 regression)
    expect(result.primaryScore).toBe(580)
    expect(result.performsLikeScore).toBe(580)
    expect(result.scoreModel).toBe("STL_v3")
    expect(result.noScore).toBe(false)

    // OFAC check (Bug 2 regression)
    expect(result.ofacMatch).toBe(false)

    // Other fields
    expect(result.requestId).toBe("sandbox-001")
    expect(result.responseStatus).toBe("SUCCESS")
    expect(result.decisionValue).toBe("APPROVE")
    expect(result.reasonCodes).toEqual(["R01"])
    expect(result.totalInquiries).toBe(5)
    expect(result.ssnValid).toBe(true)
    expect(result.hasBankruptcyIndicator).toBe(false)
  })
})
