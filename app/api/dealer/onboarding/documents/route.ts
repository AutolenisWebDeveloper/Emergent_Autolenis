import { type NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth-server"
import { dealerOnboardingService, DealerDocumentType } from "@/lib/services/dealer-onboarding"
import { randomUUID } from "crypto"
import { z } from "zod"

const VALID_DOC_TYPES = Object.values(DealerDocumentType)

const uploadSchema = z.object({
  applicationId: z.string().min(1, "Application ID is required"),
  docType: z.string().refine(
    (val) => VALID_DOC_TYPES.includes(val as any),
    { message: `docType must be one of: ${VALID_DOC_TYPES.join(", ")}` },
  ),
})

/**
 * POST /api/dealer/onboarding/documents
 *
 * Upload a dealer onboarding document (license, W-9, etc.).
 * Expects multipart/form-data with fields: applicationId, docType, file.
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

    const formData = await req.formData()
    const applicationId = formData.get("applicationId") as string
    const docType = formData.get("docType") as string
    const file = formData.get("file") as File | null

    const parsed = uploadSchema.safeParse({ applicationId, docType })
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

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        {
          error: { code: "VALIDATION_ERROR", message: "File is required" },
          correlationId: randomUUID(),
        },
        { status: 400 },
      )
    }

    // Verify the application belongs to this user
    const application = await dealerOnboardingService.getApplication(applicationId)
    if (!application || application.applicantUserId !== user.userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Not authorized for this application" } },
        { status: 403 },
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const result = await dealerOnboardingService.uploadDealerDocument(
      applicationId,
      docType as typeof DealerDocumentType[keyof typeof DealerDocumentType],
      file.name,
      fileBuffer,
      user.userId,
    )

    return NextResponse.json({ success: true, ...result }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Document upload failed",
        },
        correlationId: randomUUID(),
      },
      { status: 500 },
    )
  }
}
