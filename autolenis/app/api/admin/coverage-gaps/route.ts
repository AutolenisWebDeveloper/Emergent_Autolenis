import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import * as CoverageGapService from "@/lib/services/coverage-gap.service"
import { randomUUID } from "crypto"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role))
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const sp = request.nextUrl.searchParams
    const status = sp.get("status") || undefined
    const page = Number.parseInt(sp.get("page") || "1")

    const result = await CoverageGapService.getGapTasks({ status, page })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = randomUUID()
    console.error("[Admin Coverage Gaps Error]", { correlationId, error })
    return NextResponse.json({ error: "Failed to list coverage gaps", correlationId }, { status: 500 })
  }
}
