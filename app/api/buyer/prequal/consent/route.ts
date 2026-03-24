import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalService } from "@/lib/services/prequal.service"
import crypto from "crypto"
import { z } from "zod"

export const dynamic = "force-dynamic"

const consentSchema = z.object({
  consentVersionId: z.string().min(1, "Consent version is required"),
  sessionId: z.string().min(1, "Session ID is required"),
  consentGiven: z.literal(true, { errorMap: () => ({ message: "Consent must be given" }) }),
})

// POST /api/buyer/prequal/consent — Record consent artifact
export async function POST(request: Request) {
  try {
    const session = await requireAuth(["BUYER"])
    const body = await request.json()
    const parsed = consentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message || "Invalid input" }, correlationId: crypto.randomUUID() },
        { status: 400 },
      )
    }

    const { consentVersionId, sessionId } = parsed.data

    const requestContext = {
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    }

    const artifact = await prequalService.recordConsent(
      session.userId,
      consentVersionId,
      sessionId,
      requestContext,
    )

    return NextResponse.json({
      success: true,
      data: {
        consentArtifactId: artifact.id,
        consentDate: artifact.consentDate,
        consentGiven: artifact.consentGiven,
      },
    })
  } catch (error: unknown) {
    const err = error as Error & { code?: string }
    if (err.message === "Unauthorized") {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId: crypto.randomUUID() },
        { status: 401 },
      )
    }
    if (err.code === "NOT_FOUND") {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: err.message }, correlationId: crypto.randomUUID() },
        { status: 404 },
      )
    }
    console.error("[PreQual Consent] Error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to record consent" }, correlationId: crypto.randomUUID() },
      { status: 500 },
    )
  }
}
