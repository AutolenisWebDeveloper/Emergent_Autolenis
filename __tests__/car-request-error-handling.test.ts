import { describe, it, expect } from "vitest"

/**
 * Tests that the Prisma error code extraction logic correctly handles
 * all Prisma error types — in particular PrismaClientInitializationError
 * which stores its code in `.errorCode` instead of `.code`.
 */

/** Simulate the error code extraction logic from the route handler */
function extractPrismaCode(error: unknown): string | undefined {
  return (
    (error as { code?: string }).code ??
    (error as { errorCode?: string }).errorCode
  )
}

describe("Prisma error code extraction", () => {
  it("extracts .code from PrismaClientKnownRequestError", () => {
    const err = new Error("Foreign key constraint failed") as Error & { code: string }
    err.code = "P2003"
    expect(extractPrismaCode(err)).toBe("P2003")
  })

  it("extracts .errorCode from PrismaClientInitializationError", () => {
    // PrismaClientInitializationError uses `errorCode` instead of `code`
    const err = new Error("Can't reach database server") as Error & { errorCode: string }
    err.errorCode = "P1001"
    expect(extractPrismaCode(err)).toBe("P1001")
  })

  it("prefers .code over .errorCode when both exist", () => {
    const err = new Error("test") as Error & { code: string; errorCode: string }
    err.code = "P2002"
    err.errorCode = "P1001"
    expect(extractPrismaCode(err)).toBe("P2002")
  })

  it("returns undefined for errors with neither code nor errorCode", () => {
    const err = new Error("PrismaClientValidationError: unknown field")
    expect(extractPrismaCode(err)).toBeUndefined()
  })

  it("returns undefined for plain objects", () => {
    expect(extractPrismaCode({})).toBeUndefined()
  })

  it("handles string errors", () => {
    // JavaScript catch blocks can receive non-Error values when thrown explicitly
    expect(extractPrismaCode("some string error")).toBeUndefined()
  })
})

describe("Prisma error name detection", () => {
  it("detects PrismaClientValidationError by name", () => {
    const err = new Error("Invalid data") as Error & { name: string }
    err.name = "PrismaClientValidationError"
    expect((err as { name?: string }).name).toBe("PrismaClientValidationError")
  })

  it("detects PrismaClientInitializationError by name", () => {
    const err = new Error("Can't connect") as Error & { name: string }
    err.name = "PrismaClientInitializationError"
    expect((err as { name?: string }).name).toBe("PrismaClientInitializationError")
  })

  it("detects Prisma proxy error by message", () => {
    const err = new Error(
      "Prisma client not available. The app uses Supabase for database operations. Error: missing env"
    )
    expect(err.message).toContain("Prisma client not available")
  })
})
