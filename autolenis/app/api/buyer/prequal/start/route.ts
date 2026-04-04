import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { PreQualService } from "@/lib/services/prequal.service"

// POST /api/buyer/prequal/start - Start pre-qualification with consent
export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()

    const requestContext = {
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    }

    const result = await PreQualService.startPreQual(session.userId, body, requestContext)

    return NextResponse.json({
      success: true,
      data: { preQualification: result },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""

    // Check for profile incomplete error
    if (message.includes("Profile incomplete")) {
      return NextResponse.json(
        {
          success: false,
          error: "Profile incomplete",
          code: "PROFILE_INCOMPLETE",
        },
        { status: 400 },
      )
    }

    // Check for consent error
    if (message.includes("Consent is required")) {
      return NextResponse.json(
        {
          success: false,
          error: "Consent is required",
          code: "CONSENT_REQUIRED",
        },
        { status: 400 },
      )
    }

    console.error("[PreQual Start] Error:", error)
    return NextResponse.json({ success: false, error: "Failed to start pre-qualification" }, { status: message === "Unauthorized" ? 401 : 500 })
  }
}
