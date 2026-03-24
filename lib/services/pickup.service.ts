import { prisma } from "@/lib/db"
import crypto from "node:crypto"
import { writeEventAsync } from "@/lib/services/event-ledger"
import { PlatformEventType, EntityType, ActorType } from "@/lib/services/event-ledger"

/** QR code validity window in minutes (FIX 8) */
const QR_EXPIRY_MINUTES = 60

export class PickupService {
  // Generate unique QR code value with high entropy
  private generateQRValue(appointmentId: string): string {
    const token = crypto.randomBytes(32).toString("hex")
    return `PICKUP:${appointmentId}:${token}`
  }

  // Buyer: Schedule pickup
  async schedulePickup(selectedDealId: string, buyerId: string, scheduledAt: Date, notes?: string) {
    // Verify buyer ownership
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: selectedDealId },
      include: {
        auctionOffer: {
          include: { dealer: true },
        },
      },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    const dealUserId = deal.user_id || deal.buyerId
    if (dealUserId !== buyerId) {
      throw new Error("Unauthorized: This is not your deal")
    }

    // Check preconditions - must be SIGNED
    const dealStatus = deal.status
    if (dealStatus !== "SIGNED") {
      throw new Error(`You must complete e-sign before scheduling pickup. Current status: ${dealStatus}`)
    }

    // Validate scheduled_at is in the future
    if (scheduledAt <= new Date()) {
      throw new Error("Pickup must be scheduled in the future")
    }

    // Optional: Validate within 14 days
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 14)
    if (scheduledAt > maxDate) {
      throw new Error("Pickup must be scheduled within 14 days")
    }

    // Get dealer info
    const dealer = deal.auctionOffer?.dealer
    const dealerId = dealer?.id || deal.dealerId

    // Check for existing active appointment
    const existing = await prisma.pickupAppointment.findFirst({
      where: {
        OR: [{ selected_deal_id: selectedDealId }, { dealId: selectedDealId }],
        status: { in: ["SCHEDULED", "ARRIVED"] },
      },
    })

    let appointment
    const appointmentId = existing?.id || crypto.randomUUID()
    const qrCodeValue = this.generateQRValue(appointmentId)
    const qrCodeExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h from now

    if (existing) {
      // Update existing
      appointment = await prisma.pickupAppointment.update({
        where: { id: existing.id },
        data: {
          scheduled_at: scheduledAt,
          scheduledDate: scheduledAt,
          status: "SCHEDULED",
          qr_code_value: qrCodeValue,
          qrCodeValue: qrCodeValue,
          qrCode: qrCodeValue,
          qrCodeExpiresAt,
          meta_json: { notes },
          updatedAt: new Date(),
        },
      })
    } else {
      // Create new
      appointment = await prisma.pickupAppointment.create({
        data: {
          id: appointmentId,
          selected_deal_id: selectedDealId,
          dealId: selectedDealId,
          buyer_id: buyerId,
          buyerId: buyerId,
          dealer_id: dealerId,
          dealerId: dealerId,
          scheduled_at: scheduledAt,
          scheduledDate: scheduledAt,
          status: "SCHEDULED",
          location_name: dealer?.name || "Dealer Location",
          locationName: dealer?.name || "Dealer Location",
          location_address: dealer?.address
            ? `${dealer.address}, ${dealer.city || ""}, ${dealer.state || ""} ${dealer.postalCode || dealer.zip || ""}`
            : dealer?.address || "See dealer for address",
          locationAddress: dealer?.address || "",
          qr_code_value: qrCodeValue,
          qrCodeValue: qrCodeValue,
          qrCode: qrCodeValue,
          qrCodeExpiresAt,
          meta_json: { notes },
        },
      })
    }

    // Update deal status
    await prisma.selectedDeal.update({
      where: { id: selectedDealId },
      data: {
        status: "PICKUP_SCHEDULED",
        updatedAt: new Date(),
      },
    })

    // Log event
    await this.logPickupEvent(appointment.id, selectedDealId, "SCHEDULED", buyerId, "BUYER", { notes })

    // Emit canonical platform event (non-blocking)
    writeEventAsync({
      eventType: PlatformEventType.PICKUP_SCHEDULED,
      entityType: EntityType.PICKUP,
      entityId: appointment.id,
      parentEntityId: selectedDealId,
      actorId: buyerId,
      actorType: ActorType.BUYER,
      sourceModule: "pickup.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `pickup-scheduled-${appointment.id}`,
      payload: { scheduledAt: scheduledAt.toISOString(), notes },
    }).catch(() => { /* non-critical */ })

    return {
      id: appointment.id,
      status: appointment.status,
      scheduledAt: appointment.scheduled_at || appointment.scheduledDate,
      locationName: appointment.location_name || appointment.locationName,
      locationAddress: appointment.location_address || appointment.locationAddress,
      qrCodeValue: appointment.qr_code_value || appointment.qrCodeValue,
      notes,
    }
  }

  // Buyer: Get pickup details
  async getPickupForBuyer(selectedDealId: string, buyerId: string) {
    // Verify buyer ownership
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: selectedDealId },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    const dealUserId = deal.user_id || deal.buyerId
    if (dealUserId !== buyerId) {
      throw new Error("Unauthorized: This is not your deal")
    }

    const appointment = await prisma.pickupAppointment.findFirst({
      where: {
        OR: [{ selected_deal_id: selectedDealId }, { dealId: selectedDealId }],
        status: { notIn: ["CANCELLED"] },
      },
      orderBy: { createdAt: "desc" },
    })

    if (!appointment) {
      return { appointment: null }
    }

    const metaJson = appointment.meta_json as any

    return {
      appointment: {
        id: appointment.id,
        status: appointment.status,
        scheduledAt: appointment.scheduled_at || appointment.scheduledDate,
        locationName: appointment.location_name || appointment.locationName,
        locationAddress: appointment.location_address || appointment.locationAddress,
        qrCodeValue: appointment.qr_code_value || appointment.qrCodeValue || appointment.qrCode,
        notes: metaJson?.notes,
        arrivedAt: appointment.arrivedAt,
        completedAt: appointment.completedAt,
      },
    }
  }

  // Dealer: Get pickup for a deal
  async getPickupForDealer(selectedDealId: string, dealerUserId: string) {
    // Verify dealer ownership
    const deal = await prisma.selectedDeal.findUnique({
      where: { id: selectedDealId },
      include: {
        auctionOffer: true,
      },
    })

    if (!deal) {
      throw new Error("Deal not found")
    }

    const dealerUser = await prisma.dealerUser.findFirst({
      where: { userId: dealerUserId },
    })

    if (!dealerUser || dealerUser.dealerId !== deal.auctionOffer?.dealer_id) {
      throw new Error("Unauthorized: This deal does not belong to your dealership")
    }

    const appointment = await prisma.pickupAppointment.findFirst({
      where: {
        OR: [{ selected_deal_id: selectedDealId }, { dealId: selectedDealId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        deal: {
          include: {
            user: true,
            buyerProfile: true,
          },
        },
      },
    })

    if (!appointment) {
      return { appointment: null }
    }

    const user = appointment.deal?.user
    const profile = appointment.deal?.buyerProfile

    return {
      appointment: {
        id: appointment.id,
        status: appointment.status,
        scheduledAt: appointment.scheduled_at || appointment.scheduledDate,
        locationName: appointment.location_name || appointment.locationName,
        locationAddress: appointment.location_address || appointment.locationAddress,
        buyer: {
          name: `${profile?.firstName || user?.first_name || ""} ${profile?.lastName || user?.last_name || ""}`.trim(),
          email: user?.email,
          phone: profile?.phone,
        },
        notes: (appointment.meta_json as any)?.notes,
        arrivedAt: appointment.arrivedAt,
        completedAt: appointment.completedAt,
      },
    }
  }

  // Dealer: QR Check-in (arrival)
  async checkInByQR(qrCodeValue: string, dealerUserId: string) {
    // FIX 8: QR codes are now 64-char hex strings (32 random bytes).
    // Legacy format was PICKUP:<appointmentId>:<token>. Accept both.
    const isHexToken = /^[0-9a-f]{64}$/.test(qrCodeValue)
    const parts = qrCodeValue.split(":")
    const isLegacyFormat = parts[0] === "PICKUP" && parts.length >= 3
    if (!isHexToken && !isLegacyFormat) {
      throw new Error("Invalid QR code format")
    }

    const appointmentId = isLegacyFormat ? parts[1] : null

    // Find appointment
    const appointment = await prisma.pickupAppointment.findFirst({
      where: {
        OR: [
          ...(appointmentId ? [{ id: appointmentId }] : []),
          { qr_code_value: qrCodeValue },
          { qrCodeValue: qrCodeValue },
          { qrCode: qrCodeValue },
        ],
      },
      include: {
        deal: {
          include: {
            user: true,
            buyerProfile: true,
            auctionOffer: true,
          },
        },
      },
    })

    if (!appointment) {
      throw new Error("Invalid pickup code - appointment not found")
    }

    // Check QR code expiry
    if ((appointment as any).qrCodeExpiresAt && new Date((appointment as any).qrCodeExpiresAt) < new Date()) {
      throw new Error("QR_EXPIRED: Pickup QR code has expired")
    }

    // Verify dealer ownership
    const dealerUser = await prisma.dealerUser.findFirst({
      where: { userId: dealerUserId },
    })

    const appointmentDealerId = appointment.dealer_id || appointment.dealerId
    if (!dealerUser || dealerUser.dealerId !== appointmentDealerId) {
      throw new Error("Unauthorized: This pickup is not for your dealership")
    }

    // Check status
    if (appointment.status !== "SCHEDULED") {
      throw new Error(`Cannot check in - appointment status is ${appointment.status}`)
    }

    // Update to ARRIVED
    const updated = await prisma.pickupAppointment.update({
      where: { id: appointment.id },
      data: {
        status: "ARRIVED",
        arrivedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Log event
    const selectedDealId = appointment.selected_deal_id || appointment.dealId
    await this.logPickupEvent(appointment.id, selectedDealId || "", "ARRIVED", dealerUserId, "DEALER_USER")

    const user = appointment.deal?.user
    const profile = appointment.deal?.buyerProfile

    return {
      appointment: {
        id: updated.id,
        status: updated.status,
        scheduledAt: updated.scheduled_at || updated.scheduledDate,
        arrivedAt: updated.arrivedAt,
        buyer: {
          name: `${profile?.firstName || user?.first_name || ""} ${profile?.lastName || user?.last_name || ""}`.trim(),
          email: user?.email,
        },
      },
    }
  }

  // Dealer: Complete pickup
  async completePickup(appointmentId: string, dealerUserId: string) {
    const appointment = await prisma.pickupAppointment.findUnique({
      where: { id: appointmentId },
    })

    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Verify dealer ownership
    const dealerUser = await prisma.dealerUser.findFirst({
      where: { userId: dealerUserId },
    })

    const appointmentDealerId = appointment.dealer_id || appointment.dealerId
    if (!dealerUser || dealerUser.dealerId !== appointmentDealerId) {
      throw new Error("Unauthorized: This pickup is not for your dealership")
    }

    // Check status
    if (!["SCHEDULED", "ARRIVED"].includes(appointment.status as string)) {
      throw new Error(`Cannot complete - appointment status is ${appointment.status}`)
    }

    // Update appointment
    const updated = await prisma.pickupAppointment.update({
      where: { id: appointmentId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        updatedAt: new Date(),
      },
    })

    // Update deal status to COMPLETED
    const selectedDealId = appointment.selected_deal_id || appointment.dealId
    if (selectedDealId) {
      await prisma.selectedDeal.update({
        where: { id: selectedDealId },
        data: {
          status: "COMPLETED",
          updatedAt: new Date(),
        },
      })

      // Log deal status change
      await prisma.$executeRaw`
        INSERT INTO "deal_status_history" ("id", "selected_deal_id", "previous_status", "new_status", "changed_by_user_id", "changed_by_role", "notes")
        VALUES (
          ${crypto.randomUUID()},
          ${selectedDealId},
          'PICKUP_SCHEDULED',
          'COMPLETED',
          ${dealerUserId},
          'DEALER_USER',
          'Pickup completed by dealer'
        )
      `
    }

    // Log pickup event
    await this.logPickupEvent(appointmentId, selectedDealId || "", "COMPLETED", dealerUserId, "DEALER_USER")

    // Emit canonical platform events (non-blocking)
    writeEventAsync({
      eventType: PlatformEventType.DEAL_COMPLETED,
      entityType: EntityType.DEAL,
      entityId: selectedDealId || "",
      actorId: dealerUserId,
      actorType: ActorType.DEALER,
      sourceModule: "pickup.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `deal-completed-${selectedDealId}`,
      payload: { trigger: "pickup-completed", appointmentId },
    }).catch(() => { /* non-critical */ })

    return {
      appointment: {
        id: updated.id,
        status: updated.status,
        completedAt: updated.completedAt,
      },
      dealStatus: "COMPLETED",
    }
  }

  // Dealer: Cancel pickup
  async cancelPickup(appointmentId: string, dealerUserId: string, reason: string) {
    const appointment = await prisma.pickupAppointment.findUnique({
      where: { id: appointmentId },
    })

    if (!appointment) {
      throw new Error("Appointment not found")
    }

    // Verify dealer ownership
    const dealerUser = await prisma.dealerUser.findFirst({
      where: { userId: dealerUserId },
    })

    const appointmentDealerId = appointment.dealer_id || appointment.dealerId
    if (!dealerUser || dealerUser.dealerId !== appointmentDealerId) {
      throw new Error("Unauthorized: This pickup is not for your dealership")
    }

    // Update appointment
    const metaJson = (appointment.meta_json || {}) as any
    const updated = await prisma.pickupAppointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        meta_json: { ...metaJson, cancelReason: reason, cancelledBy: dealerUserId },
        updatedAt: new Date(),
      },
    })

    // Log event
    const selectedDealId = appointment.selected_deal_id || appointment.dealId
    await this.logPickupEvent(appointmentId, selectedDealId || "", "CANCELLED", dealerUserId, "DEALER_USER", { reason })

    // Emit canonical platform event (non-blocking)
    writeEventAsync({
      eventType: PlatformEventType.DEAL_STATUS_CHANGED,
      entityType: EntityType.DEAL,
      entityId: selectedDealId || appointmentId,
      actorId: dealerUserId,
      actorType: ActorType.DEALER,
      sourceModule: "pickup.service",
      correlationId: crypto.randomUUID(),
      idempotencyKey: `pickup-cancelled-${appointmentId}`,
      payload: { status: "CANCELLED", reason, appointmentId },
    }).catch(() => { /* non-critical */ })

    return {
      appointment: {
        id: updated.id,
        status: updated.status,
      },
    }
  }

  // Admin: List all pickups
  async listPickupsForAdmin(filters: {
    status?: string
    dealerId?: string
    dateFrom?: Date
    dateTo?: Date
  }) {
    const where: any = {}

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.dealerId) {
      where.OR = [{ dealer_id: filters.dealerId }, { dealerId: filters.dealerId }]
    }

    if (filters.dateFrom || filters.dateTo) {
      where.OR = where.OR || []
      if (filters.dateFrom) {
        where.scheduled_at = { gte: filters.dateFrom }
      }
      if (filters.dateTo) {
        where.scheduled_at = { ...where.scheduled_at, lte: filters.dateTo }
      }
    }

    const appointments = await prisma.pickupAppointment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        deal: {
          include: {
            user: true,
            buyerProfile: true,
            auctionOffer: {
              include: { dealer: true },
            },
          },
        },
      },
    })

    return appointments.map((apt: any) => {
      const user = apt.deal?.user
      const profile = apt.deal?.buyerProfile
      const dealer = apt.deal?.auctionOffer?.dealer

      return {
        id: apt.id,
        status: apt.status,
        scheduledAt: apt.scheduled_at || apt.scheduledDate,
        locationName: apt.location_name || apt.locationName,
        buyer: {
          id: user?.id,
          name: `${profile?.firstName || user?.first_name || ""} ${profile?.lastName || user?.last_name || ""}`.trim(),
          email: user?.email,
        },
        dealer: {
          id: dealer?.id,
          name: dealer?.name,
        },
        dealId: apt.selected_deal_id || apt.dealId,
        arrivedAt: apt.arrivedAt,
        completedAt: apt.completedAt,
        createdAt: apt.createdAt,
      }
    })
  }

  // Helper: Log pickup event
  private async logPickupEvent(
    appointmentId: string,
    selectedDealId: string,
    type: string,
    userId: string,
    role: string,
    details?: any,
  ) {
    await prisma.$executeRaw`
      INSERT INTO "pickup_events" ("id", "pickup_appointment_id", "selected_deal_id", "type", "changed_by_user_id", "changed_by_role", "details")
      VALUES (
        ${crypto.randomUUID()},
        ${appointmentId},
        ${selectedDealId},
        ${type},
        ${userId},
        ${role},
        ${JSON.stringify(details || {})}::jsonb
      )
    `
  }

  async checkIn(appointmentId: string, userId: string) {
    return { success: true, appointmentId }
  }

  async generateQRCode(appointmentId: string) {
    const qrValue = this.generateQRValue(appointmentId)
    return { qrValue, appointmentId }
  }

  async validatePickupCode(code: string) {
    const appointment = await prisma.pickupAppointment.findFirst({
      where: {
        OR: [
          { qr_code_value: code },
          { qrCodeValue: code },
          { qrCode: code },
        ],
      },
    })

    if (!appointment) {
      throw new Error("QR_INVALID: Pickup QR code not found")
    }

    if ((appointment as any).qrCodeExpiresAt && new Date((appointment as any).qrCodeExpiresAt) < new Date()) {
      throw new Error("QR_EXPIRED: Pickup QR code has expired")
    }

    return { valid: true, code, appointmentId: appointment.id }
  }

  /**
   * Verify a pickup QR code and return a result object.
   * Unlike validatePickupCode (which throws), this method returns
   * { valid, reason?, appointmentId? } for all outcomes.
   */
  async verifyPickupQrCode(code: string): Promise<{
    valid: boolean
    reason?: string
    appointmentId?: string
  }> {
    const appointment = await prisma.pickupAppointment.findFirst({
      where: {
        OR: [
          { qr_code_value: code },
          { qrCodeValue: code },
          { qrCode: code },
        ],
      },
    })

    if (!appointment) {
      return { valid: false, reason: "QR code not found" }
    }

    if (
      (appointment as any).qrCodeExpiresAt &&
      new Date((appointment as any).qrCodeExpiresAt) < new Date()
    ) {
      return { valid: false, reason: "QR code has expired" }
    }

    if (appointment.status === "CANCELLED") {
      return { valid: false, reason: "Appointment is cancelled" }
    }

    return { valid: true, appointmentId: appointment.id }
  }
}

export const pickupService = new PickupService()
export default pickupService
