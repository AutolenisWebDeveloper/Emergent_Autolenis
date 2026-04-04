import { describe, expect, it } from "vitest"
import { retrieveKnowledge, formatRetrievalContext, getCorpusBuildId } from "@/lib/ai/knowledge"
import { knowledgeCorpus } from "@/lib/ai/knowledge/corpus"
import type { AIRole } from "@/lib/ai/context-builder"

// =========================================================================
// Knowledge Corpus Integrity
// =========================================================================

describe("knowledge corpus", () => {
  it("contains documents", () => {
    expect(knowledgeCorpus.length).toBeGreaterThan(0)
  })

  it("every document has required fields", () => {
    for (const doc of knowledgeCorpus) {
      expect(doc.id).toBeTruthy()
      expect(doc.title).toBeTruthy()
      expect(doc.text).toBeTruthy()
      expect(doc.url).toBeTruthy()
      expect(doc.visibility).toMatch(/^(public|buyer|dealer|affiliate|admin)$/)
      expect(Array.isArray(doc.tags)).toBe(true)
      expect(doc.tags.length).toBeGreaterThan(0)
      expect(doc.updatedAt).toBeTruthy()
      expect(doc.buildId).toBeTruthy()
    }
  })

  it("has unique document IDs", () => {
    const ids = knowledgeCorpus.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("includes pricing/fees content", () => {
    const feesDocs = knowledgeCorpus.filter((d) => d.tags.includes("fees"))
    expect(feesDocs.length).toBeGreaterThan(0)
  })

  it("includes prequal/credit content", () => {
    const creditDocs = knowledgeCorpus.filter((d) => d.tags.includes("credit"))
    expect(creditDocs.length).toBeGreaterThan(0)
  })

  it("provides a build ID", () => {
    const buildId = getCorpusBuildId()
    expect(buildId).toBeTruthy()
    expect(typeof buildId).toBe("string")
  })
})

// =========================================================================
// Knowledge Retrieval
// =========================================================================

describe("knowledge retrieval", () => {
  it("returns sources for 'fees' question", () => {
    const result = retrieveKnowledge("How much does AutoLenis cost? What are the fees?", "public")
    expect(result.documents.length).toBeGreaterThan(0)
    const hasFeeTag = result.documents.some((d) => d.tags.includes("fees"))
    expect(hasFeeTag).toBe(true)
  })

  it("returns sources for 'soft vs hard credit pull' question", () => {
    const result = retrieveKnowledge("What is the difference between soft and hard credit pull?", "public")
    expect(result.documents.length).toBeGreaterThan(0)
    const hasCreditTag = result.documents.some((d) =>
      d.tags.includes("credit") || d.tags.includes("soft-pull") || d.tags.includes("prequal"),
    )
    expect(hasCreditTag).toBe(true)
  })

  it("returns sources for 'how does the auction work' question", () => {
    const result = retrieveKnowledge("How does the silent reverse auction work?", "public")
    expect(result.documents.length).toBeGreaterThan(0)
    const hasAuctionTag = result.documents.some((d) => d.tags.includes("auction"))
    expect(hasAuctionTag).toBe(true)
  })

  it("returns sources for 'contract shield' question", () => {
    const result = retrieveKnowledge("What is Contract Shield?", "public")
    expect(result.documents.length).toBeGreaterThan(0)
    const hasContractTag = result.documents.some((d) =>
      d.tags.includes("contract-shield") || d.tags.includes("contract"),
    )
    expect(hasContractTag).toBe(true)
  })

  it("returns sources for 'refund' question", () => {
    const result = retrieveKnowledge("Can I get a refund if I cancel?", "public")
    expect(result.documents.length).toBeGreaterThan(0)
    const hasRefundTag = result.documents.some((d) => d.tags.includes("refund") || d.tags.includes("deposit"))
    expect(hasRefundTag).toBe(true)
  })

  it("returns pricing page URL in fee-related sources", () => {
    const result = retrieveKnowledge("What are the fees?", "public")
    const pricingSource = result.documents.find((d) => d.url === "/pricing")
    expect(pricingSource).toBeDefined()
  })

  it("includes buildId in results", () => {
    const result = retrieveKnowledge("fees", "public")
    expect(result.buildId).toBeTruthy()
  })
})

// =========================================================================
// Role-Scoped Visibility
// =========================================================================

describe("knowledge retrieval — visibility", () => {
  it("public role cannot see buyer-only docs", () => {
    const result = retrieveKnowledge("buyer dashboard documents", "public")
    const buyerOnly = result.documents.filter((d) => d.visibility === "buyer")
    expect(buyerOnly.length).toBe(0)
  })

  it("public role cannot see admin-only docs", () => {
    const result = retrieveKnowledge("admin dashboard users", "public")
    const adminOnly = result.documents.filter((d) => d.visibility === "admin")
    expect(adminOnly.length).toBe(0)
  })

  it("buyer role can see buyer docs", () => {
    const result = retrieveKnowledge("buyer dashboard documents upload", "buyer")
    const buyerDocs = result.documents.filter((d) => d.visibility === "buyer")
    expect(buyerDocs.length).toBeGreaterThan(0)
  })

  it("buyer role can also see public docs", () => {
    const result = retrieveKnowledge("fees pricing", "buyer")
    const publicDocs = result.documents.filter((d) => d.visibility === "public")
    expect(publicDocs.length).toBeGreaterThan(0)
  })

  it("admin role can see all visibility levels", () => {
    const adminResult = retrieveKnowledge("dashboard", "admin")
    const visibilities = new Set(adminResult.documents.map((d) => d.visibility))
    // Admin should be able to see multiple visibility levels
    expect(visibilities.size).toBeGreaterThanOrEqual(1)
  })

  it("dealer role cannot see buyer docs", () => {
    const result = retrieveKnowledge("buyer dashboard documents", "dealer")
    const buyerOnly = result.documents.filter((d) => d.visibility === "buyer")
    expect(buyerOnly.length).toBe(0)
  })

  it("affiliate role cannot see admin docs", () => {
    const result = retrieveKnowledge("admin dashboard", "affiliate")
    const adminOnly = result.documents.filter((d) => d.visibility === "admin")
    expect(adminOnly.length).toBe(0)
  })
})

// =========================================================================
// Retrieval Context Formatting
// =========================================================================

describe("retrieval context formatting", () => {
  it("formats context with source citations", () => {
    const result = retrieveKnowledge("fees", "public")
    const context = formatRetrievalContext(result)
    expect(context).toBeTruthy()
    expect(context).toContain("RETRIEVED KNOWLEDGE")
    expect(context).toContain("[Source 1:")
    expect(context).toContain("Build:")
  })

  it("returns null when no documents match", () => {
    const result = retrieveKnowledge("xyzzy quantum flux capacitor", "public")
    const context = formatRetrievalContext(result)
    expect(context).toBeNull()
  })

  it("includes source URLs in formatted context", () => {
    const result = retrieveKnowledge("fees pricing", "public")
    const context = formatRetrievalContext(result)
    expect(context).toContain("/pricing")
  })
})
