import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getPrequalSessionToken } from "@/lib/prequal/session"
import { writePrequalAuditLog } from "@/lib/prequal/audit"
import { createIbvForm } from "@/lib/microbilt/ibv-client"
import { IBV_SESSION_TIMEOUT_HOURS } from "@/lib/prequal/constants"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    })

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })
    }

    if (application.status !== "IBV_PENDING") {
      return NextResponse.json(
        { success: false, error: "IBV is not required for this application" },
        { status: 409 }
      )
    }

    // Check for existing IBV session
    const existing = await prisma.prequalIbvSession.findUnique({
      where: { applicationId: application.id },
    })

    if (existing?.status === "CREATED" || existing?.status === "STARTED") {
      return NextResponse.json({
        success: true,
        sessionId: existing.ibvSessionId,
        formUrl: existing.ibvFormUrl,
      })
    }

    // Create new IBV form
    const ibvSession = await createIbvForm({
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      phone: application.phone,
      referenceId: application.id,
    })

    const expiresAt = new Date(Date.now() + IBV_SESSION_TIMEOUT_HOURS * 60 * 60 * 1000)

    await prisma.prequalIbvSession.upsert({
      where: { applicationId: application.id },
      create: {
        applicationId: application.id,
        ibvSessionId: ibvSession.sessionId,
        ibvFormUrl: ibvSession.formUrl,
        status: "CREATED",
        expiresAt,
      },
      update: {
        ibvSessionId: ibvSession.sessionId,
        ibvFormUrl: ibvSession.formUrl,
        status: "CREATED",
        expiresAt,
      },
    })

    await writePrequalAuditLog({
      applicationId: application.id,
      eventType: "IBV_FORM_CREATED",
      actorType: "SYSTEM",
      description: "IBV bank verification form created",
    })

    return NextResponse.json({
      success: true,
      sessionId: ibvSession.sessionId,
      formUrl: ibvSession.formUrl,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Prequal IBV] Failed to create IBV form", { error: msg })
    return NextResponse.json({ success: false, error: "Failed to create bank verification session" }, { status: 500 })
  }
}
