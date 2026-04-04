import { describe, it, expect } from "vitest"
import { extractApiError } from "@/lib/utils/error-message"

describe("extractApiError", () => {
  it("returns the string when error is a plain string", () => {
    expect(extractApiError("Invalid credentials", "fallback")).toBe("Invalid credentials")
  })

  it("returns the fallback when error is undefined", () => {
    expect(extractApiError(undefined, "Sign in failed")).toBe("Sign in failed")
  })

  it("returns the fallback when error is null", () => {
    expect(extractApiError(null, "Sign in failed")).toBe("Sign in failed")
  })

  it("returns message property when error is an object with a message string", () => {
    expect(
      extractApiError({ code: "AUTH_ERROR", message: "Bad credentials" }, "fallback"),
    ).toBe("Bad credentials")
  })

  it("returns the fallback when error is an object without a message property", () => {
    expect(extractApiError({ code: "AUTH_ERROR" }, "fallback")).toBe("fallback")
  })

  it("returns the fallback when error is a number", () => {
    expect(extractApiError(42, "fallback")).toBe("fallback")
  })

  it("returns the fallback when error is a boolean", () => {
    expect(extractApiError(true, "fallback")).toBe("fallback")
  })

  it("returns the fallback when error.message is not a string", () => {
    expect(extractApiError({ message: 123 }, "fallback")).toBe("fallback")
  })

  it("returns empty string when error is an empty string (callers use || for fallback)", () => {
    // Empty string is falsy but still a valid string — callers
    // should provide their own fallback via `||` if desired.
    expect(extractApiError("", "fallback")).toBe("")
    // Typical call-site pattern: extractApiError(data.error, "default") || "default"
    expect(extractApiError("", "fallback") || "fallback").toBe("fallback")
  })

  it("never returns [object Object]", () => {
    const cases = [
      { code: "ERR", message: "msg" },
      { code: "ERR" },
      {},
      [],
      42,
      null,
      undefined,
      true,
    ]
    for (const c of cases) {
      const result = extractApiError(c, "fallback")
      expect(result).not.toBe("[object Object]")
    }
  })
})
