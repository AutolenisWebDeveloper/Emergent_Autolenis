import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalService } from "@/lib/services/prequal.service"
import crypto from "crypto"
import { z } from "zod"

export const dynamic = "force-dynamic"

const forwardingSchema = z.object({
  authorizedParties: z.array(z.string().min(1)).min(1, "At least one authorized party is required"),
  authorizationText: z.string().min(10, "Authorization text is required"),
  consentGiven: z.literal(true, { errorMap: () => ({ message: "Authorization must be given" }) }),
})

// POST /api/buyer/prequal/authorize-forwarding — Record third-party forwarding authorization
export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()
    const parsed = forwardingSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input" }, correlationId: crypto.randomUUID() },
        { status: 400 },
      )
    }

    const { authorizedParties, authorizationText } = parsed.data

    const requestContext = {
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    }

    const artifact = await prequalService.recordForwardingAuthorization(
      session.userId,
      authorizedParties,
      authorizationText,
      requestContext,
    )

    return NextResponse.json({
      success: true,
      data: {
        authorizationArtifactId: artifact.id,
        recipientDescription: artifact.recipientDescription,
        authorizedAt: artifact.authorizedAt,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId: crypto.randomUUID() },
        { status: 401 },
      )
    }
    console.error("[PreQual Authorize Forwarding] Error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to record forwarding authorization" }, correlationId: crypto.randomUUID() },
      { status: 500 },
    )
  }
}
