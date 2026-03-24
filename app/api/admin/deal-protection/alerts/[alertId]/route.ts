import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as CircumventionMonitorService from "@/lib/services/circumvention-monitor.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { alertId } = await params
    const alert = await CircumventionMonitorService.getAlertById(alertId)
    if (!alert) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(alert)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Alert Get Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to get alert", correlationId }, { status: 500 })
  }
}
