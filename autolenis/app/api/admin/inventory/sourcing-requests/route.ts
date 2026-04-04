import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser, isAdminRole } from "@/lib/auth-server"
import {
  createSourcingRequest,
  listSourcingRequests,
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
    const limit = Number(sp.get("limit") || 50)
    const offset = Number(sp.get("offset") || 0)

    const result = await listSourcingRequests({ status, limit, offset })
    return NextResponse.json(result)
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Sourcing Requests List Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "LIST_REQUESTS_FAILED", message: "Failed to list sourcing requests" }, correlationId },
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
    const request = await createSourcingRequest(body)
    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    const correlationId = crypto.randomUUID()
    console.error("[Admin Create Sourcing Request Error]", { correlationId, error: String(error) })
    return NextResponse.json(
      { error: { code: "CREATE_REQUEST_FAILED", message: "Failed to create sourcing request" }, correlationId },
      { status: 500 },
    )
  }
}
