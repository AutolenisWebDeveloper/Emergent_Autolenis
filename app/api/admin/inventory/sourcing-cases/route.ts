import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import {
  openSourcingCase,
  listSourcingCases,
} from "@/lib/services/inventory-sourcing/case.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const correlationId = randomUUID()
  try {
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") ?? undefined
    const caseType = searchParams.get("caseType") ?? undefined
    const assignedAdminUserId = searchParams.get("assignedAdminUserId") ?? undefined
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined

    const data = await listSourcingCases({ status, caseType, assignedAdminUserId, limit, offset })
    return NextResponse.json({ success: true, data, correlationId })
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
      { error: { code: 500, message: "Unable to load sourcing cases." }, correlationId },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const correlationId = randomUUID()
  try {
    const session = await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const body = await request.json()

    if (!body.buyerPackageId) {
      return NextResponse.json(
        { error: { code: 400, message: "buyerPackageId is required." }, correlationId },
        { status: 400 },
      )
    }

    const data = await openSourcingCase({
      buyerPackageId: body.buyerPackageId,
      leadId: body.leadId,
      sourcingRequestId: body.sourcingRequestId,
      caseType: body.caseType,
      assignedAdminUserId: body.assignedAdminUserId ?? session.userId,
      matchedDealerId: body.matchedDealerId,
      matchedExternalDealerId: body.matchedExternalDealerId,
    })

    return NextResponse.json({ success: true, data, correlationId }, { status: 201 })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_SOURCING_CASES_CREATE]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to create sourcing case." }, correlationId },
      { status: 500 },
    )
  }
}
