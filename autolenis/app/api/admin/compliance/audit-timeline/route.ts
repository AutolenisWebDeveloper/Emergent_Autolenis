import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { ADMIN_ROLES } from "@/lib/authz/roles"
import { prisma } from "@/lib/db"
import { consentArtifactService } from "@/lib/services/prequal/consent-artifact.service"
import { forwardingAuthorizationService } from "@/lib/services/prequal/forwarding-authorization.service"

export const dynamic = "force-dynamic"

type ProviderEventRow = {
  id: string
  providerName: string
  status: string
  preQualificationId: string | null
  durationMs: number | null
  createdAt: Date
}

type TimelineEventType =
  | "CONSENT_CAPTURED"
  | "FORWARDING_REVOKED"
  | "FORWARDING_AUTHORIZED"
  | "PROVIDER_CALL"
  | "SOFT_CREDIT_PULL"
  | "PREQUAL_REVOKED"

type TimelineEntry = {
  type: TimelineEventType | string
  timestamp: Date
  details: Record<string, unknown>
}

// GET /api/admin/compliance/audit-timeline?userId=xxx
// Returns a unified audit timeline for a user's prequal compliance events
export async function GET(request: Request) {
  const correlationId = crypto.randomUUID()

  try {
    await requireAuth([...ADMIN_ROLES])

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION_ERROR", message: "userId is required" },
          correlationId,
        },
        { status: 400 },
      )
    }

    // Fetch all compliance artifacts in parallel
    const consentArtifacts = await consentArtifactService.getArtifactsForUser(userId)
    const forwardingAuths = await forwardingAuthorizationService.getAuthorizationsForUser(userId)
    const providerEvents = await prisma.preQualProviderEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }).catch((): ProviderEventRow[] => [])
    const complianceEvents = await prisma.complianceEvent.findMany({
      where: { userId, eventType: { in: ["SOFT_CREDIT_PULL", "PREQUAL_REVOKED"] } },
      orderBy: { createdAt: "desc" },
    })

    // Build unified timeline entries
    const timeline: TimelineEntry[] = []

    for (const a of consentArtifacts) {
      timeline.push({
        type: "CONSENT_CAPTURED",
        timestamp: a.capturedAt,
        details: {
          id: a.id,
          consentVersionId: a.consentVersionId,
          preQualificationId: a.preQualificationId,
        },
      })
    }

    for (const a of forwardingAuths) {
      timeline.push({
        type: a.revokedAt ? "FORWARDING_REVOKED" : "FORWARDING_AUTHORIZED",
        timestamp: a.revokedAt || a.capturedAt,
        details: {
          id: a.id,
          preQualificationId: a.preQualificationId,
          recipientType: a.authorizedRecipientType,
          recipientId: a.authorizedRecipientId,
        },
      })
    }

    for (const e of providerEvents) {
      timeline.push({
        type: "PROVIDER_CALL",
        timestamp: e.createdAt,
        details: {
          id: e.id,
          providerName: e.providerName,
          status: e.status,
          preQualificationId: e.preQualificationId,
          durationMs: e.durationMs,
        },
      })
    }

    for (const e of complianceEvents) {
      timeline.push({
        type: e.eventType,
        timestamp: e.createdAt,
        details: {
          id: e.id,
          ...(typeof e.details === "object" && e.details !== null
            ? (e.details as Record<string, unknown>)
            : {}),
        },
      })
    }

    timeline.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime(),
    )

    return NextResponse.json({
      success: true,
      data: { timeline, totalEvents: timeline.length },
      correlationId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId },
        { status: 401 },
      )
    }
    if (message === "Forbidden") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" }, correlationId },
        { status: 403 },
      )
    }
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Failed to build audit timeline" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
