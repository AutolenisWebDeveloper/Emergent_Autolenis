import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { prequalService } from "@/lib/services/prequal.service"
import { normalizePrequal } from "@/lib/dto/prequal.dto"
import crypto from "crypto"

export const dynamic = "force-dynamic"

// GET /api/buyer/prequal/offers — Get normalized prequal offers for review
export async function GET() {
  try {
    const session = await requireAuth(["BUYER"])

    const prequals = await prequalService.getOffers(session.userId)

    const offers = prequals.map((pq: any) =>
      normalizePrequal({
        id: pq.id,
        status: pq.status,
        source: pq.source,
        providerName: pq.providerName,
        creditTier: pq.creditTier,
        maxOtd: pq.maxOtd,
        maxOtdAmountCents: pq.maxOtdAmountCents,
        estimatedMonthlyMin: pq.estimatedMonthlyMin,
        estimatedMonthlyMax: pq.estimatedMonthlyMax,
        minMonthlyPaymentCents: pq.minMonthlyPaymentCents,
        maxMonthlyPaymentCents: pq.maxMonthlyPaymentCents,
        dtiRatio: pq.dtiRatio,
        expiresAt: pq.expiresAt?.toISOString() ?? null,
        consentGiven: pq.consentGiven,
        consentArtifactId: pq.consentArtifactId,
        consumerAuthorizationArtifactId: pq.consumerAuthorizationArtifactId,
        createdAt: pq.createdAt,
      }),
    )

    return NextResponse.json({
      success: true,
      data: { offers },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : ""
    if (message === "Unauthorized") {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" }, correlationId: crypto.randomUUID() },
        { status: 401 },
      )
    }
    console.error("[PreQual Offers] Error:", error)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch offers" }, correlationId: crypto.randomUUID() },
      { status: 500 },
    )
  }
}
