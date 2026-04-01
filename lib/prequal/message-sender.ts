// Prequal message delivery processor
// Reads QUEUED messages and sends them through the existing Resend integration.

import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { resend, EMAIL_CONFIG } from "@/lib/resend"

async function sendEmail(
  to: string,
  subject: string,
  body: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to,
      subject,
      text: body,
      replyTo: EMAIL_CONFIG.replyTo,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function processQueuedMessages(
  batchSize: number = 50,
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0
  let failed = 0
  let skipped = 0

  const messages = await prisma.prequalMessage.findMany({
    where: { deliveryStatus: "QUEUED" },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  })

  for (const msg of messages) {
    if (msg.channel !== "EMAIL") {
      skipped++
      continue
    }

    const result = await sendEmail(
      msg.recipient,
      msg.subject ?? "",
      msg.body,
    )

    if (result.success) {
      await prisma.prequalMessage.update({
        where: { id: msg.id },
        data: {
          deliveryStatus: "SENT",
          sentAt: new Date(),
          updatedAt: new Date(),
        },
      })
      sent++
      logger.info("[PrequalMessageSender] Email sent", {
        messageId: msg.id,
        applicationId: msg.applicationId,
        messageType: msg.messageType,
      })
    } else {
      await prisma.prequalMessage.update({
        where: { id: msg.id },
        data: {
          deliveryStatus: "FAILED",
          failureReason: result.error ?? "Unknown error",
          updatedAt: new Date(),
        },
      })
      failed++
      logger.error("[PrequalMessageSender] Email send failed", {
        messageId: msg.id,
        applicationId: msg.applicationId,
        error: result.error,
      })
    }
  }

  return { sent, failed, skipped }
}
