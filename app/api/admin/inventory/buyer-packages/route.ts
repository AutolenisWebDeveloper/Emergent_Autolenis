import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import {
  createBuyerPackageFromLead,
  createBuyerPackageFromSourcingRequest,
  listBuyerPackages,
} from "@/lib/services/inventory-sourcing/case.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const correlationId = randomUUID()
  try {
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") ?? undefined
    const packageType = searchParams.get("packageType") ?? undefined
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined

    const data = await listBuyerPackages({ status, packageType, limit, offset })
    return NextResponse.json({ success: true, data, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_BUYER_PACKAGES_LIST]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to load buyer packages." }, correlationId },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const correlationId = randomUUID()
  try {
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const body = await request.json()
    const { leadId, sourcingRequestId } = body

    if (!leadId && !sourcingRequestId) {
      return NextResponse.json(
        { error: { code: 400, message: "Either leadId or sourcingRequestId is required." }, correlationId },
        { status: 400 },
      )
    }

    const data = leadId
      ? await createBuyerPackageFromLead(leadId)
      : await createBuyerPackageFromSourcingRequest(sourcingRequestId)

    return NextResponse.json({ success: true, data, correlationId }, { status: 201 })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_BUYER_PACKAGES_CREATE]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to create buyer package." }, correlationId },
      { status: 500 },
    )
  }
}
