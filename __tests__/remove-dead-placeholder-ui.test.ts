import { describe, it, expect } from "vitest"
import fs from "fs"
import path from "path"

/**
 * Verifies that all dead placeholder UI (NotImplementedModal usage)
 * has been removed from buyer, dealer, and affiliate-facing routes.
 *
 * Issue 15: Remove or replace dead placeholder UI and eliminate
 * not-implemented modal usage.
 */

const ROOT = path.resolve(__dirname, "..")

// ── Helper ────────────────────────────────────────────────────
function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8")
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath))
}

// ── 1. NotImplementedModal component is deleted ───────────────
describe("NotImplementedModal component removal", () => {
  it("should no longer exist on disk", () => {
    expect(
      fileExists("components/dashboard/not-implemented-modal.tsx"),
    ).toBe(false)
  })
})

// ── 2. No buyer-facing page imports NotImplementedModal ───────
describe("Buyer-facing routes have no dead placeholder actions", () => {
  const buyerPages = [
    "app/buyer/offers/[offerId]/page.tsx",
  ]

  for (const page of buyerPages) {
    describe(page, () => {
      it("does not import NotImplementedModal", () => {
        const src = readFile(page)
        expect(src).not.toContain("NotImplementedModal")
        expect(src).not.toContain("not-implemented-modal")
      })

      it("has no showModal state for dead placeholder actions", () => {
        const src = readFile(page)
        expect(src).not.toContain("setShowModal")
      })
    })
  }
})

// ── 3. No dealer-facing page imports NotImplementedModal ──────
describe("Dealer-facing routes have no dead placeholder actions", () => {
  const dealerPages = [
    "app/dealer/offers/[offerId]/page.tsx",
    "app/dealer/leads/[leadId]/page.tsx",
  ]

  for (const page of dealerPages) {
    describe(page, () => {
      it("does not import NotImplementedModal", () => {
        const src = readFile(page)
        expect(src).not.toContain("NotImplementedModal")
        expect(src).not.toContain("not-implemented-modal")
      })

      it("has no showModal state for dead placeholder actions", () => {
        const src = readFile(page)
        expect(src).not.toContain("setShowModal")
      })
    })
  }
})

// ── 4. No file anywhere imports the deleted component ─────────
describe("Global codebase: no remaining NotImplementedModal imports", () => {
  function findTsxFiles(dir: string): string[] {
    const results: string[] = []
    if (!fs.existsSync(dir)) return results
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.name === "node_modules" || entry.name === ".git") continue
      if (entry.isDirectory()) {
        results.push(...findTsxFiles(full))
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        results.push(full)
      }
    }
    return results
  }

  it("no source file imports not-implemented-modal", () => {
    const files = [
      ...findTsxFiles(path.join(ROOT, "app")),
      ...findTsxFiles(path.join(ROOT, "components")),
      ...findTsxFiles(path.join(ROOT, "lib")),
    ]
    const offenders = files.filter((f) => {
      const content = fs.readFileSync(f, "utf-8")
      return content.includes("not-implemented-modal")
    })
    expect(offenders).toEqual([])
  })
})

// ── 5. Specific dead buttons are removed ──────────────────────
describe("Specific dead placeholder buttons are removed", () => {
  it("buyer offer page does not have Accept Offer button triggering modal", () => {
    const src = readFile("app/buyer/offers/[offerId]/page.tsx")
    // The page should not contain a button that shows "Accept Offer" and triggers setShowModal
    expect(src).not.toMatch(/onClick[\s\S]*setShowModal[\s\S]*Accept Offer/)
    expect(src).not.toMatch(/Accept Offer[\s\S]*setShowModal/)
  })

  it("buyer offer page does not have Negotiate button triggering modal", () => {
    const src = readFile("app/buyer/offers/[offerId]/page.tsx")
    expect(src).not.toMatch(/Negotiate[\s\S]*setShowModal/)
  })

  it("dealer offer page does not have Edit Offer button triggering modal", () => {
    const src = readFile("app/dealer/offers/[offerId]/page.tsx")
    expect(src).not.toMatch(/Edit Offer[\s\S]*setShowModal/)
  })

  it("dealer offer page does not have Withdraw Offer button triggering modal", () => {
    const src = readFile("app/dealer/offers/[offerId]/page.tsx")
    expect(src).not.toMatch(/Withdraw Offer[\s\S]*setShowModal/)
  })

  it("dealer lead page does not have Submit Offer button triggering modal", () => {
    const src = readFile("app/dealer/leads/[leadId]/page.tsx")
    expect(src).not.toMatch(/Submit Offer[\s\S]*setShowModal/)
  })

  it("dealer lead page does not have Send Message CTA triggering modal", () => {
    const src = readFile("app/dealer/leads/[leadId]/page.tsx")
    expect(src).not.toMatch(/Send Message[\s\S]*setShowModal/)
  })
})

// ── 6. Pages still render valid content (not broken) ──────────
describe("Affected pages retain valid content after cleanup", () => {
  it("buyer offer detail page still has overview, dealer, documents, activity tabs", () => {
    const src = readFile("app/buyer/offers/[offerId]/page.tsx")
    expect(src).toContain('id: "overview"')
    expect(src).toContain('id: "dealer"')
    expect(src).toContain('id: "documents"')
    expect(src).toContain('id: "activity"')
  })

  it("dealer offer detail page still has overview, buyer, documents, activity tabs", () => {
    const src = readFile("app/dealer/offers/[offerId]/page.tsx")
    expect(src).toContain('id: "overview"')
    expect(src).toContain('id: "buyer"')
    expect(src).toContain('id: "documents"')
    expect(src).toContain('id: "activity"')
  })

  it("dealer lead detail page still has overview, buyer-docs, messages, activity tabs", () => {
    const src = readFile("app/dealer/leads/[leadId]/page.tsx")
    expect(src).toContain('id: "overview"')
    expect(src).toContain('id: "buyer-docs"')
    expect(src).toContain('id: "messages"')
    expect(src).toContain('id: "activity"')
  })

  it("dealer lead detail page no longer has submit-offer tab", () => {
    const src = readFile("app/dealer/leads/[leadId]/page.tsx")
    expect(src).not.toContain('id: "submit-offer"')
  })
})
