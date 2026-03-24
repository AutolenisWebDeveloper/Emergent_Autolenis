import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import { sourcingService, type BuyerCaseStatus, type AdminSubStatus } from "@/lib/services/sourcing.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { searchParams } = new URL(request.url)
    const tab = searchParams.get("tab") ?? undefined
    const status = (searchParams.get("status") ?? undefined) as BuyerCaseStatus | undefined
    const adminSubStatus = (searchParams.get("adminSubStatus") ?? undefined) as AdminSubStatus | undefined
    const dateFrom = searchParams.get("dateFrom") ?? undefined
    const dateTo = searchParams.get("dateTo") ?? undefined
    const make = searchParams.get("make") ?? undefined
    const marketZip = searchParams.get("marketZip") ?? undefined
    const budgetMin = searchParams.get("budgetMin") ? Number(searchParams.get("budgetMin")) : undefined
    const budgetMax = searchParams.get("budgetMax") ? Number(searchParams.get("budgetMax")) : undefined
    const sortBy = (searchParams.get("sortBy") ?? undefined) as "newest" | "oldest" | "highest_budget" | undefined

    const cases = await sourcingService.listCasesForAdmin(
      { status, adminSubStatus, tab, dateFrom, dateTo, make, marketZip, budgetMin, budgetMax, sortBy },
      session.workspace_id,
    )

    return NextResponse.json({ success: true, data: cases })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_SOURCING_CASES_LIST]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to load sourcing cases. Please try again." }, correlationId },
      { status: 500 },
    )
  }
}
