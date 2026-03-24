import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import {
  getSourcingRequestById,
  updateSourcingRequestStatus,
  SOURCING_STATUSES,
  type SourcingStatus,
} from "@/lib/services/inventory-sourcing/lead.service"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params
    const request = await getSourcingRequestById(requestId)
    return NextResponse.json(request)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Get Sourcing Request Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "GET_REQUEST_FAILED", message: "Failed to get sourcing request" }, correlationId },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { requestId } = await params
    const body = await req.json()

    if (!body.status) {
      return NextResponse.json(
        { error: { code: "MISSING_STATUS", message: "status is required" } },
        { status: 400 },
      )
    }

    if (!SOURCING_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: `status must be one of: ${SOURCING_STATUSES.join(", ")}` } },
        { status: 400 },
      )
    }

    const updated = await updateSourcingRequestStatus(
      requestId,
      body.status as SourcingStatus,
      {
        assigned_admin_user_id: body.assigned_admin_user_id,
        assigned_dealer_id: body.assigned_dealer_id,
      },
    )
    return NextResponse.json(updated)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Update Sourcing Request Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "UPDATE_REQUEST_FAILED", message: "Failed to update sourcing request" }, correlationId },
      { status: 500 },
    )
  }
}
