import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as CircumventionMonitorService from "@/lib/services/circumvention-monitor.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { alertId } = await params
    const body = await request.json()
    const result = await CircumventionMonitorService.resolveAlert(alertId, user.userId, body.resolution)
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Alert Resolve Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to resolve alert", correlationId }, { status: 500 })
  }
}
