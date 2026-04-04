import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getCsrfToken, csrfHeaders } from "@/lib/csrf-client"

describe("CSRF Client Utilities", () => {
  const originalDocument = globalThis.document

  afterEach(() => {
    vi.restoreAllMocks()
    // Restore original document descriptor
    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      writable: true,
      configurable: true,
    })
  })

  describe("getCsrfToken", () => {
    it("returns undefined when document is not available (SSR)", () => {
      // Simulate server-side rendering (no document)
      Object.defineProperty(globalThis, "document", {
        value: undefined,
        writable: true,
        configurable: true,
      })
      expect(getCsrfToken()).toBeUndefined()
    })

    it("returns the csrf_token cookie value when present", () => {
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "other=val; csrf_token=abc123def; another=x" },
        writable: true,
        configurable: true,
      })
      expect(getCsrfToken()).toBe("abc123def")
    })

    it("returns undefined when csrf_token cookie is absent", () => {
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "session=xyz; theme=dark" },
        writable: true,
        configurable: true,
      })
      expect(getCsrfToken()).toBeUndefined()
    })

    it("returns the token from a single-cookie string", () => {
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "csrf_token=only_one" },
        writable: true,
        configurable: true,
      })
      expect(getCsrfToken()).toBe("only_one")
    })

    it("handles empty cookie string", () => {
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "" },
        writable: true,
        configurable: true,
      })
      expect(getCsrfToken()).toBeUndefined()
    })
  })

  describe("csrfHeaders", () => {
    it("includes Content-Type and x-csrf-token when token exists", () => {
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "csrf_token=test_token_value" },
        writable: true,
        configurable: true,
      })
      const headers = csrfHeaders()
      expect(headers["Content-Type"]).toBe("application/json")
      expect(headers["x-csrf-token"]).toBe("test_token_value")
    })

    it("includes Content-Type but omits x-csrf-token when no cookie", () => {
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "" },
        writable: true,
        configurable: true,
      })
      const headers = csrfHeaders()
      expect(headers["Content-Type"]).toBe("application/json")
      expect(headers["x-csrf-token"]).toBeUndefined()
    })

    it("merges extra headers", () => {
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "csrf_token=tok" },
        writable: true,
        configurable: true,
      })
      const headers = csrfHeaders({ Authorization: "Bearer abc" })
      expect(headers["Content-Type"]).toBe("application/json")
      expect(headers["x-csrf-token"]).toBe("tok")
      expect(headers["Authorization"]).toBe("Bearer abc")
    })

    it("allows extra headers to override Content-Type", () => {
      Object.defineProperty(globalThis, "document", {
        value: { cookie: "" },
        writable: true,
        configurable: true,
      })
      const headers = csrfHeaders({ "Content-Type": "text/plain" })
      expect(headers["Content-Type"]).toBe("text/plain")
    })
  })
})
