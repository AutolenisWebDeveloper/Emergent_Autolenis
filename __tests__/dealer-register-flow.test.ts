import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Hoist mock factories
const { mockResendSend } = vi.hoisted(() => ({
  mockResendSend: vi.fn(),
}))

// Mock prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    emailLog: {
      create: vi.fn().mockResolvedValue({ id: "log-1" }),
    },
    dealer: {
      update: vi.fn().mockResolvedValue({}),
    },
    $executeRaw: vi.fn().mockResolvedValue(1),
    $queryRaw: vi.fn().mockResolvedValue([]),
  },
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
  getSupabase: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "dealer-1", businessName: "Test Dealer" },
        error: null,
      }),
    }),
  }),
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
    from: "noreply@autolenis.com",
    replyTo: "support@autolenis.com",
    adminEmail: "admin@autolenis.com",
  },
}))

import { EmailService } from "@/lib/services/email.service"

function setResendEnv() {
  process.env['RESEND_API_KEY'] = "re_test_123"
  process.env['FROM_EMAIL'] = "noreply@autolenis.com"
}

function clearResendEnv() {
  delete process.env['RESEND_API_KEY']
  delete process.env['FROM_EMAIL']
  delete process.env['DEV_EMAIL_TO']
}

function mockResendSuccess(messageId = "msg-123") {
  mockResendSend.mockResolvedValue({ data: { id: messageId }, error: null })
}

describe("Dealer Application Email Methods", () => {
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

  describe("sendDealerApplicationSubmittedNotification", () => {
    it("should send admin notification with escaped HTML", async () => {
      const result = await service.sendDealerApplicationSubmittedNotification(
        "Test <script>Dealer</script>",
        "dealer@test.com",
        "user-1",
      )

      expect(result.success).toBe(true)
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("Test &lt;script&gt;Dealer&lt;/script&gt;"),
          html: expect.stringContaining("Test &lt;script&gt;Dealer&lt;/script&gt;"),
        }),
      )
    })

    it("should send to admin email address", async () => {
      await service.sendDealerApplicationSubmittedNotification(
        "ABC Motors",
        "abc@motors.com",
        "user-2",
      )

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "admin@autolenis.com",
        }),
      )
    })

    it("should include link to admin applications page", async () => {
      await service.sendDealerApplicationSubmittedNotification(
        "XYZ Dealer",
        "xyz@dealer.com",
      )

      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining("/admin/dealers/applications"),
        }),
      )
    })
  })

  describe("sendDealerApplicationFormToInfo", () => {
    const sampleData = {
      dealershipName: "Test Motors",
      businessType: "New & Used",
      licenseNumber: "DL-12345",
      yearsInBusiness: "10",
      contactName: "John Doe",
      contactTitle: "Owner",
      email: "john@testmotors.com",
      phone: "555-1234",
      address: "123 Main St",
      city: "Springfield",
      state: "IL",
      zipCode: "62701",
      averageInventory: "50-100",
      monthlyVolume: "20-30",
      website: "https://testmotors.com",
      additionalInfo: "We specialize in luxury vehicles.",
    }

    it("should send full application details to info@autolenis.com", async () => {
      const result = await service.sendDealerApplicationFormToInfo(sampleData, "user-1")

      expect(result.success).toBe(true)
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "info@autolenis.com",
          subject: expect.stringContaining("Test Motors"),
        }),
      )
    })

    it("should include all application fields in email body", async () => {
      await service.sendDealerApplicationFormToInfo(sampleData)

      const sentHtml = mockResendSend.mock.calls[0][0].html

      expect(sentHtml).toContain("Test Motors")
      expect(sentHtml).toContain("New &amp; Used")
      expect(sentHtml).toContain("DL-12345")
      expect(sentHtml).toContain("John Doe")
      expect(sentHtml).toContain("555-1234")
      expect(sentHtml).toContain("123 Main St")
      expect(sentHtml).toContain("Springfield")
      expect(sentHtml).toContain("IL")
      expect(sentHtml).toContain("62701")
      expect(sentHtml).toContain("50-100")
      expect(sentHtml).toContain("20-30")
    })

    it("should escape HTML in user-provided fields", async () => {
      const maliciousData = {
        ...sampleData,
        dealershipName: '<script>alert("xss")</script>',
        contactName: '<img src=x onerror="alert(1)">',
      }

      await service.sendDealerApplicationFormToInfo(maliciousData)

      const sentHtml = mockResendSend.mock.calls[0][0].html
      // Dangerous HTML tags must be escaped so browsers render them as text
      expect(sentHtml).not.toContain("<script>")
      expect(sentHtml).not.toContain("<img ")
      expect(sentHtml).toContain("&lt;script&gt;")
      expect(sentHtml).toContain("&lt;img ")
    })

    it("should handle optional fields gracefully", async () => {
      const minimalData = { ...sampleData, website: undefined, additionalInfo: undefined }

      const result = await service.sendDealerApplicationFormToInfo(minimalData)

      expect(result.success).toBe(true)
      const sentHtml = mockResendSend.mock.calls[0][0].html
      expect(sentHtml).not.toContain("Website:")
      expect(sentHtml).not.toContain("Additional Info:")
    })
  })

  describe("sendDealerApplicationConfirmation", () => {
    it("should send confirmation email to dealer applicant", async () => {
      const result = await service.sendDealerApplicationConfirmation(
        "dealer@example.com",
        "Best Cars Inc",
        "Jane Smith",
        "user-5",
      )

      expect(result.success).toBe(true)
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "dealer@example.com",
          subject: expect.stringContaining("Dealer Application"),
        }),
      )
    })

    it("should include business name and contact name in email", async () => {
      await service.sendDealerApplicationConfirmation(
        "dealer@example.com",
        "Best Cars Inc",
        "Jane Smith",
      )

      const sentHtml = mockResendSend.mock.calls[0][0].html
      expect(sentHtml).toContain("Jane Smith")
      expect(sentHtml).toContain("Best Cars Inc")
    })

    it("should escape HTML in contact name and business name", async () => {
      await service.sendDealerApplicationConfirmation(
        "dealer@example.com",
        '<script>alert("xss")</script>',
        '<img src=x onerror="alert(1)">',
      )

      const sentHtml = mockResendSend.mock.calls[0][0].html
      expect(sentHtml).not.toContain("<script>")
      expect(sentHtml).not.toContain("<img ")
      expect(sentHtml).toContain("&lt;script&gt;")
      expect(sentHtml).toContain("&lt;img ")
    })

    it("should include info@autolenis.com for questions", async () => {
      await service.sendDealerApplicationConfirmation(
        "dealer@example.com",
        "Test LLC",
        "Bob",
      )

      const sentHtml = mockResendSend.mock.calls[0][0].html
      expect(sentHtml).toContain("info@autolenis.com")
    })
  })
})
