import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerOnboardingService } from "@/lib/services/dealer-onboarding"
import { z } from "zod"
import { randomUUID } from "crypto"

const createApplicationSchema = z.object({
  legalBusinessName: z.string().min(1, "Legal business name is required"),
  dbaName: z.string().optional(),
  entityType: z.string().optional(),
  dealerLicenseNumber: z.string().min(1, "Dealer license number is required"),
  licenseState: z.string().min(1, "License state is required"),
  taxIdLast4: z.string().max(4).optional(),
  businessEmail: z.string().email("Valid business email is required"),
  businessPhone: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  principalName: z.string().min(1, "Principal name is required"),
  principalEmail: z.string().email("Valid principal email is required"),
  principalPhone: z.string().optional(),
})

/**
 * POST /api/dealer/onboarding/application
 *
 * Create a new dealer application (onboarding intake).
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

    const rawBody = await req.json()
    const parsed = createApplicationSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid application data",
            details: parsed.error.flatten().fieldErrors,
          },
          correlationId: randomUUID(),
        },
        { status: 400 },
      )
    }

    const application = await dealerOnboardingService.createApplication({
      ...parsed.data,
      websiteUrl: parsed.data.websiteUrl || undefined,
      applicantUserId: user.userId,
    })

    return NextResponse.json({ application }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to create application",
        },
        correlationId: randomUUID(),
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/dealer/onboarding/application
 *
 * Get the current dealer's onboarding application.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 },
      )
    }

    const application = await dealerOnboardingService.getApplicationByUserId(user.userId)

    if (!application) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No application found" } },
        { status: 404 },
      )
    }

    return NextResponse.json({ application })
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to get application",
        },
        correlationId: randomUUID(),
      },
      { status: 500 },
    )
  }
}
