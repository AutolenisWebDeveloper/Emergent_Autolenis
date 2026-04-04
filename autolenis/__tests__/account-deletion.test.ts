import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Hoist mock to ensure it's available in vi.mock factory
const { mockResendSend } = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
}))

// Mock prisma and supabase before importing EmailService
vi.mock("@/lib/db", () => ({
  prisma: {
    emailLog: {
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

// Helper: set the env vars required for live sending
function setResendEnv() {
  process.env['RESEND_API_KEY'] = "re_test_123"
  process.env['FROM_EMAIL'] = "noreply@autolenis.com"
}

function clearResendEnv() {
  delete process.env['RESEND_API_KEY']
  delete process.env['FROM_EMAIL']
  delete process.env['DEV_EMAIL_TO']
}

// Helper: mock Resend SDK to simulate a successful send
function mockResendSuccess(messageId = "resend-msg-abc") {
  mockResendSend.mockResolvedValue({ data: { id: messageId }, error: null })
}

describe("Account Deletion", () => {
  let service: EmailService

  beforeEach(() => {
    vi.clearAllMocks()
    setResendEnv()
    mockResendSuccess()
    service = new EmailService()
  })

  afterEach(() => {
    clearResendEnv()
  })

  describe("sendAccountDeletionConfirmationEmail", () => {
    it("should send email with correct subject", async () => {
      await service.sendAccountDeletionConfirmationEmail("user@test.com", "John")

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "user@test.com",
          subject: "Your AutoLenis Account Has Been Deleted",
        }),
      )
    })

    it("should include user first name in the email body", async () => {
      await service.sendAccountDeletionConfirmationEmail("user@test.com", "Jane")

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("Jane"),
        }),
      )
    })

    it("should include irreversibility warning in the email body", async () => {
      await service.sendAccountDeletionConfirmationEmail("user@test.com", "Alice")

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("irreversible"),
        }),
      )
    })

    it("should include support contact info in the email body", async () => {
      await service.sendAccountDeletionConfirmationEmail("user@test.com", "Bob")

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("info@autolenis.com"),
        }),
      )
    })

    it("should pass userId in the context for logging", async () => {
      const result = await service.sendAccountDeletionConfirmationEmail(
        "user@test.com",
        "Charlie",
        "user-123",
      )

      expect(result.success).toBe(true)
    })

    it("should return success when email is sent successfully", async () => {
      mockResendSuccess("deletion-msg-1")

      const result = await service.sendAccountDeletionConfirmationEmail(
        "user@test.com",
        "Dave",
      )

      expect(result.success).toBe(true)
      expect(result.messageId).toBe("deletion-msg-1")
    })
  })
})
