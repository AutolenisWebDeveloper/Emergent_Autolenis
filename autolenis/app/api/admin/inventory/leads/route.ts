import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import {
  createLead,
  listLeads,
  LEAD_STATUSES,
  LEAD_TYPES,
} from "@/lib/services/inventory-sourcing/lead.service"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sp = req.nextUrl.searchParams
    const status = (sp.get("status") || "").trim() || undefined
    const lead_type = (sp.get("lead_type") || "").trim() || undefined
    const limit = Number(sp.get("limit") || 50)
    const offset = Number(sp.get("offset") || 0)

    const result = await listLeads({ status, lead_type, limit, offset })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Leads List Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "LIST_LEADS_FAILED", message: "Failed to list leads" }, correlationId },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user || !isAdminRole(user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()

    if (body.lead_type && !LEAD_TYPES.includes(body.lead_type)) {
      return NextResponse.json(
        { error: { code: "INVALID_LEAD_TYPE", message: `lead_type must be one of: ${LEAD_TYPES.join(", ")}` } },
        { status: 400 },
      )
    }

    if (body.status && !LEAD_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: `status must be one of: ${LEAD_STATUSES.join(", ")}` } },
        { status: 400 },
      )
    }

    const lead = await createLead(body, user.userId)
    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Create Lead Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "CREATE_LEAD_FAILED", message: "Failed to create lead" }, correlationId },
      { status: 500 },
    )
  }
}
