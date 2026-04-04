import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { validateCronRequest, acquireCronLock } from "@/lib/middleware/cron-security"
import { logger } from "@/lib/logger"
import { InventoryStatus, PaymentStatus } from "@/lib/constants/statuses"

/**
 * Cron: Release expired HOLD reservations on inventory items.
 *
 * Items that have been in HOLD for more than HOLD_EXPIRY_MINUTES with no
 * successful deposit payment are released back to AVAILABLE.
 *
 * Schedule: every 10 minutes (see vercel.json)
 */
const HOLD_EXPIRY_MINUTES = 35

export async function GET(req: NextRequest) {
  const correlationId = crypto.randomUUID()

  try {
    const securityCheck = await validateCronRequest(req)
    if (securityCheck) {
      return securityCheck
    }

    // Idempotency guard (FIX 14)
    const alreadyRunning = await acquireCronLock("release-expired-holds", 10)
    if (alreadyRunning) {
      return NextResponse.json({ success: true, skipped: true, reason: "already ran in this window", correlationId })
    }

    logger.info("Starting release-expired-holds cron job", { correlationId })

    const expiryThreshold = new Date(Date.now() - HOLD_EXPIRY_MINUTES * 60 * 1000)

    const staleHolds = await prisma.inventoryItem.findMany({
      where: {
        status: InventoryStatus.HOLD,
        reservedAt: { lt: expiryThreshold },
      },
      select: { id: true, reservedAt: true },
    })

    const released: string[] = []

    for (const item of staleHolds) {
      const successfulPayment = await prisma.depositPayment.findFirst({
        where: {
          inventoryItemId: item.id,
          status: PaymentStatus.SUCCEEDED,
        },
        select: { id: true },
      })

      if (!successfulPayment) {
        const result = await prisma.inventoryItem.updateMany({
          where: {
            id: item.id,
            status: InventoryStatus.HOLD,
            reservedAt: { lt: expiryThreshold },
          },
          data: {
            status: InventoryStatus.AVAILABLE,
            reservedAt: null,
          },
        })

        if (result.count > 0) {
          released.push(item.id)
        }
      }
    }

    logger.info("Release-expired-holds cron job completed", {
      correlationId,
      released: released.length,
      staleHoldsChecked: staleHolds.length,
    })

    return NextResponse.json({
      released: released.length,
      itemIds: released,
    })
  } catch (error) {
    logger.error("release-expired-holds cron job failed", {
      correlationId,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    return NextResponse.json(
      { success: false, error: { code: "CRON_JOB_FAILED", message: "Cron job failed" }, correlationId },
      { status: 500 },
    )
  }
}
