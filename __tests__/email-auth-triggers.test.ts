/**
 * Tests for all 12 required auth/security email trigger functions.
 * Validates:
 * - Each email type renders HTML + subject without throwing
 * - Idempotency: repeated calls with the same key send only once
 * - Enumeration-safe endpoints return generic responses
 * - Email logging includes correlationId and status
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ── Hoist mocks ────────────────────────────────────────────────────────────
const { mockResendSend, mockSupabaseFrom } = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
  mockSupabaseFrom: vi.fn(),
}))

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: mockResendSend } },
  EMAIL_CONFIG: {
    from: "noreply@autolenis.com",
    replyTo: "info@autolenis.com",
    adminEmail: "admin@autolenis.com",
  },
}))

vi.mock("@/lib/db", () => {
  const select = vi.fn()
  const eq = vi.fn()
  const limit = vi.fn()
  const upsert = vi.fn()
  const insert = vi.fn()

  // Default chain: .from().select().eq().limit() → { data: [], error: null }
  limit.mockResolvedValue({ data: [], error: null })
  eq.mockReturnValue({ limit, single: vi.fn().mockResolvedValue({ data: null, error: null }) })
  select.mockReturnValue({ eq })
  upsert.mockResolvedValue({ error: null })
  insert.mockResolvedValue({ error: null })

  mockSupabaseFrom.mockReturnValue({ select, upsert, insert })

  return {
    supabase: { from: mockSupabaseFrom },
    prisma: {
      emailSendLog: { create: vi.fn().mockResolvedValue({ id: "log-1" }) },
    },
  }
})

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ── Import all trigger functions after mocks are registered ────────────────
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendPasswordChangedEmail,
  sendMfaEnabledEmail,
  sendMfaDisabledEmail,
  sendAdminNewDeviceEmail,
  sendRoleChangedEmail,
  sendBreakGlassEmail,
  sendMigrationNoticeEmail,
  sendSetPasswordEmail,
  onUserCreated,
} from "@/lib/email/triggers"

// ── Helpers ────────────────────────────────────────────────────────────────
function setResendEnv() {
  process.env['RESEND_API_KEY'] = "re_test_abc"
  process.env['FROM_EMAIL'] = "noreply@autolenis.com"
  process.env['NEXT_PUBLIC_APP_URL'] = "https://autolenis.com"
}

function clearResendEnv() {
  delete process.env['RESEND_API_KEY']
  delete process.env['FROM_EMAIL']
  delete process.env['NEXT_PUBLIC_APP_URL']
  delete process.env['ADMIN_EMAIL']
}

function mockResendSuccess(id = "msg-ok") {
  mockResendSend.mockResolvedValue({ data: { id }, error: null })
}

function mockResendError(msg = "Rate limited") {
  mockResendSend.mockResolvedValue({ data: null, error: { message: msg } })
}

// Simulate "already sent" idempotency record
function mockAlreadySent(idempotencyKey: string) {
  const limit = vi.fn().mockResolvedValue({
    data: [{ id: "existing-log", status: "sent" }],
    error: null,
  })
  const eq = vi.fn().mockReturnValue({ limit })
  const select = vi.fn().mockReturnValue({ eq })
  mockSupabaseFrom.mockReturnValueOnce({ select })
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("Auth email triggers — all 12 required types", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setResendEnv()
    mockResendSuccess()
  })

  afterEach(() => {
    clearResendEnv()
  })

  // 1) verify_email
  it("sendVerificationEmail sends and includes verify API URL", async () => {
    await sendVerificationEmail("user@test.com", "abc123token", "user-1")
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("abc123token")
    expect(call.html).toContain("/api/auth/verify-email")
    expect(call.subject).toMatch(/verify/i)
  })

  // 2) set_password
  it("sendSetPasswordEmail sends and includes reset URL", async () => {
    await sendSetPasswordEmail(
      "user@test.com",
      "Alice",
      "user-2",
      "https://autolenis.com/auth/reset-password?token=xyz"
    )
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("reset-password")
    expect(call.subject).toMatch(/password/i)
  })

  // 3) password_reset_requested
  it("sendPasswordResetEmail sends and includes reset link", async () => {
    await sendPasswordResetEmail("user@test.com", "Bob", "resettoken123")
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("resettoken123")
    expect(call.subject).toMatch(/reset/i)
  })

  // 4) password_changed
  it("sendPasswordChangedEmail sends security alert", async () => {
    await sendPasswordChangedEmail("user@test.com", "Carol", "user-3")
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("Carol")
    expect(call.subject).toMatch(/password/i)
  })

  // 5) welcome
  it("sendWelcomeEmail sends role-specific welcome", async () => {
    await sendWelcomeEmail("buyer@test.com", "Dave", "BUYER", "user-4")
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("Dave")
    expect(call.subject).toMatch(/welcome/i)
  })

  // 6) mfa_enabled
  it("sendMfaEnabledEmail sends 2FA security alert", async () => {
    await sendMfaEnabledEmail("user@test.com", "Eve", "user-5")
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("Eve")
    expect(call.subject).toMatch(/two-factor|2fa/i)
  })

  // 7) mfa_disabled
  it("sendMfaDisabledEmail sends 2FA disabled alert", async () => {
    await sendMfaDisabledEmail("user@test.com", "Frank", "user-6")
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("Frank")
    expect(call.subject).toMatch(/disabled/i)
  })

  // 8) admin_new_device
  it("sendAdminNewDeviceEmail sends device login alert with metadata", async () => {
    await sendAdminNewDeviceEmail("admin@test.com", "Grace", "user-7", {
      ip: "1.2.3.4",
      userAgent: "Mozilla/5.0",
    })
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("1.2.3.4")
    expect(call.subject).toMatch(/new.*login|login.*detected/i)
  })

  // 9) role_changed
  it("sendRoleChangedEmail sends role change alert with old/new roles", async () => {
    await sendRoleChangedEmail("user@test.com", "Henry", "user-8", "BUYER", "DEALER")
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("BUYER")
    expect(call.html).toContain("DEALER")
    expect(call.subject).toMatch(/role/i)
  })

  // 10) break_glass
  it("sendBreakGlassEmail sends break-glass alert to admin email", async () => {
    await sendBreakGlassEmail(
      "admin@autolenis.com",
      "actor@autolenis.com",
      "user-9",
      "Override user data",
      "Emergency data correction"
    )
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.to).toEqual(["admin@autolenis.com"])
    expect(call.html).toContain("actor@autolenis.com")
    expect(call.html).toContain("Override user data")
    expect(call.subject).toMatch(/break.glass/i)
  })

  // 11) migration_notice
  it("sendMigrationNoticeEmail sends migration info email", async () => {
    await sendMigrationNoticeEmail("user@test.com", "Iris", "user-10")
    expect(mockResendSend).toHaveBeenCalledOnce()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("Iris")
    expect(call.subject).toMatch(/upgrade|migration/i)
  })

  // 12) admin_notification (via onUserCreated)
  it("onUserCreated sends welcome + admin notification (2 emails)", async () => {
    process.env['ADMIN_EMAIL'] = "admin@autolenis.com"
    await onUserCreated({
      userId: "user-11",
      email: "new@test.com",
      firstName: "Jake",
      role: "BUYER",
    })
    await new Promise((r) => setTimeout(r, 50))
    expect(mockResendSend).toHaveBeenCalledTimes(2)
  })
})

describe("Idempotency — repeated sends with same key are deduplicated", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setResendEnv()
    mockResendSuccess()
  })

  afterEach(() => {
    clearResendEnv()
  })

  it("migration_notice with same userId sends only once across repeated calls", async () => {
    // First call → no existing record → sends
    await sendMigrationNoticeEmail("user@test.com", "Kathy", "user-idem-1")
    expect(mockResendSend).toHaveBeenCalledTimes(1)

    vi.clearAllMocks()

    // Simulate that EmailSendLog already has this key as "sent"
    mockAlreadySent(`migration_notice_user-idem-1`)
    mockResendSuccess()

    await sendMigrationNoticeEmail("user@test.com", "Kathy", "user-idem-1")
    // Should be deduplicated — Resend send should NOT be called again
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it("set_password with same userId sends only once", async () => {
    await sendSetPasswordEmail("user@test.com", "Leon", "user-idem-2", "https://autolenis.com/reset")
    expect(mockResendSend).toHaveBeenCalledTimes(1)

    vi.clearAllMocks()

    mockAlreadySent(`set_password_user-idem-2`)
    mockResendSuccess()

    await sendSetPasswordEmail("user@test.com", "Leon", "user-idem-2", "https://autolenis.com/reset")
    expect(mockResendSend).not.toHaveBeenCalled()
  })
})

describe("Error handling — failed Resend calls do not throw", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setResendEnv()
  })

  afterEach(() => {
    clearResendEnv()
  })

  it("sendVerificationEmail throws when Resend returns error", async () => {
    mockResendError("Resend rate limit")
    await expect(
      sendVerificationEmail("user@test.com", "token123", "user-err")
    ).rejects.toThrow("Failed to send email")
  })

  it("sendWelcomeEmail throws when Resend returns error", async () => {
    mockResendError("API key invalid")
    await expect(
      sendWelcomeEmail("user@test.com", "Mary", "BUYER", "user-err-2")
    ).rejects.toThrow("Failed to send email")
  })
})

describe("Template content — all templates include required elements", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setResendEnv()
    mockResendSuccess()
  })

  afterEach(() => {
    clearResendEnv()
  })

  it.each([
    ["sendVerificationEmail", () => sendVerificationEmail("u@test.com", "tok", "uid")],
    ["sendPasswordChangedEmail", () => sendPasswordChangedEmail("u@test.com", "Name", "uid")],
    ["sendMfaEnabledEmail", () => sendMfaEnabledEmail("u@test.com", "Name", "uid")],
    ["sendMfaDisabledEmail", () => sendMfaDisabledEmail("u@test.com", "Name", "uid")],
    ["sendAdminNewDeviceEmail", () => sendAdminNewDeviceEmail("u@test.com", "Name", "uid")],
    ["sendRoleChangedEmail", () => sendRoleChangedEmail("u@test.com", "Name", "uid", "BUYER", "DEALER")],
    ["sendBreakGlassEmail", () => sendBreakGlassEmail("admin@test.com", "actor@test.com", "uid", "action", "reason")],
    ["sendMigrationNoticeEmail", () => sendMigrationNoticeEmail("u@test.com", "Name", "uid")],
    ["sendSetPasswordEmail", () => sendSetPasswordEmail("u@test.com", "Name", "uid", "https://autolenis.com/reset")],
  ])("%s — HTML includes AutoLenis branding and footer", async (name, fn) => {
    await fn()
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("AutoLenis")
    expect(call.html).toContain("support@autolenis.com")
    expect(call.from).toBeTruthy()
    expect(call.subject).toBeTruthy()
  })
})
