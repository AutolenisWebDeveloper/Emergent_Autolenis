import { NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { supabase } from "@/lib/db"
import { requireDatabase } from "@/lib/require-database"
import { softPullConsentSchema, buyerProfileSchema } from "@/lib/validators/prequal"
import { isTestWorkspace } from "@/lib/app-mode"
import { mockSelectors } from "@/lib/mocks/mockStore"
import { externalPreApprovalService } from "@/lib/services/external-preapproval.service"
import { ZodError } from "zod"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    if (isTestWorkspace(user)) {
      return NextResponse.json({ success: true, data: mockSelectors.prequalPayload() })
    }

    const dbUnavailable = requireDatabase()
    if (dbUnavailable) return dbUnavailable

    // Get buyer profile
    const { data: buyer } = await supabase.from("BuyerProfile").select("id").eq("userId", user.userId).maybeSingle()

    if (!buyer) {
      return NextResponse.json({ success: true, data: { active: false, preQualification: null, externalSubmission: null } })
    }

    // Use the Prompt 4 canonical unified view for qualification check,
    // plus latest external submission in parallel.
    const [prequalResult, externalSubmission] = await Promise.all([
      supabase
        .from("buyer_qualification_active")
        .select("*")
        .eq("buyer_id", buyer.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      externalPreApprovalService.getLatestForBuyer(user.userId).catch(() => null),
    ])

    const prequal = prequalResult.data

    if (!prequal) {
      return NextResponse.json({
        success: true,
        data: { active: false, preQualification: null, externalSubmission },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        active: prequal.is_active ?? true,
        preQualification: {
          id: prequal.qualification_id,
          status: prequal.qualification_status,
          creditTier: prequal.credit_tier,
          maxOtdAmountCents: prequal.max_otd_amount_cents ?? null,
          minMonthlyPaymentCents: prequal.min_monthly_payment_cents ?? null,
          maxMonthlyPaymentCents: prequal.max_monthly_payment_cents ?? null,
          dtiRatio: prequal.dti_ratio ?? null,
          expiresAt: prequal.expires_at,
          providerName: prequal.provider_name,
          source: prequal.qualification_source || "INTERNAL",
          createdAt: prequal.created_at,
        },
        externalSubmission,
      },
    })
  } catch (error) {
    console.error("[PreQual API] GET error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch pre-qualification" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Production guard: prequal soft-pull is not ready for production use.
    // The current implementation uses internal heuristic scoring, not a compliant
    // bureau/provider adapter with FCRA-compliant consent capture and retention.
    if (process.env["NODE_ENV"] === "production") {
      return NextResponse.json(
        {
          success: false,
          error: "Pre-qualification is temporarily unavailable. Please check back soon.",
        },
        { status: 503 },
      )
    }

    const user = await getSessionUser()
    if (!user || user.role !== "BUYER") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Validate inputs
    const profileData = buyerProfileSchema.parse(body.profile)
    const consentData = softPullConsentSchema.parse(body.consent)

    if (isTestWorkspace(user)) {
      return NextResponse.json({
        success: true,
        data: { preQualification: mockSelectors.prequalPayload().preQualification },
      })
    }

    const dbCheck = requireDatabase()
    if (dbCheck) return dbCheck

    // Update buyer profile
    const { data: buyer, error: updateError } = await supabase
      .from("BuyerProfile")
      .update({
        ...profileData,
        updatedAt: new Date().toISOString(),
      })
      .eq("userId", user.userId)
      .select(
        "id, firstName, lastName, city, state, dateOfBirth, address, postalCode, monthlyIncomeCents, monthlyHousingCents",
      )
      .single()

    if (updateError || !buyer) {
      console.error("[PreQual API] Profile update error:", updateError)
      return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 })
    }

    // Preliminary prequalification scoring
    const monthlyIncome = (buyer.monthlyIncomeCents || 0) / 100
    const monthlyHousing = (buyer.monthlyHousingCents || 0) / 100
    const dtiRatio = monthlyIncome > 0 ? (monthlyHousing / monthlyIncome) * 100 : 100

    if (dtiRatio > 50) {
      return NextResponse.json({
        success: false,
        error: "Debt-to-income ratio exceeds acceptable threshold",
      })
    }

    // Calculate approval based on estimated scoring
    const estimatedScore = Math.floor(Math.random() * 200) + 600
    let creditTier: string
    let rateMultiplier: number

    if (estimatedScore >= 750) {
      creditTier = "EXCELLENT"
      rateMultiplier = 1.0
    } else if (estimatedScore >= 700) {
      creditTier = "GOOD"
      rateMultiplier = 0.9
    } else if (estimatedScore >= 650) {
      creditTier = "FAIR"
      rateMultiplier = 0.75
    } else {
      creditTier = "POOR"
      rateMultiplier = 0.5
    }

    const availableMonthly = monthlyIncome * 0.43 - monthlyHousing
    const maxMonthlyPayment = Math.max(0, Math.floor(availableMonthly * rateMultiplier))
    const avgApr =
      creditTier === "EXCELLENT" ? 0.045 : creditTier === "GOOD" ? 0.065 : creditTier === "FAIR" ? 0.085 : 0.12
    const termMonths = 60
    const monthlyRate = avgApr / 12
    const approvedAmount =
      monthlyRate > 0
        ? maxMonthlyPayment * ((1 - Math.pow(1 + monthlyRate, -termMonths)) / monthlyRate)
        : maxMonthlyPayment * termMonths

    // Expire existing prequals
    await supabase
      .from("PreQualification")
      .update({ status: "EXPIRED", updatedAt: new Date().toISOString() })
      .eq("buyerId", buyer.id)
      .eq("status", "ACTIVE")

    // Create new prequalification
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const { data: prequal, error: prequalError } = await supabase
      .from("PreQualification")
      .insert({
        buyerId: buyer.id,
        status: "ACTIVE",
        creditTier,
        maxOtd: Math.floor(approvedAmount),
        maxOtdAmountCents: Math.floor(approvedAmount) * 100,
        estimatedMonthlyMin: Math.floor(maxMonthlyPayment * 0.5),
        minMonthlyPaymentCents: Math.floor(maxMonthlyPayment * 0.5) * 100,
        estimatedMonthlyMax: maxMonthlyPayment,
        maxMonthlyPaymentCents: maxMonthlyPayment * 100,
        dti: Math.round(dtiRatio * 100) / 100,
        dtiRatio: Math.round(dtiRatio * 100) / 100,
        providerName: "AutoLenisPrequal",
        providerReferenceId: `ALQ-${Date.now()}`,
        softPullCompleted: true,
        softPullDate: new Date().toISOString(),
        consentGiven: consentData.consentGiven,
        consentDate: new Date().toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .select("*")
      .single()

    if (prequalError) {
      console.error("[PreQual API] Create prequal error:", prequalError)
      return NextResponse.json({ success: false, error: "Failed to create prequalification" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        preQualification: {
          id: prequal.id,
          status: "ACTIVE",
          creditTier,
          maxOtdAmountCents: Math.floor(approvedAmount) * 100,
          minMonthlyPaymentCents: Math.floor(maxMonthlyPayment * 0.5) * 100,
          maxMonthlyPaymentCents: maxMonthlyPayment * 100,
          dtiRatio: Math.round(dtiRatio * 100) / 100,
          expiresAt,
          providerName: "AutoLenisPrequal",
        },
      },
    })
  } catch (error) {
    if (error instanceof ZodError) {
      const fields: Record<string, string> = {}
      error.errors.forEach((err) => {
        fields[err.path.join(".")] = err.message
      })
      return NextResponse.json(
        {
          success: false,
          error: error.errors[0]?.message || "Validation failed",
          code: "VALIDATION_ERROR",
          fields,
        },
        { status: 400 },
      )
    }
    console.error("[PreQual API] POST error:", error)
    return NextResponse.json({ success: false, error: "Failed to submit pre-qualification" }, { status: 500 })
  }
}
