import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth-server"
import {
  openIncidentAsync,
  updateIncidentStatusAsync,
  getOpenIncidents,
} from "@/lib/services/system"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const incidents = await getOpenIncidents()

    return NextResponse.json({
      success: true,
      data: incidents,
      total: incidents.length,
    })
  } catch (error: unknown) {
    const rawMessage = (error instanceof Error ? error.message : undefined) ?? "Unknown error"
    const safeMessage = String(rawMessage).replace(/[\r\n]+/g, " ")
    console.error("[System Incidents API] Error:", safeMessage)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { incidentKey, severity, title, description, payload } = body

    if (!incidentKey || !severity || !title) {
      return NextResponse.json(
        { error: "incidentKey, severity, and title are required" },
        { status: 400 }
      )
    }

    const incident = await openIncidentAsync({
      incidentKey,
      severity,
      title,
      description,
      payload,
    })

    return NextResponse.json({ success: true, data: incident })
  } catch (error: unknown) {
    const rawMessage = (error instanceof Error ? error.message : undefined) ?? "Unknown error"
    const safeMessage = String(rawMessage).replace(/[\r\n]+/g, " ")
    console.error("[System Incidents API] Error:", safeMessage)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { incidentId, status } = body

    if (!incidentId || !status) {
      return NextResponse.json(
        { error: "incidentId and status are required" },
        { status: 400 }
      )
    }

    const validStatuses = ["OPEN", "ACKNOWLEDGED", "RESOLVED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      )
    }

    const incident = await updateIncidentStatusAsync(incidentId, status)

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: incident })
  } catch (error: unknown) {
    const rawMessage = (error instanceof Error ? error.message : undefined) ?? "Unknown error"
    const safeMessage = String(rawMessage).replace(/[\r\n]+/g, " ")
    console.error("[System Incidents API] Error:", safeMessage)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
