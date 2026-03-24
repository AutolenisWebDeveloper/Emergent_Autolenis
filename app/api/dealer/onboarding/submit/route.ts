import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerOnboardingService } from "@/lib/services/dealer-onboarding"
import { randomUUID } from "crypto"
import { z } from "zod"

const submitSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
})

/**
 * POST /api/dealer/onboarding/submit
 *
 * Submit a DRAFT dealer application for admin review.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      )
    }

    const body = await req.json()
    const parsed = submitSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors[0]?.message || "Invalid input",
          },
          correlationId: randomUUID(),
        },
        { status: 400 },
      )
    }

    // Verify ownership
    const application = await dealerOnboardingService.getApplication(parsed.data.applicationId)
    if (!application || application.applicantUserId !== user.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized for this application" } },
        { status: 403 },
      )
    }

    const updated = await dealerOnboardingService.submitApplication(
      parsed.data.applicationId,
      user.userId,
    )

    return NextResponse.json({ success: true, application: updated })
  } catch (err) {
    const statusCode = err instanceof Error && err.message.includes("Invalid status transition")
      ? 409
      : 500
    return NextResponse.json(
      {
        error: {
          code: statusCode === 409 ? "INVALID_TRANSITION" : "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Submit failed",
        },
        correlationId: randomUUID(),
      },
      { status: statusCode },
    )
  }
}
