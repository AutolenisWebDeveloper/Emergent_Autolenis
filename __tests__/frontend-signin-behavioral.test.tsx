/**
 * Frontend Behavioral Tests — SignInForm Component
 *
 * Exercises the actual SignInForm component entry point for:
 * - Unverified login UX: truthful messaging, no false claims
 * - Resend verification button: triggers real fetch, disables in flight,
 *   shows success/failure truthfully, cooldown behavior
 * - Loading states: spinner, disabled button
 * - Network failure: surfaced truthfully
 *
 * Uses @testing-library/react + happy-dom (from vitest.config.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ── Mock next/navigation ──────────────────────────────────────────────────
const mockReplace = vi.fn()
const mockPush = vi.fn()
const mockSearchParamsGet = vi.fn().mockReturnValue(null)

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockSearchParamsGet,
  }),
  usePathname: () => "/auth/signin",
}))

// ── Global fetch mock ─────────────────────────────────────────────────────
const mockFetch = vi.fn()

// ── Import the component AFTER mocks ──────────────────────────────────────
import { SignInForm } from "@/components/auth/sign-in-form"

// ── Helpers ───────────────────────────────────────────────────────────────
function mockSigninSuccess(role: string = "BUYER") {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      success: true,
      data: {
        user: { id: "u1", email: "user@example.com", role },
        redirect: null,
      },
    }),
    text: async () => "",
  }
}

function mockUnverifiedResponse(verificationEmailSent: boolean = true) {
  return {
    ok: false,
    status: 403,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      success: false,
      error: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email address before signing in.",
      requiresEmailVerification: true,
      verificationEmailSent,
    }),
    text: async () => "",
  }
}

function mockInvalidCredentials() {
  return {
    ok: false,
    status: 401,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      success: false,
      error: "Invalid email or password",
    }),
    text: async () => "",
  }
}

// ========================================================================
// Tests
// ========================================================================

describe("SignInForm — Frontend Behavioral Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReplace.mockClear()
    mockPush.mockClear()
    mockSearchParamsGet.mockReturnValue(null)
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ──────────────────────────────────────────────────────────────────────
  // Renders correctly
  // ──────────────────────────────────────────────────────────────────────
  it("renders the sign-in form with email, password, and submit button", () => {
    render(<SignInForm />)
    expect(screen.getByLabelText(/email/i)).toBeDefined()
    expect(screen.getByLabelText(/password/i)).toBeDefined()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeDefined()
  })

  // ──────────────────────────────────────────────────────────────────────
  // Successful Sign-in
  // ──────────────────────────────────────────────────────────────────────
  describe("Successful sign-in", () => {
    it("redirects buyer to dashboard on success", async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(mockSigninSuccess("BUYER"))

      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "user@example.com")
      await user.type(screen.getByLabelText(/password/i), "password123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/buyer/dashboard")
      })
    })

    it("shows loading spinner during sign-in", async () => {
      const user = userEvent.setup()

      let resolveSignin: Function
      mockFetch.mockImplementation(() => new Promise((r) => { resolveSignin = () => r(mockSigninSuccess()) }))

      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "user@example.com")
      await user.type(screen.getByLabelText(/password/i), "password123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/signing in/i)).toBeDefined()
      })

      await act(async () => { resolveSignin!() })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Unverified Login UX
  // ──────────────────────────────────────────────────────────────────────
  describe("Unverified user login", () => {
    it("shows email verification required message and resend button", async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(mockUnverifiedResponse(true))

      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "unverified@example.com")
      await user.type(screen.getByLabelText(/password/i), "password123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        // Should show verification-related messaging
        expect(screen.getByText(/verify your email/i)).toBeDefined()
      })

      // Should show the resend button
      await waitFor(() => {
        const resendBtn = screen.getByRole("button", { name: /resend/i })
        expect(resendBtn).toBeDefined()
      })
    })

    it("shows verification email sent message when backend reports it", async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(mockUnverifiedResponse(true))

      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "unverified@example.com")
      await user.type(screen.getByLabelText(/password/i), "password123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        // Should show verification link was sent
        expect(screen.getByText(/verification link was sent/i)).toBeDefined()
      })
    })

    it("does NOT falsely claim email was sent when backend says it wasn't", async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(mockUnverifiedResponse(false))

      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "unverified@example.com")
      await user.type(screen.getByLabelText(/password/i), "password123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        // Should still show verify email message
        expect(screen.getByText(/verify your email/i)).toBeDefined()
      })

      // Should NOT claim a verification email was sent
      const sentMessages = screen.queryAllByText(/verification link was sent/i)
      expect(sentMessages.length).toBe(0)
    })

    it("does NOT redirect when user is unverified", async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(mockUnverifiedResponse(true))

      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "unverified@example.com")
      await user.type(screen.getByLabelText(/password/i), "password123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeDefined()
      })

      expect(mockReplace).not.toHaveBeenCalled()
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Resend Verification UX
  // ──────────────────────────────────────────────────────────────────────
  describe("Resend verification flow", () => {
    async function setupUnverifiedState(user: ReturnType<typeof userEvent.setup>) {
      mockFetch.mockResolvedValueOnce(mockUnverifiedResponse(true))
      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "unverified@example.com")
      await user.type(screen.getByLabelText(/password/i), "password123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /resend/i })).toBeDefined()
      })
    }

    it("clicking resend triggers a real network request to /api/auth/resend-verification", async () => {
      const user = userEvent.setup()
      await setupUnverifiedState(user)

      // Now mock the resend call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true }),
        text: async () => "",
      })

      const resendBtn = screen.getByRole("button", { name: /resend/i })
      await user.click(resendBtn)

      await waitFor(() => {
        const resendCall = mockFetch.mock.calls.find(
          (c: any[]) => c[0] === "/api/auth/resend-verification",
        )
        expect(resendCall).toBeDefined()
        expect(resendCall![1].method).toBe("POST")
      })
    })

    it("resend button disables while request is in flight", async () => {
      const user = userEvent.setup()
      await setupUnverifiedState(user)

      let resolveResend: Function
      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/auth/resend-verification") {
          return new Promise((r) => {
            resolveResend = () =>
              r({
                ok: true,
                status: 200,
                headers: new Headers({ "content-type": "application/json" }),
                json: async () => ({ success: true }),
              })
          })
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })

      const resendBtn = screen.getByRole("button", { name: /resend/i })
      await user.click(resendBtn)

      // Button should be disabled or show loading
      await waitFor(() => {
        const btns = screen.getAllByRole("button").filter(
          (b) => b.textContent?.includes("Sending") || b.getAttribute("disabled") !== null,
        )
        expect(btns.length).toBeGreaterThan(0)
      })

      await act(async () => { resolveResend!() })
    })

    it("shows success message after resend succeeds", async () => {
      const user = userEvent.setup()
      await setupUnverifiedState(user)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const resendBtn = screen.getByRole("button", { name: /resend/i })
      await user.click(resendBtn)

      await waitFor(() => {
        expect(screen.getByText(/sent a new verification/i)).toBeDefined()
      })
    })

    it("shows failure message when resend network request fails", async () => {
      const user = userEvent.setup()
      await setupUnverifiedState(user)

      mockFetch.mockImplementation((url: string) => {
        if (url === "/api/auth/resend-verification") {
          return Promise.reject(new Error("Network error"))
        }
        return Promise.resolve({ ok: true, json: async () => ({}) })
      })

      const resendBtn = screen.getByRole("button", { name: /resend/i })
      await user.click(resendBtn)

      await waitFor(() => {
        expect(screen.getByText(/unable to send/i)).toBeDefined()
      })
    })

    it("shows cooldown timer after successful resend", async () => {
      const user = userEvent.setup()
      await setupUnverifiedState(user)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true }),
      })

      const resendBtn = screen.getByRole("button", { name: /resend/i })
      await user.click(resendBtn)

      await waitFor(() => {
        // Should show cooldown text like "Resend in 60s"
        expect(screen.getByText(/resend in \d+s/i)).toBeDefined()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Invalid Credentials
  // ──────────────────────────────────────────────────────────────────────
  describe("Invalid credentials", () => {
    it("shows truthful error for wrong password", async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValue(mockInvalidCredentials())

      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "user@example.com")
      await user.type(screen.getByLabelText(/password/i), "wrong")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeDefined()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Network Failure
  // ──────────────────────────────────────────────────────────────────────
  describe("Network failure", () => {
    it("shows truthful network error", async () => {
      const user = userEvent.setup()
      mockFetch.mockRejectedValue(new TypeError("Failed to fetch"))

      render(<SignInForm />)
      await user.type(screen.getByLabelText(/email/i), "user@example.com")
      await user.type(screen.getByLabelText(/password/i), "password123")
      await user.click(screen.getByRole("button", { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/unable to connect|check your internet/i)).toBeDefined()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Client validation
  // ──────────────────────────────────────────────────────────────────────
  describe("Client validation", () => {
    it("prevents submission when fields are empty (native validation)", async () => {
      const user = userEvent.setup()
      render(<SignInForm />)

      await user.click(screen.getByRole("button", { name: /sign in/i }))

      // Give it a moment
      await new Promise((r) => setTimeout(r, 100))

      // Should NOT have called the signin API since native validation blocks
      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})
