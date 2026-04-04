import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { writePrequalAuditLog } from "@/lib/prequal/audit"

export const dynamic = "force-dynamic"

import type { ApplicationStatus, QueueSegment } from "@/lib/types/prequal"

// Retention periods
const ABANDONED_PRE_CONSENT_HOURS = 72
const ABANDONED_POST_CONSENT_DAYS = 30
const VENDOR_RESPONSE_RETENTION_MONTHS = 12

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
    const now = new Date()
    let preConsentPurged = 0
    let postConsentPurged = 0
    let vendorPayloadsPurged = 0

    // ── 1. Abandoned pre-consent sessions → delete after 72 hours ──────
    const preConsentCutoff = new Date(now.getTime() - ABANDONED_PRE_CONSENT_HOURS * 60 * 60 * 1000)

    const abandonedPreConsent = await prisma.prequalApplication.findMany({
      where: {
        status: "INTAKE_IN_PROGRESS",
        consentGiven: false,
        createdAt: { lt: preConsentCutoff },
      },
      select: { id: true },
    })

    for (const app of abandonedPreConsent) {
      // Full delete — no consent was given, no vendor calls made
      await prisma.prequalApplication.delete({ where: { id: app.id } })

      // Log the purge (application is deleted, but audit log references the ID)
      await prisma.prequalAuditLog.create({
        data: {
          applicationId: app.id,
          eventType: "PURGE_ABANDONED_PRE_CONSENT",
          actorType: "SYSTEM",
          description: `Purged abandoned pre-consent session after ${ABANDONED_PRE_CONSENT_HOURS}h`,
        },
      }).catch(() => {
        // Audit log may fail if FK constraint exists — log and continue
        logger.warn("[Purge] Could not write audit log for deleted application", { id: app.id })
      })

      preConsentPurged++
    }

    // ── 2. Abandoned post-consent sessions → purge PII after 30 days ───
    const postConsentCutoff = new Date(now.getTime() - ABANDONED_POST_CONSENT_DAYS * 24 * 60 * 60 * 1000)

    const abandonedPostConsent = await prisma.prequalApplication.findMany({
      where: {
        status: { in: ["CONSENT_CAPTURED", "IPREDICT_PENDING", "SYSTEM_ERROR"] },
        completedAt: null,
        createdAt: { lt: postConsentCutoff },
      },
      select: { id: true },
    })

    for (const app of abandonedPostConsent) {
      // Scrub PII but keep consent record and audit trail
      await prisma.prequalApplication.update({
        where: { id: app.id },
        data: {
          ssnEncrypted: "[PURGED]",
          phone: "[PURGED]",
          email: "[PURGED]",
          addressLine1: "[PURGED]",
          addressLine2: null,
          city: "[PURGED]",
          zipCode: "[PURGED]",
          status: "EXPIRED" as ApplicationStatus,
          queueSegment: "EXPIRED" as QueueSegment,
        },
      })

      await writePrequalAuditLog({
        applicationId: app.id,
        eventType: "PURGE_PII_POST_CONSENT",
        actorType: "SYSTEM",
        description: `PII purged from abandoned post-consent session after ${ABANDONED_POST_CONSENT_DAYS}d`,
      })

      postConsentPurged++
    }

    // ── 3. Raw vendor responses → purge encrypted payloads after 12 months ──
    const vendorCutoff = new Date(now.getTime() - VENDOR_RESPONSE_RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000)

    // Purge iPredict encrypted payloads
    const oldIpredictReports = await prisma.prequalIpredictReport.findMany({
      where: {
        createdAt: { lt: vendorCutoff },
        encryptedPayload: { not: "[PURGED]" },
      },
      select: { id: true, applicationId: true },
    })

    for (const report of oldIpredictReports) {
      await prisma.prequalIpredictReport.update({
        where: { id: report.id },
        data: { encryptedPayload: "[PURGED]" },
      })

      await writePrequalAuditLog({
        applicationId: report.applicationId,
        eventType: "PURGE_VENDOR_RESPONSE_IPREDICT",
        actorType: "SYSTEM",
        description: `iPredict encrypted payload purged after ${VENDOR_RESPONSE_RETENTION_MONTHS}mo retention`,
      })

      vendorPayloadsPurged++
    }

    // Purge IBV encrypted payloads
    const oldIbvReports = await prisma.prequalIbvReport.findMany({
      where: {
        createdAt: { lt: vendorCutoff },
        encryptedPayload: { not: "[PURGED]" },
      },
      select: { id: true, applicationId: true },
    })

    for (const report of oldIbvReports) {
      await prisma.prequalIbvReport.update({
        where: { id: report.id },
        data: { encryptedPayload: "[PURGED]" },
      })

      await writePrequalAuditLog({
        applicationId: report.applicationId,
        eventType: "PURGE_VENDOR_RESPONSE_IBV",
        actorType: "SYSTEM",
        description: `IBV encrypted payload purged after ${VENDOR_RESPONSE_RETENTION_MONTHS}mo retention`,
      })

      vendorPayloadsPurged++
    }

    logger.info("[Prequal Cron] Purge completed", {
      preConsentPurged,
      postConsentPurged,
      vendorPayloadsPurged,
    })

    return NextResponse.json({
      success: true,
      preConsentPurged,
      postConsentPurged,
      vendorPayloadsPurged,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal Cron] Purge error", { error: msg })
    return NextResponse.json({ success: false, error: "Purge job failed" }, { status: 500 })
  }
}
