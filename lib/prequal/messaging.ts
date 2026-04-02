// Prequal transactional message queueing service
// Builds message content and creates QUEUED records — does NOT send.

import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"

const APP_URL =
  process.env["NEXT_PUBLIC_APP_URL"] || "https://www.autolenis.com"

// ── Submission Confirmation ────────────────────────────────────────────────

export async function queueSubmissionConfirmation(
  applicationId: string,
  email: string,
  firstName: string,
): Promise<void> {
  try {
    await prisma.prequalMessage.create({
      data: {
        applicationId,
        channel: "EMAIL",
        messageType: "SUBMISSION_CONFIRMATION",
        deliveryStatus: "QUEUED",
        recipient: email,
        subject: "AutoLenis — Prequalification Request Received",
        body: [
          `Hi ${firstName},`,
          "",
          "Thank you for submitting your prequalification request with AutoLenis.",
          "",
          "Your request has been received and our review is underway. Please note that this is a soft inquiry and does not affect your credit score.",
          "",
          "We will notify you as soon as your result is ready.",
          "",
          "— The AutoLenis Team",
        ].join("\n"),
      },
    })
  } catch (error: unknown) {
    logger.error("[PrequalMessaging] Failed to queue submission confirmation", {
      applicationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ── Result Ready ───────────────────────────────────────────────────────────

function getResultIntro(finalStatus: string): string {
  switch (finalStatus) {
    case "PREQUALIFIED":
      return "Great news — your AutoLenis Shopping Pass is ready!"
    case "PREQUALIFIED_CONDITIONAL":
      return "Your conditional shopping estimate is ready."
    case "MANUAL_REVIEW":
      return "Your application is under review by our team."
    case "NOT_PREQUALIFIED":
      return "We've completed your prequalification review."
    default:
      return "Your prequalification result is ready."
  }
}

export async function queueResultReady(
  applicationId: string,
  email: string,
  firstName: string,
  finalStatus: string,
): Promise<void> {
  try {
    // Prevent duplicate RESULT_READY messages for the same application
    const existing = await prisma.prequalMessage.findFirst({
      where: {
        applicationId,
        channel: "EMAIL",
        messageType: "RESULT_READY",
      },
    })
    if (existing) {
      logger.info("[PrequalMessaging] RESULT_READY already exists, skipping", {
        applicationId,
        existingStatus: existing.deliveryStatus,
      })
      return
    }

    const resultUrl = `${APP_URL}/prequal/result?id=${applicationId}`

    await prisma.prequalMessage.create({
      data: {
        applicationId,
        channel: "EMAIL",
        messageType: "RESULT_READY",
        deliveryStatus: "QUEUED",
        recipient: email,
        subject: "AutoLenis — Your Prequalification Result Is Ready",
        body: [
          `Hi ${firstName},`,
          "",
          getResultIntro(finalStatus),
          "",
          `View your result here: ${resultUrl}`,
          "",
          "— The AutoLenis Team",
        ].join("\n"),
      },
    })
  } catch (error: unknown) {
    logger.error("[PrequalMessaging] Failed to queue result-ready", {
      applicationId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ── IBV Reminder ───────────────────────────────────────────────────────────

export async function queueIbvReminder(
  applicationId: string,
  email: string,
  firstName: string,
): Promise<{ queued: boolean }> {
  try {
    // Suppress duplicates: max 1 EMAIL + IBV_REMINDER per application
    const existing = await prisma.prequalMessage.findFirst({
      where: {
        applicationId,
        channel: "EMAIL",
        messageType: "IBV_REMINDER",
      },
    })
    if (existing) {
      logger.info("[PrequalMessaging] IBV_REMINDER already exists, skipping", {
        applicationId,
      })
      return { queued: false }
    }

    const resumeUrl = `${APP_URL}/prequal/ibv-intro?id=${applicationId}`

    await prisma.prequalMessage.create({
      data: {
        applicationId,
        channel: "EMAIL",
        messageType: "IBV_REMINDER",
        deliveryStatus: "QUEUED",
        recipient: email,
        subject: "AutoLenis — Complete Your Income Verification",
        body: [
          `Hi ${firstName},`,
          "",
          "Your vehicle shopping application is waiting for bank verification. Please complete the income verification to continue.",
          "",
          `Resume here: ${resumeUrl}`,
          "",
          "— The AutoLenis Team",
        ].join("\n"),
      },
    })

    return { queued: true }
  } catch (error: unknown) {
    logger.error("[PrequalMessaging] Failed to queue IBV reminder", {
      applicationId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { queued: false }
  }
}
