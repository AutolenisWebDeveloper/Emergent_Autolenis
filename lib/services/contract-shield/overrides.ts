import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { logEvent } from "./helpers"
import { sendOverrideNotification } from "./notifications"

export async function adminOverride(scanId: string, action: "FORCE_PASS" | "FORCE_FAIL", adminId: string, reason: string) {
  const scan = await prisma.contractShieldScan.findUnique({
    where: { id: scanId },
  })

  if (!scan) {
    throw new Error("Scan not found")
  }

  const newStatus = action === "FORCE_PASS" ? "PASS" : "FAIL"

  const updatedScan = await prisma.contractShieldScan.update({
    where: { id: scanId },
    data: {
      status: newStatus,
      summary: `${scan.summary || ""}\n\n[Admin note: Status changed to ${newStatus}] ${reason}`,
    },
  })

  if (scan.selectedDealId) {
    await prisma.selectedDeal.update({
      where: { id: scan.selectedDealId },
      data: {
        status: newStatus === "PASS" ? "CONTRACT_APPROVED" : "CONTRACT_REVIEW",
      },
    })

    await logEvent(scan.selectedDealId, "ADMIN_OVERRIDE", {
      scanId,
      action,
      adminId,
      reason,
      previousStatus: scan.status,
      newStatus,
    })
  }

  return updatedScan
}

export async function adminOverrideWithConsent(
  scanId: string,
  action: "FORCE_PASS" | "FORCE_FAIL",
  adminId: string,
  reason: string,
) {
  const scan = await prisma.contractShieldScan.findUnique({
    where: { id: scanId },
    include: {
      selectedDeal: {
        include: {
          buyer: { include: { profile: true } },
        },
      },
    },
  })

  if (!scan) {
    throw new Error("Scan not found")
  }

  const newStatus = action === "FORCE_PASS" ? "PASS" : "FAIL"
  const previousStatus = scan.status

  // Create override record
  const override = await prisma.contractShieldOverride.create({
    data: {
      scanId,
      adminId,
      action,
      reason,
      previousStatus,
      newStatus,
      buyerAcknowledged: false,
    },
  })

  // Update scan status
  const updatedScan = await prisma.contractShieldScan.update({
    where: { id: scanId },
    data: {
      status: newStatus,
      summary: `${scan.summary || ""}\n\n[Admin Override: ${action}] ${reason}\n\n⚠️ This override requires buyer acknowledgment before proceeding.`,
    },
  })

  // Update deal status
  if (scan.selectedDealId) {
    await prisma.selectedDeal.update({
      where: { id: scan.selectedDealId },
      data: {
        status: "CONTRACT_REVIEW", // Keep in review until buyer acknowledges
      },
    })

    await logEvent(scan.selectedDealId, "ADMIN_OVERRIDE_CREATED", {
      scanId,
      overrideId: override.id,
      action,
      adminId,
      reason,
      previousStatus,
      newStatus,
    })

    // Send notification to buyer
    if (scan.selectedDeal?.buyer?.id) {
      await sendOverrideNotification(scan.selectedDeal.buyer.id, scanId, override.id, action, reason)
    }
  }

  logger.info("Admin override created with buyer consent requirement", {
    scanId,
    overrideId: override.id,
    action,
    adminId,
  })

  return { scan: updatedScan, override }
}

export async function buyerAcknowledgeOverride(overrideId: string, buyerId: string, comment?: string) {
  const override = await prisma.contractShieldOverride.findUnique({
    where: { id: overrideId },
    include: {
      scan: {
        include: {
          selectedDeal: true,
        },
      },
    },
  })

  if (!override) {
    throw new Error("Override not found")
  }

  // Verify buyer owns this deal
  if (override.scan.selectedDeal?.buyerId !== buyerId) {
    throw new Error("Unauthorized")
  }

  if (override.buyerAcknowledged) {
    throw new Error("Override already acknowledged")
  }

  // Update override
  const updatedOverride = await prisma.contractShieldOverride.update({
    where: { id: overrideId },
    data: {
      buyerAcknowledged: true,
      buyerAckAt: new Date(),
      buyerAckComment: comment,
    },
  })

  // Update deal status to allow progression
  if (override.scan.selectedDealId && override.newStatus === "PASS") {
    await prisma.selectedDeal.update({
      where: { id: override.scan.selectedDealId },
      data: {
        status: "CONTRACT_APPROVED",
      },
    })

    await logEvent(override.scan.selectedDealId, "BUYER_ACKNOWLEDGED_OVERRIDE", {
      overrideId,
      buyerId,
      comment,
    })
  }

  logger.info("Buyer acknowledged admin override", {
    overrideId,
    buyerId,
    scanId: override.scanId,
  })

  return updatedOverride
}
