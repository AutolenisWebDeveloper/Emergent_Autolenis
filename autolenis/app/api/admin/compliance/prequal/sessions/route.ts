import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalSessionService } from "@/lib/services/prequal-session.service"

// GET /api/admin/compliance/prequal/sessions?userId=xxx
// List prequal sessions for a user with linked artifacts and provider events
export async function GET(request: Request) {
  try {
    await requireAuth(["ADMIN"])

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "userId query parameter is required" } },
        { status: 400 },
      )
    }

    const sessions = await prequalSessionService.listUserSessions(userId)

    return NextResponse.json({ success: true, data: { sessions } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error"
    const status = message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 500
    return NextResponse.json(
      {
        success: false,
        error: {
          code: status === 401 ? "UNAUTHENTICATED" : status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR",
          message: status === 500 ? "Failed to list sessions" : message,
        },
      },
      { status },
    )
  }
}
