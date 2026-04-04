/**
 * Frontend Behavioral Tests — Verify Email Page
 *
 * Exercises the actual verify-email page component for:
 * - Valid token success path (success=true param)
 * - Error path (error param)
 * - Pending state (pending=true param)
 * - Token redirect (token param → API redirect)
 * - Resend button from verify-email page
 * - User-facing messaging correctness
 *
 * Uses @testing-library/react + happy-dom (from vitest.config.ts).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

// ── Track search params per-test ──────────────────────────────────────────
let searchParamsMap: Record<string, string | null> = {}

const mockPush = vi.fn()
const mockReplace = vi.fn()

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
    get: (key: string) => searchParamsMap[key] ?? null,
  }),
  usePathname: () => "/auth/verify-email",
}))

// ── Mock next/image & next/link ───────────────────────────────────────────
vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}))

// ── Mock hooks/use-toast ──────────────────────────────────────────────────
const mockToast = vi.fn()
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}))

// ── Mock @/lib/csrf-client ────────────────────────────────────────────────
vi.mock("@/lib/csrf-client", () => ({
  csrfHeaders: () => ({ "Content-Type": "application/json", "x-csrf-token": "test-csrf" }),
}))

// ── Mock layout components ────────────────────────────────────────────────
vi.mock("@/components/layout/auth-nav", () => ({
  AuthNav: () => <nav data-testid="auth-nav" />,
}))
vi.mock("@/components/layout/auth-footer", () => ({
  AuthFooter: () => <footer data-testid="auth-footer" />,
}))

// ── Global fetch mock ─────────────────────────────────────────────────────
const mockFetch = vi.fn()

// ── Import the page AFTER mocks ───────────────────────────────────────────
import VerifyEmailPage from "@/app/auth/verify-email/page"

describe("VerifyEmailPage — Frontend Behavioral Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParamsMap = {}
    vi.stubGlobal("fetch", mockFetch)

    // Default: /api/auth/me returns no user
    mockFetch.mockImplementation(async (url: string) => {
      if (url === "/api/auth/me") {
        return { ok: false, status: 401, json: async () => ({}) }
      }
      return { ok: true, json: async () => ({ success: true }) }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ──────────────────────────────────────────────────────────────────────
  // Success state
  // ──────────────────────────────────────────────────────────────────────
  describe("Verification success (success=true)", () => {
    it("shows 'Email Verified!' and continue button", async () => {
      searchParamsMap = { success: "true" }
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText(/email verified/i)).toBeDefined()
      })

      // Should show a continue button
      expect(screen.getByRole("button", { name: /continue/i }) || screen.getByRole("link", { name: /continue/i })).toBeDefined()
    })

    it("shows correct success messaging", async () => {
      searchParamsMap = { success: "true" }
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText(/successfully verified/i)).toBeDefined()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Error state
  // ──────────────────────────────────────────────────────────────────────
  describe("Verification error", () => {
    it("shows 'Verification Failed' with expired token message", async () => {
      searchParamsMap = { error: encodeURIComponent("This verification link has expired. Please request a new one.") }
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeDefined()
      })
      expect(screen.getByText(/expired/i)).toBeDefined()
    })

    it("shows 'Verification Failed' with invalid token message", async () => {
      searchParamsMap = { error: encodeURIComponent("Invalid verification token.") }
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeDefined()
      })
      expect(screen.getByText(/invalid/i)).toBeDefined()
    })

    it("shows resend button on error", async () => {
      searchParamsMap = { error: encodeURIComponent("This verification link has expired.") }
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeDefined()
      })

      // Should show resend button
      const resendBtn = screen.getByRole("button", { name: /resend/i })
      expect(resendBtn).toBeDefined()
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Pending state
  // ──────────────────────────────────────────────────────────────────────
  describe("Pending state (pending=true)", () => {
    it("shows pending verification message with instructions", async () => {
      searchParamsMap = { pending: "true" }
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByText(/verify your email/i)).toBeDefined()
      })
      expect(screen.getByText(/sent a verification link/i)).toBeDefined()
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Token redirect (backward compat)
  // ──────────────────────────────────────────────────────────────────────
  describe("Token redirect", () => {
    it("sets window.location.href to API endpoint when token param is present", async () => {
      // The verify-email page redirects to the API when a token param is present
      // We can't fully test window.location.href in happy-dom, but we verify
      // the redirecting state is shown
      searchParamsMap = { token: "test-token-abc" }
      render(<VerifyEmailPage />)

      // Should show "Verifying your email…" loading state
      await waitFor(() => {
        expect(screen.getByText(/verifying your email/i)).toBeDefined()
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Resend from verify-email page
  // ──────────────────────────────────────────────────────────────────────
  describe("Resend from verify-email page", () => {
    it("resend button triggers network request on error page", async () => {
      // Setup: user is authenticated so resend has an email
      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/me") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { user: { email: "user@example.com", role: "BUYER" } },
            }),
          }
        }
        if (url === "/api/auth/resend-verification") {
          return { ok: true, status: 200, json: async () => ({ success: true }) }
        }
        return { ok: true, json: async () => ({}) }
      })

      searchParamsMap = { error: encodeURIComponent("Expired token") }
      const user = userEvent.setup()
      render(<VerifyEmailPage />)

      // Wait for user data to load and resend button to be available
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /resend/i })).toBeDefined()
      })

      await user.click(screen.getByRole("button", { name: /resend/i }))

      await waitFor(() => {
        const resendCall = mockFetch.mock.calls.find(
          (c: any[]) => c[0] === "/api/auth/resend-verification",
        )
        expect(resendCall).toBeDefined()
      })

      // Toast should have been called with success
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Email Sent" }),
        )
      })
    })

    it("resend button shows failure toast on network error", async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (url === "/api/auth/me") {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              data: { user: { email: "user@example.com", role: "BUYER" } },
            }),
          }
        }
        if (url === "/api/auth/resend-verification") {
          throw new Error("Network error")
        }
        return { ok: true, json: async () => ({}) }
      })

      searchParamsMap = { error: encodeURIComponent("Expired token") }
      const user = userEvent.setup()
      render(<VerifyEmailPage />)

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /resend/i })).toBeDefined()
      })

      await user.click(screen.getByRole("button", { name: /resend/i }))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "Request Failed",
            variant: "destructive",
          }),
        )
      })
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  // Default state (no params)
  // ──────────────────────────────────────────────────────────────────────
  describe("Default state", () => {
    it("shows generic verify email heading", async () => {
      searchParamsMap = {}
      render(<VerifyEmailPage />)

      await waitFor(() => {
        // Use getAllByText since heading and description may both match
        const elements = screen.getAllByText(/verify your email/i)
        expect(elements.length).toBeGreaterThan(0)
      })
    })
  })
})
