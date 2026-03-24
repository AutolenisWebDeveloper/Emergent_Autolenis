import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth-server"
import {
  startJobRunAsync,
  completeJobRunAsync,
  getRecentJobRuns,
} from "@/lib/services/system"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const jobKey = searchParams.get("jobKey") ?? undefined
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "20", 10),
      100
    )

    const jobs = await getRecentJobRuns(jobKey, limit)

    return NextResponse.json({
      success: true,
      data: jobs,
      total: jobs.length,
    })
  } catch (error: any) {
    console.error("[System Jobs API] Error:", error?.message)
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
    const { jobKey, runType, payload } = body

    if (!jobKey) {
      return NextResponse.json(
        { error: "jobKey is required" },
        { status: 400 }
      )
    }

    const run = await startJobRunAsync({ jobKey, runType, payload })

    return NextResponse.json({ success: true, data: run })
  } catch (error: any) {
    console.error("[System Jobs API] Error:", error?.message)
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
    const { runId, status, errorMessage } = body

    if (!runId || !status) {
      return NextResponse.json(
        { error: "runId and status are required" },
        { status: 400 }
      )
    }

    const validStatuses = ["RUNNING", "COMPLETED", "FAILED", "SKIPPED"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      )
    }

    const run = await completeJobRunAsync(runId, status, errorMessage)

    if (!run) {
      return NextResponse.json(
        { error: "Job run not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: run })
  } catch (error: any) {
    console.error("[System Jobs API] Error:", error?.message)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
