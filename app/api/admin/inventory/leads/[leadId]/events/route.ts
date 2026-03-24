import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import { getLeadEvents } from "@/lib/services/inventory-sourcing/lead.service"

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
    const events = await getLeadEvents(leadId)
    return NextResponse.json({ events })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Lead Events Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "GET_EVENTS_FAILED", message: "Failed to get lead events" }, correlationId },
      { status: 500 },
    )
  }
}
