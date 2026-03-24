import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { requireAuth } from "@/lib/auth-server"
import {
  submitOffer,
  listOffersForCase,
} from "@/lib/services/inventory-sourcing/case.service"
import { logger } from "@/lib/logger"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const correlationId = randomUUID()
  try {
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { caseId } = await params
    const data = await listOffersForCase(caseId)
    return NextResponse.json({ success: true, data, correlationId })
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 401 || statusCode === 403) {
      return NextResponse.json(
        { error: { code: statusCode, message: (error as Error).message }, correlationId },
        { status: statusCode },
      )
    }
    logger.error("[ADMIN_CASE_OFFERS_LIST]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to load offers." }, correlationId },
      { status: 500 },
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ caseId: string }> },
) {
  const correlationId = randomUUID()
  try {
    await requireAuth(["ADMIN", "SUPER_ADMIN"])

    const { caseId } = await params
    const body = await request.json()

    if (!body.dealerId && !body.externalDealerId) {
      return NextResponse.json(
        { error: { code: 400, message: "Either dealerId or externalDealerId is required." }, correlationId },
        { status: 400 },
      )
    }

    const data = await submitOffer({
      sourcingCaseId: caseId,
      inviteId: body.inviteId,
      dealerId: body.dealerId,
      externalDealerId: body.externalDealerId,
      listingId: body.listingId,
      canonicalVehicleId: body.canonicalVehicleId,
      year: body.year,
      make: body.make,
      model: body.model,
      trim: body.trim,
      vin: body.vin,
      mileage: body.mileage,
      price: body.price,
      fees: body.fees,
      notes: body.notes,
      listingUrl: body.listingUrl,
      payload: body.payload,
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
    logger.error("[ADMIN_CASE_OFFERS_CREATE]", { error: String(error), correlationId })
    return NextResponse.json(
      { error: { code: 500, message: "Unable to submit offer." }, correlationId },
      { status: 500 },
    )
  }
}
