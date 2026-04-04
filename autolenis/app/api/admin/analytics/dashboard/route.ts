import { NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getExecutiveDashboard, getInventorySourceBreakdown } from "@/lib/services/analytics"
import { logger } from "@/lib/logger"
import { randomUUID } from "crypto"

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user || !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const correlationId = randomUUID()

  try {
    const url = new URL(request.url)
    const section = url.searchParams.get("section")

    if (section === "source-breakdown") {
      const data = await getInventorySourceBreakdown()
      return NextResponse.json({ success: true, data })
    }

    const data = await getExecutiveDashboard()
    return NextResponse.json({ success: true, data })
  } catch (err) {
    logger.error("Executive dashboard fetch failed", { error: err, correlationId })
    return NextResponse.json(
      { error: { code: "ANALYTICS_FETCH_FAILED", message: "Failed to load analytics dashboard" }, correlationId },
      { status: 500 }
    )
  }
}
