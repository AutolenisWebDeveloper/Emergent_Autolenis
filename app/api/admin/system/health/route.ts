import { type NextRequest, NextResponse } from "next/server"
import { getSession, isAdminRole } from "@/lib/auth-server"
import {
  getLatestHealthChecks,
  recordHealthCheckAsync,
  validateConfig,
  getOpenIncidents,
  getRecentJobRuns,
  getRateLimits,
} from "@/lib/services/system"

export const dynamic = "force-dynamic"

function safeErrorMessage(error: unknown): string {
  const msg =
    (error && typeof error === "object" && "message" in error
      ? (error as { message: unknown }).message
      : String(error ?? "Unknown error")) ?? ""
  return String(msg).replace(/[\r\n]+/g, " ")
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !isAdminRole(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [healthChecks, openIncidents, recentJobs, rateLimits, configResults] =
      await Promise.all([
        getLatestHealthChecks().catch(() => []),
        getOpenIncidents().catch(() => []),
        getRecentJobRuns(undefined, 10).catch(() => []),
        getRateLimits().catch(() => []),
        validateConfig().catch(() => []),
      ])

    const missingConfigs = configResults.filter(
      (c) => c.isRequired && !c.isPresent
    )

    const failedChecks = healthChecks.filter((c) => c.status === "FAIL")
    const criticalIncidents = openIncidents.filter(
      (i) => i.severity === "CRITICAL" || i.severity === "HIGH"
    )
    const failedJobs = recentJobs.filter((j) => j.status === "FAILED")

    const overallStatus =
      criticalIncidents.length > 0 || failedChecks.length > 0
        ? "DEGRADED"
        : missingConfigs.length > 0
          ? "WARNING"
          : "HEALTHY"

    return NextResponse.json({
      status: overallStatus,
      healthChecks,
      openIncidents: {
        total: openIncidents.length,
        critical: criticalIncidents.length,
        items: openIncidents.slice(0, 10),
      },
      recentJobs: {
        total: recentJobs.length,
        failed: failedJobs.length,
        items: recentJobs,
      },
      rateLimits,
      configValidation: {
        total: configResults.length,
        missing: missingConfigs.length,
        items: configResults,
      },
    })
  } catch (error: unknown) {
    console.error("[System Health API] Error:", safeErrorMessage(error))
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
    const { checkKey, status, message, payload } = body

    if (!checkKey || !status) {
      return NextResponse.json(
        { error: "checkKey and status are required" },
        { status: 400 }
      )
    }

    const check = await recordHealthCheckAsync({
      checkKey,
      status,
      message,
      payload,
    })

    return NextResponse.json({ success: true, data: check })
  } catch (error: unknown) {
    console.error("[System Health API] Error:", safeErrorMessage(error))
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
