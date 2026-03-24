import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import {
  getLeadById,
  updateLeadStatus,
  LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/services/inventory-sourcing/lead.service"

export const dynamic = "force-dynamic"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { leadId } = await params
    const lead = await getLeadById(leadId)
    return NextResponse.json(lead)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Get Lead Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "GET_LEAD_FAILED", message: "Failed to get lead" }, correlationId },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> },
) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { leadId } = await params
    const body = await req.json()

    if (!body.status) {
      return NextResponse.json(
        { error: { code: "MISSING_STATUS", message: "status is required" } },
        { status: 400 },
      )
    }

    if (!LEAD_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: `status must be one of: ${LEAD_STATUSES.join(", ")}` } },
        { status: 400 },
      )
    }

    const updated = await updateLeadStatus(
      leadId,
      body.status as LeadStatus,
      user.userId,
      body.notes,
    )
    return NextResponse.json(updated)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Update Lead Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "UPDATE_LEAD_FAILED", message: "Failed to update lead" }, correlationId },
      { status: 500 },
    )
  }
}
