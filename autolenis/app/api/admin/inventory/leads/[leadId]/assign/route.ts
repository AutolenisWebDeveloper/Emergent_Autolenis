import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { assignLead } from "@/lib/services/inventory-sourcing/lead.service"

export const dynamic = "force-dynamic"

export async function POST(
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

    if (!body.assigned_admin_user_id && !body.assigned_dealer_id) {
      return NextResponse.json(
        { error: { code: "MISSING_ASSIGNMENT", message: "assigned_admin_user_id or assigned_dealer_id is required" } },
        { status: 400 },
      )
    }

    const updated = await assignLead(
      leadId,
      {
        assigned_admin_user_id: body.assigned_admin_user_id,
        assigned_dealer_id: body.assigned_dealer_id,
      },
      user.userId,
    )
    return NextResponse.json(updated)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Assign Lead Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "ASSIGN_LEAD_FAILED", message: "Failed to assign lead" }, correlationId },
      { status: 500 },
    )
  }
}
