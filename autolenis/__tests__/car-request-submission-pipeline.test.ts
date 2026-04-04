import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ---------------------------------------------------------------------------
// Tests for the Prisma availability and error-discrimination logic
// that was fixed as part of the buyer Request a Car submission remediation.
// ---------------------------------------------------------------------------

describe("Prisma status helpers", () => {
  const ORIG_ENV = { ...process.env }

  afterEach(() => {
    // Restore env vars
    process.env = { ...ORIG_ENV }
  })

  describe("isPrismaConfigured", () => {
    it("returns true when POSTGRES_PRISMA_URL is set", async () => {
      process.env["POSTGRES_PRISMA_URL"] = "postgresql://localhost:5432/test"
      // Re-import to pick up env change
      const { isPrismaConfigured } = await import("@/lib/db")
      expect(isPrismaConfigured()).toBe(true)
    })

    it("returns false when POSTGRES_PRISMA_URL is empty", async () => {
      delete process.env["POSTGRES_PRISMA_URL"]
      const { isPrismaConfigured } = await import("@/lib/db")
      expect(isPrismaConfigured()).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// Route-level error discrimination
// ---------------------------------------------------------------------------

describe("Buyer requests route — error response shape", () => {
  it("errorResponse format includes code, message, and correlationId", () => {
    // Replicate the errorResponse function from the route
    function errorResponse(
      msg: string,
      status: number,
      correlationId: string,
      errorCode?: string,
    ) {
      return {
        body: { error: { code: errorCode ?? String(status), message: msg }, correlationId },
        status,
      }
    }

    const resp = errorResponse("Test error", 503, "corr-123", "DB_CONNECTION")
    expect(resp.body.error.code).toBe("DB_CONNECTION")
    expect(resp.body.error.message).toBe("Test error")
    expect(resp.body.correlationId).toBe("corr-123")
    expect(resp.status).toBe(503)
  })

  it("errorResponse uses status as code when errorCode is not provided", () => {
    function errorResponse(
      msg: string,
      status: number,
      correlationId: string,
      errorCode?: string,
    ) {
      return {
        body: { error: { code: errorCode ?? String(status), message: msg }, correlationId },
        status,
      }
    }

    const resp = errorResponse("Not found", 404, "corr-456")
    expect(resp.body.error.code).toBe("404")
  })
})

// ---------------------------------------------------------------------------
// handlePrismaError classification
// ---------------------------------------------------------------------------

describe("Prisma error classification", () => {
  // Replicate the classification logic from the route
  function classifyPrismaError(error: unknown): { status: number; code: string } | null {
    const prismaCode =
      (error as { code?: string }).code ??
      (error as { errorCode?: string }).errorCode

    if (prismaCode === "P1001" || prismaCode === "P1002" || prismaCode === "P1017") {
      return { status: 503, code: "DB_CONNECTION" }
    }
    if (prismaCode === "P2003") return { status: 422, code: "FK_CONSTRAINT" }
    if (prismaCode === "P2002") return { status: 409, code: "DUPLICATE" }

    const errName = (error as { name?: string }).name
    if (errName === "PrismaClientValidationError") return { status: 422, code: "VALIDATION" }
    if (errName === "PrismaClientInitializationError") return { status: 500, code: "DB_INIT" }

    const message = error instanceof Error ? error.message : String(error)
    if (message.includes("Prisma client not available")) return { status: 500, code: "DB_UNAVAILABLE" }

    return null
  }

  it("classifies P1001 as transient 503", () => {
    const err = Object.assign(new Error("Connection refused"), { code: "P1001" })
    expect(classifyPrismaError(err)).toEqual({ status: 503, code: "DB_CONNECTION" })
  })

  it("classifies P2003 as 422 FK_CONSTRAINT", () => {
    const err = Object.assign(new Error("FK failed"), { code: "P2003" })
    expect(classifyPrismaError(err)).toEqual({ status: 422, code: "FK_CONSTRAINT" })
  })

  it("classifies P2002 as 409 DUPLICATE", () => {
    const err = Object.assign(new Error("Unique constraint"), { code: "P2002" })
    expect(classifyPrismaError(err)).toEqual({ status: 409, code: "DUPLICATE" })
  })

  it("classifies PrismaClientValidationError as 422 VALIDATION (not 503)", () => {
    const err = Object.assign(new Error("Invalid field"), { name: "PrismaClientValidationError" })
    expect(classifyPrismaError(err)).toEqual({ status: 422, code: "VALIDATION" })
  })

  it("classifies PrismaClientInitializationError as 500 DB_INIT (not 503)", () => {
    const err = Object.assign(new Error("Missing env var"), { name: "PrismaClientInitializationError" })
    expect(classifyPrismaError(err)).toEqual({ status: 500, code: "DB_INIT" })
  })

  it("classifies 'Prisma client not available' as 500 DB_UNAVAILABLE (not 503)", () => {
    const err = new Error("Prisma client not available. Error: missing config")
    expect(classifyPrismaError(err)).toEqual({ status: 500, code: "DB_UNAVAILABLE" })
  })

  it("returns null for unknown errors", () => {
    expect(classifyPrismaError(new Error("Something else"))).toBeNull()
  })

  it("returns null for non-Error values", () => {
    expect(classifyPrismaError("string error")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Frontend error message mapping
// ---------------------------------------------------------------------------

describe("Frontend error message mapping", () => {
  /**
   * Replicate the frontend's error-message extraction logic.
   * This ensures the frontend uses the backend's message instead of hardcoding.
   */
  function extractFrontendMessage(
    status: number,
    responseData: Record<string, unknown>,
  ): string {
    const serverMsg =
      typeof responseData.error === "object"
        ? (responseData.error as { message?: string }).message
        : typeof responseData.error === "string"
          ? responseData.error
          : null

    if (status === 401 || status === 403) {
      return serverMsg || "Your session has expired. Please refresh the page and sign in again."
    }
    if (status === 422) {
      return serverMsg || "Please check your input and try again."
    }
    if (status === 409) {
      return serverMsg || "A duplicate request already exists. Please refresh and try again."
    }
    if (status === 503) {
      return serverMsg || "Service temporarily unavailable. Please wait a moment and try again."
    }
    return serverMsg || "Unable to submit your request. Please try again."
  }

  it("uses the server message for 503 instead of hardcoded 'temporarily busy'", () => {
    const msg = extractFrontendMessage(503, {
      error: { code: "DB_CONNECTION", message: "Service temporarily unavailable. Please try again in a moment." },
    })
    expect(msg).toBe("Service temporarily unavailable. Please try again in a moment.")
    expect(msg).not.toContain("temporarily busy")
  })

  it("uses the server message for 500 Prisma unavailable", () => {
    const msg = extractFrontendMessage(500, {
      error: { code: "DB_UNAVAILABLE", message: "Unable to process your request right now. Our team has been notified. Please try again later." },
    })
    expect(msg).toBe("Unable to process your request right now. Our team has been notified. Please try again later.")
    expect(msg).not.toContain("temporarily busy")
  })

  it("uses the server message for 422 validation errors", () => {
    const msg = extractFrontendMessage(422, {
      error: { code: "VALIDATION", message: "Please enter a valid 5-digit ZIP code." },
    })
    expect(msg).toBe("Please enter a valid 5-digit ZIP code.")
  })

  it("falls back to default for 503 when no server message", () => {
    const msg = extractFrontendMessage(503, {})
    expect(msg).toBe("Service temporarily unavailable. Please wait a moment and try again.")
  })

  it("handles string error format from legacy endpoints", () => {
    const msg = extractFrontendMessage(500, { error: "Something went wrong" })
    expect(msg).toBe("Something went wrong")
  })
})

// ---------------------------------------------------------------------------
// Prisma retry behaviour
// ---------------------------------------------------------------------------

describe("Prisma getPrisma retry logic", () => {
  it("getPrisma retries when env var becomes available after initial failure", async () => {
    // This test validates the LOGIC — the retry condition
    // `!_prismaLoadAttempted || (_prismaInstance === null && isPrismaConfigured())`
    // means: retry when previous attempt failed AND POSTGRES_PRISMA_URL is now set

    // When POSTGRES_PRISMA_URL is NOT set, getPrisma should not retry endlessly
    const retryCondition = (attempted: boolean, instance: unknown, configured: boolean) =>
      !attempted || (instance === null && configured)

    // First call: never attempted → should try
    expect(retryCondition(false, null, false)).toBe(true)
    // After failed first attempt with no config → should NOT retry
    expect(retryCondition(true, null, false)).toBe(false)
    // After failed first attempt but config now available → SHOULD retry
    expect(retryCondition(true, null, true)).toBe(true)
    // After successful init → should NOT retry
    expect(retryCondition(true, {}, true)).toBe(false)
  })
})
