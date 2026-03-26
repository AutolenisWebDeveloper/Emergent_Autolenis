import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getPrequalSessionToken } from "@/lib/prequal/session"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { getIbvReport } from "@/lib/microbilt/ibv-client"
import { scoreIbv } from "@/lib/decision/ibv-scorer"
import { encrypt } from "@/lib/prequal/encryption"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionToken =
      (await getPrequalSessionToken()) ??
      request.headers.get("x-prequal-session") ??
      null

    if (!sessionToken) {
      return NextResponse.json({ success: false, error: "No prequal session" }, { status: 401 })
    }

    const application = await prisma.prequalApplication.findUnique({
      where: { sessionToken },
      include: { ibvSession: true },
    })

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })
    }

    if (!application.ibvSession?.ibvSessionId) {
      return NextResponse.json({ success: false, error: "No IBV session found" }, { status: 404 })
    }

    const report = await getIbvReport(application.ibvSession.ibvSessionId)

    if (!report || report.status !== "COMPLETE") {
      return NextResponse.json({ success: true, complete: false, status: report?.status ?? "PENDING" })
    }

    // Score the IBV report
    const ibvResult = scoreIbv(report)

    // Store encrypted report
    const encryptedPayload = encrypt(JSON.stringify(report))
    await prisma.prequalIbvReport.upsert({
      where: { applicationId: application.id },
      create: {
        applicationId: application.id,
        encryptedPayload,
        outcome: ibvResult.outcome,
        monthlyIncomeCents: ibvResult.verifiedMonthlyIncomeCents ?? null,
        confidence: ibvResult.confidence ?? null,
      },
      update: {
        encryptedPayload,
        outcome: ibvResult.outcome,
        monthlyIncomeCents: ibvResult.verifiedMonthlyIncomeCents ?? null,
        confidence: ibvResult.confidence ?? null,
      },
    })

    // Update IBV session status
    await prisma.prequalIbvSession.update({
      where: { applicationId: application.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    })

    // Update application
    await prisma.prequalApplication.update({
      where: { id: application.id },
      data: {
        status: "IBV_COMPLETED",
        ibvOutcome: ibvResult.outcome,
      },
    })

    await writePrequalAuditLog({
      applicationId: application.id,
      eventType: "IBV_COMPLETED",
      actorType: "SYSTEM",
      description: `IBV completed: outcome=${ibvResult.outcome}`,
      metadata: { outcome: ibvResult.outcome, confidence: ibvResult.confidence },
    })

    return NextResponse.json({
      success: true,
      complete: true,
      outcome: ibvResult.outcome,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal IBV] Report retrieval error", { error: msg })
    return NextResponse.json({ success: false, error: "Failed to retrieve bank verification report" }, { status: 500 })
  }
}
