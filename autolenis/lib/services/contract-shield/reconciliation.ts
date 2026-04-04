import { prisma } from "@/lib/db"
import { logger } from "@/lib/logger"
import { sendOverrideNotification } from "./notifications"

export async function runReconciliationJob(jobType: "SYNC_STATUSES" | "CHECK_STALE_SCANS" | "NOTIFY_PENDING") {
  const job = await prisma.contractShieldReconciliation.create({
    data: {
      jobType,
      status: "RUNNING",
      startedAt: new Date(),
    },
  })

  try {
    let itemsProcessed = 0
    let itemsUpdated = 0
    let itemsFailed = 0

    if (jobType === "SYNC_STATUSES") {
      // Sync scan statuses with deal statuses
      const scans = await prisma.contractShieldScan.findMany({
        where: {
          status: { in: ["PASS", "FAIL"] },
        },
        include: { selectedDeal: true },
      })

      for (const scan of scans) {
        itemsProcessed++
        if (scan.selectedDeal) {
          const expectedDealStatus = scan.status === "PASS" ? "CONTRACT_APPROVED" : "CONTRACT_REVIEW"
          if (scan.selectedDeal.status !== expectedDealStatus) {
            try {
              await prisma.selectedDeal.update({
                where: { id: scan.selectedDealId! },
                data: { status: expectedDealStatus },
              })
              itemsUpdated++
            } catch (error) {
              itemsFailed++
            }
          }
        }
      }
    } else if (jobType === "CHECK_STALE_SCANS") {
      // Find scans stuck in RUNNING for > 1 hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const staleScans = await prisma.contractShieldScan.findMany({
        where: {
          status: "RUNNING",
          scannedAt: { lt: oneHourAgo },
        },
      })

      for (const scan of staleScans) {
        itemsProcessed++
        try {
          await prisma.contractShieldScan.update({
            where: { id: scan.id },
            data: {
              status: "REVIEW_READY",
              summary: "Scan timed out and was automatically moved to review.",
            },
          })
          itemsUpdated++
        } catch (error) {
          itemsFailed++
        }
      }
    } else if (jobType === "NOTIFY_PENDING") {
      // Send notifications for pending acknowledgments
      const pendingOverrides = await prisma.contractShieldOverride.findMany({
        where: {
          buyerAcknowledged: false,
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // > 24 hours old
        },
        include: {
          scan: {
            include: {
              selectedDeal: {
                include: { buyer: true },
              },
            },
          },
        },
      })

      for (const override of pendingOverrides) {
        itemsProcessed++
        if (override.scan.selectedDeal?.buyer?.id) {
          try {
            await sendOverrideNotification(
              override.scan.selectedDeal.buyer.id,
              override.scanId,
              override.id,
              override.action,
              override.reason,
            )
            itemsUpdated++
          } catch (error) {
            itemsFailed++
          }
        }
      }
    }

    await prisma.contractShieldReconciliation.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        itemsProcessed,
        itemsUpdated,
        itemsFailed,
        completedAt: new Date(),
        resultSummary: {
          jobType,
          itemsProcessed,
          itemsUpdated,
          itemsFailed,
        },
      },
    })

    logger.info("Reconciliation job completed", {
      jobId: job.id,
      jobType,
      itemsProcessed,
      itemsUpdated,
      itemsFailed,
    })

    return job
  } catch (error) {
    await prisma.contractShieldReconciliation.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorLog: error instanceof Error ? error.message : "Unknown error",
      },
    })

    logger.error("Reconciliation job failed", {
      jobId: job.id,
      jobType,
      error: error instanceof Error ? error.message : "Unknown error",
    })

    throw error
  }
}
