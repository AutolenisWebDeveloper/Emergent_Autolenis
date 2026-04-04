import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalSessionService } from "@/lib/services/prequal-session.service"

// POST /api/buyer/prequal/session/consent - Capture written-instruction consent
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

    if (!body.consentVersionId || !body.consentText) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "consentVersionId and consentText are required" } },
        { status: 400 },
      )
    }

    const result = await prequalSessionService.captureConsent(
      body.sessionId,
      session.userId,
      {
        consentVersionId: body.consentVersionId,
        consentText: body.consentText,
        consentGiven: body.consentGiven ?? false,
      },
      {
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error"

    if (message.includes("consent is required")) {
      return NextResponse.json(
        { success: false, error: { code: "CONSENT_REQUIRED", message } },
        { status: 400 },
      )
    }

    if (message.includes("not found")) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Session not found" } },
        { status: 404 },
      )
    }

    if (message.includes("INITIATED")) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATE", message } },
        { status: 409 },
      )
    }

    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json(
      { success: false, error: { code: status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR", message: status === 401 ? "Unauthorized" : "Failed to capture consent" } },
      { status },
    )
  }
}
