import { vi, describe, it, expect, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  prisma: {
    selectedDeal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pickupAppointment: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    dealerUser: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/services/event-ledger", () => ({
  writeEventAsync: vi.fn(() => Promise.resolve()),
  PlatformEventType: { PICKUP_SCHEDULED: "PICKUP_SCHEDULED" },
  EntityType: { PICKUP: "PICKUP" },
  ActorType: { BUYER: "BUYER", DEALER_USER: "DEALER_USER" },
}))

import { PickupService } from "@/lib/services/pickup.service"
import { prisma } from "@/lib/db"

const pickupService = new PickupService()

describe("PickupService - QR code security (FIX 8)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("verifyPickupQrCode", () => {
    it("returns invalid when QR code not found", async () => {
      vi.mocked(prisma.pickupAppointment.findFirst).mockResolvedValue(null)

      const result = await pickupService.verifyPickupQrCode("nonexistent-code")
      expect(result.valid).toBe(false)
      expect(result.reason).toContain("not found")
    })

    it("returns invalid when QR code has expired", async () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      vi.mocked(prisma.pickupAppointment.findFirst).mockResolvedValue({
        id: "appt-1",
        qrCodeExpiresAt: pastDate,
        status: "SCHEDULED",
      } as any)

      const result = await pickupService.verifyPickupQrCode("valid-code")
      expect(result.valid).toBe(false)
      expect(result.reason).toContain("expired")
    })

    it("returns valid when QR code is valid and not expired", async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      vi.mocked(prisma.pickupAppointment.findFirst).mockResolvedValue({
        id: "appt-1",
        qrCodeExpiresAt: futureDate,
        status: "SCHEDULED",
      } as any)

      const result = await pickupService.verifyPickupQrCode("valid-code")
      expect(result.valid).toBe(true)
      expect(result.appointmentId).toBe("appt-1")
    })

    it("returns invalid for cancelled appointments", async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000)
      vi.mocked(prisma.pickupAppointment.findFirst).mockResolvedValue({
        id: "appt-1",
        qrCodeExpiresAt: futureDate,
        status: "CANCELLED",
      } as any)

      const result = await pickupService.verifyPickupQrCode("valid-code")
      expect(result.valid).toBe(false)
      expect(result.reason).toContain("cancelled")
    })
  })

  describe("checkInByQR - expiry enforcement", () => {
    it("throws when QR code has expired during check-in", async () => {
      const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000)
      vi.mocked(prisma.pickupAppointment.findFirst).mockResolvedValue({
        id: "appt-1",
        qrCodeExpiresAt: pastDate,
        status: "SCHEDULED",
        dealer_id: "dealer-1",
        dealerId: "dealer-1",
      } as any)

      await expect(
        pickupService.checkInByQR(`${Buffer.alloc(32).toString("hex")}`, "dealer-user-1"),
      ).rejects.toThrow("expired")
    })
  })
})

describe("PickupService - QR code format (FIX 8)", () => {
  it("generates a PICKUP:<id>:<hex> QR code with 32 random bytes", () => {
    // Access private method via reflection for testing
    const service = new PickupService() as any
    const qr = service.generateQRValue("test-id")
    expect(qr).toMatch(/^PICKUP:test-id:[0-9a-f]{64}$/)
  })
})
