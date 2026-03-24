import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock dependencies before importing
vi.mock("@/lib/db", () => ({
  prisma: {
    vehicleRequestCase: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    caseEventLog: { create: vi.fn() },
    emailLog: { create: vi.fn() },
    buyerProfile: { findFirst: vi.fn() },
  },
}))

vi.mock("@/lib/resend", () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: "msg_test" }, error: null }),
    },
  },
  EMAIL_CONFIG: {
    from: "noreply@autolenis.com",
    replyTo: "support@autolenis.com",
    adminEmail: "admin@autolenis.com",
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock("@/lib/email/triggers", () => ({
  sendEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendContactNotification: vi.fn(),
}))

import { EmailService } from "@/lib/services/email.service"
import { resend } from "@/lib/resend"

beforeEach(() => {
  vi.clearAllMocks()
  // Set required env vars for email service
  process.env['RESEND_API_KEY'] = "re_test_key"
  process.env['FROM_EMAIL'] = "noreply@autolenis.com"
})

describe("Vehicle Request Email Methods", () => {
  const emailService = new EmailService()

  describe("sendVehicleRequestConfirmation", () => {
    it("sends buyer confirmation email with correct subject", async () => {
      const result = await emailService.sendVehicleRequestConfirmation(
        "buyer@example.com",
        "John Doe",
        "user_123",
      )

      expect(result.success).toBe(true)
      expect(resend.emails.send).toHaveBeenCalledTimes(1)

      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.to).toBe("buyer@example.com")
      expect(sendCall.subject).toContain("Vehicle Request Has Been Submitted")
      expect(sendCall.html).toContain("John Doe")
    })

    it("includes a link to buyer requests in the email", async () => {
      await emailService.sendVehicleRequestConfirmation(
        "buyer@example.com",
        "Jane Doe",
      )

      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.html).toContain("/buyer/requests")
    })
  })

  describe("sendVehicleRequestAdminNotification", () => {
    it("sends admin notification email to info@autolenis.com by default", async () => {
      delete process.env['VEHICLE_REQUEST_ADMIN_EMAIL']

      const result = await emailService.sendVehicleRequestAdminNotification(
        "John Doe",
        "john@example.com",
        "90210",
        [{ make: "Toyota", model: "Camry", yearMin: 2023, yearMax: 2025, condition: "NEW" }],
      )

      expect(result.success).toBe(true)
      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.to).toBe("info@autolenis.com")
      expect(sendCall.subject).toContain("New Vehicle Request")
      expect(sendCall.subject).toContain("John Doe")
    })

    it("includes vehicle details in the email body", async () => {
      await emailService.sendVehicleRequestAdminNotification(
        "Jane Doe",
        "jane@example.com",
        "10001",
        [
          { make: "BMW", model: "X5", yearMin: 2022, yearMax: 2024, condition: "USED" },
          { make: "Mercedes-Benz", condition: "EITHER" },
        ],
      )

      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.html).toContain("BMW")
      expect(sendCall.html).toContain("X5")
      expect(sendCall.html).toContain("10001")
      expect(sendCall.html).toContain("Jane Doe")
    })

    it("uses VEHICLE_REQUEST_ADMIN_EMAIL env var when set", async () => {
      process.env['VEHICLE_REQUEST_ADMIN_EMAIL'] = "custom-admin@autolenis.com"

      await emailService.sendVehicleRequestAdminNotification(
        "Buyer",
        "buyer@example.com",
        "30301",
        [{ make: "Ford", condition: "NEW" }],
      )

      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.to).toBe("custom-admin@autolenis.com")

      delete process.env['VEHICLE_REQUEST_ADMIN_EMAIL']
    })
  })

  describe("sendDealerInviteEmail", () => {
    it("sends dealer invite email with claim link containing token", async () => {
      const result = await emailService.sendDealerInviteEmail(
        "dealer@dealership.com",
        "Acme Motors",
        "abc123token",
        "2024 Toyota Camry XSE",
        "90210",
      )

      expect(result.success).toBe(true)
      expect(resend.emails.send).toHaveBeenCalledTimes(1)

      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.to).toBe("dealer@dealership.com")
      expect(sendCall.subject).toContain("Invited to AutoLenis")
      expect(sendCall.html).toContain("Acme Motors")
      expect(sendCall.html).toContain("abc123token")
      expect(sendCall.html).toContain("90210")
      expect(sendCall.html).toContain("2024 Toyota Camry XSE")
      expect(sendCall.html).toContain("/dealer/invite/claim")
    })

    it("escapes HTML in dealer name and vehicle summary", async () => {
      await emailService.sendDealerInviteEmail(
        "dealer@test.com",
        '<script>alert("xss")</script>',
        "token",
        '<img src=x onerror=alert(1)>',
        "10001",
      )

      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.html).not.toContain("<script>")
      expect(sendCall.html).not.toContain("<img")
      expect(sendCall.html).toContain("&lt;script&gt;")
    })
  })

  describe("sendSourcedOfferPresentedEmail", () => {
    it("sends buyer notification with link to case detail", async () => {
      const result = await emailService.sendSourcedOfferPresentedEmail(
        "buyer@example.com",
        "Jane Doe",
        "2024 Honda Accord Sport",
        "case-123",
        "user-456",
      )

      expect(result.success).toBe(true)
      expect(resend.emails.send).toHaveBeenCalledTimes(1)

      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.to).toBe("buyer@example.com")
      expect(sendCall.subject).toContain("New Offer Available")
      expect(sendCall.html).toContain("Jane Doe")
      expect(sendCall.html).toContain("2024 Honda Accord Sport")
      expect(sendCall.html).toContain("/buyer/requests/case-123")
    })

    it("escapes HTML in buyer name and vehicle summary", async () => {
      await emailService.sendSourcedOfferPresentedEmail(
        "buyer@test.com",
        '<b>Hacker</b>',
        '<script>xss</script>',
        "case-1",
      )

      const sendCall = (resend.emails.send as ReturnType<typeof vi.fn>).mock.calls[0][0]
      expect(sendCall.html).not.toContain("<b>Hacker</b>")
      expect(sendCall.html).not.toContain("<script>")
      expect(sendCall.html).toContain("&lt;b&gt;Hacker&lt;/b&gt;")
    })
  })
})
