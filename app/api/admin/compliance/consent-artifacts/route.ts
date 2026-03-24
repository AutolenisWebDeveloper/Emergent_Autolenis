import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { ADMIN_ROLES } from "@/lib/authz/roles"
import { consentArtifactService } from "@/lib/services/prequal/consent-artifact.service"

export const dynamic = "force-dynamic"

// GET /api/admin/compliance/consent-artifacts?userId=xxx
// Retrieves consent artifacts for a user (admin only)
export async function GET(request: Request) {
  const correlationId = crypto.randomUUID()

  try {
    await requireAuth([...ADMIN_ROLES])

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION_ERROR", message: "userId is required" },
          correlationId,
        },
        { status: 400 },
      )
    }

    const artifacts = await consentArtifactService.getArtifactsForUser(userId)

    return NextResponse.json({
      success: true,
      data: { artifacts },
      correlationId,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId },
        { status: 401 },
      )
    }
    if (message === "Forbidden") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Insufficient permissions" }, correlationId },
        { status: 403 },
      )
    }
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Failed to retrieve consent artifacts" },
        correlationId,
      },
      { status: 500 },
    )
  }
}
