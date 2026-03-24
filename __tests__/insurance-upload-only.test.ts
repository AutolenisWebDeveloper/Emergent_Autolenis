import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { join } from "path"

const root = process.cwd()

// ---------------------------------------------------------------------------
// 1. Insurance buyer UI: upload-only path
// ---------------------------------------------------------------------------
describe("Insurance buyer UI — upload-only interim path", () => {
  const pageContent = readFileSync(
    join(root, "app/buyer/deal/insurance/page.tsx"),
    "utf-8",
  )

  it('should NOT contain a "Get Quotes" CTA', () => {
    expect(pageContent).not.toContain("Get Quotes")
  })

  it('should NOT link to the quote request page', () => {
    expect(pageContent).not.toContain("/buyer/deal/insurance/quote")
  })

  it('should NOT link to the quotes listing page', () => {
    expect(pageContent).not.toContain("/buyer/deal/insurance/quotes")
  })

  it('should NOT reference "Review Quotes"', () => {
    expect(pageContent).not.toContain("Review Quotes")
  })

  it('should contain "Upload Proof" CTA', () => {
    expect(pageContent).toContain("Upload Proof")
  })

  it('should link to the proof upload page', () => {
    expect(pageContent).toContain("/buyer/deal/insurance/proof")
  })

  it('should direct users to upload proof of insurance', () => {
    expect(pageContent).toContain("Upload proof of insurance")
  })

  it('should NOT import FileText icon (used only for Get Quotes CTA)', () => {
    expect(pageContent).not.toContain("FileText")
  })
})

// ---------------------------------------------------------------------------
// 2. API routes: quote/bind/select return 410 Gone
// ---------------------------------------------------------------------------
describe("Insurance API routes — quote/bind unavailability", () => {
  const readRoute = (subpath: string) =>
    readFileSync(
      join(root, `app/api/buyer/deals/[dealId]/insurance/${subpath}/route.ts`),
      "utf-8",
    )

  it("request-quotes route should return 410", () => {
    const content = readRoute("request-quotes")
    expect(content).toContain("410")
    expect(content).not.toContain("InsuranceService")
  })

  it("select-quote route should return 410", () => {
    const content = readRoute("select-quote")
    expect(content).toContain("410")
    expect(content).not.toContain("InsuranceService")
  })

  it("bind-policy route should return 410", () => {
    const content = readRoute("bind-policy")
    expect(content).toContain("410")
    expect(content).not.toContain("InsuranceService")
  })

  it("external-proof route should still call InsuranceService", () => {
    const content = readRoute("external-proof")
    expect(content).toContain("InsuranceService")
    expect(content).not.toContain("410")
  })
})
