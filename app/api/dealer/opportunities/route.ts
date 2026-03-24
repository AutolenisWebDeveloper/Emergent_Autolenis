import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService } from "@/lib/services/sourcing.service"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await requireAuth(["DEALER"])

    const cases = await sourcingService.listOpenCasesForDealer(session.workspace_id)

    return NextResponse.json({ success: true, data: cases })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json({ error: statusCode === 401 ? "Unauthorized" : "Forbidden" }, { status: statusCode })
    }
    console.error("[DEALER_OPPORTUNITIES]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
