import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { emailService } from "@/lib/services/email.service"

export async function sendOverrideNotification(
  userId: string,
  scanId: string,
  overrideId: string,
  action: string,
  reason: string,
) {
  const notification = await prisma.contractShieldNotification.create({
    data: {
      scanId,
      recipientId: userId,
      notificationType: "EMAIL",
      status: "PENDING",
      subject: "Action Required: Contract Review Status Update",
      message: `An admin has updated your Contract Shield review status.\n\nAction: ${action}\nReason: ${reason}\n\nPlease log in to review and acknowledge this change.`,
    },
  })

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (user?.email) {
      await emailService.sendNotification(
        user.email,
        "Override Acknowledgment Required",
        `An override action (${action}) has been requested for your contract. Reason: ${reason}`,
        "Review Override",
        `${process.env['NEXT_PUBLIC_APP_URL']}/buyer/contracts`
      )

      await prisma.contractShieldNotification.update({
        where: { id: notification.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
        },
      })

      logger.info("Override notification sent", {
        notificationId: notification.id,
        userId,
        scanId,
      })
    }
  } catch (error) {
    await prisma.contractShieldNotification.update({
      where: { id: notification.id },
      data: {
        status: "FAILED",
        failedReason: error instanceof Error ? error.message : "Unknown error",
      },
    })

    logger.error("Failed to send override notification", {
      notificationId: notification.id,
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }

  return notification
}

export async function sendStatusChangeNotification(scanId: string, oldStatus: string, newStatus: string) {
  const scan = await prisma.contractShieldScan.findUnique({
    where: { id: scanId },
    include: {
      selectedDeal: {
        include: {
          buyer: true,
          dealer: true,
        },
      },
    },
  })

  if (!scan?.selectedDeal) return

  // Notify buyer
  if (scan.selectedDeal.buyer?.id) {
    const notification = await prisma.contractShieldNotification.create({
      data: {
        scanId,
        recipientId: scan.selectedDeal.buyer.id,
        notificationType: "EMAIL",
        status: "PENDING",
        subject: `Contract Review Update: ${newStatus.replace("_", " ")}`,
        message: `Your contract review status has changed from ${oldStatus} to ${newStatus}.\n\nLog in to view the details.`,
      },
    })

    try {
      if (scan.selectedDeal.buyer.email) {
        await emailService.sendNotification(
          scan.selectedDeal.buyer.email,
          "Contract Shield Status Changed",
          `Your contract shield status has changed from ${oldStatus} to ${newStatus}.`,
          "Review Contract",
          `${process.env['NEXT_PUBLIC_APP_URL']}/buyer/contracts`
        )

        await prisma.contractShieldNotification.update({
          where: { id: notification.id },
          data: { status: "SENT", sentAt: new Date() },
        })
      }
    } catch (error) {
      await prisma.contractShieldNotification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          failedReason: error instanceof Error ? error.message : "Unknown error",
        },
      })
    }
  }

  // Notify dealer
  if (scan.selectedDeal.dealer?.id) {
    const notification = await prisma.contractShieldNotification.create({
      data: {
        scanId,
        recipientId: scan.selectedDeal.dealer.id,
        notificationType: "EMAIL",
        status: "PENDING",
        subject: `Contract Review Update: ${newStatus.replace("_", " ")}`,
        message: `A contract review status has changed from ${oldStatus} to ${newStatus}.`,
      },
    })

    try {
      if (scan.selectedDeal.dealer.email) {
        await emailService.sendNotification(
          scan.selectedDeal.dealer.email,
          "Contract Shield Status Changed",
          `Contract shield status has changed from ${oldStatus} to ${newStatus}.`,
          "Review Contract",
          `${process.env['NEXT_PUBLIC_APP_URL']}/dealer/contracts`
        )

        await prisma.contractShieldNotification.update({
          where: { id: notification.id },
          data: { status: "SENT", sentAt: new Date() },
        })
      }
    } catch (error) {
      await prisma.contractShieldNotification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          failedReason: error instanceof Error ? error.message : "Unknown error",
        },
      })
    }
  }
}

/**
 * Send CMA-appropriate notifications to buyer and dealer.
 * Buyer: reassuring "manual verification" messaging.
 * Dealer: "internal verification, no action required" messaging.
 */
export async function sendCmaStatusNotification(
  dealId: string,
  cmaStatus: string,
) {
  const deal = await prisma.selectedDeal.findUnique({
    where: { id: dealId },
    include: {
      buyer: { include: { user: true } },
      dealer: true,
      scan: true,
    },
  })

  if (!deal) return

  const scanId = deal.scan?.id

  // CMA messaging map
  const buyerMessages: Record<string, { subject: string; body: string }> = {
    CONTRACT_MANUAL_REVIEW_REQUIRED: {
      subject: "Contract Verification in Progress",
      body: "We\u2019re completing a manual verification to ensure your contract is accurate before you sign. No action is needed from you at this time.",
    },
    CONTRACT_INTERNAL_FIX_IN_PROGRESS: {
      subject: "Contract Verification in Progress",
      body: "We\u2019re completing a manual verification to ensure your contract is accurate before you sign. No action is needed from you at this time.",
    },
    CONTRACT_ADMIN_OVERRIDE_APPROVED: {
      subject: "Contract Verified \u2014 Ready to Sign",
      body: "Your contract has been verified and approved. You can now proceed to sign.",
    },
    CONTRACT_APPROVED: {
      subject: "Contract Verified \u2014 Ready to Sign",
      body: "Your contract has been verified and approved. You can now proceed to sign.",
    },
  }

  const dealerMessages: Record<string, { subject: string; body: string }> = {
    CONTRACT_MANUAL_REVIEW_REQUIRED: {
      subject: "Internal Contract Verification",
      body: "AutoLenis is performing an internal verification. No action required.",
    },
    CONTRACT_INTERNAL_FIX_IN_PROGRESS: {
      subject: "Internal Contract Verification",
      body: "AutoLenis is performing an internal verification. No action required.",
    },
    CONTRACT_ADMIN_OVERRIDE_APPROVED: {
      subject: "Contract Approved",
      body: "The contract has been verified and approved. The buyer will be able to proceed.",
    },
    CONTRACT_APPROVED: {
      subject: "Contract Approved",
      body: "The contract has been verified and approved. The buyer will be able to proceed.",
    },
  }

  const buyerMsg = buyerMessages[cmaStatus]
  const dealerMsg = dealerMessages[cmaStatus]

  // Notify buyer
  if (buyerMsg && deal.buyer?.user?.email && scanId) {
    try {
      await prisma.contractShieldNotification.create({
        data: {
          scanId,
          recipientId: deal.buyer.user.id,
          notificationType: "EMAIL",
          status: "PENDING",
          subject: buyerMsg.subject,
          message: buyerMsg.body,
        },
      })

      await emailService.sendNotification(
        deal.buyer.user.email,
        buyerMsg.subject,
        buyerMsg.body,
        cmaStatus.includes("APPROVED") ? "Continue to Sign" : "View Status",
        `${process.env["NEXT_PUBLIC_APP_URL"]}/buyer/contracts`,
      )
    } catch (error) {
      logger.error("Failed to send CMA buyer notification", {
        dealId,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Notify dealer — no action required messaging
  if (dealerMsg && deal.dealer?.email && scanId) {
    try {
      await prisma.contractShieldNotification.create({
        data: {
          scanId,
          recipientId: deal.dealer.id,
          notificationType: "EMAIL",
          status: "PENDING",
          subject: dealerMsg.subject,
          message: dealerMsg.body,
        },
      })

      await emailService.sendNotification(
        deal.dealer.email,
        dealerMsg.subject,
        dealerMsg.body,
      )
    } catch (error) {
      logger.error("Failed to send CMA dealer notification", {
        dealId,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
