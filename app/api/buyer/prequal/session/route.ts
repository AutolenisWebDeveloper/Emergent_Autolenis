import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalSessionService } from "@/lib/services/prequal-session.service"

// POST /api/buyer/prequal/session - Create a new prequal session
export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()

    const result = await prequalSessionService.createSession(
      session.userId,
      { sourceType: body.sourceType },
      {
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json(
      { success: false, error: { code: status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR", message: status === 401 ? "Unauthorized" : "Failed to create session" } },
      { status },
    )
  }
}

// GET /api/buyer/prequal/session?sessionId=xxx - Get session details
export async function GET(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "sessionId is required" } },
        { status: 400 },
      )
    }

    const data = await prequalSessionService.getSession(sessionId, session.userId)
    return NextResponse.json({ success: true, data })
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
      { success: false, error: { code: status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR", message: status === 401 ? "Unauthorized" : "Failed to get session" } },
      { status },
    )
  }
}
