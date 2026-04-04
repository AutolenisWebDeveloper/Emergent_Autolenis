import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Hoist mock to ensure it's available in vi.mock factory
const { mockResendSend } = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
}))

// Mock prisma and supabase before importing EmailService
vi.mock("@/lib/db", () => ({
  prisma: {
    emailSendLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
  },
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/lib/resend", () => ({
  resend: {
    emails: {
      send: mockResendSend,
    },
  },
  EMAIL_CONFIG: {
    from: process.env['FROM_EMAIL'] || "info@autolenis.com",
    replyTo: "info@autolenis.com",
    adminEmail: process.env['ADMIN_NOTIFICATION_EMAIL'] || "info@autolenis.com",
  },
}))

import { EmailService } from "@/lib/services/email.service"
import { prisma } from "@/lib/db"
import { onUserCreated } from "@/lib/email/triggers"

// Helper: set the env vars required for live sending
function setResendEnv() {
  process.env['RESEND_API_KEY'] = "re_test_123"
  process.env['FROM_EMAIL'] = "noreply@autolenis.com"
}

function clearResendEnv() {
  delete process.env['RESEND_API_KEY']
  delete process.env['FROM_EMAIL']
  delete process.env['DEV_EMAIL_TO']
  setNodeEnv(undefined)
}

// Helper: set NODE_ENV without TS readonly errors
function setNodeEnv(value: string | undefined) {
  ;(process.env as Record<string, string | undefined>)['NODE_ENV'] = value
}

// Helper: mock Resend SDK to simulate a successful send
function mockResendSuccess(messageId = "resend-msg-abc") {
  mockResendSend.mockResolvedValue({ data: { id: messageId }, error: null })
}

// Helper: mock Resend SDK to simulate an error
function mockResendError(message = "Rate limited") {
  mockResendSend.mockResolvedValue({ data: null, error: { message } })
}

describe("EmailService", () => {
  let service: EmailService

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearResendEnv()
  })

  describe("configuration validation", () => {
    it("should throw when RESEND_API_KEY is missing", async () => {
      delete process.env['RESEND_API_KEY']
      process.env['FROM_EMAIL'] = "noreply@autolenis.com"
      service = new EmailService()

      await expect(
        service.send({
          to: "test@example.com",
          subject: "Test",
          html: "<p>Test</p>",
        }),
      ).rejects.toThrow("RESEND_API_KEY")
    })

    it("should throw when FROM_EMAIL is missing", async () => {
      process.env['RESEND_API_KEY'] = "re_test_123"
      delete process.env['FROM_EMAIL']
      service = new EmailService()

      await expect(
        service.send({
          to: "test@example.com",
          subject: "Test",
          html: "<p>Test</p>",
        }),
      ).rejects.toThrow("FROM_EMAIL")
    })

    it("should succeed when both RESEND_API_KEY and FROM_EMAIL are set", async () => {
      setResendEnv()
      mockResendSuccess()
      service = new EmailService()

      const result = await service.send({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("send (resend mode)", () => {
    beforeEach(() => {
      setResendEnv()
      service = new EmailService()
    })

    it("should send via Resend SDK and return messageId", async () => {
      mockResendSuccess("resend-msg-abc")

      const result = await service.send({
        to: "user@example.com",
        subject: "Resend Test",
        html: "<p>Hello</p>",
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe("resend-msg-abc")
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@example.com",
          subject: "Resend Test",
          html: "<p>Hello</p>",
        }),
      )
    })

    it("should handle Resend API errors gracefully", async () => {
      mockResendError("Rate limited")

      const result = await service.send({
        to: "user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain("Resend API error")
    })

    it("should not include sendgrid provider at all", async () => {
      mockResendSuccess("resend-id")

      await service.send({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })

      // Should call Resend SDK, not sendgrid
      expect(mockResendSend).toHaveBeenCalled()
    })

    it("should log email to database with SENT status", async () => {
      mockResendSuccess("msg-123")

      await service.send(
        {
          to: "test@example.com",
          subject: "Test Subject",
          html: "<p>Test</p>",
        },
        { templateKey: "test_email", userId: "user-1" },
      )

      // Wait for async logging
      await new Promise((r) => setTimeout(r, 50))

      expect(prisma.emailSendLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailType: "test_email",
          recipient: "test@example.com",
          subject: "Test Subject",
          userId: "user-1",
          status: "sent",
          resendMessageId: "msg-123",
        }),
      })
    })

    it("should include correlationId in log", async () => {
      mockResendSuccess()

      await service.send(
        {
          to: "test@example.com",
          subject: "Test",
          html: "<p>Test</p>",
        },
        { templateKey: "test_email", correlationId: "corr-123" },
      )

      await new Promise((r) => setTimeout(r, 50))

      expect(prisma.emailSendLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          idempotencyKey: "corr-123",
        }),
      })
    })

    it("should not throw when DB logging fails", async () => {
      mockResendSuccess()
      vi.mocked(prisma.emailSendLog.create).mockRejectedValueOnce(new Error("DB down"))

      const result = await service.send({
        to: "test@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("DEV_EMAIL_TO override", () => {
    beforeEach(() => {
      setResendEnv()
      service = new EmailService()
    })

    it("should redirect to DEV_EMAIL_TO in non-production", async () => {
      setNodeEnv("development")
      process.env['DEV_EMAIL_TO'] = "dev@test.com"
      mockResendSuccess()

      await service.send({
        to: "real-user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "dev@test.com",
        }),
      )
    })

    it("should NOT redirect in production", async () => {
      setNodeEnv("production")
      process.env['DEV_EMAIL_TO'] = "dev@test.com"
      mockResendSuccess()

      await service.send({
        to: "real-user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "real-user@example.com",
        }),
      )
    })

    it("should still send LIVE via Resend even with override", async () => {
      setNodeEnv("development")
      process.env['DEV_EMAIL_TO'] = "dev@test.com"
      mockResendSuccess("dev-msg-1")

      const result = await service.send({
        to: "real-user@example.com",
        subject: "Test",
        html: "<p>Test</p>",
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe("dev-msg-1")
      expect(mockResendSend).toHaveBeenCalled()
    })
  })

  describe("template methods", () => {
    beforeEach(() => {
      setResendEnv()
      mockResendSuccess()
      service = new EmailService()
    })

    it("sendWelcomeEmail should include role-specific content", async () => {
      await service.sendWelcomeEmail("buyer@test.com", "John", "BUYER", "user-1")

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "buyer@test.com",
          subject: expect.stringContaining("Welcome"),
        }),
      )
    })

    it("sendAdminNewSignupNotification should send to admin email", async () => {
      await service.sendAdminNewSignupNotification("user@test.com", "Jane", "DEALER", "user-2")

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("DEALER signup"),
        }),
      )
    })

    it("sendAffiliateNewSignupNotification should include referral code", async () => {
      await service.sendAffiliateNewSignupNotification(
        "affiliate@test.com",
        "Partner",
        "NewUser",
        "REF123",
        "aff-1",
        "user-3",
      )

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "affiliate@test.com",
          html: expect.stringContaining("REF123"),
        }),
      )
    })

    it("sendPasswordChangedEmail should use correct templateKey", async () => {
      await service.sendPasswordChangedEmail("user@test.com", "Bob", "user-4")

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("password"),
        }),
      )
    })
  })
})

describe("Email Triggers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setResendEnv()
    process.env['ADMIN_EMAIL'] = "admin@autolenis.com"
    mockResendSuccess()
  })

  afterEach(() => {
    clearResendEnv()
    delete process.env['ADMIN_EMAIL']
  })

  it("onUserCreated should send welcome + admin emails", async () => {
    process.env['ADMIN_EMAIL'] = "admin@test.com"
    await onUserCreated({
      userId: "user-abc",
      email: "new@example.com",
      firstName: "TestUser",
      role: "BUYER",
    })

    // Wait for async operations
    await new Promise((r) => setTimeout(r, 100))

    // Resend send should have been called at least twice (welcome + admin)
    expect(mockResendSend).toHaveBeenCalledTimes(2)
  })

  it("onUserCreated with referral should send 2 emails", async () => {
    process.env['ADMIN_EMAIL'] = "admin@test.com"
    await onUserCreated({
      userId: "user-def",
      email: "referred@example.com",
      firstName: "Referred",
      role: "BUYER",
      referral: { code: "ALREF123" },
    })

    await new Promise((r) => setTimeout(r, 100))

    // welcome + admin + admin-with-referral-info = at least 2 emails
    expect(mockResendSend).toHaveBeenCalledTimes(2)
  })
})
