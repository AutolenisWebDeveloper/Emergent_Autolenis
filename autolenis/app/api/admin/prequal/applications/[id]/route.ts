import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { getSessionUser } from "@/lib/auth-server"
import { ADMIN_ROLES } from "@/lib/authz/roles"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const user = await getSessionUser()
    if (!user || !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    const { id } = await params
    const workspaceId = user.workspace_id

    const application = await prisma.prequalApplication.findFirst({
      where: { id, ...(workspaceId ? { workspaceId } : {}) },
      include: {
        consent: true,
        ipredictReport: {
          select: {
            id: true,
            band: true,
            scoreRaw: true,
            hardFailReason: true,
            requestId: true,
            latencyMs: true,
            createdAt: true,
            // NOTE: encryptedPayload is NOT returned to admin (raw vendor data)
          },
        },
        ibvSession: true,
        ibvReport: {
          select: {
            id: true,
            outcome: true,
            monthlyIncomeCents: true,
            confidence: true,
            createdAt: true,
            // NOTE: encryptedPayload is NOT returned to admin
          },
        },
        decision: true,
        auditLogs: { orderBy: { createdAt: "asc" } },
        notes: { orderBy: { createdAt: "desc" } },
      },
    })

    if (!application) {
      return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 })
    }

    // Redact encrypted SSN — never expose
    const { ssnEncrypted: _ssn, ...safeApp } = application as Record<string, unknown>

    return NextResponse.json({ success: true, data: safeApp })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    logger.error("[Admin Prequal] Application detail error", { error: msg })
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
