import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { IBV_REMINDER_DELAY_HOURS } from "@/lib/prequal/constants"

export const dynamic = "force-dynamic"

function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env["CRON_SECRET"]
  if (!cronSecret) return false
  return (
    request.headers.get("authorization") === `Bearer ${cronSecret}` ||
    request.headers.get("x-cron-secret") === cronSecret
  )
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }

  try {
    const cutoff = new Date(Date.now() - IBV_REMINDER_DELAY_HOURS * 60 * 60 * 1000)

    // Find IBV_PENDING applications that haven't completed IBV and are older than the reminder delay
    const pending = await prisma.prequalApplication.findMany({
      where: {
        status: "IBV_PENDING",
        updatedAt: { lt: cutoff },
        messages: {
          none: {
            messageType: "IBV_REMINDER",
            createdAt: { gt: new Date(Date.now() - IBV_REMINDER_DELAY_HOURS * 60 * 60 * 1000) },
          },
        },
      },
      select: { id: true, email: true, phone: true, firstName: true },
    })

    let remindersQueued = 0

    for (const app of pending) {
      // Queue a reminder message (actual sending is handled by a separate job/service)
      await prisma.prequalMessage.create({
        data: {
          applicationId: app.id,
          channel: "EMAIL",
          messageType: "IBV_REMINDER",
          deliveryStatus: "QUEUED",
          recipient: app.email,
          subject: "Complete your income verification",
          body: `Hi ${app.firstName}, your vehicle shopping application is waiting for bank verification. Please complete the income verification to continue.`,
        },
      })

      await writePrequalAuditLog({
        applicationId: app.id,
        eventType: "IBV_REMINDER_QUEUED",
        actorType: "SYSTEM",
        description: "IBV reminder queued for incomplete bank verification",
      })

      remindersQueued++
    }

    logger.info("[Prequal Cron] IBV reminders queued", { remindersQueued })
    return NextResponse.json({ success: true, remindersQueued })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal Cron] IBV reminders error", { error: msg })
    return NextResponse.json({ success: false, error: "IBV reminders failed" }, { status: 500 })
  }
}
