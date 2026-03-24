import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalSessionService } from "@/lib/services/prequal-session.service"

// POST /api/buyer/prequal/session/authorize - Capture forwarding authorization
export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()

    if (!body.sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "sessionId is required" } },
        { status: 400 },
      )
    }

    if (!body.authorizationText) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "authorizationText is required" } },
        { status: 400 },
      )
    }

    const result = await prequalSessionService.captureForwardingAuthorization(
      body.sessionId,
      session.userId,
      {
        authorizationText: body.authorizationText,
        authorized: body.authorized ?? false,
        recipientDescription: body.recipientDescription,
      },
      {
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error"

    if (message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      )
    }

    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json(
      { success: false, error: { code: status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR", message: status === 401 ? "Unauthorized" : "Failed to capture authorization" } },
      { status },
    )
  }
}
