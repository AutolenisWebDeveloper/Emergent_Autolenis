/**
 * Frontend Behavioral Tests — SignUpForm Component
 *
 * Exercises the actual SignUpForm component entry point for all 3 roles
 * (Buyer, Affiliate, Dealer) with real user interactions, verifying:
 * - Form submission triggers fetch to /api/auth/signup
 * - Loading state during submission
 * - Submit button disabled while in flight
 * - Role-specific redirect on success
 * - Duplicate email error handling
 * - Validation errors displayed
 * - Network failure surfaced truthfully
 * - No false generic fatal error on success
 *
 * Uses @testing-library/react + happy-dom (from vitest.config.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ── Mock next/navigation ──────────────────────────────────────────────────
const mockReplace = vi.fn()
const mockSearchParamsGet = vi.fn().mockReturnValue(null)

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
  usePathname: () => "/auth/signup",
}))

// ── Mock next/image ───────────────────────────────────────────────────────
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}))

// ── Global fetch mock ─────────────────────────────────────────────────────
const mockFetch = vi.fn()

// ── Import the component AFTER mocks ──────────────────────────────────────
import { SignUpForm } from "@/components/auth/sign-up-form"

// ── Helpers ───────────────────────────────────────────────────────────────
async function fillSignupForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { role?: string; skipPackage?: boolean } = {},
) {
  await user.type(screen.getByLabelText("First name"), "Jane")
  await user.type(screen.getByLabelText("Last name"), "Doe")
  await user.type(screen.getByLabelText("Email"), "jane@example.com")
  await user.type(screen.getByLabelText("Password"), "SecurePass123!")

  if (overrides.role) {
    const select = screen.getByLabelText("I want to")
    await user.selectOptions(select, overrides.role)
  }
}

function mockSuccessResponse(role: string = "BUYER") {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      success: true,
      data: {
        user: { id: "u1", email: "jane@example.com", role },
        redirect: null,
      },
    }),
    text: async () => "",
  }
}

function mockDuplicateEmailResponse() {
  return {
    ok: false,
    status: 409,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      success: false,
      error: "An account with this email already exists",
    }),
    text: async () => "",
  }
}

function mockServerErrorResponse() {
  return {
    ok: false,
    status: 500,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      success: false,
      error: "Internal server error",
    }),
    text: async () => "",
  }
}

// ========================================================================
// Tests
// ========================================================================

describe("SignUpForm — Frontend Behavioral Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReplace.mockClear()
    mockSearchParamsGet.mockReturnValue(null)

    // Default: signup succeeds, referral returns ok
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/api/auth/signup") {
        return mockSuccessResponse("BUYER")
      }
      if (url === "/api/affiliate/process-referral") {
        return { ok: true, json: async () => ({}) }
      }
      return { ok: true, json: async () => ({}) }
    })

    // Install fetch mock
    vi.stubGlobal("fetch", mockFetch)

    // Mock localStorage
    const store: Record<string, string> = {}
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, val: string) => { store[key] = val },
      removeItem: (key: string) => { delete store[key] },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ──────────────────────────────────────────────────────────────────────
  // Buyer Signup Success
  // ──────────────────────────────────────────────────────────────────────
  describe("Buyer signup — success path", () => {
    it("renders the signup form with all required fields", () => {
      render(<SignUpForm />)
      expect(screen.getByLabelText('First name')).toBeDefined()
      expect(screen.getByLabelText('Last name')).toBeDefined()
      expect(screen.getByLabelText('Email')).toBeDefined()
      expect(screen.getByLabelText('Password')).toBeDefined()
      expect(screen.getByLabelText('I want to')).toBeDefined()
      expect(screen.getByRole("button", { name: /create account/i })).toBeDefined()
    })

    it("submits buyer signup and redirects to onboarding", async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/signup") return mockSuccessResponse("BUYER")
        return { ok: true, json: async () => ({}) }
      })

      render(<SignUpForm />)

      await fillSignupForm(user)

      // Select a package (required for BUYER role) — PackageCard uses role="radio"
      const standardPkg = screen.getByRole("radio", { name: /standard/i })
      await user.click(standardPkg)

      // Submit the form
      const submitBtn = screen.getByRole("button", { name: /create.*account/i })
      await user.click(submitBtn)

      // Verify fetch was called with correct endpoint and buyer payload
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/auth/signup",
          expect.objectContaining({
            method: "POST",
            headers: expect.objectContaining({ "Content-Type": "application/json" }),
          }),
        )
      })

      // Verify the body includes BUYER role
      const signupCall = mockFetch.mock.calls.find((c: any[]) => c[0] === "/api/auth/signup")
      if (signupCall) {
        const body = JSON.parse(signupCall[1].body)
        expect(body.role).toBe("BUYER")
        expect(body.email).toBe("jane@example.com")
        expect(body.firstName).toBe("Jane")
        expect(body.lastName).toBe("Doe")
      }

      // Should redirect to buyer onboarding
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/buyer/onboarding")
      })
    })

    it("shows loading spinner while submitting", async () => {
      const user = userEvent.setup()

      // Delay response to observe loading state
      let resolveSignup: Function
      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/signup") {
          return new Promise((resolve) => {
            resolveSignup = () => resolve(mockSuccessResponse("BUYER"))
          })
        }
        return { ok: true, json: async () => ({}) }
      })

      render(<SignUpForm />)
      await fillSignupForm(user)

      // Select a package
      await user.click(screen.getByRole("radio", { name: /standard/i }))

      const submitBtn = screen.getByRole("button", { name: /create.*account/i })
      await user.click(submitBtn)

      // During submission: button should show loading text and be disabled
      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /creating account/i })
        expect(btn).toBeDefined()
        expect(btn.getAttribute("disabled")).not.toBeNull()
      })

      // Resolve the fetch
      await act(async () => {
        resolveSignup!()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Affiliate Signup Success
  // ──────────────────────────────────────────────────────────────────────
  describe("Affiliate signup — success path", () => {
    it("submits affiliate signup with AFFILIATE role and redirects correctly", async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/signup") return mockSuccessResponse("AFFILIATE")
        return { ok: true, json: async () => ({}) }
      })

      // Provide ?role=affiliate in search params
      mockSearchParamsGet.mockImplementation((key: string) =>
        key === "role" ? "affiliate" : null,
      )

      render(<SignUpForm />)

      await fillSignupForm(user, { role: "AFFILIATE" })

      const submitBtn = screen.getByRole("button", { name: /create account/i })
      await user.click(submitBtn)

      await waitFor(() => {
        const signupCall = mockFetch.mock.calls.find((c: any[]) => c[0] === "/api/auth/signup")
        expect(signupCall).toBeDefined()
        const body = JSON.parse(signupCall![1].body)
        expect(body.role).toBe("AFFILIATE")
      })

      // Should redirect to affiliate onboarding
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/affiliate/portal/onboarding")
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Dealer Signup Success
  // ──────────────────────────────────────────────────────────────────────
  describe("Dealer signup — success path", () => {
    it("submits dealer signup with DEALER role and redirects correctly", async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/signup") return mockSuccessResponse("DEALER")
        return { ok: true, json: async () => ({}) }
      })

      mockSearchParamsGet.mockImplementation((key: string) =>
        key === "role" ? "dealer" : null,
      )

      render(<SignUpForm />)

      await fillSignupForm(user, { role: "DEALER" })

      const submitBtn = screen.getByRole("button", { name: /create account/i })
      await user.click(submitBtn)

      await waitFor(() => {
        const signupCall = mockFetch.mock.calls.find((c: any[]) => c[0] === "/api/auth/signup")
        expect(signupCall).toBeDefined()
        const body = JSON.parse(signupCall![1].body)
        expect(body.role).toBe("DEALER")
      })

      // Should redirect to dealer onboarding
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dealer/onboarding")
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Duplicate Email Handling
  // ──────────────────────────────────────────────────────────────────────
  describe("Duplicate email handling", () => {
    it("shows truthful error when email already exists", async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/signup") return mockDuplicateEmailResponse()
        return { ok: true, json: async () => ({}) }
      })

      render(<SignUpForm />)
      await fillSignupForm(user)

      // Select a package
      await user.click(screen.getByRole("radio", { name: /standard/i }))

      const submitBtn = screen.getByRole("button", { name: /create.*account/i })
      await user.click(submitBtn)

      // Should show duplicate email error, not a generic fatal error
      await waitFor(() => {
        const errorEl = screen.getByText(/already exists/i)
        expect(errorEl).toBeDefined()
      })

      // Should NOT redirect
      expect(mockReplace).not.toHaveBeenCalled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Frontend Validation
  // ──────────────────────────────────────────────────────────────────────
  describe("Client-side validation", () => {
    it("prevents submission when required fields are empty (native validation)", async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      // With empty fields, clicking submit should not trigger a fetch to /api/auth/signup
      // because HTML required attributes prevent submission in the browser.
      // In happy-dom, the form won't submit without required fields being filled.
      const submitBtn = screen.getByRole("button", { name: /create account/i })
      await user.click(submitBtn)

      // Give it a moment
      await new Promise((r) => setTimeout(r, 100))

      // Should NOT have called the signup API
      const signupCalls = mockFetch.mock.calls.filter(
        (c: any[]) => c[0] === "/api/auth/signup",
      )
      expect(signupCalls.length).toBe(0)
    })

    it("shows error when password is too short", async () => {
      const user = userEvent.setup()
      render(<SignUpForm />)

      await user.type(screen.getByLabelText('First name'), "Jane")
      await user.type(screen.getByLabelText('Last name'), "Doe")
      await user.type(screen.getByLabelText('Email'), "jane@example.com")
      await user.type(screen.getByLabelText('Password'), "short")

      const submitBtn = screen.getByRole("button", { name: /create account/i })
      await user.click(submitBtn)

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeDefined()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Network Failure
  // ──────────────────────────────────────────────────────────────────────
  describe("Network failure handling", () => {
    it("shows truthful network error, not generic failure", async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/signup") {
          throw new TypeError("Failed to fetch")
        }
        return { ok: true, json: async () => ({}) }
      })

      render(<SignUpForm />)
      await fillSignupForm(user)

      // Select a package
      await user.click(screen.getByRole("radio", { name: /standard/i }))

      const submitBtn = screen.getByRole("button", { name: /create.*account/i })
      await user.click(submitBtn)

      await waitFor(() => {
        expect(screen.getByText(/unable to connect|check your internet/i)).toBeDefined()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Server error
  // ──────────────────────────────────────────────────────────────────────
  describe("Server error handling", () => {
    it("shows backend error message truthfully", async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/signup") return mockServerErrorResponse()
        return { ok: true, json: async () => ({}) }
      })

      render(<SignUpForm />)
      await fillSignupForm(user)

      // Select a package
      await user.click(screen.getByRole("radio", { name: /standard/i }))

      const submitBtn = screen.getByRole("button", { name: /create.*account/i })
      await user.click(submitBtn)

      await waitFor(() => {
        expect(screen.getByText(/internal server error/i)).toBeDefined()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Welcome email trigger (from the signup path)
  // ──────────────────────────────────────────────────────────────────────
  describe("Welcome email trigger from signup path", () => {
    it("successful signup does not show error (welcome email is backend-side non-blocking)", async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/signup") return mockSuccessResponse("BUYER")
        return { ok: true, json: async () => ({}) }
      })

      render(<SignUpForm />)
      await fillSignupForm(user)

      await user.click(screen.getByRole("radio", { name: /standard/i }))

      const submitBtn = screen.getByRole("button", { name: /create.*account/i })
      await user.click(submitBtn)

      // Should redirect without any error (welcome email is fire-and-forget on backend)
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/buyer/onboarding")
      })

      // No error should be shown
      const errorEls = screen.queryAllByText(/error|failed|something went wrong/i)
      expect(errorEls.length).toBe(0)
    })
  })
})
